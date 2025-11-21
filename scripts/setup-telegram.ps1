# Setup Telegram Bot Configuration
# This script helps you add your Telegram bot token to .env.local

$botToken = "7657983245:AAEx45-05EZOKANiaEnJV9M4V1zeKqaSgBM"
$envFile = ".env.local"

Write-Host "Setting up Telegram Bot Configuration..." -ForegroundColor Cyan
Write-Host ""

# Check if .env.local exists
if (Test-Path $envFile) {
    Write-Host "Found .env.local file" -ForegroundColor Green
    
    # Read existing content
    $content = Get-Content $envFile -Raw
    
    # Check if TELEGRAM_BOT_TOKEN already exists
    if ($content -match "TELEGRAM_BOT_TOKEN") {
        Write-Host "TELEGRAM_BOT_TOKEN already exists in .env.local" -ForegroundColor Yellow
        Write-Host "Updating with new token..." -ForegroundColor Yellow
        $content = $content -replace "TELEGRAM_BOT_TOKEN=.*", "TELEGRAM_BOT_TOKEN=$botToken"
    } else {
        Write-Host "Adding TELEGRAM_BOT_TOKEN to .env.local" -ForegroundColor Green
        $content += "`n# Telegram Notifications`n"
        $content += "TELEGRAM_BOT_TOKEN=$botToken`n"
    }
    
    # Check if TELEGRAM_CHAT_ID exists
    if ($content -notmatch "TELEGRAM_CHAT_ID") {
        Write-Host "TELEGRAM_CHAT_ID not found" -ForegroundColor Yellow
        Write-Host "Adding placeholder for TELEGRAM_CHAT_ID" -ForegroundColor Yellow
        $content += "TELEGRAM_CHAT_ID=your_chat_id_here`n"
        Write-Host ""
        Write-Host "To get your chat ID:" -ForegroundColor Cyan
        Write-Host "  1. Open Telegram and search for @userinfobot" -ForegroundColor White
        Write-Host "  2. Start a conversation with @userinfobot" -ForegroundColor White
        Write-Host "  3. Send any message (e.g. /start)" -ForegroundColor White
        Write-Host "  4. Copy your Chat ID from the bots response" -ForegroundColor White
        Write-Host "  5. Update TELEGRAM_CHAT_ID in .env.local" -ForegroundColor White
    }
    
    # Write updated content
    Set-Content -Path $envFile -Value $content -NoNewline
    
    Write-Host ""
    Write-Host "Telegram bot token added to .env.local" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Get your chat ID from @userinfobot on Telegram" -ForegroundColor White
    Write-Host "  2. Update TELEGRAM_CHAT_ID in .env.local" -ForegroundColor White
    Write-Host "  3. Run: npm run test:telegram" -ForegroundColor White
    Write-Host "  4. Restart your server" -ForegroundColor White
} else {
    Write-Host ".env.local file not found" -ForegroundColor Yellow
    Write-Host "Creating .env.local with Telegram configuration..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "WARNING: You need to add ENCRYPTION_KEY and other required variables!" -ForegroundColor Red
    Write-Host ""
    
    $content = "# Telegram Notifications`n"
    $content += "TELEGRAM_BOT_TOKEN=$botToken`n"
    $content += "TELEGRAM_CHAT_ID=your_chat_id_here`n"
    
    Set-Content -Path $envFile -Value $content -NoNewline
    
    Write-Host "Created .env.local with Telegram configuration" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Add ENCRYPTION_KEY (min 32 characters) to .env.local" -ForegroundColor White
    Write-Host "  2. Get your chat ID from @userinfobot on Telegram" -ForegroundColor White
    Write-Host "  3. Update TELEGRAM_CHAT_ID in .env.local" -ForegroundColor White
    Write-Host "  4. Run: npm run test:telegram" -ForegroundColor White
}

Write-Host ""
