#!/bin/bash

# Bash script to set up Google Sheets API for TradeTron Token Generator

echo "================================================"
echo "Google Sheets API Setup"
echo "================================================"
echo ""

# Check if .env.local exists
ENV_FILE=".env.local"
NEEDS_ENCRYPTION_KEY=false
NEEDS_API_KEY=false

if [ -f "$ENV_FILE" ]; then
    echo "✓ Found existing .env.local file"
    
    # Check for ENCRYPTION_KEY
    if ! grep -q "^ENCRYPTION_KEY=" "$ENV_FILE" || grep -q "ENCRYPTION_KEY=.*your_\|change_this\|min_32" "$ENV_FILE"; then
        NEEDS_ENCRYPTION_KEY=true
        echo "⚠ ENCRYPTION_KEY is missing or not set properly"
    else
        echo "✓ ENCRYPTION_KEY is set"
    fi
    
    # Check for GOOGLE_SHEETS_API_KEY
    if ! grep -q "^GOOGLE_SHEETS_API_KEY=" "$ENV_FILE" || grep -q "GOOGLE_SHEETS_API_KEY=.*your_\|here" "$ENV_FILE"; then
        NEEDS_API_KEY=true
        echo "⚠ GOOGLE_SHEETS_API_KEY is missing or not set"
    else
        echo "✓ GOOGLE_SHEETS_API_KEY is set"
    fi
else
    echo "⚠ .env.local file not found. Creating new one..."
    NEEDS_ENCRYPTION_KEY=true
    NEEDS_API_KEY=true
fi

echo ""

# Generate ENCRYPTION_KEY if needed
if [ "$NEEDS_ENCRYPTION_KEY" = true ]; then
    echo "Generating ENCRYPTION_KEY..."
    ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -d '\n')
    echo "✓ Generated encryption key"
    echo ""
fi

# Get Google Sheets API Key
if [ "$NEEDS_API_KEY" = true ]; then
    echo "================================================"
    echo "Google Sheets API Key Setup"
    echo "================================================"
    echo ""
    echo "To get your Google Sheets API Key:"
    echo "1. Go to: https://console.cloud.google.com/"
    echo "2. Create a new project or select an existing one"
    echo "3. Enable 'Google Sheets API'"
    echo "4. Go to Credentials > Create Credentials > API Key"
    echo "5. Copy the API key"
    echo ""
    echo "Your Google Sheet URL:"
    echo "https://docs.google.com/spreadsheets/d/1W7i5AQ77-pklRv0BkDRkFILSkjq4bkvN5vTCQU7YrLA"
    echo ""
    
    read -p "Enter your Google Sheets API Key (or press Enter to skip): " API_KEY
    
    if [ -z "$API_KEY" ]; then
        echo "⚠ API key not provided. You can add it later to .env.local"
        API_KEY="your_google_sheets_api_key_here"
    else
        echo "✓ API key received"
    fi
    echo ""
fi

# Create or update .env.local
echo "Creating/Updating .env.local file..."

if [ "$NEEDS_ENCRYPTION_KEY" = true ]; then
    echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" > "$ENV_FILE"
else
    # Keep existing ENCRYPTION_KEY
    grep "^ENCRYPTION_KEY=" "$ENV_FILE" > "$ENV_FILE.tmp" 2>/dev/null || echo "" > "$ENV_FILE.tmp"
    mv "$ENV_FILE.tmp" "$ENV_FILE"
fi

if [ "$NEEDS_API_KEY" = true ]; then
    echo "GOOGLE_SHEETS_API_KEY=$API_KEY" >> "$ENV_FILE"
else
    # Keep existing GOOGLE_SHEETS_API_KEY
    grep "^GOOGLE_SHEETS_API_KEY=" "$ENV_FILE" >> "$ENV_FILE" 2>/dev/null || true
fi

# Add other common settings if file doesn't exist or is new
if [ "$NEEDS_ENCRYPTION_KEY" = true ] && [ "$NEEDS_API_KEY" = true ]; then
    echo "" >> "$ENV_FILE"
    echo "# Optional: Job queue concurrency (default: 4)" >> "$ENV_FILE"
    echo "MAX_CONCURRENCY=4" >> "$ENV_FILE"
    echo "" >> "$ENV_FILE"
    echo "# Optional: Run browser in headless mode (default: true)" >> "$ENV_FILE"
    echo "HEADLESS=true" >> "$ENV_FILE"
    echo "" >> "$ENV_FILE"
    echo "# Optional: Default sheet range (default: Sheet1!A:Z)" >> "$ENV_FILE"
    echo "GOOGLE_SHEETS_RANGE=Sheet1!A:Z" >> "$ENV_FILE"
fi

echo "✓ .env.local file created/updated"
echo ""
echo "================================================"
echo "Setup Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Restart your development server (npm run dev)"
echo "2. Go to http://localhost:3000"
echo "3. Click 'Sync from Google Sheets'"
echo "4. Paste your sheet URL or ID: 1W7i5AQ77-pklRv0BkDRkFILSkjq4bkvN5vTCQU7YrLA"
echo "5. Click 'Sync Now'"
echo ""
echo "If you need to add the API key later, edit .env.local and add:"
echo "GOOGLE_SHEETS_API_KEY=your_actual_api_key_here"
echo ""

