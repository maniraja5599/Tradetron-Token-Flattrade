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

async function readJsonFile<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(content) as T
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      await ensureDataDir()
      await fs.writeFile(filePath, JSON.stringify(defaultValue, null, 2))
      return defaultValue
    }
    throw error
  }
}

async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await ensureDataDir()
  await fs.writeFile(filePath, JSON.stringify(data, null, 2))
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

// Runs DB
export async function getRuns(limit: number = 100): Promise<RunLog[]> {
  const runs = await readJsonFile<RunLog[]>(RUNS_FILE, [])
  return runs.slice(0, limit).sort((a, b) => 
    new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  )
}

export async function saveRun(run: RunLog): Promise<void> {
  const runs = await readJsonFile<RunLog[]>(RUNS_FILE, [])
  runs.push(run)
  // Keep only last 10000 runs
  const limited = runs.slice(-10000)
  await writeJsonFile(RUNS_FILE, limited)
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
  await writeJsonFile(CONFIG_FILE, config)
}
