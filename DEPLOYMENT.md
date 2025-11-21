# 🚀 Free Hosting Deployment Guide

This guide covers deploying the TradeTron Token Generator to free hosting platforms.

## ⚠️ Important Considerations

This application has specific requirements:
- **Persistent Storage**: Uses file-based JSON storage (`data/` directory)
- **Long-Running Process**: Needs a persistent server for cron jobs
- **Playwright**: Requires Chromium browser installation
- **Environment Variables**: Needs encryption keys and optional Google Sheets config

## 🎯 Recommended Platforms

### 1. **Railway** (⭐ Best Choice)
- ✅ Free tier: $5 credit/month (enough for small apps)
- ✅ Persistent file storage
- ✅ Long-running processes
- ✅ Easy environment variable setup
- ✅ Automatic deployments from GitHub

### 2. **Fly.io**
- ✅ Free tier: 3 shared VMs
- ✅ Persistent volumes
- ✅ Good for long-running apps
- ⚠️ More complex setup

---

## 📦 Option 1: Railway (Recommended)

### Step 1: Prepare Your Repository

Ensure your code is pushed to GitHub:
```bash
git add .
git commit -m "Prepare for deployment"
git push
```

### Step 2: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your repository

### Step 3: Configure Build Settings

Railway will auto-detect Next.js. Configure:

**Build Command:**
```bash
npm install && npm run playwright:install chromium
```

**Start Command:**
```bash
npm start
```

### Step 4: Set Environment Variables

In Railway dashboard → Variables tab, add:

```env
ENCRYPTION_KEY=your_secret_encryption_key_min_32_chars_long
MAX_CONCURRENCY=4
HEADLESS=true
NODE_ENV=production
PORT=3000
```

**Optional (Google Sheets):**
```env
GOOGLE_SHEETS_API_KEY=your_api_key
# OR
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

### Step 5: Enable Persistent Storage

1. In Railway dashboard → Settings
2. Enable "Persistent Storage" or use Railway's volume feature
3. The `data/` directory will persist across deployments

### Step 6: Deploy

Railway will automatically:
- Build your app
- Install dependencies
- Install Playwright Chromium
- Start your application

Your app will be live at: `https://your-app-name.up.railway.app`

---

## 📦 Option 2: Fly.io

### Step 1: Install Fly CLI

```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# Mac/Linux
curl -L https://fly.io/install.sh | sh
```

### Step 2: Login

```bash
fly auth login
```

### Step 3: Create Fly App

```bash
fly launch
```

Follow prompts:
- App name: tradetron-token-generator
- Region: Choose closest
- PostgreSQL: No (we use file storage)
- Redis: No

### Step 4: Create fly.toml

Create `fly.toml` in project root:

```toml
app = "tradetron-token-generator"
primary_region = "iad"

[build]
  builder = "heroku/buildpacks:20"

[env]
  NODE_ENV = "production"
  PORT = "8080"

[[services]]
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]
    force_https = true

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

[[mounts]]
  source = "data_volume"
  destination = "/app/data"
```

### Step 5: Create Volume

```bash
fly volumes create data_volume --size 1
```

### Step 6: Set Secrets

```bash
fly secrets set ENCRYPTION_KEY=your_secret_key_min_32_chars
fly secrets set HEADLESS=true
fly secrets set MAX_CONCURRENCY=4
```

### Step 7: Deploy

```bash
fly deploy
```

---

## 🔧 Required Code Changes for Deployment

### 1. Update package.json start script

Ensure `package.json` has:

```json
{
  "scripts": {
    "start": "next start -p ${PORT:-3000}"
  }
}
```

### 2. Create vercel.json (if using Vercel)

If you want to try Vercel (requires database migration):

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install && npm run playwright:install chromium",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

**⚠️ Note:** Vercel is serverless. You'll need to:
- Migrate from file storage to a database (MongoDB Atlas free tier, Supabase, etc.)
- Use external cron service (cron-job.org, EasyCron) for scheduling
- Store Playwright artifacts in cloud storage (S3, Cloudinary)

---

## 🗄️ Alternative: Database Migration (For Serverless)

If you want to use Vercel/Netlify, migrate to a database:

### Option A: MongoDB Atlas (Free)

1. Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster
3. Get connection string
4. Install: `npm install mongodb`
5. Update `lib/db.ts` to use MongoDB instead of JSON files

### Option B: Supabase (Free PostgreSQL)

1. Sign up at [supabase.com](https://supabase.com)
2. Create project
3. Get connection string
4. Install: `npm install @supabase/supabase-js`
5. Update `lib/db.ts` to use Supabase

### Option C: PlanetScale (Free MySQL)

1. Sign up at [planetscale.com](https://planetscale.com)
2. Create database
3. Get connection string
4. Install: `npm install @planetscale/database`
5. Update `lib/db.ts` to use PlanetScale

---

## 🔐 Security Checklist

Before deploying:

- [ ] Generate strong `ENCRYPTION_KEY` (32+ characters, random)
- [ ] Never commit `.env` files
- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS (most platforms do this automatically)
- [ ] Review and restrict access if needed

---

## 📊 Platform Comparison

| Feature | Railway | Fly.io | Vercel |
|---------|---------|--------|--------|
| **Free Tier** | $5/month credit | 3 VMs free | Generous free |
| **Persistent Storage** | ✅ Yes | ✅ Yes | ❌ No (need DB) |
| **Long-Running** | ✅ Yes | ✅ Yes | ❌ Serverless |
| **Auto Deploy** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Setup Difficulty** | ⭐ Easy | ⭐⭐ Medium | ⭐ Easy |
| **Best For** | This app | This app | Needs DB migration |

---

## 🚀 Quick Start: Railway (5 Minutes)

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Sign up Railway**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

3. **Deploy**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repo

4. **Add Environment Variables**
   - Go to Variables tab
   - Add `ENCRYPTION_KEY` (generate a random 32+ char string)
   - Add `HEADLESS=true`
   - Add `MAX_CONCURRENCY=4`

5. **Done!** Your app is live 🎉

---

## 🐛 Troubleshooting

### Playwright not found
- Ensure build command includes: `npm run playwright:install chromium`
- Check platform supports installing system dependencies

### Data not persisting
- Enable persistent storage/volumes
- Check mount points are correct
- Verify write permissions

### Scheduler not working
- Ensure app stays running (not serverless)
- Check cron job is initialized on startup
- Verify timezone settings

### Build fails
- Check Node.js version (needs 20+)
- Review build logs
- Ensure all dependencies are in `package.json`

---

## 📝 Next Steps After Deployment

1. **Test the deployment**
   - Visit your live URL
   - Add a test user
   - Run a test login

2. **Monitor logs**
   - Check platform's log viewer
   - Monitor for errors

3. **Set up monitoring** (optional)
   - Use UptimeRobot (free) for uptime monitoring
   - Set up alerts for failures

4. **Backup strategy**
   - Export data regularly
   - Consider automated backups

---

## 💡 Tips

- **Railway** is recommended for easiest setup
- **Render** is good if you need more free resources
- **Fly.io** offers more control but requires CLI
- Always test locally first with `npm run build && npm start`
- Keep your `ENCRYPTION_KEY` secure and backed up
- Monitor your free tier usage to avoid unexpected charges

---

## 📞 Need Help?

- Check platform documentation
- Review application logs
- Test locally first: `npm run build && npm start`
- Ensure all environment variables are set correctly

