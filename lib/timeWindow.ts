/**
 * Time Window Restriction
 * Restricts server operations to specific time windows to save costs
 */

const TIMEZONE = 'Asia/Kolkata' // IST

export interface TimeWindow {
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
  timezone: string
}

// Default time window: 8:15 AM to 9:00 AM IST
const DEFAULT_WINDOW: TimeWindow = {
  startHour: 8,
  startMinute: 15,
  endHour: 9,
  endMinute: 0,
  timezone: TIMEZONE,
}

/**
 * Get current time window from environment or use default
 */
export function getTimeWindow(): TimeWindow {
  // Allow override via environment variables
  if (process.env.TIME_WINDOW_START && process.env.TIME_WINDOW_END) {
    const [startHour, startMinute] = process.env.TIME_WINDOW_START.split(':').map(Number)
    const [endHour, endMinute] = process.env.TIME_WINDOW_END.split(':').map(Number)
    
    return {
      startHour,
      startMinute,
      endHour,
      endMinute,
      timezone: process.env.TIME_WINDOW_TIMEZONE || TIMEZONE,
    }
  }
  
  return DEFAULT_WINDOW
}

/**
 * Get current time in the specified timezone
 */
function getCurrentTimeInTimezone(timezone: string): { hour: number; minute: number } {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  
  const parts = formatter.formatToParts(now)
  return {
    hour: parseInt(parts.find(p => p.type === 'hour')?.value || '0'),
    minute: parseInt(parts.find(p => p.type === 'minute')?.value || '0'),
  }
}

/**
 * Check if current time is within the allowed time window
 */
export function isWithinTimeWindow(): boolean {
  const window = getTimeWindow()
  const current = getCurrentTimeInTimezone(window.timezone)
  
  const currentMinutes = current.hour * 60 + current.minute
  const startMinutes = window.startHour * 60 + window.startMinute
  const endMinutes = window.endHour * 60 + window.endMinute
  
  // Handle case where end time is before start time (spans midnight)
  if (endMinutes < startMinutes) {
    // Window spans midnight (e.g., 22:00 to 02:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes
  } else {
    // Normal window (e.g., 08:15 to 09:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  }
}

/**
 * Get time until next window opens (in milliseconds)
 */
export function getTimeUntilNextWindow(): number {
  const window = getTimeWindow()
  const current = getCurrentTimeInTimezone(window.timezone)
  const now = new Date()
  
  const currentMinutes = current.hour * 60 + current.minute
  const startMinutes = window.startHour * 60 + window.startMinute
  
  let nextWindowStart = new Date(now)
  
  if (currentMinutes < startMinutes) {
    // Window is later today
    nextWindowStart.setUTCHours(window.startHour, window.startMinute, 0, 0)
    // Adjust for IST offset (+5:30)
    nextWindowStart.setUTCHours(nextWindowStart.getUTCHours() - 5)
    nextWindowStart.setUTCMinutes(nextWindowStart.getUTCMinutes() - 30)
  } else {
    // Window is tomorrow
    nextWindowStart.setUTCDate(nextWindowStart.getUTCDate() + 1)
    nextWindowStart.setUTCHours(window.startHour, window.startMinute, 0, 0)
    // Adjust for IST offset (+5:30)
    nextWindowStart.setUTCHours(nextWindowStart.getUTCHours() - 5)
    nextWindowStart.setUTCMinutes(nextWindowStart.getUTCMinutes() - 30)
  }
  
  return nextWindowStart.getTime() - now.getTime()
}

/**
 * Get human-readable message about time window status
 */
export function getTimeWindowStatus(): { allowed: boolean; message: string; nextWindow?: string } {
  const window = getTimeWindow()
  const allowed = isWithinTimeWindow()
  
  if (allowed) {
    return {
      allowed: true,
      message: `Server is active (within time window: ${String(window.startHour).padStart(2, '0')}:${String(window.startMinute).padStart(2, '0')} - ${String(window.endHour).padStart(2, '0')}:${String(window.endMinute).padStart(2, '0')} ${window.timezone})`,
    }
  }
  
  const timeUntil = getTimeUntilNextWindow()
  const hours = Math.floor(timeUntil / (1000 * 60 * 60))
  const minutes = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60))
  
  const nextWindowTime = new Date(Date.now() + timeUntil)
  const nextWindowStr = nextWindowTime.toLocaleString('en-US', {
    timeZone: window.timezone,
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  
  return {
    allowed: false,
    message: `Server is in sleep mode (outside time window). Next window opens in ${hours}h ${minutes}m`,
    nextWindow: nextWindowStr,
  }
}

