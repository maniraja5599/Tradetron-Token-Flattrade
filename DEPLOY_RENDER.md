# Deploy to Render (Free Tier)

This guide explains how to deploy the Tradetron Token Generator to Render's **Free Web Service** tier.

## Prerequisites
- A GitHub account with this repository.
- A [Render](https://render.com/) account.

## Steps

1.  **Sign up/Log in to Render**: Go to [dashboard.render.com](https://dashboard.render.com/).
2.  **Create New Blueprint**:
    - Click **New +** button.
    - Select **Blueprint**.
    - Connect your GitHub account if not already connected.
    - Select the `Tradetron-Token-Flattrade` repository.
3.  **Configure**:
    - Render will automatically detect the `render.yaml` file.
    - It will prompt you to enter the **Environment Variables** defined in the file (`SECRET_KEY`, `CRON_SECRET`, etc.).
    - Enter the values from your local `.env.local` file.
4.  **Deploy**:
    - Click **Apply**.
    - Render will start building your application using the Dockerfile.
    - This may take 5-10 minutes.

## Free Tier Limitations
- **Memory:** 512MB RAM. We have configured the app to run with low memory (`MAX_CONCURRENCY=1`), but heavy usage might still cause restarts.
- **Spin Down:** The server will **sleep after 15 minutes of inactivity**.
    - When you open the URL after it sleeps, it will take **~1 minute to wake up**.
    - **Cron Jobs:** Internal cron jobs (like auto-login at 8:30 AM) **WILL NOT RUN** if the server is asleep.
    - **Solution:** You must use an external uptime monitor (like [UptimeRobot](https://uptimerobot.com/)) to ping your Render URL every 5 minutes to keep it awake during trading hours.

## Environment Variables
Make sure to add these in the Render Dashboard if you didn't during setup:
- `SECRET_KEY`: (Generate a random string)
- `CRON_SECRET`: (Your cron secret)
- `GOOGLE_SHEETS_URL`: (Your Google Sheet URL)
- `TELEGRAM_BOT_TOKEN`: (Your Bot Token)
- `TELEGRAM_CHAT_ID`: (Your Chat ID)
