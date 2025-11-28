# Quick Fix: Remove Time Window Restriction

## The Problem
Your Railway deployment shows the server is in "sleep mode" due to a time window restriction. The health API shows `timeWindow.enabled: true` even though the window is set to 00:00-23:59 (all day).

## Solution: Disable Time Window

You have **3 options** to fix this immediately:

### Option 1: Railway Environment Variable (FASTEST - 2 minutes) ⚡

1. Go to [Railway Dashboard](https://railway.app)
2. Select your project → Your service
3. Click **"Variables"** tab
4. Find `TIME_WINDOW_ENABLED`:
   - If it exists and is set to `true`, change it to `false`
   - If it doesn't exist, click **"+ New Variable"**:
     - Name: `TIME_WINDOW_ENABLED`
     - Value: `false`
5. Railway will automatically redeploy (wait 1-2 minutes)
6. ✅ Done! Server will run 24/7

### Option 2: Settings Page (If accessible)

1. Visit: https://tradetron-token-flattrade-tradetron.up.railway.app/settings
2. Scroll to **"Time Window Settings"**
3. **Uncheck** "Enable Time Window" checkbox
4. Click **"Save Settings"**
5. ✅ Done! Takes effect immediately

### Option 3: Deploy Updated Code

The code has been updated to:
- ✅ Default to **disabled** (no restrictions)
- ✅ Allow time window API to be updated even when outside window
- ✅ Fix health endpoint to show correct status

**To deploy:**
```bash
git add .
git commit -m "Disable time window by default"
git push
```

Railway will auto-deploy. After deployment, the time window will be disabled by default.

## Verify It's Fixed

After applying any option above:

1. **Check Health API:**
   ```bash
   curl https://tradetron-token-flattrade-tradetron.up.railway.app/api/health
   ```
   Should show: `"enabled": false`

2. **Check Dashboard:**
   - Visit: https://tradetron-token-flattrade-tradetron.up.railway.app
   - Should show "Server is active" (no sleep mode message)

## What Changed in the Code

1. **`lib/timeWindow.ts`**: Now defaults to disabled instead of enabled
2. **`server.js`**: Added `/api/time-window` to allowed paths
3. **`app/api/health/route.ts`**: Fixed to use correct enabled check

## Why This Happened

The time window was enabled in the config file (`data/config.json`) with `timeWindowEnabled: true`. The code now prioritizes environment variables and defaults to disabled if nothing is set.


