# PowerShell script to set up Google Sheets API for TradeTron Token Generator

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Google Sheets API Setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env.local exists
$envFile = ".env.local"
$needsEncryptionKey = $false
$needsApiKey = $false

if (Test-Path $envFile) {
    Write-Host "✓ Found existing .env.local file" -ForegroundColor Green
    $envContent = Get-Content $envFile -Raw
    
    # Check for ENCRYPTION_KEY
    if ($envContent -notmatch "ENCRYPTION_KEY\s*=" -or ($envContent -match "ENCRYPTION_KEY\s*=\s*(your_|change_this|min_32)")) {
        $needsEncryptionKey = $true
        Write-Host "⚠ ENCRYPTION_KEY is missing or not set properly" -ForegroundColor Yellow
    } else {
        Write-Host "✓ ENCRYPTION_KEY is set" -ForegroundColor Green
    }
    
    # Check for GOOGLE_SHEETS_API_KEY
    if ($envContent -notmatch "GOOGLE_SHEETS_API_KEY\s*=" -or ($envContent -match "GOOGLE_SHEETS_API_KEY\s*=\s*(your_|here)")) {
        $needsApiKey = $true
        Write-Host "⚠ GOOGLE_SHEETS_API_KEY is missing or not set" -ForegroundColor Yellow
    } else {
        Write-Host "✓ GOOGLE_SHEETS_API_KEY is set" -ForegroundColor Green
    }
} else {
    Write-Host "⚠ .env.local file not found. Creating new one..." -ForegroundColor Yellow
    $needsEncryptionKey = $true
    $needsApiKey = $true
}

Write-Host ""

# Generate ENCRYPTION_KEY if needed
if ($needsEncryptionKey) {
    Write-Host "Generating ENCRYPTION_KEY..." -ForegroundColor Cyan
    $encryptionKey = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
    Write-Host "✓ Generated encryption key" -ForegroundColor Green
    Write-Host ""
}

# Get Google Sheets API Key
if ($needsApiKey) {
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "Google Sheets API Key Setup" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To get your Google Sheets API Key:" -ForegroundColor Yellow
    Write-Host "1. Go to: https://console.cloud.google.com/" -ForegroundColor White
    Write-Host "2. Create a new project or select an existing one" -ForegroundColor White
    Write-Host "3. Enable 'Google Sheets API'" -ForegroundColor White
    Write-Host "4. Go to Credentials > Create Credentials > API Key" -ForegroundColor White
    Write-Host "5. Copy the API key" -ForegroundColor White
    Write-Host ""
    Write-Host "Your Google Sheet URL:" -ForegroundColor Cyan
    Write-Host "https://docs.google.com/spreadsheets/d/1W7i5AQ77-pklRv0BkDRkFILSkjq4bkvN5vTCQU7YrLA" -ForegroundColor White
    Write-Host ""
    
    $apiKey = Read-Host "Enter your Google Sheets API Key (or press Enter to skip)"
    
    if ([string]::IsNullOrWhiteSpace($apiKey)) {
        Write-Host "⚠ API key not provided. You can add it later to .env.local" -ForegroundColor Yellow
        $apiKey = "your_google_sheets_api_key_here"
    } else {
        Write-Host "✓ API key received" -ForegroundColor Green
    }
    Write-Host ""
}

# Create or update .env.local
Write-Host "Creating/Updating .env.local file..." -ForegroundColor Cyan

$envLines = @()

if ($needsEncryptionKey) {
    $envLines += "ENCRYPTION_KEY=$encryptionKey"
} else {
    # Keep existing ENCRYPTION_KEY
    $existingLines = Get-Content $envFile
    $encryptionKeyLine = $existingLines | Where-Object { $_ -match "ENCRYPTION_KEY\s*=" }
    if ($encryptionKeyLine) {
        $envLines += $encryptionKeyLine
    }
}

if ($needsApiKey) {
    $envLines += "GOOGLE_SHEETS_API_KEY=$apiKey"
} else {
    # Keep existing GOOGLE_SHEETS_API_KEY
    $existingLines = Get-Content $envFile
    $apiKeyLine = $existingLines | Where-Object { $_ -match "GOOGLE_SHEETS_API_KEY\s*=" }
    if ($apiKeyLine) {
        $envLines += $apiKeyLine
    }
}

# Add other common settings if file doesn't exist
if (-not (Test-Path $envFile)) {
    $envLines += ""
    $envLines += "# Optional: Job queue concurrency (default: 4)"
    $envLines += "MAX_CONCURRENCY=4"
    $envLines += ""
    $envLines += "# Optional: Run browser in headless mode (default: true)"
    $envLines += "HEADLESS=true"
    $envLines += ""
    $envLines += "# Optional: Default sheet range (default: Sheet1!A:Z)"
    $envLines += "GOOGLE_SHEETS_RANGE=Sheet1!A:Z"
}

# Write to file
$envLines | Out-File -FilePath $envFile -Encoding utf8 -Force

Write-Host "✓ .env.local file created/updated" -ForegroundColor Green
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart your development server (npm run dev)" -ForegroundColor White
Write-Host "2. Go to http://localhost:3000" -ForegroundColor White
Write-Host "3. Click 'Sync from Google Sheets'" -ForegroundColor White
Write-Host "4. Paste your sheet URL or ID: 1W7i5AQ77-pklRv0BkDRkFILSkjq4bkvN5vTCQU7YrLA" -ForegroundColor White
Write-Host "5. Click 'Sync Now'" -ForegroundColor White
Write-Host ""
Write-Host "If you need to add the API key later, edit .env.local and add:" -ForegroundColor Yellow
Write-Host "GOOGLE_SHEETS_API_KEY=your_actual_api_key_here" -ForegroundColor White
Write-Host ""

