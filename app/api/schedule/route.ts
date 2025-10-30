import { NextRequest, NextResponse } from 'next/server'
import { updateSchedule, getCurrentSchedule } from '@/lib/scheduler'

export async function GET() {
  try {
    const schedule = await getCurrentSchedule()
    return NextResponse.json({
      hour: schedule.hour,
      minute: schedule.minute,
      timezone: schedule.timezone,
      timeString: `${String(schedule.hour).padStart(2, '0')}:${String(schedule.minute).padStart(2, '0')}`,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { hour, minute } = body

    if (typeof hour !== 'number' || typeof minute !== 'number') {
      return NextResponse.json(
        { error: 'hour and minute must be numbers' },
        { status: 400 }
      )
    }

    await updateSchedule(hour, minute)

    return NextResponse.json({
      success: true,
      message: 'Schedule updated successfully',
      schedule: {
        hour,
        minute,
        timeString: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

