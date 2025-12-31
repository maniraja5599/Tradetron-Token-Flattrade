import { RunLog } from '@/types'
import fs from 'fs'
import path from 'path'
import { addNotification } from './notifications'

interface TelegramConfig {
  botToken?: string
  chatId?: string
  enabled?: boolean
}

interface TelegramNotificationSettings {
  individualEnabled: boolean
  batchEnabled: boolean
}

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'telegram-settings.json')

function getNotificationSettings(): TelegramNotificationSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8')
      return JSON.parse(data)
    }
  } catch (error) {
    // Default to enabled if settings file doesn't exist or can't be read
  }
  return { individualEnabled: true, batchEnabled: true }
}

const TELEGRAM_API_URL = 'https://api.telegram.org/bot'

/**
 * Get Telegram configuration from environment variables or config file
 */
export async function getTelegramConfig(): Promise<TelegramConfig> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN || ''
  const chatId = process.env.TELEGRAM_CHAT_ID || ''

  // Check if Telegram is enabled (default: true if both token and chatId are provided)
  const enabled = process.env.TELEGRAM_ENABLED !== 'false' &&
    botToken.length > 0 &&
    chatId.length > 0

  return {
    botToken,
    chatId,
    enabled,
  }
}

/**
 * Send a message to Telegram
 */
async function sendTelegramMessage(botToken: string, chatId: string, message: string): Promise<boolean> {
  try {
    const url = `${TELEGRAM_API_URL}${botToken}/sendMessage`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      console.error(`[Telegram] Failed to send message: ${response.status}`, error)
      return false
    }

    return true
  } catch (error: any) {
    console.error(`[Telegram] Error sending message:`, error.message)
    return false
  }
}

/**
 * Escape HTML special characters for Telegram
 */
function escapeHtml(text: string): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Format run result for Telegram notification
 */
function formatRunNotification(runLog: RunLog): string {
  const status = runLog.status === 'success' ? '✅' : '❌'
  const statusText = runLog.status === 'success' ? 'SUCCESS' : 'FAILED'
  const duration = (runLog.ms / 1000).toFixed(1)

  const time = new Date(runLog.finishedAt).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'short',
    timeStyle: 'medium',
  })

  let message = `<b>${status} Login ${statusText}</b>\n\n`
  message += `<b>User:</b> ${runLog.userName}\n`
  message += `<b>Status:</b> ${statusText}\n`
  message += `<b>Time:</b> ${time} IST\n`
  message += `<b>Duration:</b> ${duration}s\n`

  if (runLog.tokenGenerated) {
    message += `<b>Token:</b> ✅ Generated\n`
  }

  if (runLog.message) {
    const messageText = escapeHtml(runLog.message)
    message += `\n<b>Message:</b>\n<code>${messageText}</code>\n`
  }

  if (runLog.finalUrl) {
    message += `\n<b>Final URL:</b> ${runLog.finalUrl}\n`
  }

  if (runLog.status === 'fail' && runLog.artifactDir) {
    message += `\n⚠️ <i>Check artifacts for error details</i>`
  }

  return message
}

/**
 * Send Telegram notification for a run result
 */
export async function sendRunNotification(runLog: RunLog): Promise<boolean> {
  try {
    // Check if individual notifications are enabled
    const settings = getNotificationSettings()
    if (!settings.individualEnabled) {
      console.log(`[Telegram] Individual notifications are disabled`)
      return false
    }

    const config = await getTelegramConfig()

    if (!config.enabled) {
      console.log(`[Telegram] Notifications disabled or not configured (token: ${config.botToken ? 'set' : 'missing'}, chatId: ${config.chatId ? 'set' : 'missing'})`)
      return false
    }

    if (!config.botToken || !config.chatId) {
      console.log(`[Telegram] Missing configuration (token: ${config.botToken ? 'set' : 'missing'}, chatId: ${config.chatId ? 'set' : 'missing'})`)
      return false
    }

    const message = formatRunNotification(runLog)
    const success = await sendTelegramMessage(config.botToken, config.chatId, message)

    if (success) {
      console.log(`[Telegram] ✅ Notification sent for user: ${runLog.userName} (${runLog.status})`)
      // Add app notification for successful Telegram message
      if (runLog.status === 'success') {
        await addNotification({
          title: 'Telegram Message Sent',
          message: `Successfully sent login status for ${runLog.userName} to Telegram.`,
          type: 'success'
        })
      }
    } else {
      console.log(`[Telegram] ❌ Failed to send notification for user: ${runLog.userName}`)
      // Add app notification for failed Telegram message
      await addNotification({
        title: 'Telegram Message Failed',
        message: `Failed to send login status for ${runLog.userName} to Telegram. Check bot settings.`,
        type: 'error'
      })
    }

    return success
  } catch (error: any) {
    console.error(`[Telegram] Error sending notification:`, error.message)
    return false
  }
}

/**
 * Send a simple text message to Telegram
 */
export async function sendTelegramNotification(message: string): Promise<boolean> {
  try {
    console.log('[Telegram] Sending notification:', message.split('\n')[0])
    const config = await getTelegramConfig()

    if (!config.enabled || !config.botToken || !config.chatId) {
      console.log('[Telegram] Notification skipped - disabled or missing config')
      return false
    }

    return await sendTelegramMessage(config.botToken, config.chatId, message)
  } catch (error: any) {
    console.error(`[Telegram] Error sending notification:`, error.message)
    return false
  }
}

/**
 * Format batch results for Telegram notification
 */
function formatBatchNotification(runLogs: RunLog[], inactiveUsers: string[] = []): string {
  const total = runLogs.length
  const successful = runLogs.filter(r => r.status === 'success').length
  const unsuccessful = runLogs.filter(r => r.status === 'fail').length

  let message = `<b>📊 Batch Results</b>\n\n`
  message += `Total: ${total} | ✅ ${successful} | ❌ ${unsuccessful}`

  // Add inactive users count if any
  if (inactiveUsers.length > 0) {
    message += ` | ⏸️ ${inactiveUsers.length} inactive`
  }
  message += `\n\n`

  // Successful runs
  const successfulRuns = runLogs.filter(r => r.status === 'success')
  if (successfulRuns.length > 0) {
    message += `<b>✅ Successful</b>\n`
    for (const run of successfulRuns) {
      const time = new Date(run.finishedAt).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).toLowerCase()
      const duration = (run.ms / 1000).toFixed(1)
      const tokenText = run.tokenGenerated ? ' ✅ Token' : ''
      message += `${run.userName} - ${time} (${duration}s)${tokenText}\n`
    }
    message += `\n`
  }

  // Unsuccessful runs
  const unsuccessfulRuns = runLogs.filter(r => r.status === 'fail')
  if (unsuccessfulRuns.length > 0) {
    message += `<b>❌ Unsuccessful</b>\n`
    for (const run of unsuccessfulRuns) {
      const time = new Date(run.finishedAt).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).toLowerCase()
      const duration = (run.ms / 1000).toFixed(1)
      message += `${run.userName} - ${time} (${duration}s)\n`
      if (run.message) {
        const errorMessage = escapeHtml(run.message)
        message += `Error: ${errorMessage}\n`
      }
    }
    message += `\n`
    message += `⚠️ Check artifacts for details`
  }

  // Add inactive users section if any
  if (inactiveUsers.length > 0) {
    message += `\n<b>⏸️ Inactive Users (Skipped)</b>\n`
    message += inactiveUsers.join(', ')
    message += `\n`
  }

  return message
}

/**
 * Send Telegram notification for batch results
 */
export async function sendBatchNotification(runLogs: RunLog[], inactiveUsers: string[] = []): Promise<boolean> {
  try {
    // Check if batch notifications are enabled
    const settings = getNotificationSettings()
    if (!settings.batchEnabled) {
      console.log(`[Telegram] Batch notifications are disabled`)
      return false
    }

    const config = await getTelegramConfig()

    if (!config.enabled) {
      console.log(`[Telegram] Notifications disabled or not configured (token: ${config.botToken ? 'set' : 'missing'}, chatId: ${config.chatId ? 'set' : 'missing'})`)
      return false
    }

    if (!config.botToken || !config.chatId) {
      console.log(`[Telegram] Missing configuration (token: ${config.botToken ? 'set' : 'missing'}, chatId: ${config.chatId ? 'set' : 'missing'})`)
      return false
    }

    if (runLogs.length === 0 && inactiveUsers.length === 0) {
      console.log(`[Telegram] No run logs or inactive users to send batch notification`)
      return false
    }

    const message = formatBatchNotification(runLogs, inactiveUsers)
    const success = await sendTelegramMessage(config.botToken, config.chatId, message)

    if (success) {
      const inactiveText = inactiveUsers.length > 0 ? ` (${inactiveUsers.length} inactive skipped)` : ''
      console.log(`[Telegram] ✅ Batch notification sent for ${runLogs.length} runs${inactiveText}`)
      // Add app notification for successful Batch Telegram message
      await addNotification({
        title: 'Batch Telegram Sent',
        message: `Successfully sent batch report for ${runLogs.length} runs to Telegram.`,
        type: 'success'
      })
    } else {
      console.log(`[Telegram] ❌ Failed to send batch notification`)
      // Add app notification for failed Batch Telegram message
      await addNotification({
        title: 'Batch Telegram Failed',
        message: `Failed to send batch report to Telegram. Check bot settings.`,
        type: 'error'
      })
    }

    return success
  } catch (error: any) {
    console.error(`[Telegram] Error sending batch notification:`, error.message)
    return false
  }
}

