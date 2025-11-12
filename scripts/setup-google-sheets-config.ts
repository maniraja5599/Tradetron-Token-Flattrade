import { saveGoogleSheetsConfig } from '@/lib/db'

// Script to manually configure Google Sheets URL for auto-updates
// Usage: tsx scripts/setup-google-sheets-config.ts

async function setup() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log('Usage: tsx scripts/setup-google-sheets-config.ts <sheet-url-or-id> [range] [updateEnabled]')
    console.log('Example: tsx scripts/setup-google-sheets-config.ts "https://docs.google.com/spreadsheets/d/1W7i5AQ77-pklRv0BkDRkFILSkjq4bkvN5vTCQU7YrLA/edit"')
    console.log('Example: tsx scripts/setup-google-sheets-config.ts "1W7i5AQ77-pklRv0BkDRkFILSkjq4bkvN5vTCQU7YrLA" "Sheet1!A:Z" true')
    process.exit(1)
  }

  const sheetUrlOrId = args[0]
  const range = args[1] || 'Sheet1!A:Z'
  const updateEnabled = args[2] !== 'false'

  try {
    await saveGoogleSheetsConfig({
      sheetUrlOrId,
      range,
      updateEnabled,
    })
    
    console.log('✅ Google Sheets config saved successfully!')
    console.log(`   Sheet URL/ID: ${sheetUrlOrId}`)
    console.log(`   Range: ${range}`)
    console.log(`   Update Enabled: ${updateEnabled}`)
    console.log('')
    console.log('🚀 Auto-updates will now work after each authentication run!')
  } catch (error: any) {
    console.error('❌ Failed to save Google Sheets config:', error.message)
    process.exit(1)
  }
}

setup()

