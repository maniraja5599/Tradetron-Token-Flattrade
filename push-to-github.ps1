# Git Push Script for TradeTron Token Generator
# This script commits all changes and pushes to GitHub

$ErrorActionPreference = "Stop"

Write-Host "Preparing to push to GitHub..." -ForegroundColor Cyan

# Navigate to project directory
$projectPath = "E:\Mani\Backup\TradeTron Login page\TradeTron Login page"
Set-Location $projectPath

# Try to find git in common locations
$gitPaths = @(
    "C:\Program Files\Git\cmd\git.exe",
    "C:\Program Files (x86)\Git\cmd\git.exe",
    "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe",
    "$env:ProgramFiles\Git\cmd\git.exe"
)

$gitExe = $null
foreach ($path in $gitPaths) {
    if (Test-Path $path) {
        $gitExe = $path
        break
    }
}

# Try to use git from PATH if not found in common locations
if (-not $gitExe) {
    try {
        $gitExe = (Get-Command git -ErrorAction Stop).Source
    } catch {
        Write-Host "ERROR: Git not found. Please install Git or add it to your PATH." -ForegroundColor Red
        Write-Host "Download Git from: https://git-scm.com/download/win" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Alternatively, you can manually run these commands:" -ForegroundColor Yellow
        Write-Host "  cd `"$projectPath`"" -ForegroundColor Gray
        Write-Host "  git add -A" -ForegroundColor Gray
        Write-Host "  git commit -m `"Clean up unused files and update UI improvements`"" -ForegroundColor Gray
        Write-Host "  git push origin main" -ForegroundColor Gray
        exit 1
    }
}

Write-Host "Using Git: $gitExe" -ForegroundColor Green
Write-Host ""

# Check git status
Write-Host "Checking git status..." -ForegroundColor Cyan
& $gitExe status --short
Write-Host ""

# Add all changes
Write-Host "Staging all changes..." -ForegroundColor Cyan
& $gitExe add -A

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to stage changes" -ForegroundColor Red
    exit 1
}

# Check if there are changes to commit
$status = & $gitExe status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "No changes to commit. Everything is up to date!" -ForegroundColor Yellow
    exit 0
}

# Commit changes
Write-Host "Committing changes..." -ForegroundColor Cyan
$commitMessage = "Clean up unused files and update UI improvements

- Remove empty qr-decoder folder
- Remove commit-and-push.ps1 helper script
- Remove tsconfig.tsbuildinfo build artifact
- Update .gitignore to exclude build artifacts
- Modernize dashboard cards UI with glassmorphism
- Fix optional chaining for health.scheduler properties
- Update text colors for dark background visibility
- Make header fixed on scroll
- Improve card hover effects and animations"

& $gitExe commit -m $commitMessage

if ($LASTEXITCODE -eq 0) {
    Write-Host "Commit successful!" -ForegroundColor Green
    Write-Host ""
    
    # Push to remote
    Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
    & $gitExe push origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Successfully pushed to GitHub!" -ForegroundColor Green
        Write-Host "Repository: https://github.com/maniraja5599/Tradetron-Token-Flattrade.git" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "All done! Your code is now on GitHub." -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "Push failed. You may need to:" -ForegroundColor Yellow
        Write-Host "   - Authenticate with GitHub (git credential helper)" -ForegroundColor Yellow
        Write-Host "   - Check your internet connection" -ForegroundColor Yellow
        Write-Host "   - Verify you have push permissions" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "You can try pushing manually:" -ForegroundColor Yellow
        Write-Host "  git push origin main" -ForegroundColor Gray
    }
} else {
    Write-Host ""
    Write-Host "Commit failed. Check the error above." -ForegroundColor Yellow
}

