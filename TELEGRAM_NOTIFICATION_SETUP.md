# Telegram Notification Setup Guide

This guide will help you set up Telegram notifications to receive alerts when login runs complete.

## ⚙️ Prerequisites

1. **Telegram Bot Token**: You need to create a Telegram bot and get its token
2. **Telegram Chat ID**: You need to get your Telegram chat ID where notifications will be sent

## Step 1: Create a Telegram Bot

1. **Open Telegram** and search for [@BotFather](https://t.me/botfather)
2. **Start a conversation** with BotFather
3. **Send the command**: `/newbot`
4. **Follow the instructions**:
   - Choose a name for your bot (e.g., "TradeTron Notifications")
   - Choose a username for your bot (e.g., "tradetron_notifications_bot")
5. **Copy the bot token** that BotFather sends you (it looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

## Step 2: Get Your Chat ID

### Option A: Using @userinfobot (Recommended)

1. **Open Telegram** and search for [@userinfobot](https://t.me/userinfobot)
2. **Start a conversation** with @userinfobot
3. **Send any message** (e.g., `/start`)
4. **Copy your Chat ID** from the bot's response (it's a number like: `123456789`)

### Option B: Using @getidsbot

1. **Open Telegram** and search for [@getidsbot](https://t.me/getidsbot)
2. **Start a conversation** with @getidsbot
3. **Send any message**
4. **Copy your Chat ID** from the bot's response

### Option C: For Group Chats

If you want to receive notifications in a group:

1. **Add your bot to the group**:
   - Open your Telegram group
   - Click on the group name at the top
   - Click "Add Members" or "Add to Group"
   - Search for your bot by username (e.g., `@manififtobot`)
   - Add the bot to the group

2. **Get the group chat ID** (choose one method):

   **Method 1: Using @userinfobot (Easiest)**
   - Add [@userinfobot](https://t.me/userinfobot) to your group
   - Send any message in the group (e.g., `/start` or `test`)
   - The bot will reply with group information
   - Look for "Chat ID" in the response (it will be a negative number like `-123456789`)
   - Copy the Chat ID (including the minus sign)

   **Method 2: Using @getidsbot (Alternative)**
   - Add [@getidsbot](https://t.me/getidsbot) to your group
   - Send any message in the group
   - The bot will reply with the group chat ID
   - Copy the Chat ID (it will be a negative number like `-123456789`)

   **Method 3: Using the Script (Easiest for Developers)**
   - Make sure your bot token is set in `.env.local`
   - Add your bot to the group
   - Send a message in the group
   - Run: `npm run get-group-chat-id`
   - The script will show all group chat IDs found
   - Copy the Chat ID you want to use (it will be a negative number like `-123456789`)

   **Method 4: Using Telegram API (Advanced)**
   - Send a message in the group (after adding your bot)
   - Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Replace `<YOUR_BOT_TOKEN>` with your actual bot token (e.g., `7657983245:AAEx45-05EZOKANiaEnJV9M4V1zeKqaSgBM`)
   - Look for the `"chat"` object in the response
   - Find the `"id"` field for your group (it will be a negative number like `-123456789`)
   - Copy the Chat ID (including the minus sign)

3. **Make the bot an admin** (optional, but recommended):
   - Open your Telegram group
   - Click on the group name at the top
   - Click "Administrators"
   - Click "Add Administrator"
   - Select your bot
   - Give it permission to send messages (usually enabled by default)

## Step 3: Configure Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here

# Optional: Disable Telegram notifications (default: true if both token and chatId are set)
# TELEGRAM_ENABLED=true
```

### Example (Personal Chat)

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789
```

### Example (Group Chat)

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=-123456789
```

**Note:** Group chat IDs are negative numbers (starting with `-`). Make sure to include the minus sign when copying the chat ID.

## Step 4: Test Your Configuration

### Option A: Using the API Endpoint

You can test your Telegram configuration using the API:

```bash
# Test Telegram notification
curl -X POST http://localhost:3000/api/telegram/config \
  -H "Content-Type: application/json" \
  -d '{
    "testMessage": "🧪 Test message from TradeTron Token Generator"
  }'
```

### Option B: Run a Test Login

1. **Start your server**: `npm run dev`
2. **Run a login** for any user (click "Run" next to a user)
3. **Check your Telegram** - you should receive a notification with the run results

## Step 5: Verify Notifications

After configuring Telegram:

1. **Run a test login** for any user
2. **Check your Telegram** - you should receive a notification like:

```
✅ Login SUCCESS

User: John Doe
Status: SUCCESS
Time: 1/15/2024, 10:30:45 AM IST
Duration: 12.5s
Token: ✅ Generated

Message:
Token generated successfully
```

Or for failures:

```
❌ Login FAILED

User: John Doe
Status: FAILED
Time: 1/15/2024, 10:30:45 AM IST
Duration: 8.2s

Message:
Invalid credentials

⚠️ Check artifacts for error details
```

## What Gets Sent

After each login run (success or failure), you'll receive a Telegram notification with:

- **Status**: ✅ SUCCESS or ❌ FAILED
- **User Name**: The name of the user who ran the login
- **Time**: Timestamp in IST timezone
- **Duration**: How long the login took (in seconds)
- **Token Status**: Whether a token was generated (for successful runs)
- **Message**: Success message or error details
- **Final URL**: The final URL after login (if available)
- **Artifact Info**: Reminder to check artifacts for failed runs

## Troubleshooting

### Error: "Telegram notifications disabled or not configured"

**Problem:** Environment variables are not set or bot token/chat ID is missing.

**Solution:**
- Check that `TELEGRAM_BOT_TOKEN` is set in `.env.local`
- Check that `TELEGRAM_CHAT_ID` is set in `.env.local`
- Restart your server after adding environment variables

### Error: "Failed to send message: 401"

**Problem:** Invalid bot token.

**Solution:**
- Verify your bot token is correct
- Make sure you copied the entire token from BotFather
- Check that there are no extra spaces or characters

### Error: "Failed to send message: 400"

**Problem:** Invalid chat ID or bot doesn't have permission to send messages.

**Solution:**
- Verify your chat ID is correct
- Make sure you've started a conversation with the bot (send `/start` to your bot)
- If using a group, make sure the bot is added to the group
- If using a group, make sure the bot has permission to send messages

### Error: "Failed to send message: 403"

**Problem:** Bot is blocked or doesn't have permission.

**Solution:**
- Make sure you haven't blocked the bot
- If using a group, make sure the bot is still in the group
- Check that the bot has permission to send messages in the group

### Notifications Not Sending

**Check:**
1. Are environment variables set correctly?
2. Is `TELEGRAM_ENABLED` set to `false`? (should be `true` or not set)
3. Did you restart the server after changing environment variables?
4. Check console logs for error messages
5. Test using the API endpoint first (see Step 4)

## Security Notes

- **Never commit your bot token to version control**
- Store your bot token securely in `.env.local` (which should be in `.gitignore`)
- Don't share your bot token publicly
- Use environment variables for production deployments (Render, Railway, etc.)
- Consider using a separate bot for production vs. development

## Environment Variables for Cloud Deployments

For cloud deployments (Render, Railway, etc.), add the environment variables in your platform's dashboard:

### Render
1. Go to your service settings
2. Click "Environment"
3. Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`
4. Redeploy your service

### Railway
1. Go to your project settings
2. Click "Variables"
3. Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`
4. Redeploy your service

## Disabling Notifications

To disable Telegram notifications without removing the configuration:

```env
TELEGRAM_ENABLED=false
```

Or simply remove `TELEGRAM_BOT_TOKEN` or `TELEGRAM_CHAT_ID` from your environment variables.

## Multiple Chat IDs (Group Notifications)

If you want to send notifications to multiple chats or groups, you'll need to modify the code to support multiple chat IDs. Currently, the system supports one chat ID per deployment.

For multiple notifications, you can:
1. Create a Telegram group
2. Add your bot to the group
3. Use the group chat ID as `TELEGRAM_CHAT_ID`
4. All members of the group will receive notifications

