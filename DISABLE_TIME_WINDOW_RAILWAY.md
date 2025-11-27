# How to Disable Time Window Restriction on Railway

The time window restriction is now **disabled by default** in the code. However, if it's currently enabled on your Railway deployment, you can disable it using one of the following methods:

## Method 1: Using Railway Environment Variables (Recommended)

1. Go to [Railway Dashboard](https://railway.app)
2. Select your project: **Tradetron Token Flattrade**
3. Click on your service
4. Go to the **"Variables"** tab
5. Find the variable `TIME_WINDOW_ENABLED` and set it to `false`
   - If it doesn't exist, click **"+ New Variable"**
   - Variable Name: `TIME_WINDOW_ENABLED`
   - Value: `false`
6. Railway will automatically redeploy your service
7. Wait for deployment to complete (usually 1-2 minutes)

## Method 2: Using the Settings Page in the App

1. Visit your Railway app: https://tradetron-token-flattrade-tradetron.up.railway.app/settings
2. Scroll to the **"Time Window Settings"** section
3. Uncheck the **"Enable Time Window"** checkbox
4. Click **"Save Settings"**
5. The change will be saved to the config file and take effect immediately

## Method 3: Remove the Environment Variable

If `TIME_WINDOW_ENABLED` is set to `true` in Railway:
1. Go to Railway Dashboard → Your Service → Variables
2. Delete or remove the `TIME_WINDOW_ENABLED` variable
3. Railway will redeploy automatically
4. The server will default to **disabled** (24/7 operations)

## Verify It's Disabled

After making changes, verify the time window is disabled:

1. **Check the Dashboard**: Visit https://tradetron-token-flattrade-tradetron.up.railway.app
   - Look for "Server is active" status (should not mention time window restrictions)

2. **Check via API**:
   ```bash
   curl https://tradetron-token-flattrade-tradetron.up.railway.app/api/health
   ```
   The response should show:
   ```json
   {
     "timeWindow": {
       "enabled": false,
       "active": true
     }
   }
   ```

## Important Notes

- **After the code update**: The time window is now **disabled by default**, so new deployments will not have restrictions unless explicitly enabled
- **Existing deployments**: If you have `TIME_WINDOW_ENABLED=true` set, you need to change it to `false` or remove it
- **Cost consideration**: With time window disabled, the server runs 24/7, which may increase Railway costs

## Quick Fix Command (if you have Railway CLI)

```bash
railway variables set TIME_WINDOW_ENABLED=false
```

