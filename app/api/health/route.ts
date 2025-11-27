import { NextResponse } from 'next/server'
import { getJobQueue, getAllBatchProgress } from '@/lib/jobs'
import { isSchedulerRunning, getNextRunTime, getCurrentSchedule } from '@/lib/scheduler'
import { isWithinTimeWindow, getTimeWindowStatus, getTimeWindow, isTimeWindowEnabledSync } from '@/lib/timeWindow'

export async function GET() {
  const queue = getJobQueue()
  const stats = queue.getStats()
  const nextRun = await getNextRunTime()
  const schedule = await getCurrentSchedule()
  const timeWindowStatus = getTimeWindowStatus()
  const timeWindow = await getTimeWindow()
  const batchProgress = getAllBatchProgress()

  // Calculate overall progress if there are active batches
  let overallProgress = null
  if (batchProgress.length > 0) {
    const totalCompleted = batchProgress.reduce((sum, b) => sum + b.completed, 0)
    const totalExpected = batchProgress.reduce((sum, b) => sum + b.total, 0)
    overallProgress = {
      completed: totalCompleted,
      total: totalExpected,
      percentage: totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) : 0,
    }
  }

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
    queue: {
      ...stats,
      progress: overallProgress,
      batches: batchProgress,
    },
    timeWindow: {
      enabled: isTimeWindowEnabledSync(),
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

