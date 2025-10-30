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
  
  scheduledTask = cron.schedule(cronExpression, async () => {
    console.log(`[Scheduler] Triggered daily run at ${String(config.hour).padStart(2, '0')}:${String(config.minute).padStart(2, '0')} IST`)
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
  })

  console.log(`[Scheduler] Started - will run daily at ${String(config.hour).padStart(2, '0')}:${String(config.minute).padStart(2, '0')} ${config.timezone}`)
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
  
  // Restart scheduler with new time
  if (isSchedulerRunning()) {
    await startScheduler()
  }
}

export async function getCurrentSchedule(): Promise<ScheduleConfig> {
  return await getScheduleConfig()
}

