# Installation Guide - TradeTron Token Generator

This guide will walk you through installing the TradeTron Token Generator application on a new computer step by step.

## 🚀 Quick Installation (One-Click)

**For the fastest installation, use our automated scripts:**

### Windows
- **PowerShell (Recommended):** Right-click `install.ps1` → "Run with PowerShell"
  - Or run: `powershell -ExecutionPolicy Bypass -File install.ps1`
- **Batch File:** Double-click `install.bat` or run: `install.bat`

### Mac/Linux
```bash
chmod +x install.sh
./install.sh
```

**What the script does:**
- ✅ Checks Node.js installation
- ✅ Installs all npm dependencies
- ✅ Installs Playwright Chromium browser
- ✅ Creates `.env.local` with auto-generated encryption key
- ✅ Verifies installation
- ✅ Optionally starts the application

**Manual installation:** Continue reading below for step-by-step instructions.

---

## Prerequisites

Before you begin, ensure the target computer has:

1. **Node.js 20 or higher** installed
   - Check installation: Open terminal/command prompt and run `node --version`
   - If not installed, download from: https://nodejs.org/
   - Also installs npm (Node Package Manager) automatically

2. **Administrator/Root access** (for installing system dependencies)

3. **Internet connection** (for downloading dependencies)

---

## Step-by-Step Installation

### Step 1: Transfer Project Files

**Option A: Using Git (Recommended)**
```bash
# If you have a Git repository
git clone <repository-url>
cd "TradeTron Login page"
```

**Option B: Copy Files Manually**
1. Copy the entire project folder to the new computer
2. Navigate to the project folder in terminal/command prompt:
   ```bash
   cd "C:\path\to\TradeTron Login page"
   ```
   (On Windows, use PowerShell or Command Prompt)
   (On Mac/Linux, use Terminal)

### Step 2: Install Node.js Dependencies

Open terminal/command prompt in the project folder and run:

```bash
npm install
```

**What this does:**
- Downloads and installs all required packages listed in `package.json`
- Creates `node_modules` folder with all dependencies
- This may take 2-5 minutes depending on internet speed

**Troubleshooting:**
- If you get permission errors, try: `npm install --legacy-peer-deps`
- If npm is not found, ensure Node.js is properly installed

### Step 3: Install Playwright Browser

Playwright requires Chromium browser to be downloaded:

```bash
npm run playwright:install
```

**What this does:**
- Downloads Chromium browser (required for automation)
- Installs it in a system cache location
- This may take 1-3 minutes

**Troubleshooting:**
- If this fails, ensure you have internet connection
- On Windows, you may need to run PowerShell/Command Prompt as Administrator

### Step 4: Create Environment Configuration File

Create a `.env.local` file in the project root folder:

**On Windows:**
```powershell
# In PowerShell
New-Item -Path .env.local -ItemType File
```

**On Mac/Linux:**
```bash
touch .env.local
```

**Or manually:**
1. Create a new file named `.env.local` in the project root folder
2. Add the following content:

```env
# Required: Encryption key (minimum 32 characters)
# Generate a secure random string - this encrypts all user passwords
ENCRYPTION_KEY=your_secret_encryption_key_min_32_chars_long_please_change_this

# Optional: Maximum concurrent jobs (default: 4)
MAX_CONCURRENCY=4

# Optional: Run browser in headless mode (default: true)
# Set to false to see browser window during automation
HEADLESS=true

# Optional: Custom Chromium executable path
# Leave empty to use Playwright's bundled Chromium
CHROMIUM_EXECUTABLE_PATH=
```

**Important:** 
- Replace `your_secret_encryption_key_min_32_chars_long_please_change_this` with a secure random string of at least 32 characters
- This key encrypts all passwords - keep it secure and never share it
- Example: Use a password generator or run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Step 5: Verify Installation

Run a quick test to ensure everything is installed correctly:

```bash
npm run build
```

**What this does:**
- Compiles the Next.js application
- Checks for any configuration errors
- Should complete without errors

**If you see errors:**
- Check that all dependencies installed correctly: `npm install` again
- Verify Node.js version is 20+: `node --version`
- Check that `.env.local` file exists and has ENCRYPTION_KEY set

### Step 6: Start the Application

**For Development (with hot reload):**
```bash
npm run dev
```

**For Production:**
```bash
npm run build
npm start
```

**What happens:**
- Application starts on `http://localhost:3000`
- You should see: "✓ Ready in X seconds"
- Open your web browser and navigate to: `http://localhost:3000`

### Step 7: Access the Application

1. Open your web browser (Chrome, Firefox, Edge, etc.)
2. Navigate to: `http://localhost:3000`
3. You should see the Dashboard page

**If the page doesn't load:**
- Check that the server is running (look for "✓ Ready" message)
- Verify no firewall is blocking port 3000
- Try accessing `http://127.0.0.1:3000` instead

---

## Quick Installation Checklist

- [ ] Node.js 20+ installed (`node --version` returns v20 or higher)
- [ ] Project files copied to new computer
- [ ] Dependencies installed (`npm install` completed successfully)
- [ ] Playwright browser installed (`npm run playwright:install` completed)
- [ ] `.env.local` file created with ENCRYPTION_KEY (32+ characters)
- [ ] Application builds successfully (`npm run build` no errors)
- [ ] Application starts (`npm run dev` or `npm start`)
- [ ] Dashboard accessible at `http://localhost:3000`

---

## Post-Installation Setup

### 1. Add Users

After installation, you need to add users:

1. Navigate to **"Add User"** page
2. Fill in:
   - Profile Name (e.g., "John Doe")
   - Tradetron Username (e.g., `724700`)
   - Broker Username (your Flatrade user ID)
   - Password
   - 2FA Method: TOTP secret or DOB (DDMMYYYY format)

### 2. Test Run

1. Go to Dashboard
2. Click **"Run"** next to any user to test the automation
3. Check for any errors in the run logs

### 3. Verify Scheduled Jobs

The application automatically runs all active users daily at **08:30 AM IST**. 

Verify the scheduler is running:
- Check the Dashboard for scheduled runs
- View recent runs to confirm automation is working

---

## Troubleshooting

### Common Issues

**Issue: "npm is not recognized"**
- **Solution:** Node.js is not installed or not in PATH. Reinstall Node.js and restart terminal.

**Issue: "Playwright browsers not found"**
- **Solution:** Run `npm run playwright:install` again. Ensure internet connection is active.

**Issue: "ENCRYPTION_KEY not found"**
- **Solution:** Create `.env.local` file in project root with ENCRYPTION_KEY variable.

**Issue: "Port 3000 already in use"**
- **Solution:** Either stop the application using port 3000, or set PORT environment variable:
  ```bash
  # Windows PowerShell
  $env:PORT=3001; npm run dev
  
  # Mac/Linux
  PORT=3001 npm run dev
  ```

**Issue: "Cannot find module" errors**
- **Solution:** Run `npm install` again. Delete `node_modules` folder and `package-lock.json`, then run `npm install`.

**Issue: Browser automation fails**
- **Solution:** 
  - Ensure Playwright browser is installed: `npm run playwright:install`
  - Check HEADLESS setting in `.env.local`
  - Verify internet connection for login flow

### Getting Help

If you encounter issues:
1. Check the terminal/console for error messages
2. Verify all prerequisites are met
3. Ensure `.env.local` is configured correctly
4. Check that all installation steps were completed

---

## Production Deployment

For production use on a server:

### Option 1: Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Build the application
npm run build

# Start with PM2
pm2 start npm --name "tradetron-app" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

### Option 2: Using Docker

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f
```

### Option 3: Using systemd (Linux)

Create a service file `/etc/systemd/system/tradetron.service`:

```ini
[Unit]
Description=TradeTron Token Generator
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/project
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable tradetron
sudo systemctl start tradetron
```

---

## Security Recommendations

1. **Change ENCRYPTION_KEY:** Use a strong, unique encryption key (minimum 32 characters)
2. **Use HTTPS:** For production, configure reverse proxy (nginx/Apache) with SSL certificate
3. **Firewall:** Only expose necessary ports (3000 or configured port)
4. **Regular Updates:** Keep Node.js and dependencies updated
5. **Backup:** Regularly backup the `data/` folder containing user credentials

---

## Uninstallation

To remove the application:

1. Stop the application (Ctrl+C or `pm2 stop tradetron-app`)
2. Delete the project folder
3. (Optional) Remove Node.js if not needed for other projects

---

## Need More Help?

- Check the main `README.md` for usage instructions
- Review error messages in terminal/console
- Check `artifacts/` folder for screenshots from failed automation runs

