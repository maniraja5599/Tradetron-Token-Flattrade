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

  // Force schedule to 08:31 (default) - always update to ensure correct time
  let config = await getScheduleConfig()
  // Always set to 08:31 regardless of existing config
  if (config.hour !== DEFAULT_SCHEDULE.hour || config.minute !== DEFAULT_SCHEDULE.minute) {
    console.log(`[Scheduler] Updating schedule from ${String(config.hour).padStart(2, '0')}:${String(config.minute).padStart(2, '0')} to default: ${String(DEFAULT_SCHEDULE.hour).padStart(2, '0')}:${String(DEFAULT_SCHEDULE.minute).padStart(2, '0')}`)
    config = {
      hour: DEFAULT_SCHEDULE.hour,
      minute: DEFAULT_SCHEDULE.minute,
      timezone: DEFAULT_SCHEDULE.timezone,
    }
    await saveScheduleConfig(config)
  }
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

  // Calculate if scheduled time has passed today
  const currentMinutes = tzNow.hour * 60 + tzNow.minute
  const scheduledMinutes = config.hour * 60 + config.minute
  const hasPassedToday = currentMinutes >= scheduledMinutes

  // Determine target day: today or tomorrow
  const targetDayOffset = hasPassedToday ? 1 : 0
  
  // Start with the target day at the current time
  let candidate = new Date(now)
  if (targetDayOffset > 0) {
    // Add days to get to target day
    candidate = new Date(candidate.getTime() + targetDayOffset * 24 * 60 * 60 * 1000)
  }

  // Now align candidate to the scheduled time in the target timezone
  // We'll iterate to find the exact time
  let attempts = 0
  const maxAttempts = 20
  
  while (attempts < maxAttempts) {
    const candidateTZ = getTZTime(candidate)
    const candidateMinutes = candidateTZ.hour * 60 + candidateTZ.minute
    
    // Check if we've reached the target time
    if (candidateTZ.hour === config.hour && candidateTZ.minute === config.minute) {
      // Verify it's in the future
      if (candidate.getTime() > now.getTime()) {
        return candidate
      } else {
        // If it's still in the past, add a day and continue
        candidate = new Date(candidate.getTime() + 24 * 60 * 60 * 1000)
        attempts++
        continue
      }
    }
    
    // Calculate how many minutes to adjust
    let diffMinutes = scheduledMinutes - candidateMinutes
    
    // If we need to go backwards in time (negative diff), it means we're on the target day
    // but later than scheduled time. Since we've already determined the target day,
    // we should just subtract to get to the scheduled time on that same day.
    if (diffMinutes < 0) {
      // We're on the target day but later than scheduled time
      // Subtract the difference to get to scheduled time on the same day
      candidate = new Date(candidate.getTime() + diffMinutes * 60 * 1000)
      attempts++
      continue
    }
    
    // Positive diffMinutes means we need to add time to reach scheduled time
    candidate = new Date(candidate.getTime() + diffMinutes * 60 * 1000)
    attempts++
  }

  // Fallback: ensure we return a future date even if alignment failed
  // Add one more day to be safe
  if (candidate.getTime() <= now.getTime()) {
    candidate = new Date(candidate.getTime() + 24 * 60 * 60 * 1000)
  }

  // Log for debugging
  const finalTZ = getTZTime(candidate)
  console.log(`[Scheduler] Next run calculated: ${candidate.toISOString()} (${finalTZ.year}-${String(finalTZ.month).padStart(2, '0')}-${String(finalTZ.day).padStart(2, '0')} ${String(finalTZ.hour).padStart(2, '0')}:${String(finalTZ.minute).padStart(2, '0')} ${config.timezone})`)

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

