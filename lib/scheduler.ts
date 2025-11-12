import * as cron from 'node-cron'
import { getUsers } from './db'
import { enqueueJob } from './jobs'
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
  
  // Calculate next run time for logging
  const now = new Date()
  const tzDate = new Date(now.toLocaleString('en-US', { timeZone: config.timezone }))
  const nextRun = new Date(tzDate)
  nextRun.setHours(config.hour, config.minute, 0, 0)
  if (nextRun.getTime() <= tzDate.getTime()) {
    nextRun.setDate(nextRun.getDate() + 1)
  }
  
  scheduledTask = cron.schedule(cronExpression, async () => {
    console.log(`[Scheduler] ✅ Triggered daily run at ${String(config.hour).padStart(2, '0')}:${String(config.minute).padStart(2, '0')} ${config.timezone}`)
    try {
      const users = await getUsers()
      const activeUsers = users.filter(u => u.active)
      console.log(`[Scheduler] Enqueuing ${activeUsers.length} active users`)
      
      for (const user of activeUsers) {
        enqueueJob({ userId: user.id })
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
  const kolkata = new Date(now.toLocaleString('en-US', { timeZone: config.timezone }))
  
  // Set to scheduled time today
  const nextRun = new Date(kolkata)
  nextRun.setHours(config.hour, config.minute, 0, 0)
  
  // If already past scheduled time today, schedule for tomorrow
  if (nextRun.getTime() <= kolkata.getTime()) {
    nextRun.setDate(nextRun.getDate() + 1)
  }
  
  return nextRun
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
        
        for (const user of activeUsers) {
          enqueueJob({ userId: user.id })
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

