# Render.com Deployment Guide

## 🚀 Quick Deployment Steps

### Option A: Using Docker (Current Setup)

Render has auto-detected your Dockerfile. To proceed:

1. **Continue with current settings:**
   - **Name**: `Tradetron-Token-Flattrade` (or change to `tradetron-token-generator`)
   - **Language**: `Docker` ✅ (keep as is)
   - **Branch**: `main` ✅ (keep as is)

2. **Scroll down and configure:**

   **Environment Variables** (click "Add Environment Variable" for each):
   ```
   ENCRYPTION_KEY=your_secret_key_min_32_chars_long
   MAX_CONCURRENCY=4
   HEADLESS=true
   NODE_ENV=production
   ```

   **Generate ENCRYPTION_KEY:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **Advanced Settings:**
   - Click "Advanced"
   - **Enable Persistent Disk**: ✅
   - **Mount Path**: `/app/data`
   - **Size**: 1 GB (free tier) or more if needed

4. **Click "Create Web Service"**

---

### Option B: Switch to Node.js Runtime

If you prefer Node.js instead of Docker:

1. **Change Language:**
   - Click the "Language" dropdown
   - Select **"Node"** instead of "Docker"

2. **Configure Settings:**
   ```
   Build Command: npm run playwright:install && npm run build
   Start Command: npm start
   ```

3. **Environment Variables** (same as Option A):
   ```
   ENCRYPTION_KEY=your_secret_key_min_32_chars_long
   MAX_CONCURRENCY=4
   HEADLESS=true
   NODE_ENV=production
   ```

4. **Advanced Settings:**
   - **Enable Persistent Disk**: ✅
   - **Mount Path**: `/opt/render/project/src/data`

---

## 📋 Complete Configuration Checklist

### Basic Settings:
- [x] **Source Code**: `maniraja5599 / Tradetron-Token-Flattrade` ✅
- [ ] **Name**: `tradetron-token-generator` (or keep auto-filled name)
- [ ] **Language**: Docker (keep) OR Node (if switching)
- [ ] **Branch**: `main` ✅

### Environment Variables (Required):
- [ ] `ENCRYPTION_KEY` - **REQUIRED** (32+ characters)
- [ ] `MAX_CONCURRENCY=4` (optional, default: 4)
- [ ] `HEADLESS=true` (optional, default: true)
- [ ] `NODE_ENV=production` (optional, default: production)

### Advanced Settings:
- [ ] **Persistent Disk**: ✅ Enabled
- [ ] **Mount Path**:
  - Docker: `/app/data`
  - Node.js: `/opt/render/project/src/data`
- [ ] **Health Check Path**: `/api/health` (optional but recommended)

---

## 🔧 Post-Deployment

After clicking "Create Web Service":

1. **Wait for build** (5-10 minutes)
   - Monitor the build logs
   - Build should complete successfully

2. **Verify deployment:**
   - Visit your Render URL: `https://tradetron-token-generator.onrender.com`
   - Check health: `https://tradetron-token-generator.onrender.com/api/health`

3. **Check logs:**
   - Go to your service → "Logs" tab
   - Look for "Ready on http://0.0.0.0:3000"

---

## 🐛 Troubleshooting

### Build Fails: "Playwright not found"
- This shouldn't happen with Docker (already in Dockerfile)
- If using Node.js, ensure build command includes: `npm run playwright:install`

### Runtime Error: "ENCRYPTION_KEY not found"
- Double-check environment variables are set correctly
- Make sure variable name is exactly `ENCRYPTION_KEY` (case-sensitive)

### Application crashes on startup
- Check logs in Render dashboard
- Verify all environment variables are set
- Ensure ENCRYPTION_KEY is at least 32 characters

### Data not persisting
- Ensure Persistent Disk is enabled
- Check mount path is correct
- Verify data directory structure exists

---

## 💡 Recommended Settings Summary

**For Docker (Current Setup):**
```
Name: tradetron-token-generator
Language: Docker
Branch: main
Environment Variables:
  ENCRYPTION_KEY=<your-32-char-key>
  MAX_CONCURRENCY=4
  HEADLESS=true
  NODE_ENV=production
Persistent Disk: Enabled
Mount Path: /app/data
```

**For Node.js (Alternative):**
```
Name: tradetron-token-generator
Language: Node
Branch: main
Build Command: npm run playwright:install && npm run build
Start Command: npm start
Environment Variables: (same as above)
Persistent Disk: Enabled
Mount Path: /opt/render/project/src/data
```

---

## 🎯 Quick Action Items

1. Generate ENCRYPTION_KEY:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Add environment variables in Render dashboard

3. Enable Persistent Disk in Advanced settings

4. Click "Create Web Service"

5. Wait for deployment and verify!

---

## 📞 Next Steps

After deployment:
1. Test the health endpoint
2. Add your first user via the web interface
3. Test a manual run
4. Monitor scheduled runs (daily at 08:30 AM IST)

Good luck with your deployment! 🚀

