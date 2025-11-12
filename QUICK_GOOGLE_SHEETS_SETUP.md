# Quick Google Sheets API Setup Guide

Since your Google Sheet is **publicly accessible**, you can use a simple API key to sync users.

## Step 1: Get Google Sheets API Key

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/

2. **Create or Select a Project:**
   - Click the project dropdown at the top
   - Click "New Project" or select an existing one
   - Give it a name (e.g., "TradeTron Sheets")

3. **Enable Google Sheets API:**
   - Go to "APIs & Services" → "Library"
   - Search for "Google Sheets API"
   - Click on it and click "Enable"

4. **Create API Key:**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the API key (it will look like: `AIzaSyD...`)
   
   **Optional but Recommended:** Restrict the API key:
   - Click "Restrict Key"
   - Under "API restrictions", select "Restrict key"
   - Check "Google Sheets API"
   - Click "Save"

## Step 2: Add API Key to Your Project

1. **Create `.env.local` file:**
   - In your project root directory, create a file named `.env.local`
   - Copy the content from `.env.local.example` (if it exists) or create a new one

2. **Add your API key:**
   ```env
   ENCRYPTION_KEY=your_secret_encryption_key_min_32_chars_long_change_this
   GOOGLE_SHEETS_API_KEY=AIzaSyD...your_api_key_here
   ```

3. **If you don't have ENCRYPTION_KEY set:**
   - Generate one using: `openssl rand -base64 32`
   - Or use any random string that's at least 32 characters long
   - **Important:** Keep this key secret and never commit it to git

## Step 3: Restart Your Development Server

1. **Stop the current server:**
   - Press `Ctrl+C` in the terminal where `npm run dev` is running
   - Or close the terminal

2. **Start the server again:**
   ```bash
   npm run dev
   ```

## Step 4: Sync Your Google Sheet

1. **Open your app:**
   - Go to http://localhost:3000

2. **Click "Sync from Google Sheets"**

3. **Paste your sheet URL:**
   - URL: `https://docs.google.com/spreadsheets/d/1W7i5AQ77-pklRv0BkDRkFILSkjq4bkvN5vTCQU7YrLA/edit?usp=sharing`
   - Or just the Sheet ID: `1W7i5AQ77-pklRv0BkDRkFILSkjq4bkvN5vTCQU7YrLA`

4. **Sheet Range (optional):**
   - Default: `Sheet1!A:Z` (should work for your sheet)

5. **Click "Sync Now"**

6. **You should see:**
   - "Sync completed!" message
   - Number of users created/updated
   - All 5 users (SHANU, SACHIN, RISHU, REEBOK, UMA) should be imported

## Troubleshooting

### Error: "ENCRYPTION_KEY environment variable is required"
- Make sure you have `ENCRYPTION_KEY` in your `.env.local` file
- The key must be at least 32 characters long
- Restart the server after adding it

### Error: "Failed to fetch sheet data"
- Verify your API key is correct
- Make sure Google Sheets API is enabled in your Google Cloud project
- Check that the sheet is still publicly accessible
- Verify the Sheet ID is correct

### Error: "No data found in the sheet"
- Check that the sheet range is correct (default: `Sheet1!A:Z`)
- Verify your sheet has data in the first sheet tab
- Make sure the sheet name matches (if your sheet tab has a different name, use that name in the range)

### Users not syncing
- Check the sync results message for specific errors
- Verify all required columns are present: NAME, TRADETRON ID, FLATTRADE ID, PASSWORD, DOB
- Make sure there are no empty rows between the header and data

## Your Sheet Format

Your sheet should look like this:

| NAME   | TRADETRON ID | FLATTRADE ID | PASSWORD      | DOB      |
|--------|-------------|--------------|---------------|----------|
| SHANU  | 1967985     | FZ07651      | Shanu@123     | 01061963 |
| SACHIN | 2324009     | FT033489     | Sachin$25Q2   | 02121955 |
| RISHU  | 2338285     | FT040036     | Rishu$25Q2    | 10041992 |
| REEBOK | 2284661     | FCNI029      | Reebok$1234   | 11171992 |
| UMA    | 2283813     | FZ17611      | Umadevi@2026  | 11111997 |

The system will automatically:
- Detect the DOB column
- Create login URLs from TRADETRON ID
- Encrypt passwords and DOB
- Set all users as active by default

## Security Notes

- **Never commit `.env.local` to git** (it should be in `.gitignore`)
- Keep your API key secure
- Consider restricting your API key to only Google Sheets API
- The encryption key should be unique and kept secret

