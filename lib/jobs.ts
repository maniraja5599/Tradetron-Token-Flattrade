import { User, RunLog } from '@/types'
import { getUserById } from './db'
import { saveRun } from './db'
import { loginFlow } from '@/automations/loginFlow'
import { updateSheetWithRunResult } from '@/lib/googleSheets'
import { getGoogleSheetsConfig } from './db'
import { sendRunNotification, sendBatchNotification } from './telegram'
import { addNotification } from './notifications'

type Job = {
  userId: string
  headful?: boolean
  batchId?: string
}

class JobQueue {
  private queue: Job[] = []
  private running = new Set<string>()
  private maxConcurrency: number
  private processing = false
  private activeBatches = new Map<string, {
    expectedCount: number
    runLogs: RunLog[]
    startedAt: number
    inactiveUsers: string[] // Track inactive user names
  }>()

  constructor(maxConcurrency: number = 4) {
    this.maxConcurrency = maxConcurrency
  }

  enqueue(job: Job): void {
    if (this.running.has(job.userId)) {
      console.log(`[Queue] User ${job.userId} already running, skipping`)
      // If this is part of a batch, we need to account for the skipped job
      if (job.batchId && this.activeBatches.has(job.batchId)) {
        const batch = this.activeBatches.get(job.batchId)!
        // Decrease expected count since this job won't run
        batch.expectedCount = Math.max(0, batch.expectedCount - 1)
        console.log(`[Queue] 📦 Adjusted batch ${job.batchId} expected count to ${batch.expectedCount} (job skipped)`)
        // Check if batch is now complete (fire and forget async call)
        if (batch.runLogs.length >= batch.expectedCount && batch.expectedCount > 0) {
          this.completeBatch(job.batchId).catch(err => {
            console.error(`[Queue] Error completing batch ${job.batchId}:`, err)
          })
        }
      }
      return
    }
    this.queue.push(job)
    this.process()
  }

  /**
   * Start a batch run - collects all results and sends batch notification
   */
  startBatch(batchId: string, expectedCount: number): void {
    this.activeBatches.set(batchId, {
      expectedCount,
      runLogs: [],
      startedAt: Date.now(),
      inactiveUsers: [],
    })
    console.log(`[Queue] 📦 Started batch ${batchId} with ${expectedCount} expected jobs`)
  }

  /**
   * Check if a batch is active
   */
  isBatchActive(batchId?: string): boolean {
    if (!batchId) return false
    return this.activeBatches.has(batchId)
  }

  /**
   * Add run log to batch and check if batch is complete
   */
  private async addToBatch(batchId: string | undefined, runLog: RunLog): Promise<void> {
    if (!batchId || !this.activeBatches.has(batchId)) {
      return
    }

    const batch = this.activeBatches.get(batchId)!
    batch.runLogs.push(runLog)

    // Check if batch is complete (all expected jobs finished)
    if (batch.runLogs.length >= batch.expectedCount && batch.expectedCount > 0) {
      await this.completeBatch(batchId)
    }
  }

  /**
   * Complete a batch and send notification
   */
  private async completeBatch(batchId: string): Promise<void> {
    const batch = this.activeBatches.get(batchId)
    if (!batch) return

    console.log(`[Queue] 📦 Batch ${batchId} complete - sending batch notification for ${batch.runLogs.length} runs`)

    // Send batch notification with inactive users info
    try {
      await sendBatchNotification(batch.runLogs, batch.inactiveUsers)
    } catch (error: any) {
      console.error(`[Queue] ❌ Failed to send batch notification:`, error.message)
    }

    // Remove batch
    this.activeBatches.delete(batchId)
  }

  private async process(): Promise<void> {
    if (this.processing) return
    this.processing = true

    while (this.queue.length > 0 && this.running.size < this.maxConcurrency) {
      const job = this.queue.shift()
      if (!job) break

      this.running.add(job.userId)
      this.runJob(job).finally(async () => {
        this.running.delete(job.userId)
        // Add delay to allow GC and prevent memory spikes
        if (process.env.NODE_ENV === 'production') {
          console.log('[Queue] ⏳ Waiting 5s for GC before next job...')
          await new Promise(resolve => setTimeout(resolve, 5000))
        }
        this.process()
      })
    }

    this.processing = false
  }

  private async runJob(job: Job): Promise<void> {
    console.log(`[Job] Entering runJob for user ID: ${job.userId}`)
    const user = await getUserById(job.userId)
    if (!user || !user.active) {
      console.log(`[Queue] User ${job.userId} not found or inactive`)
      // If this is part of a batch, adjust expected count and track inactive user
      if (job.batchId && this.activeBatches.has(job.batchId)) {
        const batch = this.activeBatches.get(job.batchId)!
        batch.expectedCount = Math.max(0, batch.expectedCount - 1)
        if (user && !user.active) {
          batch.inactiveUsers.push(user.name)
        }
        console.log(`[Queue] 📦 Adjusted batch ${job.batchId} expected count to ${batch.expectedCount} (user inactive)`)
        // Check if batch is now complete
        if (batch.runLogs.length >= batch.expectedCount && batch.expectedCount > 0) {
          await this.completeBatch(job.batchId)
        }
      }
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

      // Add system notification for login result
      if (status === 'success') {
        await addNotification({
          title: 'Login Successful',
          message: `Successfully generated token for **${user.name}**.`,
          type: 'success',
          link: '/runs'
        })
      } else {
        await addNotification({
          title: 'Login Failed',
          message: `Login failed for **${user.name}**: ${message}`,
          type: 'error',
          link: '/runs'
        })
      }

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

      // Handle Telegram notifications
      // If this is part of a batch, collect the result and send batch notification when complete
      // Otherwise, send individual notification
      try {
        if (job.batchId && this.isBatchActive(job.batchId)) {
          // Add to batch - batch notification will be sent when all jobs complete
          await this.addToBatch(job.batchId, runLog)
          console.log(`[Job] 📦 Added to batch ${job.batchId} (${this.activeBatches.get(job.batchId)?.runLogs.length}/${this.activeBatches.get(job.batchId)?.expectedCount})`)
        } else {
          // Send individual notification (not part of a batch)
          await sendRunNotification(runLog)
        }
      } catch (error: any) {
        // Don't fail the job if Telegram notification fails - just log the error
        // This ensures the job completes even if Telegram notification fails
        console.error(`[Job] ❌ Failed to send Telegram notification for user ${user.name} (Status: ${status}):`, error.message)
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

  /**
   * Get batch progress information
   */
  getBatchProgress(batchId: string): { completed: number; total: number; percentage: number; active: boolean } | null {
    const batch = this.activeBatches.get(batchId)
    if (!batch) return null

    const percentage = batch.expectedCount > 0
      ? Math.round((batch.runLogs.length / batch.expectedCount) * 100)
      : 0

    return {
      completed: batch.runLogs.length,
      total: batch.expectedCount,
      percentage: Math.min(100, percentage),
      active: true,
    }
  }

  /**
   * Get all active batches with their progress
   */
  getAllBatchProgress(): Array<{ batchId: string; completed: number; total: number; percentage: number }> {
    const batches: Array<{ batchId: string; completed: number; total: number; percentage: number }> = []

    for (const [batchId, batch] of this.activeBatches.entries()) {
      const percentage = batch.expectedCount > 0
        ? Math.round((batch.runLogs.length / batch.expectedCount) * 100)
        : 0

      batches.push({
        batchId,
        completed: batch.runLogs.length,
        total: batch.expectedCount,
        percentage: Math.min(100, percentage),
      })
    }

    return batches
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

export function startBatch(batchId: string, expectedCount: number): void {
  getJobQueue().startBatch(batchId, expectedCount)
}

export function getBatchProgress(batchId: string) {
  return getJobQueue().getBatchProgress(batchId)
}

export function getAllBatchProgress() {
  return getJobQueue().getAllBatchProgress()
}

