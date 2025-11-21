import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getUsers, saveUser, saveGoogleSheetsConfig } from '@/lib/db'
import { encrypt } from '@/lib/crypto'
import { v4 as uuidv4 } from 'uuid'
import { User } from '@/types'
import fs from 'fs/promises'
import path from 'path'

// Extract Sheet ID from URL or use directly
function extractSheetId(sheetUrlOrId: string): string {
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

// Fetch data from Google Sheets
async function fetchSheetData(sheetId: string, range: string = 'Sheet1!A:Z'): Promise<string[][]> {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  const serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH

  if (!apiKey && !serviceAccountKey && !serviceAccountKeyPath) {
    throw new Error('Either GOOGLE_SHEETS_API_KEY, GOOGLE_SERVICE_ACCOUNT_KEY, or GOOGLE_SERVICE_ACCOUNT_KEY_PATH must be set in environment variables')
  }

  const sheets = google.sheets({ version: 'v4' })

  if (serviceAccountKey || serviceAccountKeyPath) {
    // Use service account authentication (for private sheets)
    try {
      let credentials: any
      
      // Check if it's a file path (prioritize file path over env var)
      if (serviceAccountKeyPath) {
        // Read from file
        const keyPath = path.isAbsolute(serviceAccountKeyPath)
          ? serviceAccountKeyPath
          : path.join(process.cwd(), serviceAccountKeyPath)
        const keyContent = await fs.readFile(keyPath, 'utf-8')
        credentials = JSON.parse(keyContent)
      } else if (serviceAccountKey) {
        // Parse from environment variable
        // Handle both regular JSON and base64 encoded JSON
        let keyToParse = serviceAccountKey
        try {
          // Try parsing as-is first
          credentials = JSON.parse(keyToParse)
        } catch {
          // If that fails, try base64 decoding
          try {
            keyToParse = Buffer.from(serviceAccountKey, 'base64').toString('utf-8')
            credentials = JSON.parse(keyToParse)
          } catch {
            throw new Error('Invalid service account key format. Must be valid JSON or base64-encoded JSON.')
          }
        }
      }
      
      const auth = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      })
      
      const response = await sheets.spreadsheets.values.get({
        auth,
        spreadsheetId: sheetId,
        range,
      })
      
      return (response.data.values as string[][]) || []
    } catch (error: any) {
      throw new Error(`Service account authentication failed: ${error.message}`)
    }
  } else {
    // Use API key (for public sheets)
    try {
      const response = await sheets.spreadsheets.values.get({
        key: apiKey,
        spreadsheetId: sheetId,
        range,
      })
      
      return (response.data.values as string[][]) || []
    } catch (error: any) {
      throw new Error(`Failed to fetch sheet data: ${error.message}`)
    }
  }
}

// Map sheet row to user object
// Expected columns (configurable via env or default):
// Name, TradetronUsername, BrokerUsername, Password, TOTPSecretOrDOB, IsDOB (optional), Active (optional)
function mapRowToUser(row: string[], headers: string[]): Partial<User> | null | { error: string } {
  // Create a map of header names to indices (case-insensitive)
  const headerMap: { [key: string]: number } = {}
  headers.forEach((header, index) => {
    const normalized = header.trim().toLowerCase()
    headerMap[normalized] = index
  })

  // Get column indices with fallbacks (prioritizing common variations)
  const getName = () => {
    const nameIdx = headerMap['name'] ?? headerMap['username'] ?? headerMap['user name'] ?? 0
    return row[nameIdx]?.trim()
  }

  const getTradetronUsername = () => {
    // Prioritize "TRADETRON ID" format, then other variations
    const idx = headerMap['tradetron id'] ?? headerMap['tradetronid'] ?? headerMap['tradetron username'] ?? headerMap['tradetronusername'] ?? headerMap['tradetron'] ?? headerMap['tt username'] ?? headerMap['tt id'] ?? 1
    return row[idx]?.trim()
  }

  const getBrokerUsername = () => {
    // Prioritize "FLATTRADE ID" format, then other variations
    const idx = headerMap['flattrade id'] ?? headerMap['flattradeid'] ?? headerMap['broker username'] ?? headerMap['brokerusername'] ?? headerMap['broker'] ?? headerMap['broker id'] ?? 2
    return row[idx]?.trim()
  }

  const getPassword = () => {
    const idx = headerMap['password'] ?? headerMap['pwd'] ?? headerMap['pass'] ?? 3
    return row[idx]?.trim()
  }

  const getTOTPKey = () => {
    // Prioritize "TOTP KEY" column, then other TOTP variations
    const idx = headerMap['totp key'] ?? headerMap['totpkey'] ?? headerMap['totp'] ?? headerMap['totp secret'] ?? headerMap['totpsecret'] ?? headerMap['2fa'] ?? headerMap['otp'] ?? headerMap['otp key']
    return idx !== undefined ? row[idx]?.trim() : ''
  }

  const getDOB = () => {
    // Get DOB column
    const idx = headerMap['dob'] ?? headerMap['date of birth'] ?? headerMap['birth'] ?? headerMap['birthdate']
    return idx !== undefined ? row[idx]?.trim() : ''
  }

  const getTOTPSecretOrDOB = () => {
    // Get TOTP KEY first
    const totpKey = getTOTPKey()
    // Get DOB
    const dob = getDOB()
    
    // Priority: TOTP KEY > DOB
    // If both are filled, use TOTP KEY
    if (totpKey) {
      return totpKey
    }
    // If only DOB is filled, use DOB
    if (dob) {
      return dob
    }
    
    // Fallback to old column names for backward compatibility
    const idx = headerMap['totpsecretordob'] ?? headerMap['totp secret or dob'] ?? headerMap['totp/dob'] ?? 4
    return row[idx]?.trim() || ''
  }

  const getIsDOB = () => {
    // Check if IsDOB column exists and has a value
    const idx = headerMap['isdob'] ?? headerMap['is dob'] ?? headerMap['dob flag']
    if (idx !== undefined && row[idx]) {
      const value = row[idx].trim().toLowerCase()
      return value === 'true' || value === '1' || value === 'yes' || value === 'y'
    }
    
    // Get TOTP KEY and DOB values
    const totpKey = getTOTPKey()
    const dob = getDOB()
    
    // If both are filled, prioritize TOTP KEY (isDOB = false)
    if (totpKey && dob) {
      return false // Use TOTP KEY when both are present
    }
    
    // If only TOTP KEY is filled, it's not DOB
    if (totpKey) {
      return false
    }
    
    // If only DOB is filled, it's DOB
    if (dob) {
      return true
    }
    
    // Fallback: check if the value looks like DOB (8 digits)
    const totpSecretOrDOB = getTOTPSecretOrDOB()
    return totpSecretOrDOB ? /^\d{8}$/.test(totpSecretOrDOB) : false
  }

  const getActive = () => {
    // Check STATUS column first (ACTIVE/INACTIVE)
    const statusIdx = headerMap['status'] ?? headerMap['state']
    if (statusIdx !== undefined && row[statusIdx]) {
      const statusValue = row[statusIdx].trim().toUpperCase()
      if (statusValue === 'ACTIVE') {
        return true
      }
      if (statusValue === 'INACTIVE') {
        return false
      }
    }
    
    // Fallback to ACTIVE/ENABLED columns
    const idx = headerMap['active'] ?? headerMap['enabled']
    if (idx !== undefined && row[idx]) {
      const value = row[idx].trim().toLowerCase()
      return value === 'true' || value === '1' || value === 'yes' || value === 'y' || value === 'active' || value === ''
    }
    return true // Default to active
  }

  const name = getName()
  const tradetronUsername = getTradetronUsername()
  const brokerUsername = getBrokerUsername()
  const password = getPassword()
  const totpSecretOrDOB = getTOTPSecretOrDOB()

  // Validate required fields and return error details
  const missingFields: string[] = []
  if (!name) missingFields.push('NAME')
  if (!tradetronUsername) missingFields.push('TRADETRON ID')
  if (!brokerUsername) missingFields.push('FLATTRADE ID')
  if (!password) missingFields.push('PASSWORD')
  if (!totpSecretOrDOB) missingFields.push('DOB/TOTP')
  
  if (missingFields.length > 0) {
    // Return error details instead of null
    return { error: `Missing required fields: ${missingFields.join(', ')}` }
  }

  const isDOB = getIsDOB()
  const active = getActive()
  const loginUrl = `https://flattrade.tradetron.tech/auth/${tradetronUsername}`

  return {
    name,
    tradetronUsername,
    brokerUsername,
    encryptedPassword: encrypt(password),
    encryptedTotpSecret: encrypt(totpSecretOrDOB),
    isDOB,
    loginUrl,
    active,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sheetUrlOrId, range, updateExisting } = body

    if (!sheetUrlOrId) {
      return NextResponse.json(
        { error: 'Sheet URL or ID is required' },
        { status: 400 }
      )
    }

    // Extract sheet ID from URL
    const sheetId = extractSheetId(sheetUrlOrId)
    const sheetRange = range || process.env.GOOGLE_SHEETS_RANGE || 'Sheet1!A:Z'

    // Fetch data from Google Sheets
    const rows = await fetchSheetData(sheetId, sheetRange)
    
    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No data found in the sheet' },
        { status: 400 }
      )
    }

    // First row is headers
    const headers = rows[0]
    const dataRows = rows.slice(1)

    // Get existing users to check for updates
    const existingUsers = await getUsers()
    const existingUsersMap = new Map<string, User>()
    existingUsers.forEach(user => {
      // Use tradetronUsername as key for matching
      existingUsersMap.set(user.tradetronUsername.toLowerCase(), user)
    })

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    }

    // Process each row
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      try {
        // Skip empty rows
        if (!row || row.every(cell => !cell || !cell.trim())) {
          continue
        }

        const userData = mapRowToUser(row, headers)
        if (!userData) {
          results.skipped++
          results.errors.push(`Row ${i + 2}: Missing required fields`)
          continue
        }
        
        // Check if userData has an error property (from validation)
        if ('error' in userData) {
          results.skipped++
          results.errors.push(`Row ${i + 2}: ${userData.error}`)
          continue
        }

        // At this point, userData is guaranteed to be Partial<User>
        const validUserData = userData as Partial<User>
        
        // Check if user already exists
        const existingUser = existingUsersMap.get(validUserData.tradetronUsername!.toLowerCase())
        
        if (existingUser) {
          // Update existing user if updateExisting is true
          if (updateExisting !== false) {
            const updatedUser: User = {
              ...existingUser,
              ...validUserData,
              updatedAt: new Date().toISOString(),
            }
            await saveUser(updatedUser)
            results.updated++
          } else {
            results.skipped++
          }
        } else {
          // Create new user
          const newUser: User = {
            id: uuidv4(),
            ...validUserData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as User
          await saveUser(newUser)
          results.created++
        }
      } catch (error: any) {
        results.skipped++
        results.errors.push(`Row ${i + 2}: ${error.message}`)
      }
    }

    // Save Google Sheets config for future updates
    if (sheetUrlOrId) {
      try {
        await saveGoogleSheetsConfig({
          sheetUrlOrId,
          range: sheetRange,
          updateEnabled: true,
        })
        console.log(`[Sync] ✅ Saved Google Sheets config: ${sheetUrlOrId}`)
      } catch (error: any) {
        console.error(`[Sync] ⚠️ Failed to save Google Sheets config:`, error)
        // Don't fail the sync if config save fails
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sync completed: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped`,
      results,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to sync from Google Sheets' },
      { status: 500 }
    )
  }
}

// GET endpoint to test connection
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sheetUrlOrId = searchParams.get('sheetUrlOrId')
    const range = searchParams.get('range') || process.env.GOOGLE_SHEETS_RANGE || 'Sheet1!A:Z'

    if (!sheetUrlOrId) {
      return NextResponse.json(
        { error: 'Sheet URL or ID is required as query parameter' },
        { status: 400 }
      )
    }

    const sheetId = extractSheetId(sheetUrlOrId)
    const rows = await fetchSheetData(sheetId, range)

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Sheet is accessible but contains no data',
        headers: [],
        rowCount: 0,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Sheet is accessible',
      headers: rows[0],
      rowCount: rows.length - 1,
      preview: rows.slice(0, 3), // First 3 rows as preview
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to access Google Sheets' },
      { status: 500 }
    )
  }
}

