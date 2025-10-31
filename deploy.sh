#!/bin/bash

# TradeTron Token Generator - Deployment Script
# Usage: ./deploy.sh [docker|pm2|systemd]

set -e

DEPLOYMENT_TYPE=${1:-docker}
ENCRYPTION_KEY=""

echo "🚀 TradeTron Token Generator - Deployment Script"
echo "=================================================="
echo ""

# Check if ENCRYPTION_KEY is set
if [ -z "$ENCRYPTION_KEY" ]; then
    echo "⚠️  ENCRYPTION_KEY not found in environment"
    echo "📝 Generating a new encryption key..."
    ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    echo "✅ Generated key: $ENCRYPTION_KEY"
    echo ""
    echo "⚠️  IMPORTANT: Save this key securely!"
    echo "   ENCRYPTION_KEY=$ENCRYPTION_KEY"
    echo ""
    read -p "Press Enter to continue..."
fi

case $DEPLOYMENT_TYPE in
    docker)
        echo "🐳 Deploying with Docker..."
        
        # Check if Docker is installed
        if ! command -v docker &> /dev/null; then
            echo "❌ Docker is not installed. Please install Docker first."
            exit 1
        fi
        
        # Check if Docker Compose is installed
        if ! command -v docker-compose &> /dev/null; then
            echo "❌ Docker Compose is not installed. Please install Docker Compose first."
            exit 1
        fi
        
        # Create .env file if it doesn't exist
        if [ ! -f .env ]; then
            echo "📝 Creating .env file..."
            cat > .env << EOF
ENCRYPTION_KEY=$ENCRYPTION_KEY
MAX_CONCURRENCY=4
HEADLESS=true
NODE_ENV=production
EOF
        fi
        
        echo "🏗️  Building and starting containers..."
        docker-compose up -d --build
        
        echo "✅ Deployment complete!"
        echo "📊 View logs: docker-compose logs -f"
        echo "🌐 Access: http://localhost:3000"
        ;;
    
    pm2)
        echo "⚡ Deploying with PM2..."
        
        # Check if Node.js is installed
        if ! command -v node &> /dev/null; then
            echo "❌ Node.js is not installed. Please install Node.js 20+ first."
            exit 1
        fi
        
        # Check if PM2 is installed
        if ! command -v pm2 &> /dev/null; then
            echo "📦 Installing PM2..."
            npm install -g pm2
        fi
        
        echo "📦 Installing dependencies..."
        npm install
        
        echo "🎭 Installing Playwright browsers..."
        npm run playwright:install
        
        echo "🏗️  Building application..."
        npm run build
        
        # Create .env.local if it doesn't exist
        if [ ! -f .env.local ]; then
            echo "📝 Creating .env.local file..."
            cat > .env.local << EOF
ENCRYPTION_KEY=$ENCRYPTION_KEY
MAX_CONCURRENCY=4
HEADLESS=true
NODE_ENV=production
PORT=3000
EOF
        fi
        
        echo "🚀 Starting with PM2..."
        pm2 start server.js --name tradetron
        pm2 save
        pm2 startup
        
        echo "✅ Deployment complete!"
        echo "📊 View logs: pm2 logs tradetron"
        echo "📈 Status: pm2 status"
        echo "🌐 Access: http://localhost:3000"
        ;;
    
    systemd)
        echo "🔧 Setting up systemd service..."
        
        # Check if running as root or with sudo
        if [ "$EUID" -ne 0 ]; then 
            echo "❌ This requires sudo/root access"
            exit 1
        fi
        
        SERVICE_USER=${SUDO_USER:-$USER}
        APP_DIR=$(pwd)
        
        echo "Creating systemd service for user: $SERVICE_USER"
        echo "Application directory: $APP_DIR"
        
        # Create service file
        cat > /etc/systemd/system/tradetron.service << EOF
[Unit]
Description=TradeTron Token Generator
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$APP_DIR
Environment="NODE_ENV=production"
Environment="PORT=3000"
Environment="ENCRYPTION_KEY=$ENCRYPTION_KEY"
Environment="MAX_CONCURRENCY=4"
Environment="HEADLESS=true"
ExecStart=/usr/bin/node $APP_DIR/server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
        
        systemctl daemon-reload
        systemctl enable tradetron
        systemctl start tradetron
        
        echo "✅ Service created and started!"
        echo "📊 Status: systemctl status tradetron"
        echo "📝 Logs: journalctl -u tradetron -f"
        ;;
    
    *)
        echo "❌ Unknown deployment type: $DEPLOYMENT_TYPE"
        echo ""
        echo "Usage: ./deploy.sh [docker|pm2|systemd]"
        echo ""
        echo "Options:"
        echo "  docker   - Deploy using Docker Compose (default)"
        echo "  pm2      - Deploy using PM2 process manager"
        echo "  systemd  - Deploy as systemd service (requires sudo)"
        exit 1
        ;;
esac

echo ""
echo "🎉 Done! Check SERVER_DEPLOYMENT.md for more details."

