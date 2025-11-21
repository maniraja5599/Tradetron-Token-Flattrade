# 🚂 Railway Quick Start (5 Minutes)

The fastest way to deploy your TradeTron Token Generator for free!

## Step 1: Push to GitHub ✅

Your code is already on GitHub at:
`https://github.com/maniraja5599/Tradetron-Token-Flattrade.git`

## Step 2: Sign Up for Railway

1. Go to **[railway.app](https://railway.app)**
2. Click **"Start a New Project"**
3. Sign up with **GitHub** (easiest way)
4. Authorize Railway to access your repositories

## Step 3: Deploy Your App

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Find and select: `Tradetron-Token-Flattrade`
4. Railway will automatically:
   - Detect it's a Next.js app
   - Start building
   - Install dependencies
   - Install Playwright Chromium

## Step 4: Configure Environment Variables

1. In your Railway project dashboard
2. Go to **"Variables"** tab
3. Click **"New Variable"** and add:

### Required Variables:

```env
ENCRYPTION_KEY=your_random_32_character_minimum_secret_key_here
```

**Generate a secure key:**
```bash
# On Windows PowerShell:
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})

# Or use an online generator:
# https://randomkeygen.com/
```

### Time Window Configuration (Cost Savings):

To restrict server operations to specific hours (e.g., 8:15 AM - 9:00 AM IST):

```env
TIME_WINDOW_START=08:15
TIME_WINDOW_END=09:00
TIME_WINDOW_TIMEZONE=Asia/Kolkata
TIME_WINDOW_ENABLED=true
```

**Note:** Set `TIME_WINDOW_ENABLED=false` to disable and allow 24/7 operations.

See `TIME_WINDOW_CONFIG.md` for detailed configuration options.

### Recommended Variables:

```env
HEADLESS=true
MAX_CONCURRENCY=4
NODE_ENV=production
```

### Optional (Google Sheets):

```env
GOOGLE_SHEETS_API_KEY=your_api_key
# OR
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

## Step 5: Enable Persistent Storage

1. In Railway dashboard → **Settings**
2. Scroll to **"Volumes"** section
3. Click **"Add Volume"**
4. Name: `data`
5. Mount Path: `/app/data`
6. Size: 1GB (free tier)

This ensures your user data and run logs persist!

## Step 6: Get Your Live URL

1. Railway will automatically generate a URL
2. Click on your service
3. Go to **"Settings"** → **"Domains"**
4. Your app is live at: `https://your-app-name.up.railway.app`

## Step 7: Test Your Deployment

1. Visit your live URL
2. You should see the TradeTron Token Generator dashboard
3. Add a test user
4. Click "Run" to test login

## 🎉 Done!

Your app is now live and will:
- ✅ Run 24/7 (on free tier)
- ✅ Persist data across restarts
- ✅ Run scheduled jobs daily
- ✅ Auto-deploy on git push

## 📊 Monitor Your App

- **Logs**: Click "Deployments" → View logs
- **Metrics**: See CPU, Memory usage
- **Usage**: Check your $5/month free credit

## 🔄 Auto-Deploy

Every time you push to GitHub:
```bash
git push
```

Railway automatically:
1. Detects the push
2. Builds your app
3. Deploys the new version
4. Restarts with zero downtime

## 💰 Free Tier Limits

Railway gives you:
- **$5 credit/month** (usually enough for small apps)
- **500 hours** of runtime
- **100GB** bandwidth
- **1GB** storage

For this app, you'll likely use:
- ~$2-3/month (well within free tier)

## 🐛 Troubleshooting

### Build Fails
- Check build logs in Railway dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version (needs 20+)

### App Crashes
- Check logs for errors
- Verify all environment variables are set
- Ensure `ENCRYPTION_KEY` is set correctly

### Data Not Persisting
- Verify volume is mounted correctly
- Check volume mount path: `/app/data`
- Ensure app has write permissions

### Playwright Not Found
- Build command should include: `npm run playwright:install chromium`
- Check build logs for Playwright installation

## 📝 Next Steps

1. **Set up custom domain** (optional)
   - Railway → Settings → Domains
   - Add your custom domain

2. **Enable monitoring** (optional)
   - Use UptimeRobot (free) to monitor uptime
   - Set up alerts for downtime

3. **Backup strategy**
   - Export data regularly from dashboard
   - Or set up automated backups

## 🆘 Need Help?

- Railway Docs: [docs.railway.app](https://docs.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- Check your app logs in Railway dashboard

---

**That's it! Your app is live in under 5 minutes! 🚀**

