# Railway Deployment Fix Guide

## Application Failed to Respond - Troubleshooting

If you see "Application failed to respond" error, follow these steps:

### Step 1: Check Deploy Logs

1. Go to Railway dashboard
2. Click on your service: `tradetron-token-generator`
3. Click **"Deploy Logs"** tab
4. Look for error messages (usually in red)

### Step 2: Set Required Environment Variables

**CRITICAL:** Railway requires these environment variables:

1. Go to Railway dashboard → Your service → **Settings** → **Variables**
2. Add these variables:

```
ENCRYPTION_KEY=your_secret_key_minimum_32_characters_long_required
PORT=3000
NODE_ENV=production
MAX_CONCURRENCY=4
HEADLESS=true
```

**Generate ENCRYPTION_KEY:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as your ENCRYPTION_KEY.

### Step 3: Verify Port Configuration

Railway automatically sets the `PORT` environment variable. The updated `package.json` now uses it:
```json
"start": "next start -p ${PORT:-3000}"
```

### Step 4: Common Errors and Fixes

#### Error: "ENCRYPTION_KEY environment variable is required"
**Fix:** Add `ENCRYPTION_KEY` in Railway Variables (see Step 2)

#### Error: "Cannot find module" or "Module not found"
**Fix:** 
- Check Deploy Logs for missing dependencies
- Redeploy: Railway → Deploy → Redeploy

#### Error: "Port already in use" or "EADDRINUSE"
**Fix:** 
- Railway handles ports automatically
- The updated start script uses `PORT` env variable

#### Error: "Playwright browser not found"
**Fix:**
- Check Build Logs - Playwright should install during build
- If it fails, the `postinstall` script runs `playwright:install`

### Step 5: Check Deploy Logs for Specific Errors

**Most common issues:**

1. **Missing ENCRYPTION_KEY** (most common)
   - Error: "ENCRYPTION_KEY environment variable is required"
   - Solution: Add it in Railway Variables

2. **Build fails**
   - Check Build Logs tab
   - Look for compilation errors

3. **Runtime crash**
   - Check Deploy Logs tab
   - Look for stack traces

### Step 6: Redeploy After Fixing Variables

After adding environment variables:

1. Go to Railway dashboard
2. Click **"Deploy"** → **"Redeploy"**
3. Wait for deployment to complete
4. Check Deploy Logs to verify it started successfully

### Step 7: Verify Application is Running

1. Check Deploy Logs for:
   ```
   ✓ Ready in X seconds
   - Local: http://localhost:3000
   ```

2. Try accessing:
   ```
   https://tradetron-token-generator-production.up.railway.app/api/health
   ```

3. Should return JSON with scheduler status

### Quick Fix Checklist

- [ ] ENCRYPTION_KEY set in Railway Variables (32+ characters)
- [ ] PORT=3000 set (or Railway auto-sets it)
- [ ] NODE_ENV=production set
- [ ] Redeployed after adding variables
- [ ] Checked Deploy Logs for errors
- [ ] Application shows "Ready" in logs

### Still Not Working?

1. **Check HTTP Logs** tab for incoming requests
2. **Check Deploy Logs** for runtime errors
3. **Try redeploying** with "Clear build cache" enabled
4. **Contact Railway support** with Request ID from error page

### Railway-Specific Configuration

Railway automatically:
- Sets `PORT` environment variable
- Provides persistent storage for `/app/data` and `/app/artifacts`
- Routes traffic to your app

Your app should work once `ENCRYPTION_KEY` is set!

