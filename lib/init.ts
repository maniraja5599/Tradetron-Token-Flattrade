import fs from 'fs/promises'
import path from 'path'
import { startScheduler } from '@/lib/scheduler'

async function ensureDirectories() {
  const dirs = ['data', 'artifacts']
  for (const dir of dirs) {
    const dirPath = path.join(process.cwd(), dir)
    try {
      await fs.access(dirPath)
    } catch {
      await fs.mkdir(dirPath, { recursive: true })
      console.log(`Created directory: ${dir}`)
    }
  }
}

export async function initializeApp() {
  await ensureDirectories()
  await startScheduler()
}

