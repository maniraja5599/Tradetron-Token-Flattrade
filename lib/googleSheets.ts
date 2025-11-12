import { google } from 'googleapis'
import { RunLog } from '@/types'
import { getUserById } from './db'
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

  if (!apiKey && !serviceAccountKey && !serviceAccountKeyPath) {
    throw new Error('Either GOOGLE_SHEETS_API_KEY, GOOGLE_SERVICE_ACCOUNT_KEY, or GOOGLE_SERVICE_ACCOUNT_KEY_PATH must be set')
  }

  const sheets = google.sheets({ version: 'v4' })

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
    
    const auth = new google.auth.JWT(
      credentials.client_email,
      undefined,
      credentials.private_key,
      ['https://www.googleapis.com/auth/spreadsheets'] // Full write access
    )
    
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
