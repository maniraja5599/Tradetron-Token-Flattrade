# TradeTron Token Generator - Quick Start

## 🚀 Getting Started in 5 Minutes

### Step 1: Install Dependencies

```bash
npm install
npm run playwright:install
```

### Step 2: Setup Environment

Create `.env.local`:

```env
ENCRYPTION_KEY=your_secret_key_at_least_32_characters_long
MAX_CONCURRENCY=4
HEADLESS=true
```

### Step 3: Add Your First User

1. Start the server: `npm run dev`
2. Visit http://localhost:3000
3. Click "Add User"
4. Fill in:
   - **Profile Name**: My Account
   - **Tradetron Username**: 724700
   - **Broker Username**: Your Flatrade username
   - **Password**: Your Flatrade password
   - **2FA**: Check "Use DOB" and enter `DDMMYYYY` format (e.g., `17111992`)

### Step 4: Test Login

Click "Run" next to your user to test the login flow immediately.

### Step 5: Enable Scheduled Runs

1. Edit your user
2. Ensure "Active" checkbox is checked
3. The system will automatically run daily at 08:30 AM IST

## 🎯 What Happens?

1. **Daily at 08:30 AM IST**: System logs in all active users
2. **Browser Automation**: Opens headless browser, navigates to Tradetron URL
3. **Login Flow**: Enters credentials, handles 2FA (TOTP/DOB)
4. **Token Generation**: Completes OAuth flow and generates token
5. **Logging**: All runs are logged with success/failure status

## 📝 Important Notes

- Login URL is auto-generated: `https://flattrade.tradetron.tech/auth/{tradetronUsername}`
- DOB format: `DDMMYYYY` (8 digits, e.g., `17111992` for Nov 17, 1992)
- TOTP: Paste your base32 secret from Google Authenticator
- Failed runs save screenshots and HTML to `artifacts/` folder

## 🐛 Troubleshooting

- **Browser not found**: Set `CHROMIUM_EXECUTABLE_PATH` in `.env.local`
- **Login fails**: Check artifacts folder for screenshots
- **Scheduler not running**: Check `/api/health` endpoint

## 📞 Support

Check the main README.md for detailed documentation.

