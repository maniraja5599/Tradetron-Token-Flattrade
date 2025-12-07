import { google } from 'googleapis'
import { RunLog, User } from '@/types'
import { getUserById, saveUser, getUsers, saveGoogleSheetsConfig } from './db'
import { encrypt } from '@/lib/crypto'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs/promises'
import path from 'path'

// Extract Sheet ID from URL or use directly
export function extractSheetId(sheetUrlOrId: string): string {
  // If it's already a Sheet ID (just alphanumeric), return it
  if (/^[a-zA-Z0-9_-]+$/.test(sheetUrlOrId)) {
    return sheetUrlOrId
  }

  // Extract from Google Sheets URL
  // Format: https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit
  const match = sheetUrlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (match) {
    return match[1]
  }

  throw new Error('Invalid Google Sheets URL or ID')
}

// Get authenticated Google Sheets client with write access
export async function getSheetsClient(): Promise<{
  sheets: any
  auth: any | null
  apiKey?: string
  hasWriteAccess: boolean
}> {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  const serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH
  const googleApplicationCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS

  if (!apiKey && !serviceAccountKey && !serviceAccountKeyPath && !googleApplicationCredentials) {
    throw new Error('Either GOOGLE_SHEETS_API_KEY, GOOGLE_SERVICE_ACCOUNT_KEY, GOOGLE_SERVICE_ACCOUNT_KEY_PATH, or GOOGLE_APPLICATION_CREDENTIALS must be set')
  }

  const sheets = google.sheets({ version: 'v4' })

  // Check for Application Default Credentials first (set by server.js from GSA_JSON_B64)
  if (googleApplicationCredentials) {
    try {
      // Verify the credentials file exists and is valid
      const credsPath = googleApplicationCredentials
      try {
        const credsContent = await fs.readFile(credsPath, 'utf-8')
        // Validate JSON format
        JSON.parse(credsContent)
      } catch (fileError: any) {
        console.error('[GoogleSheets] ⚠️ Invalid credentials file at GOOGLE_APPLICATION_CREDENTIALS:', fileError.message)
        console.error('[GoogleSheets] 💡 Check that GSA_JSON_B64 is properly base64-encoded and complete')
        throw fileError // Force fallback
      }

      const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        keyFile: credsPath, // Explicitly specify the key file
      })
      const authClient = await auth.getClient()
      return { sheets, auth: authClient, hasWriteAccess: true }
    } catch (error: any) {
      console.error('[GoogleSheets] Failed to use Application Default Credentials:', error.message)
      if (error.message?.includes('Unterminated string') || error.message?.includes('JSON')) {
        console.error('[GoogleSheets] 💡 JSON parsing error - check that GSA_JSON_B64 is complete and properly base64-encoded')
        console.error('[GoogleSheets] 💡 Tip: Ensure no line breaks or truncation in the base64 string')
      }
      // Fall through to other auth methods
    }
  }

  if (serviceAccountKey || serviceAccountKeyPath) {
    // Use service account authentication (required for write access)
    let credentials: any

    if (serviceAccountKeyPath) {
      // Read from file
      const keyPath = path.isAbsolute(serviceAccountKeyPath)
        ? serviceAccountKeyPath
        : path.join(process.cwd(), serviceAccountKeyPath)
      const keyContent = await fs.readFile(keyPath, 'utf-8')
      credentials = JSON.parse(keyContent)
    } else if (serviceAccountKey) {
      // Parse from environment variable
      let keyToParse = serviceAccountKey
      try {
        credentials = JSON.parse(keyToParse)
      } catch {
        try {
          keyToParse = Buffer.from(serviceAccountKey, 'base64').toString('utf-8')
          credentials = JSON.parse(keyToParse)
        } catch {
          throw new Error('Invalid service account key format')
        }
      }
    }

    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'], // Full write access
    })

    return { sheets, auth, hasWriteAccess: true }
  } else {
    // API key doesn't support write operations
    return { sheets, auth: null, apiKey, hasWriteAccess: false }
  }
}

// Convert column index (0-based) to letter (A, B, C, ..., Z, AA, AB, ...)
function columnToLetter(col: number): string {
  let result = ''
  let temp = col
  while (temp >= 0) {
    result = String.fromCharCode(65 + (temp % 26)) + result
    temp = Math.floor(temp / 26) - 1
  }
  return result
}

// Fetch sheet data to find row index for a user
async function findUserRowIndex(
  sheetId: string,
  range: string,
  userName: string,
  tradetronId: string
): Promise<number | null> {
  const { sheets, auth, apiKey } = await getSheetsClient()

  try {
    const response = auth
      ? await sheets.spreadsheets.values.get({
        auth,
        spreadsheetId: sheetId,
        range,
      })
      : await sheets.spreadsheets.values.get({
        key: apiKey,
        spreadsheetId: sheetId,
        range,
      })

    const rows = (response.data.values as string[][]) || []
    if (rows.length === 0) return null

    const headers = rows[0]
    const nameColIndex = headers.findIndex(h =>
      h && (h.trim().toLowerCase().includes('name') || h.trim().toLowerCase().includes('user'))
    )
    const tradetronColIndex = headers.findIndex(h =>
      h && (h.trim().toLowerCase().includes('tradetron') || h.trim().toLowerCase().includes('tt id'))
    )

    // Find row by matching name or tradetron ID
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.every(cell => !cell || !cell.trim())) continue

      const rowName = nameColIndex >= 0 ? row[nameColIndex]?.trim().toLowerCase() : ''
      const rowTradetronId = tradetronColIndex >= 0 ? row[tradetronColIndex]?.trim().toLowerCase() : ''

      if (
        (nameColIndex >= 0 && rowName === userName.toLowerCase()) ||
        (tradetronColIndex >= 0 && rowTradetronId === tradetronId.toLowerCase())
      ) {
        return i + 1 // Return 1-based row index
      }
    }

    return null
  } catch (error: any) {
    console.error(`[GoogleSheets] Error finding user row:`, error)
    return null
  }
}

// Ensure columns exist in the sheet (add headers if missing)
async function ensureColumnsExist(
  sheetId: string,
  sheetName: string,
  headers: string[],
  columnsToAdd: string[]
): Promise<{ [key: string]: number }> {
  const { sheets, auth, hasWriteAccess } = await getSheetsClient()

  if (!hasWriteAccess || !auth) {
    throw new Error('Write access required to add columns. Use service account authentication.')
  }

  const columnMap: { [key: string]: number } = {}
  const existingHeaders = headers.map(h => h.trim().toLowerCase())
  const newHeaders: string[] = []
  const newColumnIndices: number[] = []

  // Find existing columns and identify missing ones
  columnsToAdd.forEach(colName => {
    const colIndex = existingHeaders.indexOf(colName.toLowerCase())
    if (colIndex >= 0) {
      columnMap[colName] = colIndex
    } else {
      // Column doesn't exist, will add it
      const newIndex = headers.length + newHeaders.length
      columnMap[colName] = newIndex
      newHeaders.push(colName)
      newColumnIndices.push(newIndex)
    }
  })

  // Add missing column headers
  if (newHeaders.length > 0) {
    const startCol = columnToLetter(headers.length)
    const endCol = columnToLetter(headers.length + newHeaders.length - 1)

    await sheets.spreadsheets.values.update({
      auth,
      spreadsheetId: sheetId,
      range: `${sheetName}!${startCol}1:${endCol}1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [newHeaders],
      },
    })

    console.log(`[GoogleSheets] Added ${newHeaders.length} new columns: ${newHeaders.join(', ')}`)
  }

  return columnMap
}

// Update Google Sheet with run results
export async function updateSheetWithRunResult(
  sheetUrlOrId: string,
  runLog: RunLog,
  range: string = 'Sheet1!A:Z'
): Promise<boolean> {
  try {
    if (!sheetUrlOrId) {
      console.log(`[GoogleSheets] No sheet URL configured`)
      return false // No sheet URL configured
    }

    console.log(`[GoogleSheets] Starting update for run: ${runLog.id}, user: ${runLog.userName}`)
    const sheetId = extractSheetId(sheetUrlOrId)
    console.log(`[GoogleSheets] Extracted sheet ID: ${sheetId}`)

    const user = await getUserById(runLog.userId)

    if (!user) {
      console.error(`[GoogleSheets] User not found for run: ${runLog.userId}`)
      return false
    }

    console.log(`[GoogleSheets] Found user: ${user.name} (${user.tradetronUsername})`)

    // Check if we have write access
    const { hasWriteAccess, auth } = await getSheetsClient()
    if (!hasWriteAccess || !auth) {
      console.warn(`[GoogleSheets] ⚠️ Write access required. Service account authentication needed for updates.`)
      console.warn(`[GoogleSheets] Current auth method: ${auth ? 'Service Account' : 'API Key (read-only)'}`)
      console.warn(`[GoogleSheets] 💡 To enable auto-updates: Set up a service account with Editor permission on the sheet`)
      console.warn(`[GoogleSheets] 💡 See: GOOGLE_SHEETS_UPDATE_SETUP.md for setup instructions`)
      return false
    }

    console.log(`[GoogleSheets] ✅ Write access confirmed (service account)`)

    // Find the row index for this user
    console.log(`[GoogleSheets] Searching for user row: name="${user.name}", tradetronId="${user.tradetronUsername}"`)
    const rowIndex = await findUserRowIndex(sheetId, range, user.name, user.tradetronUsername)

    if (!rowIndex) {
      console.warn(`[GoogleSheets] ⚠️ Could not find row for user: ${user.name} (${user.tradetronUsername})`)
      console.warn(`[GoogleSheets] Make sure the user exists in the sheet with matching NAME or TRADETRON ID`)
      return false
    }

    console.log(`[GoogleSheets] ✅ Found user at row: ${rowIndex}`)

    // Get sheet headers
    const { sheets } = await getSheetsClient()
    const sheetName = range.split('!')[0]

    const headersResponse = await sheets.spreadsheets.values.get({
      auth: auth!,
      spreadsheetId: sheetId,
      range: `${sheetName}!1:1`, // Get header row
    })

    const headers = (headersResponse.data.values?.[0] as string[]) || []

    // Ensure required columns exist
    const requiredColumns = ['Last Run Status', 'Last Run Time', 'Token Generated', 'Last Run Message']
    const columnMap = await ensureColumnsExist(sheetId, sheetName, headers, requiredColumns)

    // Prepare update values
    const statusValue = runLog.status === 'success' ? 'Success' : 'Failed'
    const timeValue = new Date(runLog.finishedAt).toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    const tokenValue = runLog.tokenGenerated ? 'Yes' : 'No'

    // Get message/reason - truncate if too long (Google Sheets has cell size limits)
    let messageValue = runLog.message || ''
    if (messageValue.length > 500) {
      messageValue = messageValue.substring(0, 497) + '...'
    }
    // Clean up message - remove extra whitespace and newlines for better display
    messageValue = messageValue.trim().replace(/\s+/g, ' ')

    // Update cells using batch update
    const updates = [
      {
        range: `${sheetName}!${columnToLetter(columnMap['Last Run Status'])}${rowIndex}`,
        values: [[statusValue]],
      },
      {
        range: `${sheetName}!${columnToLetter(columnMap['Last Run Time'])}${rowIndex}`,
        values: [[timeValue]],
      },
      {
        range: `${sheetName}!${columnToLetter(columnMap['Token Generated'])}${rowIndex}`,
        values: [[tokenValue]],
      },
      {
        range: `${sheetName}!${columnToLetter(columnMap['Last Run Message'])}${rowIndex}`,
        values: [[messageValue]],
      },
    ]

    await sheets.spreadsheets.values.batchUpdate({
      auth: auth!,
      spreadsheetId: sheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: updates,
      },
    })

    console.log(`[GoogleSheets] ✅ Updated sheet for user: ${user.name} - Status: ${statusValue}`)
    return true
  } catch (error: any) {
    console.error(`[GoogleSheets] ❌ Error updating sheet:`, error)
    return false
  }
}

// Sync from Google Sheets
export async function syncFromGoogleSheets(force: boolean = false): Promise<void> {
  try {
    // Check if Google Sheets is configured
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    const serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH

    if (!apiKey && !serviceAccountKey && !serviceAccountKeyPath) {
      console.log('[GoogleSheets] ⚠️ Google Sheets not configured. Skipping sync.')
      console.log('[GoogleSheets] 💡 Set GOOGLE_SHEETS_API_KEY or GOOGLE_SERVICE_ACCOUNT_KEY to enable sync')
      return
    }

    // Default Google Sheets URL (from app/page.tsx)
    const defaultSheetUrl = 'https://docs.google.com/spreadsheets/d/1W7i5AQ77-pklRv0BkDRkFILSkjq4bkvN5vTCQU7YrLA/edit?gid=0#gid=0'
    const defaultRange = 'Users!A:Z'

    console.log('[GoogleSheets] 🔄 Starting automatic Google Sheets sync...')
    console.log(`[GoogleSheets] Sheet URL: ${defaultSheetUrl}`)
    console.log(`[GoogleSheets] Range: ${defaultRange}`)

    const sheetId = extractSheetId(defaultSheetUrl)
    const { sheets, auth, apiKey: activeApiKey } = await getSheetsClient()

    // Fetch data from Google Sheets
    let values: string[][] = []

    if (auth) {
      const response = await sheets.spreadsheets.values.get({
        auth,
        spreadsheetId: sheetId,
        range: defaultRange,
      })
      values = (response.data.values as string[][]) || []
    } else {
      const response = await sheets.spreadsheets.values.get({
        key: activeApiKey,
        spreadsheetId: sheetId,
        range: defaultRange,
      })
      values = (response.data.values as string[][]) || []
    }

    if (values.length < 2) {
      console.log('[GoogleSheets] ⚠️ No data found in Google Sheets (need at least header + 1 row)')
      return
    }

    // Parse headers (first row)
    const headers = values[0].map(h => h?.trim().toLowerCase() || '')

    // Find column indices (case-insensitive matching)
    const nameCol = headers.findIndex(h => h.includes('name') || h.includes('user'))
    const tradetronCol = headers.findIndex(h => h.includes('tradetron') || h.includes('tt id') || h.includes('tradetron id'))
    const brokerCol = headers.findIndex(h =>
      h.includes('broker') ||
      h.includes('username') ||
      h.includes('user id') ||
      h.includes('flattrade') ||
      h.includes('flattrade id') ||
      (h.includes('id') && !h.includes('tradetron') && !h.includes('tt'))
    )
    const passwordCol = headers.findIndex(h => h.includes('password') || h.includes('pwd'))
    const dobCol = headers.findIndex(h => (h.includes('dob') || h.includes('date of birth') || h.includes('birth')) && !h.includes('totp'))
    const totpKeyCol = headers.findIndex(h =>
      (h.includes('totp key') || h.includes('totpkey')) ||
      (h.includes('totp') && !h.includes('dob') && !h.includes('secret or'))
    )
    const totpCol = headers.findIndex(h =>
      (h.includes('totp') || h.includes('otp') || h.includes('2fa') || h.includes('secret')) &&
      !h.includes('key') &&
      !h.includes('dob')
    )
    const statusCol = headers.findIndex(h => h.includes('status') || h.includes('state'))

    if (nameCol < 0 || tradetronCol < 0 || brokerCol < 0 || passwordCol < 0) {
      console.log('[GoogleSheets] ⚠️ Required columns not found in sheet')
      console.log('[GoogleSheets] Required: Name, Tradetron ID, Broker Username, Password')
      return
    }

    // Process data rows
    let created = 0
    let updated = 0
    let skipped = 0

    for (let i = 1; i < values.length; i++) {
      const row = values[i]
      if (!row || row.every(cell => !cell || !cell.trim())) continue

      const name = row[nameCol]?.trim()
      const tradetronUsername = row[tradetronCol]?.trim()
      const brokerUsername = row[brokerCol]?.trim()
      const password = row[passwordCol]?.trim()
      const dob = dobCol >= 0 ? row[dobCol]?.trim() : ''
      const totpKey = totpKeyCol >= 0 ? row[totpKeyCol]?.trim() : ''
      const totpSecret = totpCol >= 0 ? row[totpCol]?.trim() : ''
      const status = statusCol >= 0 ? row[statusCol]?.trim().toUpperCase() : ''

      if (!name || !tradetronUsername || !brokerUsername || !password) {
        skipped++
        continue
      }

      // Check if user already exists
      const existingUsers = await getUsers()
      const existingUser = existingUsers.find(
        u => u.tradetronUsername === tradetronUsername || u.name.toLowerCase() === name.toLowerCase()
      )

      // Priority: TOTP KEY > DOB > TOTP Secret (for backward compatibility)
      let totpOrDOB = ''
      let isDOB = false

      if (totpKey) {
        totpOrDOB = totpKey
        isDOB = false
      } else if (dob) {
        totpOrDOB = dob
        isDOB = dob.length === 8 && /^\d{8}$/.test(dob)
      } else if (totpSecret) {
        totpOrDOB = totpSecret
        isDOB = false
      }

      if (!totpOrDOB) {
        skipped++
        continue
      }

      // Determine active status from STATUS column
      let active = true // Default to active
      if (status) {
        if (status === 'ACTIVE') {
          active = true
        } else if (status === 'INACTIVE') {
          active = false
        }
      }

      // Check if ENCRYPTION_KEY is available before encrypting
      if (!process.env.ENCRYPTION_KEY) {
        console.error('[GoogleSheets] ❌ ENCRYPTION_KEY not set - cannot encrypt user data')
        console.error('[GoogleSheets] 💡 Please set ENCRYPTION_KEY environment variable to enable auto-sync')
        return // Exit early
      }

      if (existingUser) {
        // Update existing user
        const updatedUser: User = {
          ...existingUser,
          name, // Update name
          tradetronUsername,
          brokerUsername,
          loginUrl: `https://flattrade.tradetron.tech/auth/${tradetronUsername}`,
          encryptedPassword: encrypt(password), // Re-encrypt password
          encryptedTotpSecret: encrypt(totpOrDOB), // Re-encrypt TOTP/DOB
          isDOB,
          active,
          updatedAt: new Date().toISOString(),
        }
        await saveUser(updatedUser)
        updated++
      } else {
        // Create new user
        const newUser: User = {
          id: uuidv4(),
          name,
          tradetronUsername,
          brokerUsername,
          loginUrl: `https://flattrade.tradetron.tech/auth/${tradetronUsername}`,
          encryptedPassword: encrypt(password),
          encryptedTotpSecret: encrypt(totpOrDOB),
          isDOB,
          active,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        await saveUser(newUser)
        created++
      }
    }

    // Save Google Sheets config for future updates
    try {
      await saveGoogleSheetsConfig({
        sheetUrlOrId: defaultSheetUrl,
        range: defaultRange,
        updateEnabled: true,
      })
      console.log('[GoogleSheets] ✅ Saved Google Sheets config for auto-updates')
    } catch (error) {
      console.error('[GoogleSheets] ⚠️ Failed to save Google Sheets config:', error)
    }

    console.log(`[GoogleSheets] ✅ Sync completed! Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`)
  } catch (error: any) {
    console.error('[GoogleSheets] ❌ Sync failed:', error.message)
    console.error('[GoogleSheets] 💡 This is normal if Google Sheets is not configured or accessible')
  }
}
