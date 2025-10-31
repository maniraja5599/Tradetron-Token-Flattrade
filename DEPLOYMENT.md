# Free Server Deployment Guide - TradeTron Token Generator

This guide covers deploying your application to free hosting platforms.

## ⚠️ Important Considerations

**Your application has special requirements:**
- ✅ Persistent file storage (for `data/` folder with user credentials)
- ✅ Background cron jobs (scheduled daily runs)
- ✅ Playwright browser automation (requires Chromium)
- ✅ Long-running processes

**Not all free platforms support these features.** See recommendations below.

---

## 🚀 Recommended Free Hosting Platforms

### Option 1: Render ⭐

**Best for:** Applications needing persistent storage and cron jobs

**Free Tier:**
- $5 free credit monthly (enough for small apps)
- Persistent storage
- Background workers
- Custom domains

**Deployment Steps:**

1. **Sign up:**
   - Visit: https://render.com
   - Sign up with GitHub (free)

2. **Create New Project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository: `maniraja5599/Tradetron-Token-Flattrade`

3. **Configure Environment Variables:**
   - In Render dashboard → Variables tab
   - Add these variables:
     ```
     ENCRYPTION_KEY=your_secret_key_min_32_chars_long
     MAX_CONCURRENCY=4
     HEADLESS=true
     NODE_ENV=production
     ```

4. **Configure Build Settings:**
   - Render auto-detects Next.js
   - Build Command: `npm run build`
   - Start Command: `npm start`
   - Port: `3000`

5. **Install Playwright:**
   - Add a build script in `package.json`:
     ```json
     "scripts": {
       "build": "npm run playwright:install && next build"
     }
     ```

6. **Deploy:**
   - Render automatically deploys on git push
   - Or click "Deploy Now" in dashboard

**Get your URL:** Render provides a free `.onrender.com` domain

---

### Option 2: Render ⭐

**Best for:** Simple deployments with persistent storage

**Free Tier:**
- Free tier available
- Persistent disk storage
- Background workers
- Custom domains

**Deployment Steps:**

1. **Sign up:**
   - Visit: https://render.com
   - Sign up with GitHub (free)

2. **Create New Web Service:**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select: `maniraja5599/Tradetron-Token-Flattrade`

3. **Configure Settings:**
   ```
   Name: tradetron-token-generator
   Environment: Node
   Build Command: npm run playwright:install && npm run build
   Start Command: npm start
   ```

4. **Add Environment Variables:**
   - In Environment Variables section:
     ```
     ENCRYPTION_KEY=your_secret_key_min_32_chars_long
     MAX_CONCURRENCY=4
     HEADLESS=true
     NODE_ENV=production
     ```

5. **Advanced - Persistent Disk:**
   - Go to "Advanced" settings
   - Enable "Persistent Disk"
   - Mount path: `/opt/render/project/src/data`

6. **Deploy:**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)

**Get your URL:** Render provides a free `.onrender.com` domain

---

### Option 2: Fly.io ⭐

**Best for:** Docker-based deployments

**Free Tier:**
- 3 shared-cpu VMs free
- Persistent volumes
- Global edge network

**Deployment Steps:**

1. **Install Fly CLI:**
   ```bash
   # Windows (PowerShell)
   powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
   
   # Mac/Linux
   curl -L https://fly.io/install.sh | sh
   ```

2. **Sign up:**
   ```bash
   fly auth signup
   ```

3. **Create fly.toml:**
   Create `fly.toml` in project root:
   ```toml
   app = "tradetron-token-generator"
   primary_region = "iad"
   
   [build]
     dockerfile = "Dockerfile"
   
   [env]
     NODE_ENV = "production"
     HEADLESS = "true"
     MAX_CONCURRENCY = "4"
   
   [[services]]
     internal_port = 3000
     protocol = "tcp"
   
     [[services.ports]]
       handlers = ["http"]
       port = 80
       force_https = true
   
     [[services.ports]]
       handlers = ["tls", "http"]
       port = 443
   
     [services.concurrency]
       type = "connections"
       hard_limit = 25
       soft_limit = 20
   
     [[services.http_checks]]
       interval = "10s"
       timeout = "2s"
       grace_period = "5s"
       method = "GET"
       path = "/api/health"
   ```

4. **Set Secrets:**
   ```bash
   fly secrets set ENCRYPTION_KEY=your_secret_key_min_32_chars_long
   ```

5. **Deploy:**
   ```bash
   fly deploy
   ```

**Get your URL:** Fly.io provides a free `.fly.dev` domain

---

### Option 3: Vercel (Limited Support)

**⚠️ Note:** Vercel is serverless and has limitations:
- ❌ No persistent file storage (data/ folder won't persist)
- ❌ Limited cron job support
- ✅ Best for Next.js frontend only

**If you still want to try:**

1. **Sign up:** https://vercel.com (free with GitHub)

2. **Import Project:**
   - Click "Add New Project"
   - Import from GitHub: `maniraja5599/Tradetron-Token-Flattrade`

3. **Configure:**
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`

4. **Environment Variables:**
   ```
   ENCRYPTION_KEY=your_secret_key_min_32_chars_long
   MAX_CONCURRENCY=4
   HEADLESS=true
   ```

5. **Deploy:**
   - Click "Deploy"

**⚠️ Important:** You'll need to use external storage (e.g., MongoDB, Supabase) instead of file-based storage for this to work on Vercel.

---

## 📝 Pre-Deployment Checklist

Before deploying, ensure:

- [ ] All code is pushed to GitHub
- [ ] `.env.local` is NOT committed (already in `.gitignore`)
- [ ] Environment variables are documented
- [ ] Application builds successfully: `npm run build`
- [ ] Test locally: `npm start`

---

## 🔧 Required Environment Variables

Set these in your hosting platform's dashboard:

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `ENCRYPTION_KEY` | ✅ Yes | Min 32 characters | `your_secret_key_min_32_chars_long` |
| `MAX_CONCURRENCY` | ❌ No | Job concurrency (default: 4) | `4` |
| `HEADLESS` | ❌ No | Headless browser mode (default: true) | `true` |
| `CHROMIUM_EXECUTABLE_PATH` | ❌ No | Custom Chromium path | Leave empty |
| `NODE_ENV` | ❌ No | Environment (default: production) | `production` |

---

## 🛠️ Platform-Specific Configuration

### Updating package.json for Deployment

Add this to your `package.json` scripts section:

```json
{
  "scripts": {
    "build": "npm run playwright:install && next build",
    "postinstall": "npm run playwright:install"
  }
}
```

This ensures Playwright browsers are installed during build.

### Creating vercel.json (if using Vercel)

Create `vercel.json`:

```json
{
  "buildCommand": "npm run playwright:install && npm run build",
  "crons": [
    {
      "path": "/api/schedule",
      "schedule": "30 8 * * *"
    }
  ]
}
```

---

## 🚀 Quick Deploy Commands

### Render (CLI)

```bash
# Install Render CLI
npm install -g render-cli

# Login
render login

# Deploy
render deploy
```

### Fly.io

```bash
# Already covered above
fly deploy
```

---

## 📊 Platform Comparison

| Platform | Free Tier | Storage | Cron Jobs | Browser Support | Ease |
|----------|-----------|---------|-----------|-----------------|------|
| **Render** | ⭐⭐⭐⭐ | ✅ | ✅ | ✅ | ⭐⭐⭐⭐ |
| **Fly.io** | ⭐⭐⭐⭐ | ✅ | ✅ | ✅ | ⭐⭐⭐ |
| **Vercel** | ⭐⭐⭐⭐⭐ | ❌ | Limited | ⚠️ | ⭐⭐⭐⭐⭐ |

**Recommendation:** Use **Render** or **Fly.io** for best compatibility.

---

## 🔍 Post-Deployment Verification

After deployment:

1. **Check Health Endpoint:**
   ```
   https://your-app-url.onrender.com/api/health
   ```

2. **Verify Dashboard:**
   ```
   https://your-app-url.onrender.com
   ```

3. **Test Adding User:**
   - Navigate to "Add User"
   - Fill in test credentials
   - Verify it saves

4. **Check Logs:**
   - View deployment logs in platform dashboard
   - Look for any errors

---

## 🔄 Continuous Deployment

All platforms support automatic deployment:

1. **GitHub Integration:**
   - Connect your GitHub repository
   - Every push to `main` branch auto-deploys

2. **Manual Deploy:**
   - Push to GitHub: `git push origin main`
   - Platform auto-detects and deploys

---

## 💾 Handling Persistent Storage

**Important:** Your app uses file-based storage (`data/` folder). 

**Solutions:**

1. **Use Platform Persistent Storage:**
   - Render: Enable Persistent Disk
   - Fly.io: Use volumes

2. **Or Migrate to Database:**
   - MongoDB Atlas (free tier)
   - Supabase (free tier)
   - PostgreSQL (free on most platforms)

---

## 🐛 Troubleshooting

### Build Fails: "Playwright not found"

**Solution:** Add to `package.json`:
```json
{
  "scripts": {
    "postinstall": "npm run playwright:install"
  }
}
```

### Build Fails: "Cannot find module"

**Solution:** Check `package.json` includes all dependencies

### Runtime Error: "ENCRYPTION_KEY not found"

**Solution:** Add environment variable in platform dashboard

### Cron Jobs Not Running

**Solution:** 
- Check platform supports cron jobs
- Verify scheduler is initialized
- Check logs for errors

### Storage Not Persisting

**Solution:**
- Enable persistent disk/volume
- Or migrate to external database

---

## 📚 Additional Resources

- Render Docs: https://render.com/docs
- Fly.io Docs: https://fly.io/docs
- Vercel Docs: https://vercel.com/docs

---

## 🎯 Recommended Setup

**For beginners:** Render ⭐
- Easy setup
- Good free tier
- Reliable service

**For Docker users:** Fly.io
- More control
- Docker-based
- Global edge network

**For advanced users:** Render
- Good balance
- Reliable
- Good documentation

---


