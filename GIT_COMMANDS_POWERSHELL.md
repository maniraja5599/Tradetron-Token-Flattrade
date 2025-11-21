# Git Commands for PowerShell

PowerShell doesn't support `&&` for chaining commands. Use these alternatives:

## ✅ Correct PowerShell Syntax

### Option 1: Use Semicolon (;)
```powershell
git add -A; git commit -m "message"; git push
```

### Option 2: Separate Commands (Recommended)
```powershell
git add -A
git commit -m "message"
git push
```

### Option 3: Use -and Operator (for conditional)
```powershell
git add -A -and git commit -m "message" -and git push
```

### Option 4: Use PowerShell's Pipeline
```powershell
git add -A; if ($?) { git commit -m "message" }; if ($?) { git push }
```

## ❌ What Doesn't Work in PowerShell

```powershell
# This will FAIL:
git add -A && git commit -m "message" && git push
```

## 📝 Common Git Workflows

### Add, Commit, Push
```powershell
git add -A
git commit -m "Your commit message"
git push
```

### Add All and Commit
```powershell
git add .
git commit -m "Update files"
```

### Push to Specific Branch
```powershell
git push origin main
```

### Check Status First
```powershell
git status
git add -A
git commit -m "message"
git push
```

## 🔧 Create PowerShell Aliases (Optional)

Add to your PowerShell profile (`$PROFILE`):

```powershell
# Git shortcuts
function gacp { param($msg) git add -A; git commit -m $msg; git push }
function gac { param($msg) git add -A; git commit -m $msg }
function gs { git status }
function gl { git log --oneline -10 }
```

Then use:
```powershell
gacp "My commit message"
```

## 💡 Tip

For Windows, you can also use Git Bash which supports `&&`:
```bash
git add -A && git commit -m "message" && git push
```

