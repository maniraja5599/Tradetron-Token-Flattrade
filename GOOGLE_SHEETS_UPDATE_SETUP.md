# Google Sheets Auto-Update Setup Guide

This guide will help you set up automatic updates to your Google Sheet after each authentication run.

## ⚠️ Important Requirements

**Auto-updates require Service Account authentication (NOT API Key)**

- ❌ **API Keys are READ-ONLY** - They cannot write to Google Sheets
- ✅ **Service Accounts have WRITE ACCESS** - Required for auto-updates

## Step 1: Set Up Service Account (If Not Already Done)

If you're currently using an API key, you need to set up a service account:

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Create or select a project**
3. **Enable Google Sheets API**
4. **Create Service Account:**
   - Go to "IAM & Admin" → "Service Accounts"
   - Click "Create Service Account"
   - Give it a name (e.g., "tradetron-sheets-updater")
   - Click "Create and Continue"
   - Skip role assignment, click "Done"

5. **Create and Download Key:**
   - Click on the service account
   - Go to "Keys" tab
   - Click "Add Key" → "Create new key"
   - Choose "JSON" format
   - Download the JSON file

6. **Share Sheet with Service Account:**
   - Open your Google Sheet
   - Click "Share" button
   - Add the service account email (from the JSON file, `client_email` field)
   - **IMPORTANT: Give it "Editor" permission** (not "Viewer")
   - Click "Send"

7. **Add Service Account to Environment:**
   
   **Option A: File Path (Recommended for local development)**
   ```env
   GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./keys/service-account-key.json
   ```
   
   **Option B: Environment Variable (JSON string)**
   ```env
   GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
   ```
   
   **Option C: Base64 Encoded (Recommended for Render/Cloud deployments)**
   
   This is the safest way to store service account credentials in cloud platforms like Render:
   
   1. Encode your service account JSON file to base64:
      ```bash
      # Linux/Mac
      cat service-account-key.json | base64 -w0
      
      # Windows PowerShell
      [Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account-key.json"))
      ```
   
   2. Add the base64 string as an environment variable in Render:
      - Key: `GSA_JSON_B64`
      - Value: (paste the base64 string)
   
   3. The app will automatically decode it and set up `GOOGLE_APPLICATION_CREDENTIALS` at startup.
   
   **Why use base64?** It avoids issues with special characters, newlines, and JSON escaping that can occur when storing JSON directly in environment variables.

## Step 2: Configure Google Sheets URL

After syncing from Google Sheets, the URL should be saved automatically. If not, you can configure it manually:

### Option A: Sync from Google Sheets (Recommended)

1. Go to the dashboard
2. Click "Sync from Google Sheets"
3. Paste your Google Sheets URL or Sheet ID
4. Click "Sync Now"
5. The sheet URL will be saved automatically

### Option B: Manual Configuration

You can manually set the Google Sheets URL using the API:

```bash
# Using curl
curl -X POST http://localhost:3000/api/google-sheets/config \
  -H "Content-Type: application/json" \
  -d '{
    "sheetUrlOrId": "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit",
    "range": "Sheet1!A:Z",
    "updateEnabled": true
  }'
```

Or use the script:

```bash
npm run setup:google-sheets "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"
```

### Option C: Environment Variable

Add to `.env.local`:

```env
GOOGLE_SHEETS_URL=https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit
GOOGLE_SHEETS_RANGE=Sheet1!A:Z
GOOGLE_SHEETS_UPDATE_ENABLED=true
```

## Step 3: Verify Configuration

Check if the configuration is saved:

```bash
# Check config.json
cat data/config.json
```

You should see:

```json
{
  "hour": 8,
  "minute": 31,
  "timezone": "Asia/Kolkata",
  "googleSheets": {
    "sheetUrlOrId": "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit",
    "range": "Sheet1!A:Z",
    "updateEnabled": true
  }
}
```

## Step 4: Test Auto-Update

1. Run a test authentication:
   - Click "Run" next to any user
   - Or click "Run All Now"

2. Check the console logs for:
   - `[Job] 📝 Attempting to update Google Sheet for user: ...`
   - `[GoogleSheets] ✅ Write access confirmed (service account)`
   - `[GoogleSheets] ✅ Found user at row: X`
   - `[GoogleSheets] ✅ Updated sheet for user: ...`

3. Check your Google Sheet:
   - The columns "Last Run Status", "Last Run Time", "Token Generated", and "Last Run Message" should be added automatically
   - The user's row should be updated with the run results

## Troubleshooting

### Error: "Write access required. Service account authentication needed for updates"

**Problem:** You're using an API key instead of a service account.

**Solution:** 
- Set up a service account (see Step 1)
- Add `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` or `GOOGLE_SERVICE_ACCOUNT_KEY` to `.env.local`
- Make sure the service account has "Editor" permission on the sheet

### Error: "Could not find row for user"

**Problem:** The user's NAME or TRADETRON ID doesn't match the sheet.

**Solution:**
- Verify the user's NAME in the app matches the NAME in the sheet (case-insensitive)
- Verify the user's TRADETRON ID in the app matches the TRADETRON ID in the sheet
- Make sure the user exists in the sheet

### Error: "Google Sheets URL not configured"

**Problem:** The sheet URL wasn't saved during sync.

**Solution:**
- Sync from Google Sheets again, OR
- Manually configure the URL using Option B or C above

### Updates Not Happening

**Check:**
1. Is service account configured? (Check `.env.local`)
2. Does service account have "Editor" permission on the sheet?
3. Is the sheet URL saved in `data/config.json`?
4. Check console logs for error messages
5. Restart the server after changing environment variables

## What Gets Updated

After each authentication run, the following columns are updated:

- **Last Run Status**: "Success" or "Failed"
- **Last Run Time**: Timestamp (IST timezone)
- **Token Generated**: "Yes" or "No"
- **Last Run Message**: Success message or failure reason

These columns are created automatically if they don't exist.

## Security Notes

- Never commit service account keys to version control
- Store keys securely (use file path method if possible)
- Use the principle of least privilege (only give Editor permission, not Owner)
- Regularly rotate service account keys

