import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'telegram-settings.json')

interface TelegramNotificationSettings {
  individualEnabled: boolean
  batchEnabled: boolean
}

// Default settings
const DEFAULT_SETTINGS: TelegramNotificationSettings = {
  individualEnabled: true,
  batchEnabled: true,
}

function getSettings(): TelegramNotificationSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('[Telegram Settings] Error reading settings:', error)
  }
  return DEFAULT_SETTINGS
}

function saveSettings(settings: TelegramNotificationSettings): void {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(SETTINGS_FILE)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2))
  } catch (error) {
    console.error('[Telegram Settings] Error saving settings:', error)
    throw error
  }
}

export async function GET() {
  try {
    const settings = getSettings()
    return NextResponse.json(settings)
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get settings', message: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { individualEnabled, batchEnabled } = body

    if (typeof individualEnabled !== 'boolean' || typeof batchEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid settings. Both individualEnabled and batchEnabled must be boolean values.' },
        { status: 400 }
      )
    }

    const settings: TelegramNotificationSettings = {
      individualEnabled,
      batchEnabled,
    }

    saveSettings(settings)
    return NextResponse.json({ success: true, settings })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to save settings', message: error.message },
      { status: 500 }
    )
  }
}

