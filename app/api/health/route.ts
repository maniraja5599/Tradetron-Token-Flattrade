import { NextResponse } from 'next/server'
import { getJobQueue } from '@/lib/jobs'
import { isSchedulerRunning, getNextRunTime, getCurrentSchedule } from '@/lib/scheduler'
import { isWithinTimeWindow, getTimeWindowStatus, getTimeWindow } from '@/lib/timeWindow'

export async function GET() {
  const queue = getJobQueue()
  const stats = queue.getStats()
  const nextRun = await getNextRunTime()
  const schedule = await getCurrentSchedule()
  const timeWindowStatus = getTimeWindowStatus()
  const timeWindow = await getTimeWindow()

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    scheduler: {
      running: isSchedulerRunning(),
      schedule: {
        hour: schedule.hour,
        minute: schedule.minute,
        timezone: schedule.timezone,
        timeString: `${String(schedule.hour).padStart(2, '0')}:${String(schedule.minute).padStart(2, '0')}`,
      },
      nextRun: nextRun.toISOString(),
      nextRunIST: nextRun.toLocaleString('en-US', { timeZone: schedule.timezone }),
    },
    queue: stats,
    timeWindow: {
      enabled: process.env.TIME_WINDOW_ENABLED !== 'false',
      active: isWithinTimeWindow(),
      window: {
        start: `${String(timeWindow.startHour).padStart(2, '0')}:${String(timeWindow.startMinute).padStart(2, '0')}`,
        end: `${String(timeWindow.endHour).padStart(2, '0')}:${String(timeWindow.endMinute).padStart(2, '0')}`,
        timezone: timeWindow.timezone,
      },
      status: timeWindowStatus.message,
      nextWindow: timeWindowStatus.nextWindow,
    },
  })
}

