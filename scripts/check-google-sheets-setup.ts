import { getGoogleSheetsConfig } from '@/lib/db'

// Script to check Google Sheets setup for auto-updates
// Usage: tsx scripts/check-google-sheets-setup.ts

async function checkSetup() {
  console.log('🔍 Checking Google Sheets Auto-Update Setup...\n')

  // Check 1: Google Sheets Config
  console.log('1️⃣ Checking Google Sheets Config...')
  try {
    const config = await getGoogleSheetsConfig()
    if (!config.sheetUrlOrId) {
      console.log('   ❌ Google Sheets URL not configured')
      console.log('   💡 Solution: Sync from Google Sheets or set GOOGLE_SHEETS_URL in .env.local')
    } else {
      console.log(`   ✅ Google Sheets URL: ${config.sheetUrlOrId}`)
      console.log(`   ✅ Range: ${config.range}`)
      console.log(`   ✅ Update Enabled: ${config.updateEnabled}`)
    }
  } catch (error: any) {
    console.log(`   ❌ Error reading config: ${error.message}`)
  }

  // Check 2: Authentication Method
  console.log('\n2️⃣ Checking Authentication Method...')
  try {
    // We need to check if service account is configured
    const hasServiceAccount = !!(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH)
    const hasApiKey = !!process.env.GOOGLE_SHEETS_API_KEY

    if (hasServiceAccount) {
      console.log('   ✅ Service Account configured')
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH) {
        console.log(`   📁 Using service account key file: ${process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH}`)
      } else {
        console.log('   📝 Using service account key from environment variable')
      }
      console.log('   ✅ Write access available - Auto-updates will work!')
    } else if (hasApiKey) {
      console.log('   ⚠️  Only API Key configured (read-only)')
      console.log('   ❌ API Keys cannot write to Google Sheets')
      console.log('   💡 Solution: Set up a service account for write access')
      console.log('   💡 See: GOOGLE_SHEETS_UPDATE_SETUP.md for setup instructions')
    } else {
      console.log('   ❌ No authentication method configured')
      console.log('   💡 Solution: Set up service account or API key')
    }
  } catch (error: any) {
    console.log(`   ❌ Error checking authentication: ${error.message}`)
  }

  console.log('\n📝 Summary:')
  console.log('   - If all checks pass ✅, auto-updates should work after each run')
  console.log('   - If any check fails ❌, see GOOGLE_SHEETS_UPDATE_SETUP.md for setup instructions')
  console.log('   - After fixing issues, restart the server and run a test authentication')
  console.log('')
  console.log('🔧 Next Steps:')
  console.log('   1. If Google Sheets URL is missing: Sync from Google Sheets in the dashboard')
  console.log('   2. If only API Key is configured: Set up a service account (see GOOGLE_SHEETS_UPDATE_SETUP.md)')
  console.log('   3. After setup: Restart the server and run "Run All Now" to test')
}

checkSetup().catch(console.error)
