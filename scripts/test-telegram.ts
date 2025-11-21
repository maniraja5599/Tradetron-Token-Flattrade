#!/usr/bin/env tsx

/**
 * Test Telegram Bot Configuration
 * 
 * This script helps you:
 * 1. Verify your bot token is valid
 * 2. Get your chat ID
 * 3. Test sending a message
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') })

import { getTelegramConfig, sendTelegramNotification } from '../lib/telegram'

async function testTelegram() {
  console.log('🧪 Testing Telegram Configuration...\n')

  // Get configuration
  const config = await getTelegramConfig()

  // Check if bot token is set
  if (!config.botToken) {
    console.log('❌ TELEGRAM_BOT_TOKEN is not set')
    console.log('   Please add TELEGRAM_BOT_TOKEN to your .env.local file')
    process.exit(1)
  }

  // Check if chat ID is set
  if (!config.chatId) {
    console.log('❌ TELEGRAM_CHAT_ID is not set')
    console.log('   Please add TELEGRAM_CHAT_ID to your .env.local file')
    console.log('\n💡 To get your chat ID:')
    console.log('   1. Open Telegram and search for @userinfobot')
    console.log('   2. Start a conversation with @userinfobot')
    console.log('   3. Send any message (e.g., /start)')
    console.log('   4. Copy your Chat ID from the bot\'s response')
    process.exit(1)
  }

  console.log('✅ Bot Token: Set')
  console.log('✅ Chat ID: Set')
  console.log(`✅ Enabled: ${config.enabled ? 'Yes' : 'No'}\n`)

  // Test bot token by calling getMe
  console.log('🔍 Verifying bot token...')
  try {
    const response = await fetch(`https://api.telegram.org/bot${config.botToken}/getMe`)
    const data = await response.json()

    if (data.ok) {
      console.log('✅ Bot token is valid!')
      console.log(`   Bot Name: ${data.result.first_name}`)
      console.log(`   Bot Username: @${data.result.username}`)
      console.log(`   Bot ID: ${data.result.id}\n`)
    } else {
      console.log('❌ Bot token is invalid')
      console.log(`   Error: ${data.description}`)
      process.exit(1)
    }
  } catch (error: any) {
    console.log('❌ Failed to verify bot token')
    console.log(`   Error: ${error.message}`)
    process.exit(1)
  }

  // Test sending a message
  console.log('📤 Testing message sending...')
  try {
    const testMessage = '🧪 Test message from TradeTron Token Generator\n\nIf you receive this message, your Telegram notifications are configured correctly!'
    const success = await sendTelegramNotification(testMessage)

    if (success) {
      console.log('✅ Test message sent successfully!')
      console.log('   Check your Telegram to see the message.\n')
    } else {
      console.log('❌ Failed to send test message')
      console.log('')
      console.log('💡 Common issues:')
      console.log('   1. You haven\'t started a conversation with the bot yet')
      console.log('      → Open Telegram and search for your bot (@manififtobot)')
      console.log('      → Send a message to the bot (e.g., /start)')
      console.log('      → Then run this test again')
      console.log('')
      console.log('   2. Your chat ID might be incorrect')
      console.log('      → Get your chat ID from @userinfobot')
      console.log('      → Make sure you copied the correct ID')
      console.log('')
      console.log('   3. The bot might be blocked')
      console.log('      → Check if you\'ve blocked the bot')
      console.log('      → Unblock the bot and try again')
      process.exit(1)
    }
  } catch (error: any) {
    console.log('❌ Error sending test message')
    console.log(`   Error: ${error.message}`)
    process.exit(1)
  }

  console.log('✅ All tests passed!')
  console.log('   Your Telegram notifications are configured correctly.')
  console.log('   You will receive notifications for each login run.\n')
}

testTelegram().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})

