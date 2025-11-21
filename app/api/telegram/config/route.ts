import { NextRequest, NextResponse } from 'next/server'
import { getTelegramConfig, sendTelegramNotification } from '@/lib/telegram'

export async function GET() {
  try {
    const config = await getTelegramConfig()
    // Don't expose the actual token in the response for security
    return NextResponse.json({
      enabled: config.enabled,
      botTokenConfigured: !!config.botToken,
      chatIdConfigured: !!config.chatId,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get Telegram config' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { testMessage } = body

    if (testMessage) {
      // Send a test message
      const success = await sendTelegramNotification(
        testMessage || '🧪 Test message from TradeTron Token Generator'
      )
      
      if (success) {
        return NextResponse.json({
          success: true,
          message: 'Test message sent successfully',
        })
      } else {
        return NextResponse.json(
          { 
            error: 'Failed to send test message. Check your Telegram configuration (TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID)',
            details: 'Make sure your bot token and chat ID are correct, and the bot has permission to send messages to the chat.',
          },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: false,
      error: 'No test message provided',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to test Telegram notification' },
      { status: 500 }
    )
  }
}

