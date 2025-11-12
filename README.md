# TradeTron Token Generator

A secure, multi-user web application for automating daily TradeTron broker token generation using Playwright browser automation.

## Features

- 🔐 **Secure Credential Storage**: AES-256-GCM encryption for all sensitive data
- 🤖 **Automated Login**: Playwright-based browser automation for OAuth flow
- 📅 **Daily Scheduling**: Automatic runs at 08:30 AM IST via node-cron
- 👥 **Multi-User Support**: Manage multiple users with their own credentials
- 🔑 **2FA Support**: TOTP (Google Authenticator) or DOB-based authentication
- 📊 **Dashboard**: Real-time status monitoring and run logs
- 🎯 **Flexible Selectors**: Customizable selectors for different broker pages
- 📋 **Google Sheets Sync**: Import users directly from Google Sheets with one click
- 🔄 **Auto-Update**: Automatically write run results back to Google Sheets after each authentication

## Installation

### 🚀 One-Click Installation (Recommended)

**Windows:**
- Double-click `install.bat` or run `install.ps1`
- PowerShell: `powershell -ExecutionPolicy Bypass -File install.ps1`

**Mac/Linux:**
```bash
chmod +x install.sh && ./install.sh
```

🍎 **Mac users:** See [MAC_INSTALLATION.md](./MAC_INSTALLATION.md) for detailed Mac-specific instructions

The script will automatically:
- Check prerequisites
- Install all dependencies
- Setup environment configuration
- Verify installation

### Manual Installation

📖 **For detailed step-by-step instructions, see [INSTALLATION.md](./INSTALLATION.md)**

### Prerequisites

- Node.js 20+ and npm
- Chromium browser (included with Playwright or custom path)

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npm run playwright:install

# Copy environment template
cp .env.example .env.local
```

### Environment Variables

Create `.env.local`:

```env
# Required: Encryption key (min 32 characters)
ENCRYPTION_KEY=your_secret_encryption_key_min_32_chars_long

# Optional: Job queue concurrency (default: 4)
MAX_CONCURRENCY=4

# Optional: Run browser in headless mode (default: true)
HEADLESS=true

# Optional: Custom Chromium executable path
CHROMIUM_EXECUTABLE_PATH=/path/to/chromium

# Optional: Google Sheets API Configuration
# Option 1: For public sheets (anyone with link can view)
GOOGLE_SHEETS_API_KEY=your_google_api_key

# Option 2: For private sheets (requires service account)
# Option 2a: Direct JSON (escape newlines in private_key)
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}

# Option 2b: Path to service account key file (alternative to above)
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./path/to/service-account-key.json

# Optional: Default sheet range (default: Sheet1!A:Z)
GOOGLE_SHEETS_RANGE=Sheet1!A:Z

# Optional: Enable Google Sheets auto-update (default: enabled after sync)
# Note: Requires service account with Editor permission (not API key)
GOOGLE_SHEETS_UPDATE_ENABLED=true
```

### Development

```bash
npm run dev
```

Visit http://localhost:3000

### Production (Local)

```bash
npm run build
npm start
```

Visit http://localhost:3000

## Usage

1. **Add a User**: Navigate to "Add User" and fill in:
   - Profile Name
   - Tradetron Username (e.g., `724700`)
   - Broker Username (your Flatrade user ID)
   - Password
   - 2FA Method: TOTP secret or DOB (DDMMYYYY format)

2. **View Dashboard**: See all users, recent runs, and queue status

3. **Manual Run**: Click "Run" next to any user to test immediately

4. **Scheduled Runs**: The system automatically runs all active users daily at 08:30 AM IST

5. **Sync from Google Sheets**: Click "Sync from Google Sheets" to import users from a Google Sheet:
   - Paste your Google Sheets URL or Sheet ID
   - Configure the sheet range (default: Sheet1!A:Z)
   - Choose to update existing users or only create new ones
   - Required columns: NAME, TRADETRON ID, FLATTRADE ID, PASSWORD, DOB
   - Optional columns: IsDOB (auto-detected), Active (true/false, defaults to true)
   - **📖 See [GOOGLE_SHEETS_SETUP.md](./GOOGLE_SHEETS_SETUP.md) for detailed setup instructions**

## Project Structure

```
├── app/              # Next.js 14 App Router
│   ├── api/         # API routes
│   ├── users/       # User management pages
│   └── page.tsx     # Dashboard
├── automations/     # Browser automation logic
├── lib/             # Core modules
│   ├── crypto.ts    # Encryption utilities
│   ├── db.ts        # JSON file database
│   ├── jobs.ts      # Job queue management
│   └── scheduler.ts # Cron scheduler
├── data/            # JSON database files
└── artifacts/       # Screenshots and logs from failed runs
```

## Security

- All passwords and 2FA secrets are encrypted at rest using AES-256-GCM
- Sensitive data is never logged or exposed in API responses
- Environment variables for all secrets

## License

MIT

