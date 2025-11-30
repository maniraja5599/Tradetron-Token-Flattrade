import { sendTelegramNotification, getTelegramConfig } from '../lib/telegram'
import { updateSchedule } from '../lib/scheduler'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function test() {
    console.log('Testing Telegram Notification...')
    const config = await getTelegramConfig()
    console.log('Config:', {
        enabled: config.enabled,
        botTokenSet: !!config.botToken,
        chatIdSet: !!config.chatId
    })

    const success = await sendTelegramNotification('🧪 <b>Test Notification</b>\n\nThis is a test from the debug script.')
    console.log('Notification sent:', success)

    if (success) {
        console.log('Now testing updateSchedule notification...')
        console.log('updateSchedule is imported:', typeof updateSchedule === 'function')
    }
}

test().catch(console.error)
