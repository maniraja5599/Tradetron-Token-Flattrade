# 🔧 Fix Render Deployment Issue

## Problem
Render is trying to use Docker mode but can't find a Dockerfile, causing the build to fail.

## Solution: Switch to Node.js Buildpack

### Option 1: Update Render Settings (Recommended)

1. **Go to Render Dashboard** → Your Service → **Settings**
2. **Scroll to "Build & Deploy"** section
3. **Change "Docker" to "Node"**:
   - Look for "Docker" or "Build Command" section
   - Change to **"Node"** environment
   - Or remove Docker configuration

4. **Set Build Command:**
   ```
   npm install && npm run playwright:install chromium
   ```

5. **Set Start Command:**
   ```
   npm start
   ```

6. **Set Environment:**
   - Environment: **Node**
   - Node Version: **20** (or latest)

7. **Save and Redeploy**

### Option 2: Use render.yaml (Already Created)

The `render.yaml` file is already in your repo. Render should auto-detect it, but if not:

1. **Go to Settings** → **Build & Deploy**
2. **Enable "Auto-Deploy"** from `render.yaml`
3. **Or manually configure** using the settings below

### Option 3: Delete and Recreate Service

If the above doesn't work:

1. **Delete the current service** (Settings → Delete Service)
2. **Create new Web Service**
3. **Connect GitHub repo**
4. **Configure manually:**
   - **Environment**: Node
   - **Build Command**: `npm install && npm run playwright:install chromium`
   - **Start Command**: `npm start`
   - **Node Version**: 20

## Required Environment Variables

Add these in Render → Environment:

```env
ENCRYPTION_KEY=your_secret_encryption_key_min_32_chars_long
HEADLESS=true
MAX_CONCURRENCY=4
NODE_ENV=production
PORT=10000
```

## Enable Persistent Disk

1. **Go to Settings** → **Disks**
2. **Add Disk:**
   - Name: `data-disk`
   - Mount Path: `/opt/render/project/src/data`
   - Size: 1GB

## After Fixing

1. **Click "Manual Deploy"** → **"Deploy latest commit"**
2. **Watch the build logs**
3. **Should see:**
   - `npm install` running
   - `playwright:install chromium` running
   - `npm run build` running
   - `npm start` starting server

## If Still Failing

Check build logs for:
- Node version issues (needs 20+)
- Playwright installation errors
- Missing dependencies
- Port binding issues

## Alternative: Use Railway Instead

If Render continues to have issues, **Railway is easier**:
- Auto-detects Next.js
- Better free tier
- Simpler setup

See `RAILWAY_QUICK_START.md` for Railway deployment.

