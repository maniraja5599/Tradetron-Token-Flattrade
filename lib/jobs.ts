import { User, RunLog } from '@/types'
import { getUserById } from './db'
import { saveRun } from './db'
import { loginFlow } from '@/automations/loginFlow'
import { updateSheetWithRunResult } from '@/lib/googleSheets'
import { getGoogleSheetsConfig } from './db'

type Job = {
  userId: string
  headful?: boolean
}

class JobQueue {
  private queue: Job[] = []
  private running = new Set<string>()
  private maxConcurrency: number
  private processing = false

  constructor(maxConcurrency: number = 4) {
    this.maxConcurrency = maxConcurrency
  }

  enqueue(job: Job): void {
    if (this.running.has(job.userId)) {
      console.log(`[Queue] User ${job.userId} already running, skipping`)
      return
    }
    this.queue.push(job)
    this.process()
  }

  private async process(): Promise<void> {
    if (this.processing) return
    this.processing = true

    while (this.queue.length > 0 && this.running.size < this.maxConcurrency) {
      const job = this.queue.shift()
      if (!job) break

      this.running.add(job.userId)
      this.runJob(job).finally(() => {
        this.running.delete(job.userId)
        this.process()
      })
    }

    this.processing = false
  }

  private async runJob(job: Job): Promise<void> {
    const user = await getUserById(job.userId)
    if (!user || !user.active) {
      console.log(`[Queue] User ${job.userId} not found or inactive`)
      return
    }

    const runId = `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const startedAt = new Date().toISOString()
    let finishedAt = startedAt
    let status: 'success' | 'fail' = 'fail'
    let message = ''
    let artifactDir: string | undefined
    let finalUrl: string | undefined
    let tokenGenerated = false

    try {
      console.log(`[Job] Starting login for user: ${user.name} (${user.id})`)

      const result = await loginFlow({
        loginUrl: user.loginUrl,
        brokerUsername: user.brokerUsername,
        encryptedPassword: user.encryptedPassword,
        encryptedTotpSecret: user.encryptedTotpSecret,
        isDOB: user.isDOB || false,
        selectors: user.selectors,
        userId: user.id,
        headful: job.headful ?? false,
      })

      finishedAt = new Date().toISOString()
      status = result.status
      message = result.message || 'Login successful'
      artifactDir = result.artifactDir
      finalUrl = result.finalUrl
      tokenGenerated = result.tokenGenerated || false
    } catch (error: any) {
      finishedAt = new Date().toISOString()
      status = 'fail'
      message = error.message || 'Unknown error'
      artifactDir = error.artifactDir
      console.error(`[Job] Error for user ${user.name}:`, error)
    } finally {
      const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime()

      const runLog: RunLog = {
        id: runId,
        userId: user.id,
        userName: user.name,
        startedAt,
        finishedAt,
        ms,
        status,
        message,
        artifactDir,
        finalUrl,
        tokenGenerated,
      }

      await saveRun(runLog)
      console.log(`[Job] Completed login for user: ${user.name} - ${status}`)
      
      // Update Google Sheet with run results (ALWAYS updates for both success and failure)
      // This runs in the finally block, so it executes regardless of login outcome
      try {
        const googleSheetsConfig = await getGoogleSheetsConfig()
        if (!googleSheetsConfig.sheetUrlOrId) {
          console.log(`[Job] ⚠️ Google Sheets URL not configured. Skipping sheet update for user: ${user.name}`)
          console.log(`[Job] 💡 To enable auto-updates: Sync from Google Sheets or set GOOGLE_SHEETS_URL in .env.local`)
        } else if (!googleSheetsConfig.updateEnabled) {
          console.log(`[Job] ⚠️ Google Sheets update is disabled. Skipping sheet update for user: ${user.name}`)
        } else {
          console.log(`[Job] 📝 Attempting to update Google Sheet for user: ${user.name} (Status: ${status})`)
          const updated = await updateSheetWithRunResult(
            googleSheetsConfig.sheetUrlOrId,
            runLog,
            googleSheetsConfig.range
          )
          if (updated) {
            console.log(`[Job] ✅ Successfully updated Google Sheet for user: ${user.name} with status: ${status}`)
          } else {
            console.log(`[Job] ⚠️ Google Sheet update returned false for user: ${user.name} (Status: ${status}) - check logs above for details`)
          }
        }
      } catch (error: any) {
        // Don't fail the job if sheet update fails - just log the error
        // This ensures the job completes even if Google Sheets update fails
        console.error(`[Job] ❌ Failed to update Google Sheet for user ${user.name} (Status: ${status}):`, error.message)
        console.error(`[Job] Error details:`, error)
      }
    }
  }

  getStats() {
    return {
      queueLength: this.queue.length,
      running: this.running.size,
      maxConcurrency: this.maxConcurrency,
    }
  }
}

// Singleton instance
let queueInstance: JobQueue | null = null

export function getJobQueue(): JobQueue {
  if (!queueInstance) {
    const maxConcurrency = parseInt(process.env.MAX_CONCURRENCY || '4', 10)
    queueInstance = new JobQueue(maxConcurrency)
  }
  return queueInstance
}

export function enqueueJob(job: Job): void {
  getJobQueue().enqueue(job)
}

