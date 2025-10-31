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
```

### Development

```bash
npm run dev
```

Visit http://localhost:3000

### Production

```bash
npm run build
npm start
```

## Docker

```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 🌐 Deployment

🚀 **Deploy to free hosting platforms:** See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions

**Recommended free platforms:**
- **Render** (reliable) - https://render.com
- **Fly.io** (Docker-based) - https://fly.io
- **Vercel** (Next.js optimized) - https://vercel.com

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
- HTTPS recommended for production

## License

MIT

