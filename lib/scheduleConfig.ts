export type ScheduleConfig = {
  hour: number // 0-23
  minute: number // 0-59
  timezone: string // Default: 'Asia/Kolkata'
}

export const DEFAULT_SCHEDULE: ScheduleConfig = {
  hour: 8,
  minute: 30,
  timezone: 'Asia/Kolkata',
}

