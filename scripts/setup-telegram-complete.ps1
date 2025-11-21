# Setup Telegram Bot Configuration - Complete
# This script adds both bot token and chat ID to .env.local

$botToken = "7657983245:AAEx45-05EZOKANiaEnJV9M4V1zeKqaSgBM"
$chatId = "1442996522"
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
        if (-not $content.EndsWith("`n")) {
            $content += "`n"
        }
        $content += "# Telegram Notifications`n"
        $content += "TELEGRAM_BOT_TOKEN=$botToken`n"
    }
    
    # Check if TELEGRAM_CHAT_ID already exists
    if ($content -match "TELEGRAM_CHAT_ID") {
        Write-Host "TELEGRAM_CHAT_ID already exists in .env.local" -ForegroundColor Yellow
        Write-Host "Updating with new chat ID..." -ForegroundColor Yellow
        $content = $content -replace "TELEGRAM_CHAT_ID=.*", "TELEGRAM_CHAT_ID=$chatId"
    } else {
        Write-Host "Adding TELEGRAM_CHAT_ID to .env.local" -ForegroundColor Green
        $content += "TELEGRAM_CHAT_ID=$chatId`n"
    }
    
    # Write updated content
    Set-Content -Path $envFile -Value $content -NoNewline
    
    Write-Host ""
    Write-Host "Telegram configuration added to .env.local" -ForegroundColor Green
    Write-Host ""
    Write-Host "Configuration:" -ForegroundColor Cyan
    Write-Host "  Bot Token: $botToken" -ForegroundColor White
    Write-Host "  Chat ID: $chatId" -ForegroundColor White
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Run: npm run test:telegram" -ForegroundColor White
    Write-Host "  2. Restart your server" -ForegroundColor White
    Write-Host "  3. Run a test login to receive notifications" -ForegroundColor White
} else {
    Write-Host ".env.local file not found" -ForegroundColor Yellow
    Write-Host "Creating .env.local with Telegram configuration..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "WARNING: You need to add ENCRYPTION_KEY and other required variables!" -ForegroundColor Red
    Write-Host ""
    
    $content = "# Telegram Notifications`n"
    $content += "TELEGRAM_BOT_TOKEN=$botToken`n"
    $content += "TELEGRAM_CHAT_ID=$chatId`n"
    
    Set-Content -Path $envFile -Value $content -NoNewline
    
    Write-Host "Created .env.local with Telegram configuration" -ForegroundColor Green
    Write-Host ""
    Write-Host "Configuration:" -ForegroundColor Cyan
    Write-Host "  Bot Token: $botToken" -ForegroundColor White
    Write-Host "  Chat ID: $chatId" -ForegroundColor White
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Add ENCRYPTION_KEY (min 32 characters) to .env.local" -ForegroundColor White
    Write-Host "  2. Run: npm run test:telegram" -ForegroundColor White
    Write-Host "  3. Restart your server" -ForegroundColor White
}

Write-Host ""

