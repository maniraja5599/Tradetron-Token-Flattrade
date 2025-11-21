import fs from 'fs/promises'
import path from 'path'
import { startScheduler } from '@/lib/scheduler'
import { getUsers } from '@/lib/db'
import { google } from 'googleapis'
import { saveUser, saveGoogleSheetsConfig } from '@/lib/db'
import { encrypt } from '@/lib/crypto'
import { v4 as uuidv4 } from 'uuid'
import { User } from '@/types'
import { execSync } from 'child_process'

async function ensureDirectories() {
  const dirs = ['data', 'artifacts']
  for (const dir of dirs) {
    const dirPath = path.join(process.cwd(), dir)
    try {
      await fs.access(dirPath)
    } catch {
      await fs.mkdir(dirPath, { recursive: true })
      console.log(`Created directory: ${dir}`)
    }
  }
}

// Ensure Playwright browsers are installed (for Render/deployment environments)
async function ensurePlaywrightBrowsers() {
  try {
    const { chromium } = require('playwright')
    // Try to get the executable path - if it fails, browsers aren't installed
    const executablePath = chromium.executablePath()
    if (executablePath) {
      try {
        await fs.access(executablePath)
        console.log('[Init] ✅ Playwright browsers are installed')
        console.log(`[Init] Browser path: ${executablePath}`)
        return
      } catch (error) {
        // Executable path exists but file doesn't - need to install
        console.log(`[Init] ⚠️ Browser path reported as: ${executablePath}, but file not found`)
      }
    } else {
      console.log('[Init] ⚠️ chromium.executablePath() returned null/undefined')
    }
  } catch (error: any) {
    // Browsers not installed or path not found
    console.log(`[Init] ⚠️ Error checking browser path: ${error.message}`)
  }

  // Browsers not found - install them (without --with-deps since we don't have root in runtime)
  console.log('[Init] ⚠️ Playwright browsers not found - installing...')
  try {
    // Try without --with-deps first (runtime environments typically don't have root access)
    // System dependencies should be installed during build phase
    execSync('npx playwright install chromium', {
      stdio: 'inherit',
      cwd: process.cwd(),
      timeout: 120000, // 2 minute timeout
    })
    console.log('[Init] ✅ Playwright browsers installed successfully')
  } catch (error: any) {
    console.error('[Init] ⚠️ Failed to install Playwright browsers:', error.message)
    console.error('[Init] 💡 This may cause login automation to fail')
    console.error('[Init] 💡 Browsers should be installed during build phase. Check build logs.')
  }
}

// Extract Sheet ID from URL or use directly
function extractSheetId(sheetUrlOrId: string): string {
  if (/^[a-zA-Z0-9_-]+$/.test(sheetUrlOrId)) {
    return sheetUrlOrId
  }
  const match = sheetUrlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (match) {
    return match[1]
  }
  throw new Error('Invalid Google Sheets URL or ID')
}

// Auto-sync from Google Sheets on first run
async function autoSyncFromGoogleSheets() {
  try {
    // Check if Google Sheets is configured
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    const serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH

    if (!apiKey && !serviceAccountKey && !serviceAccountKeyPath) {
      console.log('[Init] ⚠️ Google Sheets not configured. Skipping auto-sync.')
      console.log('[Init] 💡 Set GOOGLE_SHEETS_API_KEY or GOOGLE_SERVICE_ACCOUNT_KEY to enable auto-sync')
      return
    }

    // Default Google Sheets URL (from app/page.tsx)
    const defaultSheetUrl = 'https://docs.google.com/spreadsheets/d/1W7i5AQ77-pklRv0BkDRkFILSkjq4bkvN5vTCQU7YrLA/edit?gid=0#gid=0'
    const defaultRange = 'Users!A:Z'

    console.log('[Init] 🔄 Starting automatic Google Sheets sync on first run...')
    console.log(`[Init] Sheet URL: ${defaultSheetUrl}`)
    console.log(`[Init] Range: ${defaultRange}`)

    const sheetId = extractSheetId(defaultSheetUrl)
    const sheets = google.sheets({ version: 'v4' })

    // Fetch data from Google Sheets
    let values: string[][] = []
    
    if (serviceAccountKey || serviceAccountKeyPath) {
      // Use service account
      let credentials: any
      if (serviceAccountKeyPath) {
        const keyPath = path.isAbsolute(serviceAccountKeyPath)
          ? serviceAccountKeyPath
          : path.join(process.cwd(), serviceAccountKeyPath)
        const keyContent = await fs.readFile(keyPath, 'utf-8')
        credentials = JSON.parse(keyContent)
      } else if (serviceAccountKey) {
        // TypeScript guard: serviceAccountKey is definitely defined here
        try {
          credentials = JSON.parse(serviceAccountKey)
        } catch {
          const keyToParse = Buffer.from(serviceAccountKey, 'base64').toString('utf-8')
          credentials = JSON.parse(keyToParse)
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
        range: defaultRange,
      })
      
      values = (response.data.values as string[][]) || []
    } else {
      // Use API key
      const response = await sheets.spreadsheets.values.get({
        key: apiKey,
        spreadsheetId: sheetId,
        range: defaultRange,
      })
      
      values = (response.data.values as string[][]) || []
    }

    if (values.length < 2) {
      console.log('[Init] ⚠️ No data found in Google Sheets (need at least header + 1 row)')
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
      console.log('[Init] ⚠️ Required columns not found in sheet')
      console.log('[Init] Required: Name, Tradetron ID, Broker Username, Password')
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

      if (existingUser) {
        updated++
        // Update existing user (optional - you can skip this if you want)
        continue
      }

      // Priority: TOTP KEY > DOB > TOTP Secret (for backward compatibility)
      // If both TOTP KEY and DOB are filled, use TOTP KEY
      let totpOrDOB = ''
      let isDOB = false
      
      if (totpKey) {
        // TOTP KEY is present - use it (not DOB)
        totpOrDOB = totpKey
        isDOB = false
      } else if (dob) {
        // Only DOB is present - use it
        totpOrDOB = dob
        isDOB = dob.length === 8 && /^\d{8}$/.test(dob)
      } else if (totpSecret) {
        // Fallback to old TOTP Secret column (for backward compatibility)
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
        console.error('[Init] ❌ ENCRYPTION_KEY not set - cannot encrypt user data')
        console.error('[Init] 💡 Please set ENCRYPTION_KEY environment variable to enable auto-sync')
        return // Exit early if encryption key is not available
      }

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

    // Save Google Sheets config for future updates
    try {
      await saveGoogleSheetsConfig({
        sheetUrlOrId: defaultSheetUrl,
        range: defaultRange,
        updateEnabled: true,
      })
      console.log('[Init] ✅ Saved Google Sheets config for auto-updates')
    } catch (error) {
      console.error('[Init] ⚠️ Failed to save Google Sheets config:', error)
    }

    console.log(`[Init] ✅ Auto-sync completed! Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`)
  } catch (error: any) {
    console.error('[Init] ❌ Auto-sync failed:', error.message)
    console.error('[Init] 💡 This is normal if Google Sheets is not configured or accessible')
  }
}

export async function initializeApp() {
  try {
    await ensureDirectories()
    
    // Ensure Playwright browsers are installed (with timeout to prevent blocking too long)
    try {
      await Promise.race([
        ensurePlaywrightBrowsers(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Browser installation timeout')), 120000) // 2 min timeout
        )
      ])
    } catch (error: any) {
      if (error.message === 'Browser installation timeout') {
        console.error('[Init] ⚠️ Browser installation timed out - continuing anyway')
        console.error('[Init] 💡 Browsers may install in background, but login jobs may fail initially')
      } else {
        console.error('[Init] ⚠️ Playwright browser check failed:', error.message)
      }
    }
    
    // Check if this is first run (no users exist)
    const users = await getUsers()
    if (users.length === 0) {
      console.log('[Init] 🚀 First run detected - no users found')
      console.log('[Init] 🔄 Attempting automatic sync from Google Sheets...')
      // Run auto-sync in background (non-blocking) to prevent server startup delays
      autoSyncFromGoogleSheets().catch((error) => {
        console.error('[Init] ⚠️ Auto-sync failed (non-critical):', error.message)
      })
    } else {
      console.log(`[Init] ✅ Found ${users.length} existing user(s) - skipping auto-sync`)
    }
    
    await startScheduler()
    console.log('[Init] ✅ Application initialized successfully')
  } catch (error: any) {
    console.error('[Init] ❌ Critical error during initialization:', error)
    console.error('[Init] Stack:', error.stack)
    // Don't throw - allow server to start even if init fails
    // The app can still work without auto-sync
  }
}

