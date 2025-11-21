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
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
    const parts = formatter.formatToParts(date)
    return {
      year: parseInt(parts.find(p => p.type === 'year')?.value || '0'),
      month: parseInt(parts.find(p => p.type === 'month')?.value || '0'),
      day: parseInt(parts.find(p => p.type === 'day')?.value || '0'),
      hour: parseInt(parts.find(p => p.type === 'hour')?.value || '0'),
      minute: parseInt(parts.find(p => p.type === 'minute')?.value || '0')
    }
  }
  
  // Get current time in IST
  const tzNow = getTZTime(now)
  
  // Determine if scheduled time is today or tomorrow in IST
  const scheduledTimeMinutes = config.hour * 60 + config.minute
  const currentTimeMinutes = tzNow.hour * 60 + tzNow.minute
  
  // Calculate days to add (0 for today, 1 for tomorrow)
  const daysToAdd = scheduledTimeMinutes > currentTimeMinutes ? 0 : 1
  
  // Get the scheduled date in IST
  const scheduledDateIST = new Date(now)
  scheduledDateIST.setUTCDate(scheduledDateIST.getUTCDate() + daysToAdd)
  const scheduledTZ = getTZTime(scheduledDateIST)
  
  // Now find the UTC Date that produces the scheduled time in IST
  // IST offset is +05:30, so we subtract that from the IST time
  // Create a UTC date for the scheduled day at the scheduled hour:minute
  // Then subtract 5:30 to get the actual UTC time
  
  // Start with scheduled day at midnight UTC, then add hours/minutes
  let candidate = new Date(Date.UTC(
    scheduledTZ.year,
    scheduledTZ.month - 1,
    scheduledTZ.day,
    config.hour,
    config.minute,
    0,
    0
  ))
  
  // Subtract IST offset (5:30 = 5 hours 30 minutes = 330 minutes)
  candidate = new Date(candidate.getTime() - (5 * 60 + 30) * 60 * 1000)
  
  // Verify and adjust if needed (handles edge cases)
  let verified = getTZTime(candidate)
  let attempts = 0
  while (
    (verified.hour !== config.hour || verified.minute !== config.minute ||
     verified.day !== scheduledTZ.day || verified.month !== scheduledTZ.month) &&
    attempts < 5
  ) {
    // Calculate adjustment needed
    const targetMinutes = config.hour * 60 + config.minute
    const actualMinutes = verified.hour * 60 + verified.minute
    const diffMinutes = targetMinutes - actualMinutes
    
    // Also account for day difference
    const dayDiff = scheduledTZ.day - verified.day
    const totalDiffMinutes = diffMinutes + (dayDiff * 24 * 60)
    
    candidate = new Date(candidate.getTime() + totalDiffMinutes * 60 * 1000)
    verified = getTZTime(candidate)
    attempts++
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

