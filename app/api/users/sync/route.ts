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
function mapRowToUser(row: string[], headers: string[]): Partial<User> | null {
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

  const getTOTPSecretOrDOB = () => {
    // Prioritize "DOB" column, then other variations
    const idx = headerMap['dob'] ?? headerMap['totpsecretordob'] ?? headerMap['totp secret or dob'] ?? headerMap['totp'] ?? headerMap['totp/dob'] ?? headerMap['date of birth'] ?? 4
    return row[idx]?.trim()
  }

  const getIsDOB = () => {
    // Check if IsDOB column exists and has a value
    const idx = headerMap['isdob'] ?? headerMap['is dob'] ?? headerMap['dob flag']
    if (idx !== undefined && row[idx]) {
      const value = row[idx].trim().toLowerCase()
      return value === 'true' || value === '1' || value === 'yes' || value === 'y'
    }
    
    // Auto-detect: if the column name is "DOB" or contains "DOB", it's definitely DOB
    // Check headerMap keys for DOB-related column names
    const hasDOBColumn = Object.keys(headerMap).some(key => {
      return key === 'dob' || key.includes('dob') || key === 'date of birth'
    })
    
    if (hasDOBColumn) {
      return true // If there's a DOB column, it's definitely DOB
    }
    
    // Fallback: if TOTPSecretOrDOB is 8 digits, it's likely DOB (MMDDYYYY or DDMMYYYY)
    const totpSecretOrDOB = getTOTPSecretOrDOB()
    return totpSecretOrDOB ? /^\d{8}$/.test(totpSecretOrDOB) : false
  }

  const getActive = () => {
    const idx = headerMap['active'] ?? headerMap['enabled'] ?? 6
    if (idx !== undefined && row[idx]) {
      const value = row[idx].trim().toLowerCase()
      return value === 'true' || value === '1' || value === 'yes' || value === 'y' || value === ''
    }
    return true // Default to active
  }

  const name = getName()
  const tradetronUsername = getTradetronUsername()
  const brokerUsername = getBrokerUsername()
  const password = getPassword()
  const totpSecretOrDOB = getTOTPSecretOrDOB()

  // Validate required fields
  if (!name || !tradetronUsername || !brokerUsername || !password || !totpSecretOrDOB) {
    return null // Skip invalid rows
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

        // Check if user already exists
        const existingUser = existingUsersMap.get(userData.tradetronUsername!.toLowerCase())
        
        if (existingUser) {
          // Update existing user if updateExisting is true
          if (updateExisting !== false) {
            const updatedUser: User = {
              ...existingUser,
              ...userData,
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
            ...userData,
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

