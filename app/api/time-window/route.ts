import { NextRequest, NextResponse } from 'next/server'
import { getTimeWindow, TimeWindow } from '@/lib/timeWindow'
import { readJsonFile, writeJsonFile } from '@/lib/db'
import path from 'path'
import fs from 'fs/promises'

const DATA_DIR = path.join(process.cwd(), 'data')
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')

async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }
}

export async function GET() {
  try {
    const { getTimeWindow, isTimeWindowEnabled } = await import('@/lib/timeWindow')
    const window = await getTimeWindow()
    const enabled = await isTimeWindowEnabled()
    return NextResponse.json({
      success: true,
      timeWindow: window,
      enabled,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { startHour, startMinute, endHour, endMinute, timezone, enabled } = body

    // Validate inputs
    if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23) {
      return NextResponse.json(
        { error: 'Hours must be between 0 and 23' },
        { status: 400 }
      )
    }

    if (startMinute < 0 || startMinute > 59 || endMinute < 0 || endMinute > 59) {
      return NextResponse.json(
        { error: 'Minutes must be between 0 and 59' },
        { status: 400 }
      )
    }

    const timeWindow: TimeWindow = {
      startHour: parseInt(startHour),
      startMinute: parseInt(startMinute),
      endHour: parseInt(endHour),
      endMinute: parseInt(endMinute),
      timezone: timezone || 'Asia/Kolkata',
    }

    // Save to config file
    await ensureDataDir()
    const config = await readJsonFile<any>(CONFIG_FILE, {})
    config.timeWindow = timeWindow
    config.timeWindowEnabled = enabled !== undefined ? enabled : true
    await writeJsonFile(CONFIG_FILE, config)

    return NextResponse.json({
      success: true,
      message: 'Time window settings saved successfully',
      timeWindow,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

