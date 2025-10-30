import { NextResponse } from 'next/server'
import { getJobQueue } from '@/lib/jobs'
import { isSchedulerRunning, getNextRunTime, getCurrentSchedule } from '@/lib/scheduler'

export async function GET() {
  const queue = getJobQueue()
  const stats = queue.getStats()
  const nextRun = await getNextRunTime()
  const schedule = await getCurrentSchedule()

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
  })
}

