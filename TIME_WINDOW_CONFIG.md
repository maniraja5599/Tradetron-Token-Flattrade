# Time Window Configuration Guide

## Overview

The server has a time window restriction feature that limits operations to specific hours to reduce Railway costs. By default, the server only processes operations from **8:15 AM to 9:00 AM IST**.

## Configuration in Railway

### Step 1: Access Railway Dashboard

1. Go to [Railway Dashboard](https://railway.app)
2. Select your project
3. Click on your service (e.g., "tradetron-token-generator")

### Step 2: Add Environment Variables

1. Click on the **"Variables"** tab
2. Click **"+ New Variable"** for each variable below:

#### Required Variables:

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `TIME_WINDOW_START` | `08:15` | Start time in HH:MM format (24-hour) |
| `TIME_WINDOW_END` | `09:00` | End time in HH:MM format (24-hour) |
| `TIME_WINDOW_TIMEZONE` | `Asia/Kolkata` | Timezone (IST) |
| `TIME_WINDOW_ENABLED` | `true` | Enable/disable time window (`true` or `false`) |

### Step 3: Save and Redeploy

After adding the variables:
1. Railway will automatically detect the changes
2. The service will redeploy automatically
3. Wait for deployment to complete (usually 1-2 minutes)

## Example Configurations

### Default Configuration (8:15 AM - 9:00 AM IST)
```
TIME_WINDOW_START=08:15
TIME_WINDOW_END=09:00
TIME_WINDOW_TIMEZONE=Asia/Kolkata
TIME_WINDOW_ENABLED=true
```

### Extended Window (8:00 AM - 10:00 AM IST)
```
TIME_WINDOW_START=08:00
TIME_WINDOW_END=10:00
TIME_WINDOW_TIMEZONE=Asia/Kolkata
TIME_WINDOW_ENABLED=true
```

### Disable Time Window (24/7 Operations)
```
TIME_WINDOW_ENABLED=false
```
(Other variables can be omitted if disabled)

### Different Timezone (US Eastern Time)
```
TIME_WINDOW_START=08:15
TIME_WINDOW_END=09:00
TIME_WINDOW_TIMEZONE=America/New_York
TIME_WINDOW_ENABLED=true
```

## How It Works

### During Time Window (8:15 AM - 9:00 AM IST)
- ✅ All operations work normally
- ✅ You can run jobs, add users, sync sheets
- ✅ Full functionality available

### Outside Time Window
- ❌ Write operations blocked (returns 503 error)
- ✅ Read-only operations work (viewing dashboard, health checks)
- ✅ Jobs already running will complete
- ✅ Dashboard remains viewable

## Checking Status

### Via Dashboard
1. Go to your dashboard at `https://your-app.railway.app`
2. Check the health card - it shows time window status
3. Look for "Server is active" or "Server is in sleep mode"

### Via API
```bash
curl https://your-app.railway.app/api/health
```

Response includes:
```json
{
  "timeWindow": {
    "enabled": true,
    "active": true,
    "window": {
      "start": "08:15",
      "end": "09:00",
      "timezone": "Asia/Kolkata"
    },
    "status": "Server is active (within time window...)",
    "nextWindow": "11/22/2025, 08:15 AM"
  }
}
```

## Troubleshooting

### Time Window Not Working
1. **Check variables are set correctly:**
   - Go to Railway → Variables tab
   - Verify all 4 variables are present
   - Check values are correct (no extra spaces)

2. **Check timezone:**
   - Ensure `TIME_WINDOW_TIMEZONE` matches your location
   - Common timezones:
     - `Asia/Kolkata` (IST)
     - `America/New_York` (EST)
     - `Europe/London` (GMT)
     - `Asia/Dubai` (GST)

3. **Verify deployment:**
   - Check Railway deployment logs
   - Look for time window initialization messages
   - Ensure no errors during startup

4. **Test with health endpoint:**
   ```bash
   curl https://your-app.railway.app/api/health | jq .timeWindow
   ```

### Disable Time Window Temporarily
Set in Railway Variables:
```
TIME_WINDOW_ENABLED=false
```
Then redeploy (automatic).

## Cost Savings

**Important Note:** Railway still charges for server uptime (24/7). The time window restriction:
- ✅ Blocks operations outside the window (saves processing costs)
- ✅ Reduces unnecessary API calls
- ❌ Does NOT stop the server (Railway still charges for running time)

For maximum cost savings, consider:
- Using Railway's sleep feature (if available)
- Scheduled deployments to start/stop service
- Or keep the time window restriction for operation limits

## Support

If you need help:
1. Check Railway deployment logs
2. Verify environment variables are set correctly
3. Test with the health endpoint
4. Check the dashboard for time window status

