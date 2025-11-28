import { NextResponse } from 'next/server'
import { resumeScheduler, getPauseConfig } from '@/lib/schedulerPause'

export async function POST() {
  try {
    await resumeScheduler()
    return NextResponse.json({
      success: true,
      message: 'Scheduler resumed',
      paused: false,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to resume scheduler' },
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

