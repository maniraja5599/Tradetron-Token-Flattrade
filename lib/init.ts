import fs from 'fs/promises'
import path from 'path'
import { startScheduler } from '@/lib/scheduler'
import { getUsers } from '@/lib/db'
import { google } from 'googleapis'
import { saveUser, saveGoogleSheetsConfig } from '@/lib/db'
import { encrypt } from '@/lib/crypto'
import { syncFromGoogleSheets } from '@/lib/googleSheets'
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
    console.log('[Init] Running: npx playwright install chromium')
    execSync('npx playwright install chromium', {
      stdio: 'inherit',
      cwd: process.cwd(),
      timeout: 180000, // 3 minute timeout (browser download can take time)
      env: {
        ...process.env,
        // Ensure Playwright doesn't skip browser download
        PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: undefined,
      }
    })
    console.log('[Init] ✅ Playwright browsers installed successfully')

    // Verify installation after install
    try {
      const { chromium } = require('playwright')
      const newExecutablePath = chromium.executablePath()
      if (newExecutablePath) {
        await fs.access(newExecutablePath)
        console.log(`[Init] ✅ Verified browser at: ${newExecutablePath}`)
      }
    } catch (verifyError) {
      console.warn(`[Init] ⚠️ Browser installed but verification failed:`, verifyError)
    }
  } catch (error: any) {
    console.error('[Init] ❌ Failed to install Playwright browsers:', error.message)
    console.error('[Init] 💡 This will cause login automation to fail')
    console.error('[Init] 💡 Check Railway build logs to ensure browsers are installed during build')
    console.error('[Init] 💡 Build command should include: npm run playwright:install chromium')
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
      // Run auto-sync in background (non-blocking) to prevent server startup delays
      syncFromGoogleSheets().catch((error) => {
        console.error('[Init] ⚠️ Auto-sync failed (non-critical):', error.message)
      })
    } else {
      console.log(`[Init] ✅ Found ${users.length} existing user(s) - skipping auto-sync`)
    }

    // Delay scheduler start to allow server to stabilize and bind port
    setTimeout(async () => {
      await startScheduler()
      console.log('[Init] ✅ Scheduler started (delayed)')
    }, 10000)
    console.log('[Init] ✅ Application initialized successfully')
  } catch (error: any) {
    console.error('[Init] ❌ Critical error during initialization:', error)
    console.error('[Init] Stack:', error.stack)
    // Don't throw - allow server to start even if init fails
    // The app can still work without auto-sync
  }
}

