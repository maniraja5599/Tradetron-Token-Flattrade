import fs from 'fs/promises'
import path from 'path'
import { User, RunLog } from '@/types'
import { ScheduleConfig, DEFAULT_SCHEDULE } from './scheduleConfig'

const DATA_DIR = path.join(process.cwd(), 'data')
const USERS_FILE = path.join(DATA_DIR, 'users.json')
const RUNS_FILE = path.join(DATA_DIR, 'runs.json')
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }
}

export async function readJsonFile<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    // Remove BOM (Byte Order Mark) if present
    let cleanContent = content.replace(/^\uFEFF/, '')

    // Try to fix common JSON corruption issues
    // Remove trailing commas before closing brackets/braces
    cleanContent = cleanContent.replace(/,(\s*[}\]])/g, '$1')

    // Try to fix duplicate closing brackets (like ]}])
    cleanContent = cleanContent.replace(/\]\s*\}\s*\]\s*$/, ']')
    cleanContent = cleanContent.replace(/\}\s*\]\s*\}\s*$/, '}]')

    // Remove any trailing characters after valid JSON
    try {
      // Try to find the last valid JSON structure
      let lastValidIndex = cleanContent.length
      for (let i = cleanContent.length - 1; i >= 0; i--) {
        const testContent = cleanContent.substring(0, i + 1)
        try {
          JSON.parse(testContent)
          lastValidIndex = i + 1
          break
        } catch {
          continue
        }
      }
      cleanContent = cleanContent.substring(0, lastValidIndex)
    } catch {
      // If that fails, try the original content
    }

    return JSON.parse(cleanContent) as T
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      await ensureDataDir()
      await fs.writeFile(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8')
      return defaultValue
    }

    // If JSON parsing failed, try to recover by backing up and recreating
    console.error(`[DB] Failed to parse JSON file ${filePath}:`, error.message)
    try {
      // Backup corrupted file
      const backupPath = `${filePath}.backup.${Date.now()}`
      await fs.copyFile(filePath, backupPath)
      console.log(`[DB] Backed up corrupted file to ${backupPath}`)

      // Try to extract valid entries from the corrupted file
      const content = await fs.readFile(filePath, 'utf-8')
      // Try to extract array entries using regex (last resort)
      const arrayMatch = content.match(/\[[\s\S]*\]/)?.[0]
      if (arrayMatch) {
        try {
          const recovered = JSON.parse(arrayMatch)
          console.log(`[DB] Recovered ${Array.isArray(recovered) ? recovered.length : 0} entries`)
          await writeJsonFile(filePath, recovered)
          return recovered as T
        } catch {
          // If recovery failed, use default
        }
      }
    } catch (recoveryError) {
      console.error(`[DB] Recovery attempt failed:`, recoveryError)
    }

    // If all else fails, recreate with default value
    console.log(`[DB] Recreating ${filePath} with default value`)
    await ensureDataDir()
    await fs.writeFile(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8')
    return defaultValue
  }
}

export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await ensureDataDir()
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

// Users DB
export async function getUsers(): Promise<User[]> {
  return readJsonFile<User[]>(USERS_FILE, [])
}

export async function getUserById(id: string): Promise<User | null> {
  const users = await getUsers()
  return users.find(u => u.id === id) || null
}

export async function saveUser(user: User): Promise<void> {
  const users = await getUsers()
  const index = users.findIndex(u => u.id === user.id)
  if (index >= 0) {
    users[index] = user
  } else {
    users.push(user)
  }
  await writeJsonFile(USERS_FILE, users)
}

export async function deleteUser(id: string): Promise<boolean> {
  const users = await getUsers()
  const filtered = users.filter(u => u.id !== id)
  if (filtered.length === users.length) return false
  await writeJsonFile(USERS_FILE, filtered)
  return true
}

export async function deleteAllUsers(): Promise<void> {
  await writeJsonFile(USERS_FILE, [])
}

// Runs DB
export async function getRuns(limit: number = 100): Promise<RunLog[]> {
  const runs = await readJsonFile<RunLog[]>(RUNS_FILE, [])
  // Sort by startedAt descending (most recent first), then take limit
  const sorted = runs.sort((a, b) =>
    new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  )
  return sorted.slice(0, limit)
}

export async function saveRun(run: RunLog): Promise<void> {
  console.log(`[DB] Saving run ${run.id} for user ${run.userName}`)
  const runs = await readJsonFile<RunLog[]>(RUNS_FILE, [])
  runs.push(run)
  // Keep only last 10000 runs
  const limited = runs.slice(-10000)
  await writeJsonFile(RUNS_FILE, limited)
  console.log(`[DB] Saved run ${run.id}`)
}

export async function getRunById(id: string): Promise<RunLog | null> {
  const runs = await readJsonFile<RunLog[]>(RUNS_FILE, [])
  return runs.find(r => r.id === id) || null
}

// Config DB
export async function getScheduleConfig(): Promise<ScheduleConfig> {
  return readJsonFile<ScheduleConfig>(CONFIG_FILE, DEFAULT_SCHEDULE)
}

export async function saveScheduleConfig(config: ScheduleConfig): Promise<void> {
  // Preserve other config properties (like googleSheets) when saving schedule
  const fullConfig = await readJsonFile<any>(CONFIG_FILE, {})
  fullConfig.hour = config.hour
  fullConfig.minute = config.minute
  fullConfig.timezone = config.timezone
  await writeJsonFile(CONFIG_FILE, fullConfig)
}

// Google Sheets Config
export interface GoogleSheetsConfig {
  sheetUrlOrId?: string
  range?: string
  updateEnabled?: boolean
}

export async function getGoogleSheetsConfig(): Promise<GoogleSheetsConfig> {
  const config = await readJsonFile<any>(CONFIG_FILE, {})
  // Check if updateEnabled is explicitly set, otherwise default to true if sheetUrlOrId exists
  const hasSheetUrl = !!(config.googleSheets?.sheetUrlOrId || process.env.GOOGLE_SHEETS_URL)
  const updateEnabled = config.googleSheets?.updateEnabled !== undefined
    ? config.googleSheets.updateEnabled
    : (process.env.GOOGLE_SHEETS_UPDATE_ENABLED === 'true' || (process.env.GOOGLE_SHEETS_UPDATE_ENABLED === undefined && hasSheetUrl))

  return {
    sheetUrlOrId: config.googleSheets?.sheetUrlOrId || process.env.GOOGLE_SHEETS_URL || '',
    range: config.googleSheets?.range || process.env.GOOGLE_SHEETS_RANGE || 'Users!A:Z',
    updateEnabled,
  }
}

export async function saveGoogleSheetsConfig(googleSheetsConfig: GoogleSheetsConfig): Promise<void> {
  const config = await readJsonFile<any>(CONFIG_FILE, {})
  config.googleSheets = {
    ...config.googleSheets,
    ...googleSheetsConfig,
  }
  await writeJsonFile(CONFIG_FILE, config)
}
