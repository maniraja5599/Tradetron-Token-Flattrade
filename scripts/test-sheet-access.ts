import { google } from 'googleapis'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const apiKey = process.env.GOOGLE_SHEETS_API_KEY
console.log('--- DEBUG INFO ---')
console.log('Current Directory:', process.cwd())
console.log('API Key from env:', apiKey ? `${apiKey.substring(0, 5)}...` : 'undefined')

// Fallback to hardcoded key for testing if env var fails (TEMPORARY)
const effectiveApiKey = apiKey
console.log('Effective API Key:', effectiveApiKey ? `${effectiveApiKey.substring(0, 5)}...` : 'undefined')
console.log('--- END DEBUG ---')

if (!effectiveApiKey) {
    console.error('Error: GOOGLE_SHEETS_API_KEY is missing in .env.local')
    process.exit(1)
}

async function testSheetAccess() {
    const sheets = google.sheets({ version: 'v4' })

    // Example public sheet (US Population data)
    const sheetId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'

    console.log(`Testing access to public sheet: ${sheetId}`)

    try {
        const response = await sheets.spreadsheets.values.get({
            key: effectiveApiKey,
            spreadsheetId: sheetId,
            range: 'Class Data!A1:E5',
        })

        console.log('Success! Data fetched:')
        console.log(response.data.values)
    } catch (error: any) {
        console.error('Error fetching sheet:', error.message)
        if (error.response) {
            console.error('Status:', error.response.status)
            console.error('Status Text:', error.response.statusText)
        }
    }
}

testSheetAccess()
