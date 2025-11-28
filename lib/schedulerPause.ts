/**
 * Scheduler Pause/Stop Management
 * Allows pausing scheduled runs for specific dates
 */

import { readJsonFile, writeJsonFile } from './db'
import path from 'path'

const PAUSE_CONFIG_FILE = path.join(process.cwd(), 'data', 'scheduler-pause.json')

export interface PauseConfig {
  paused: boolean
  pausedUntil?: string // ISO date string, if null then paused indefinitely
  pausedDates?: string[] // Array of ISO date strings (YYYY-MM-DD) to skip
}

const DEFAULT_PAUSE_CONFIG: PauseConfig = {
  paused: false,
  pausedDates: [],
}

export async function getPauseConfig(): Promise<PauseConfig> {
  return await readJsonFile<PauseConfig>(PAUSE_CONFIG_FILE, DEFAULT_PAUSE_CONFIG)
}

export async function savePauseConfig(config: PauseConfig): Promise<void> {
  await writeJsonFile(PAUSE_CONFIG_FILE, config)
}

export async function isPausedForDate(date: Date): Promise<boolean> {
  const pauseConfig = await getPauseConfig()
  
  if (!pauseConfig.paused) {
    return false
  }

  // Check if paused indefinitely (no pausedUntil)
  if (pauseConfig.paused && !pauseConfig.pausedUntil) {
    return true
  }

  // Check if paused until a specific date
  if (pauseConfig.pausedUntil) {
    const pausedUntilDate = new Date(pauseConfig.pausedUntil)
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)
    pausedUntilDate.setHours(0, 0, 0, 0)
    
    if (checkDate <= pausedUntilDate) {
      return true
    }
  }

  // Check if specific date is in pausedDates array
  const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
  if (pauseConfig.pausedDates?.includes(dateStr)) {
    return true
  }

  return false
}

export async function pauseScheduler(untilDate?: Date | null): Promise<void> {
  const config: PauseConfig = {
    paused: true,
    pausedUntil: untilDate ? untilDate.toISOString() : undefined,
    pausedDates: [],
  }
  await savePauseConfig(config)
}

export async function pauseForDates(dates: Date[]): Promise<void> {
  const pauseConfig = await getPauseConfig()
  const dateStrings = dates.map(d => {
    const date = new Date(d)
    date.setHours(0, 0, 0, 0)
    return date.toISOString().split('T')[0] // YYYY-MM-DD
  })
  
  pauseConfig.pausedDates = [...new Set([...(pauseConfig.pausedDates || []), ...dateStrings])]
  await savePauseConfig(pauseConfig)
}

export async function resumeScheduler(): Promise<void> {
  const config: PauseConfig = {
    paused: false,
    pausedDates: [],
  }
  await savePauseConfig(config)
}

export async function stopScheduler(): Promise<void> {
  const config: PauseConfig = {
    paused: true,
    pausedUntil: undefined, // Indefinite pause
    pausedDates: [],
  }
  await savePauseConfig(config)
}

