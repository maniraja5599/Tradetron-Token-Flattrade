import * as cron from 'node-cron'
import { getUsers } from './db'
import { enqueueJob, startBatch } from './jobs'
import { getScheduleConfig, saveScheduleConfig } from './db'
import { ScheduleConfig, DEFAULT_SCHEDULE } from './scheduleConfig'

let scheduledTask: cron.ScheduledTask | null = null

export async function startScheduler(): Promise<void> {
  if (scheduledTask) {
    console.log('[Scheduler] Already running, restarting...')
    stopScheduler()
  }

  const config = await getScheduleConfig()
  const cronExpression = `${config.minute} ${config.hour} * * *`

  // Calculate next run time for logging using the correct timezone conversion
  const nextRun = await getNextRunTime()

  scheduledTask = cron.schedule(cronExpression, async () => {
    console.log(`[Scheduler] ✅ Triggered daily run at ${String(config.hour).padStart(2, '0')}:${String(config.minute).padStart(2, '0')} ${config.timezone}`)
    try {
      const users = await getUsers()
      const activeUsers = users.filter(u => u.active)
      console.log(`[Scheduler] Enqueuing ${activeUsers.length} active users`)

      if (activeUsers.length > 0) {
        // Generate batch ID and start batch tracking
        const batchId = `scheduled-batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        startBatch(batchId, activeUsers.length)

        // Enqueue all jobs with batch ID
        for (const user of activeUsers) {
          enqueueJob({ userId: user.id, batchId })
        }
      }
    } catch (error) {
      console.error('[Scheduler] Error during scheduled run:', error)
    }
  }, {
    timezone: config.timezone,
    scheduled: true,
  })

  const nextRunStr = nextRun.toLocaleString('en-US', {
    timeZone: config.timezone,
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })

  console.log(`[Scheduler] ✅ Started - will run daily at ${String(config.hour).padStart(2, '0')}:${String(config.minute).padStart(2, '0')} ${config.timezone}`)
  console.log(`[Scheduler] 📅 Next run scheduled for: ${nextRunStr} ${config.timezone}`)
}

export function stopScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop()
    scheduledTask = null
    console.log('[Scheduler] Stopped')
  }
}

export async function getNextRunTime(): Promise<Date> {
  const config = await getScheduleConfig()
  const now = new Date()

  // Helper to get time components in target timezone
  const getTZTime = (date: Date) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: config.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hourCycle: 'h23' // Force 00-23 format
    })
    const parts = formatter.formatToParts(date)
    const hourVal = parseInt(parts.find(p => p.type === 'hour')?.value || '0')
    return {
      year: parseInt(parts.find(p => p.type === 'year')?.value || '0'),
      month: parseInt(parts.find(p => p.type === 'month')?.value || '0'),
      day: parseInt(parts.find(p => p.type === 'day')?.value || '0'),
      hour: hourVal % 24,
      minute: parseInt(parts.find(p => p.type === 'minute')?.value || '0')
    }
  }

  // Get current time in target timezone
  const tzNow = getTZTime(now)

  // Create a Date object for "Today" at the scheduled time in the target timezone
  // We construct a string ISO format that Date.parse can handle, or use a library.
  // Since we want to avoid heavy libraries, we'll use a robust iterative approach.

  // Start with 'now' and adjust to match scheduled time
  let candidate = new Date(now)

  // Brute force alignment:
  // 1. Adjust candidate to match target hour/minute in target timezone
  // We do this by checking the difference and adding/subtracting

  let attempts = 0
  while (attempts < 5) {
    const currentTZ = getTZTime(candidate)

    // Check if we match the target time
    if (currentTZ.hour === config.hour && currentTZ.minute === config.minute) {
      break
    }

    // Calculate difference in minutes
    const currentMinutes = currentTZ.hour * 60 + currentTZ.minute
    const targetMinutes = config.hour * 60 + config.minute
    let diffMinutes = targetMinutes - currentMinutes

    // Apply difference
    candidate = new Date(candidate.getTime() + diffMinutes * 60 * 1000)
    attempts++
  }

  // Now 'candidate' is roughly today at the scheduled time. 
  // Check if it's in the past relative to 'now'
  if (candidate.getTime() <= now.getTime()) {
    // If today's scheduled time has passed, add 24 hours
    candidate = new Date(candidate.getTime() + 24 * 60 * 60 * 1000)

    // Re-verify alignment after adding a day (DST shifts might cause 1 hour off)
    attempts = 0
    while (attempts < 3) {
      const currentTZ = getTZTime(candidate)
      if (currentTZ.hour === config.hour && currentTZ.minute === config.minute) break

      const currentMinutes = currentTZ.hour * 60 + currentTZ.minute
      const targetMinutes = config.hour * 60 + config.minute
      let diffMinutes = targetMinutes - currentMinutes

      candidate = new Date(candidate.getTime() + diffMinutes * 60 * 1000)
      attempts++
    }
  }

  return candidate
}

export function isSchedulerRunning(): boolean {
  return scheduledTask !== null
}

export async function updateSchedule(hour: number, minute: number): Promise<void> {
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error('Invalid time: hour must be 0-23, minute must be 0-59')
  }

  const config: ScheduleConfig = {
    hour,
    minute,
    timezone: DEFAULT_SCHEDULE.timezone,
  }

  await saveScheduleConfig(config)

  // Calculate if the new time is today or tomorrow
  const now = new Date()
  const tzDate = new Date(now.toLocaleString('en-US', { timeZone: config.timezone }))
  const scheduledTime = new Date(tzDate)
  scheduledTime.setHours(hour, minute, 0, 0)

  const isToday = scheduledTime.getTime() > tzDate.getTime()
  const when = isToday ? 'today' : 'tomorrow'
  const msUntilScheduled = scheduledTime.getTime() - tzDate.getTime()
  const minutesUntilScheduled = Math.floor(msUntilScheduled / 60000)

  console.log(`[Scheduler] 🔄 Updating schedule to ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${config.timezone} (will run ${when})`)

  // If the scheduled time is today and within 5 minutes, set up an immediate trigger
  // This handles cases where cron might miss very close schedule changes
  if (isToday && minutesUntilScheduled > 0 && minutesUntilScheduled <= 5) {
    console.log(`[Scheduler] ⚡ Schedule is ${minutesUntilScheduled} minute(s) away - setting up immediate trigger`)
    const triggerInMs = msUntilScheduled

    setTimeout(async () => {
      console.log(`[Scheduler] ⚡ Immediate trigger fired at ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
      try {
        const users = await getUsers()
        const activeUsers = users.filter(u => u.active)
        console.log(`[Scheduler] Enqueuing ${activeUsers.length} active users (immediate trigger)`)

        if (activeUsers.length > 0) {
          // Generate batch ID and start batch tracking
          const batchId = `scheduled-batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          startBatch(batchId, activeUsers.length)

          // Enqueue all jobs with batch ID
          for (const user of activeUsers) {
            enqueueJob({ userId: user.id, batchId })
          }
        }
      } catch (error) {
        console.error('[Scheduler] Error during immediate trigger run:', error)
      }
    }, triggerInMs)
  }

  // Restart scheduler with new time
  if (isSchedulerRunning()) {
    await startScheduler()
  } else {
    // If scheduler wasn't running, start it
    await startScheduler()
  }
}

export async function getCurrentSchedule(): Promise<ScheduleConfig> {
  return await getScheduleConfig()
}

