# Mac Installation Guide - TradeTron Token Generator

This guide provides step-by-step instructions for installing the TradeTron Token Generator on macOS.

## 🚀 Quick Installation (One-Click for Mac)

### Method 1: Automated Script (Recommended)

1. **Open Terminal** (Press `Cmd + Space`, type "Terminal", press Enter)

2. **Navigate to the project folder:**
   ```bash
   cd ~/Desktop/BROKER/"TradeTron Login page"
   ```
   (Or wherever you copied the project files)

3. **Make the script executable and run it:**
   ```bash
   chmod +x install.sh
   ./install.sh
   ```

The script will automatically:
- ✅ Check if Node.js is installed
- ✅ Install all dependencies
- ✅ Setup Playwright browser
- ✅ Create environment configuration
- ✅ Verify installation

**That's it!** The script handles everything.

---

## Prerequisites

Before installation, ensure you have:

1. **macOS 10.15 (Catalina) or later**
2. **Node.js 20 or higher**
   - Check if installed: Open Terminal and run `node --version`
   - If not installed, see **Installing Node.js on Mac** below
3. **Internet connection**

---

## Installing Node.js on Mac

### Option 1: Using Homebrew (Recommended)

If you have Homebrew installed:

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node@20

# Verify installation
node --version
npm --version
```

### Option 2: Direct Download

1. Visit: https://nodejs.org/
2. Download the **LTS version** (macOS Installer .pkg)
3. Double-click the downloaded `.pkg` file
4. Follow the installation wizard
5. Restart Terminal and verify: `node --version`

### Option 3: Using nvm (Node Version Manager)

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart Terminal or run:
source ~/.zshrc

# Install Node.js 20
nvm install 20
nvm use 20

# Verify
node --version
```

---

## Step-by-Step Manual Installation

If you prefer manual installation or the script doesn't work:

### Step 1: Transfer Project Files

**Option A: Using Git**
```bash
git clone <repository-url>
cd "TradeTron Login page"
```

**Option B: Copy Files Manually**
1. Copy the project folder to your Mac (e.g., `~/Desktop/BROKER/`)
2. Open Terminal
3. Navigate to the project:
   ```bash
   cd ~/Desktop/BROKER/"TradeTron Login page"
   ```

### Step 2: Install Dependencies

```bash
npm install
```

**What this does:**
- Downloads and installs all required packages
- Creates `node_modules` folder
- Takes 2-5 minutes

**Troubleshooting:**
- If you get permission errors:
  ```bash
  sudo npm install
  ```
- If npm is not found, ensure Node.js is properly installed

### Step 3: Install Playwright Browser

```bash
npm run playwright:install
```

**What this does:**
- Downloads Chromium browser for automation
- Installs to system cache
- Takes 1-3 minutes

**Troubleshooting:**
- If you get permission errors, you may need to allow Terminal access:
  - System Preferences → Security & Privacy → Privacy → Full Disk Access
  - Add Terminal.app

### Step 4: Create Environment Configuration

Create `.env.local` file:

```bash
# Create the file
touch .env.local

# Open in TextEdit (or use your preferred editor)
open -a TextEdit .env.local
```

Add the following content:

```env
# Required: Encryption key (minimum 32 characters)
# Generate one: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=your_secret_encryption_key_min_32_chars_long

# Optional: Maximum concurrent jobs (default: 4)
MAX_CONCURRENCY=4

# Optional: Run browser in headless mode (default: true)
HEADLESS=true

# Optional: Custom Chromium executable path
CHROMIUM_EXECUTABLE_PATH=
```

**Generate a secure encryption key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and replace `your_secret_encryption_key_min_32_chars_long` in `.env.local`.

### Step 5: Verify Installation

```bash
npm run build
```

Should complete without errors.

### Step 6: Start the Application

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

Then open your browser and visit: **http://localhost:3000**

---

## Mac-Specific Troubleshooting

### Issue: "Permission denied" when running install.sh

**Solution:**
```bash
chmod +x install.sh
./install.sh
```

### Issue: "Command not found: node" or "Command not found: npm"

**Solution:**
- Node.js is not installed or not in PATH
- Install Node.js (see **Installing Node.js on Mac** above)
- Restart Terminal after installation
- Verify: `node --version`

### Issue: Playwright fails to install browser

**Solution:**
```bash
# Install system dependencies
brew install python3

# Retry Playwright installation
npm run playwright:install
```

### Issue: Port 3000 already in use

**Solution:**
```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 npm run dev
```

### Issue: "zsh: command not found" errors

**Solution:**
This usually means the command is not in your PATH. For Node.js:
```bash
# Check if Node.js is installed
which node

# If not found, add to PATH (for Homebrew installations)
echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Issue: Gatekeeper blocking script execution

**Solution:**
```bash
# Allow script to run
xattr -d com.apple.quarantine install.sh

# Then run
./install.sh
```

---

## Verifying Installation

After installation, verify everything works:

```bash
# Check Node.js version (should be 20+)
node --version

# Check npm version
npm --version

# Check if dependencies are installed
ls node_modules

# Check if Playwright is installed
npx playwright --version

# Check if .env.local exists
ls -la .env.local

# Test build
npm run build
```

---

## Starting the Application

### Development Mode (with hot reload)

```bash
npm run dev
```

Then open: **http://localhost:3000**

### Production Mode

```bash
npm run build
npm start
```

Then open: **http://localhost:3000**

### Stopping the Application

Press `Ctrl + C` in Terminal to stop the server.

---

## Running on Startup (Mac)

To automatically start the application when your Mac boots:

### Option 1: Using launchd (Built-in)

Create `~/Library/LaunchAgents/com.tradetron.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.tradetron</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/path/to/project/server.js</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>/path/to/project</string>
</dict>
</plist>
```

Load it:
```bash
launchctl load ~/Library/LaunchAgents/com.tradetron.plist
```

### Option 2: Using PM2 (Recommended)

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
# Follow the instructions it shows
```

---

## Security Recommendations for Mac

1. **Enable Firewall:**
   - System Preferences → Security & Privacy → Firewall → Turn On Firewall

2. **File Permissions:**
   ```bash
   # Set proper permissions for .env.local
   chmod 600 .env.local
   ```

3. **Keep Node.js Updated:**
   ```bash
   # If using Homebrew
   brew upgrade node
   
   # If using nvm
   nvm install 20 --latest-npm
   ```

---

## Uninstallation

To remove the application:

```bash
# Stop the application (if running)
npm run stop
# or if using PM2
pm2 stop tradetron-app
pm2 delete tradetron-app

# Remove the project folder
rm -rf ~/Desktop/BROKER/"TradeTron Login page"

# (Optional) Remove global packages if not needed
npm uninstall -g pm2
```

---

## Need Help?

- Check Terminal for error messages
- Verify Node.js version: `node --version`
- Check if port 3000 is available: `lsof -i :3000`
- Review the main `INSTALLATION.md` for general troubleshooting
- Check `README.md` for usage instructions

---

## Quick Reference

```bash
# Installation
chmod +x install.sh && ./install.sh

# Start Development Server
npm run dev

# Build for Production
npm run build

# Start Production Server
npm start

# Install Playwright Browser
npm run playwright:install

# Check Application Status
curl http://localhost:3000/api/health
```

