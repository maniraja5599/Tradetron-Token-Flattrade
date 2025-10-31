# Render Playwright Browser Launch Fix

## 🔧 Problem
The app is deployed but Playwright browser launch is failing with:
```
browserType.launch: Failed to launch: Error: spawn /root/.cache/ms-playwri...
```

## ✅ Solution

I've updated the Dockerfile to use Alpine's system Chromium instead of Playwright's downloaded browser. Now you need to redeploy.

### Steps to Fix:

1. **Commit the updated Dockerfile:**
   ```bash
   git add Dockerfile
   git commit -m "Fix: Use system Chromium for Playwright in Docker"
   git push
   ```

2. **Render will auto-redeploy** (or manually trigger redeploy in Render dashboard)

3. **Alternative: Add Environment Variable in Render** (if needed):
   - Go to your Render service → Environment tab
   - Add: `CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`
   - This should already be set in Dockerfile, but can override if needed

### What Changed:

- ✅ Removed `npm run playwright:install` (not needed with system Chromium)
- ✅ Added `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` to prevent Playwright from downloading browsers
- ✅ Set `CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` to use Alpine's system Chromium
- ✅ Added additional dependencies (`udev`, `ttf-opensans`) for Chromium

### After Redeploy:

1. Wait for build to complete (5-10 minutes)
2. Test by clicking "Run" on a user
3. Check logs if issues persist

### Verify It Works:

After redeploy, check:
- Go to your service → Logs tab
- Look for: `[LoginFlow] Using custom Chromium: /usr/bin/chromium`
- Try running a test login flow

---

**Note:** The system Chromium approach is more reliable in Docker environments and doesn't require downloading large browser binaries during build.

