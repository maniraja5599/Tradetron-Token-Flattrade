# Server Deployment Guide

This guide covers deploying to various server types: VPS, dedicated servers, cloud instances, etc.

## 🎯 Quick Deployment Options

### Option 1: Docker (Recommended for VPS/Cloud Servers)

**Best for:** Any Linux server (Ubuntu, Debian, CentOS, etc.)

#### Prerequisites
- Docker and Docker Compose installed
- Port 3000 available (or change in docker-compose.yml)

#### Deployment Steps

1. **Clone your repository:**
   ```bash
   git clone <your-repo-url>
   cd TradeTron-Login-page
   ```

2. **Create `.env` file:**
   ```bash
   cat > .env << EOF
   ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   MAX_CONCURRENCY=4
   HEADLESS=true
   NODE_ENV=production
   EOF
   ```

3. **Start with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

4. **Check logs:**
   ```bash
   docker-compose logs -f
   ```

5. **Access your app:**
   - Local: `http://localhost:3000`
   - Remote: `http://your-server-ip:3000`

#### Reverse Proxy Setup (Nginx)

Create `/etc/nginx/sites-available/tradetron`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/tradetron /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

### Option 2: Direct Node.js Deployment

**Best for:** Servers where you want full control

#### Prerequisites
- Node.js 20+ and npm
- PM2 (process manager) - recommended

#### Deployment Steps

1. **Install Node.js 20+ on your server:**
   ```bash
   # Ubuntu/Debian
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Or use nvm
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 20
   nvm use 20
   ```

2. **Install PM2 (process manager):**
   ```bash
   npm install -g pm2
   ```

3. **Clone and setup:**
   ```bash
   git clone <your-repo-url>
   cd TradeTron-Login-page
   npm install
   npm run playwright:install
   npm run build
   ```

4. **Create `.env.local` file:**
   ```env
   ENCRYPTION_KEY=your_secret_key_min_32_chars_long
   MAX_CONCURRENCY=4
   HEADLESS=true
   NODE_ENV=production
   PORT=3000
   ```

5. **Generate ENCRYPTION_KEY:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

6. **Start with PM2:**
   ```bash
   pm2 start server.js --name tradetron
   pm2 save
   pm2 startup  # Follow instructions to enable auto-start on reboot
   ```

7. **Useful PM2 commands:**
   ```bash
   pm2 logs tradetron          # View logs
   pm2 restart tradetron       # Restart
   pm2 stop tradetron          # Stop
   pm2 status                  # Check status
   ```

---

### Option 3: Cloud Platform Deployment

#### Render.com

1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect GitHub repository
4. Configure:
   - **Name:** tradetron-token-generator
   - **Environment:** Node
   - **Build Command:** `npm run playwright:install && npm run build`
   - **Start Command:** `npm start`
5. Add Environment Variables:
   - `ENCRYPTION_KEY` (32+ characters)
   - `MAX_CONCURRENCY=4`
   - `HEADLESS=true`
   - `NODE_ENV=production`
6. Enable **Persistent Disk** in Advanced settings
   - Mount path: `/opt/render/project/src/data`
7. Deploy!

#### Fly.io

1. Install Fly CLI:
   ```bash
   # Windows
   powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
   
   # Mac/Linux
   curl -L https://fly.io/install.sh | sh
   ```

2. Sign up and login:
   ```bash
   fly auth signup
   fly auth login
   ```

3. Deploy:
   ```bash
   fly launch  # Follow prompts, use existing fly.toml
   fly secrets set ENCRYPTION_KEY=your_key_here
   fly deploy
   ```

#### Vercel

1. Go to https://vercel.com
2. Import your GitHub repository
3. Framework: Next.js (auto-detected)
4. Add Environment Variables:
   - `ENCRYPTION_KEY`
   - `MAX_CONCURRENCY=4`
   - `HEADLESS=true`
5. Deploy!

**⚠️ Note:** Vercel has limitations:
- No persistent file storage (use external DB)
- Limited cron job support
- Consider using external storage (MongoDB, Supabase)

---

### Option 4: Traditional VPS (DigitalOcean, Linode, AWS EC2, etc.)

Follow **Option 2: Direct Node.js Deployment** above, then:

1. **Set up firewall:**
   ```bash
   # Ubuntu/Debian
   sudo ufw allow 22    # SSH
   sudo ufw allow 80     # HTTP
   sudo ufw allow 443    # HTTPS
   sudo ufw enable
   ```

2. **Set up SSL with Certbot (Let's Encrypt):**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

3. **Auto-start with systemd:**

   Create `/etc/systemd/system/tradetron.service`:
   ```ini
   [Unit]
   Description=TradeTron Token Generator
   After=network.target

   [Service]
   Type=simple
   User=your-user
   WorkingDirectory=/path/to/TradeTron-Login-page
   Environment="NODE_ENV=production"
   Environment="PORT=3000"
   ExecStart=/usr/bin/node server.js
   Restart=on-failure

   [Install]
   WantedBy=multi-user.target
   ```

   Enable and start:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable tradetron
   sudo systemctl start tradetron
   sudo systemctl status tradetron
   ```

---

## 🔧 Required Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `ENCRYPTION_KEY` | ✅ Yes | Min 32 characters | Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `MAX_CONCURRENCY` | ❌ No | Job concurrency (default: 4) | `4` |
| `HEADLESS` | ❌ No | Headless browser mode (default: true) | `true` |
| `NODE_ENV` | ❌ No | Environment (default: production) | `production` |
| `PORT` | ❌ No | Server port (default: 3000) | `3000` |

---

## 📝 Post-Deployment Checklist

- [ ] Environment variables set (especially `ENCRYPTION_KEY`)
- [ ] Application builds successfully
- [ ] Server starts without errors
- [ ] Health endpoint works: `http://your-server/api/health`
- [ ] Can access dashboard: `http://your-server/`
- [ ] Persistent storage configured (for `data/` and `artifacts/` folders)
- [ ] SSL certificate installed (for production)
- [ ] Firewall configured
- [ ] Auto-start on reboot configured (PM2 or systemd)

---

## 🐛 Troubleshooting

### Build Fails: "Playwright not found"
```bash
npm run playwright:install
```

### Runtime Error: "ENCRYPTION_KEY not found"
Set the environment variable:
```bash
export ENCRYPTION_KEY=your_key_here
# Or add to .env.local file
```

### Port Already in Use
Change PORT in environment or kill the process:
```bash
# Find process using port 3000
lsof -i :3000
# Kill it
kill -9 <PID>
```

### Browser Not Found (Playwright)
```bash
npm run playwright:install
# Or set CHROMIUM_EXECUTABLE_PATH if using custom Chromium
```

### Check Application Status
```bash
# With PM2
pm2 status
pm2 logs

# With systemd
sudo systemctl status tradetron
sudo journalctl -u tradetron -f

# With Docker
docker-compose logs -f
```

---

## 🔄 Updates and Maintenance

### Update Application
```bash
git pull
npm install
npm run build
pm2 restart tradetron  # or docker-compose restart
```

### Backup Data
```bash
# Backup data folder
tar -czf backup-$(date +%Y%m%d).tar.gz data/
```

---

## 🆘 Need Help?

Check the main `DEPLOYMENT.md` for platform-specific guides, or review logs for specific error messages.

