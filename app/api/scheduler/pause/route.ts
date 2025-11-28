import { NextRequest, NextResponse } from 'next/server'
import { pauseScheduler, pauseForDates, getPauseConfig } from '@/lib/schedulerPause'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { untilDate, dates } = body

    if (dates && Array.isArray(dates) && dates.length > 0) {
      // Pause for specific dates
      const dateObjects = dates.map((d: string) => new Date(d))
      await pauseForDates(dateObjects)
      return NextResponse.json({
        success: true,
        message: `Scheduler paused for ${dates.length} date(s)`,
        paused: true,
      })
    } else if (untilDate) {
      // Pause until a specific date
      const until = new Date(untilDate)
      await pauseScheduler(until)
      return NextResponse.json({
        success: true,
        message: `Scheduler paused until ${until.toLocaleDateString()}`,
        paused: true,
        pausedUntil: until.toISOString(),
      })
    } else {
      // Pause indefinitely
      await pauseScheduler(null)
      return NextResponse.json({
        success: true,
        message: 'Scheduler paused indefinitely',
        paused: true,
      })
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to pause scheduler' },
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

