# Google Sheets Sync Setup Guide

This guide will help you set up Google Sheets integration to sync users directly into the TradeTron Token Generator.

## Option 1: Public Sheets (Easier - Recommended for Testing)

This method works if your Google Sheet is publicly accessible (anyone with the link can view it).

### Steps:

1. **Make your Google Sheet public:**
   - Open your Google Sheet
   - Click "Share" button
   - Change access to "Anyone with the link" can view
   - Copy the sheet URL

2. **Get a Google API Key:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the "Google Sheets API" for your project
   - Go to "Credentials" → "Create Credentials" → "API Key"
   - Copy the API key
   - (Optional) Restrict the API key to only Google Sheets API for security

3. **Add to environment variables:**
   ```env
   GOOGLE_SHEETS_API_KEY=your_api_key_here
   ```

4. **Use in the app:**
   - Click "Sync from Google Sheets" button
   - Paste your Google Sheets URL
   - Click "Sync Now"

## Option 2: Private Sheets (More Secure - Recommended for Production)

This method uses a service account to access private Google Sheets.

### Steps:

1. **Create a Service Account:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the "Google Sheets API" for your project
   - Go to "IAM & Admin" → "Service Accounts"
   - Click "Create Service Account"
   - Give it a name (e.g., "tradetron-sheets-reader")
   - Click "Create and Continue"
   - Skip role assignment, click "Continue"
   - Click "Done"

2. **Create and Download Key:**
   - Click on the service account you just created
   - Go to "Keys" tab
   - Click "Add Key" → "Create new key"
   - Choose "JSON" format
   - Download the JSON file

3. **Share Sheet with Service Account:**
   - Open your Google Sheet
   - Click "Share" button
   - Add the service account email (found in the JSON file as `client_email`)
   - **Important for auto-updates**: Give it "Editor" permission (not "Viewer") so it can write results back to the sheet
   - Click "Send"

4. **Add to environment variables (choose one method):**

   **Method A: File Path (Recommended - Easier)**
   - Store the downloaded JSON file in a secure location (e.g., `./keys/service-account-key.json`)
   - Add to your `.env.local` file:
   
   ```env
   GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./keys/service-account-key.json
   ```
   
   **Important:** 
   - Make sure the file path is relative to your project root or use an absolute path
   - Add the keys directory to `.gitignore` to avoid committing sensitive files
   - Never commit service account keys to version control

   **Method B: Environment Variable (Alternative)**
   - Open the downloaded JSON file
   - Copy the entire JSON content
   - Add it to your `.env.local` file as a single line:
   
   ```env
   GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n","client_email":"...@....iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
   ```
   
   **Note:** You need to escape newlines in the private_key field (use `\\n` instead of actual newlines)
   
   **Method C: Base64 Encoded (Alternative)**
   - You can also base64 encode the entire JSON file content and store it:
   ```bash
   # On Linux/Mac
   cat service-account-key.json | base64 -w 0
   
   # On Windows (PowerShell)
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account-key.json"))
   ```
   - Then store the base64 string in `.env.local`:
   ```env
   GOOGLE_SERVICE_ACCOUNT_KEY=eyJ0eXBlIjoic2VydmljZV9hY2NvdW50Ii...
   ```

5. **Use in the app:**
   - Click "Sync from Google Sheets" button
   - Paste your Google Sheets URL or Sheet ID
   - Click "Sync Now"
   - After syncing, the sheet URL will be saved and auto-updates will be enabled

## Auto-Update Feature

After syncing from a Google Sheet, the application will automatically update the sheet with run results after each authentication run. The following columns will be added/updated automatically:

- **Last Run Status**: Shows "Success" or "Failed"
- **Last Run Time**: Timestamp of the last run (IST timezone)
- **Token Generated**: Shows "Yes" or "No"
- **Last Run Message**: Shows the success message (e.g., "Token generated successfully") or failure reason (e.g., "Authentication failed - Error detected on page")

### Requirements for Auto-Update:

1. **Service Account Required**: Auto-updates require service account authentication (not API key). API keys are read-only.
2. **Write Permissions**: The service account must have "Editor" permission (not just "Viewer") on the Google Sheet.
3. **Auto-Enabled**: After syncing from a sheet, auto-updates are automatically enabled for that sheet.

### How It Works:

1. After each authentication run completes, the system:
   - Finds the user's row in the sheet (by matching NAME or TRADETRON ID)
   - Updates the "Last Run Status", "Last Run Time", "Token Generated", and "Last Run Message" columns
   - Creates these columns automatically if they don't exist

2. Updates happen automatically in the background - no manual intervention needed.

3. If a user's row cannot be found in the sheet, a warning is logged but the run still completes successfully.

## Google Sheet Format

Your Google Sheet should have the following columns (first row is headers):

| Column Name | Required | Description | Example |
|------------|----------|-------------|---------|
| NAME | Yes | User's name | SHANU |
| TRADETRON ID | Yes | Tradetron ID | 1967985 |
| FLATTRADE ID | Yes | FlatTrade/Broker ID | FZ07651 |
| PASSWORD | Yes | User's password | Shanu@123 |
| DOB | Yes | Date of birth (8 digits: MMDDYYYY or DDMMYYYY) or TOTP secret | 01061963 or JBSWY3DPEHPK3PXP |
| IsDOB | No | Auto-detected if DOB column exists | true (auto) |
| Active | No | true/false, defaults to true | true |

### Example Sheet (Recommended Format):

```
| NAME   | TRADETRON ID | FLATTRADE ID | PASSWORD      | DOB      | Active |
|--------|-------------|--------------|---------------|----------|--------|
| SHANU  | 1967985     | FZ07651      | Shanu@123     | 01061963 | true   |
| SACHIN | 2324009     | FT033489     | Sachin$25Q2   | 02121955 | true   |
| RISHU  | 2338285     | FT040036     | Rishu$25Q2    | 10041992 | true   |
```

### Column Name Variations (All Case-Insensitive):

The sync function is flexible and will recognize these column name variations:
- **NAME**: `NAME`, `Name`, `Username`, `User Name`
- **TRADETRON ID**: `TRADETRON ID`, `TradetronID`, `Tradetron Username`, `TradetronUsername`, `Tradetron`, `TT Username`, `TT ID`
- **FLATTRADE ID**: `FLATTRADE ID`, `FlatTradeID`, `Broker Username`, `BrokerUsername`, `Broker`, `Broker ID`
- **PASSWORD**: `PASSWORD`, `Password`, `Pwd`, `Pass`
- **DOB**: `DOB`, `TOTPSecretOrDOB`, `TOTP Secret Or DOB`, `TOTP`, `TOTP/DOB`, `Date Of Birth`
- **IsDOB**: `IsDOB`, `Is DOB`, `DOB Flag` (Auto-detected if DOB column exists)
- **Active**: `Active`, `Enabled`

### Notes:

- **DOB Format**: The DOB can be in MMDDYYYY format (e.g., 01061963 for January 6, 1963) or DDMMYYYY format. The system will auto-detect if a column is named "DOB" and treat it as a date of birth.
- **Auto-detection**: If a column is named "DOB" or contains "DOB", the system automatically sets `IsDOB` to `true`.
- **Column Order**: Column order doesn't matter - the system finds columns by name.
- **Case Sensitivity**: All column names are case-insensitive.

## Troubleshooting

### Error: "Either GOOGLE_SHEETS_API_KEY or GOOGLE_SERVICE_ACCOUNT_KEY must be set"
- Make sure you've added one of these environment variables to your `.env.local` file
- Restart your development server after adding environment variables

### Error: "Service account authentication failed"
- Verify the service account JSON is correctly formatted
- If using file path: Check that the file exists and the path is correct
- If using env var: Make sure newlines are properly escaped (`\\n`) or use base64 encoding
- Make sure the service account email has access to the Google Sheet
- Check that the Google Sheets API is enabled in your Google Cloud project
- Verify the service account key file hasn't been corrupted or modified

### Error: "Write access required. Service account authentication needed for updates"
- Auto-updates require service account authentication (not API key)
- API keys are read-only and cannot write to sheets
- Set up a service account (see Option 2 above) for auto-updates to work
- Make sure the service account has "Editor" permission on the sheet (not "Viewer")

### Error: "Could not find row for user"
- The system couldn't match the user to a row in the sheet
- Verify the user's NAME or TRADETRON ID matches exactly (case-insensitive)
- Check that the user exists in the sheet
- Ensure the sheet hasn't been modified in a way that breaks the mapping

### Error: "Failed to fetch sheet data"
- For public sheets: Verify your API key is correct and Google Sheets API is enabled
- For private sheets: Verify the service account has access to the sheet
- Check that the Sheet ID in the URL is correct

### Error: "No data found in the sheet"
- Verify the sheet range is correct (default: `Sheet1!A:Z`)
- Make sure your sheet has data rows (not just headers)
- Check that the sheet name matches the range (e.g., if your sheet is named "Users", use `Users!A:Z`)

### Users not being created/updated
- Check the sync results message for errors
- Verify all required columns are present
- Make sure row data is not empty
- Check that TradetronUsername values are unique

## Security Best Practices

1. **For Public Sheets:**
   - Restrict your API key to only Google Sheets API
   - Use IP restrictions if possible
   - Don't share your API key publicly

2. **For Private Sheets:**
   - Store service account keys securely
   - Never commit service account keys to version control
   - Use the principle of least privilege (only give Viewer access)
   - Rotate keys regularly

3. **General:**
   - Use environment variables for all secrets
   - Keep your `.env.local` file in `.gitignore`
   - Regularly audit who has access to your Google Sheets

## Support

If you encounter issues, check:
1. Browser console for errors
2. Server logs for detailed error messages
3. Google Cloud Console for API usage and errors
4. Google Sheets sharing settings

