#!/usr/bin/env tsx

/**
 * Get Group Chat ID from Telegram
 * 
 * This script helps you get your Telegram group chat ID.
 * 
 * Usage:
 * 1. Add your bot to the group
 * 2. Send a message in the group
 * 3. Run this script: npm run get-group-chat-id
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') })

import { getTelegramConfig } from '../lib/telegram'

async function getGroupChatId() {
  console.log('🔍 Getting Group Chat ID from Telegram...\n')

  const config = await getTelegramConfig()

  if (!config.botToken) {
    console.log('❌ TELEGRAM_BOT_TOKEN is not set')
    console.log('   Please add TELEGRAM_BOT_TOKEN to your .env.local file')
    process.exit(1)
  }

  console.log('✅ Bot Token: Set')
  console.log('')

  // Verify bot token
  try {
    const response = await fetch(`https://api.telegram.org/bot${config.botToken}/getMe`)
    const data = await response.json()

    if (!data.ok) {
      console.log('❌ Bot token is invalid')
      console.log(`   Error: ${data.description}`)
      process.exit(1)
    }

    console.log(`✅ Bot: @${data.result.username} (${data.result.first_name})`)
    console.log('')
  } catch (error: any) {
    console.log('❌ Failed to verify bot token')
    console.log(`   Error: ${error.message}`)
    process.exit(1)
  }

  // Get updates
  console.log('📥 Fetching recent messages...')
  console.log('')
  console.log('⚠️  Make sure you:')
  console.log('   1. Added your bot to the group')
  console.log('   2. Sent at least one message in the group')
  console.log('')

  try {
    const response = await fetch(`https://api.telegram.org/bot${config.botToken}/getUpdates`)
    const data = await response.json()

    if (!data.ok) {
      console.log('❌ Failed to get updates')
      console.log(`   Error: ${data.description}`)
      process.exit(1)
    }

    const updates = data.result || []

    if (updates.length === 0) {
      console.log('⚠️  No messages found')
      console.log('')
      console.log('💡 To get your group chat ID:')
      console.log('   1. Add your bot to the group')
      console.log('   2. Send a message in the group')
      console.log('   3. Run this script again')
      console.log('')
      console.log('   Or use @userinfobot:')
      console.log('   1. Add @userinfobot to your group')
      console.log('   2. Send any message in the group')
      console.log('   3. Copy the Chat ID from the bot\'s response')
      process.exit(0)
    }

    // Find group chats (negative IDs)
    const groupChats = new Map<number, { title?: string; type: string; username?: string }>()

    for (const update of updates) {
      if (update.message && update.message.chat) {
        const chat = update.message.chat
        // Group chats have negative IDs
        if (chat.id < 0) {
          if (!groupChats.has(chat.id)) {
            groupChats.set(chat.id, {
              title: chat.title,
              type: chat.type,
              username: chat.username,
            })
          }
        }
      }
    }

    if (groupChats.size === 0) {
      console.log('⚠️  No group chats found')
      console.log('')
      console.log('💡 To get your group chat ID:')
      console.log('   1. Add your bot to the group')
      console.log('   2. Send a message in the group')
      console.log('   3. Run this script again')
      console.log('')
      console.log('   Or use @userinfobot:')
      console.log('   1. Add @userinfobot to your group')
      console.log('   2. Send any message in the group')
      console.log('   3. Copy the Chat ID from the bot\'s response')
      process.exit(0)
    }

    console.log(`✅ Found ${groupChats.size} group chat(s):\n`)

    for (const [chatId, chatInfo] of groupChats.entries()) {
      console.log(`Group Chat ID: ${chatId}`)
      if (chatInfo.title) {
        console.log(`   Title: ${chatInfo.title}`)
      }
      if (chatInfo.username) {
        console.log(`   Username: @${chatInfo.username}`)
      }
      console.log(`   Type: ${chatInfo.type}`)
      console.log('')
    }

    console.log('📝 To use this chat ID:')
    console.log(`   Add to .env.local: TELEGRAM_CHAT_ID=${Array.from(groupChats.keys())[0]}`)
    console.log('')

    // If multiple groups, show all
    if (groupChats.size > 1) {
      console.log('💡 Multiple groups found. Choose the one you want to use.')
      console.log('')
    }
  } catch (error: any) {
    console.log('❌ Error getting updates')
    console.log(`   Error: ${error.message}`)
    process.exit(1)
  }
}

getGroupChatId().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})

