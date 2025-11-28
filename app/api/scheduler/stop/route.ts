import { NextResponse } from 'next/server'
import { stopScheduler, getPauseConfig } from '@/lib/schedulerPause'

export async function POST() {
  try {
    await stopScheduler()
    return NextResponse.json({
      success: true,
      message: 'Scheduler stopped (paused indefinitely)',
      paused: true,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to stop scheduler' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const config = await getPauseConfig()
    return NextResponse.json(config)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get pause status' },
      { status: 500 }
    )
  }
}

