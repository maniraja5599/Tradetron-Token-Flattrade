'use client'

import Link from 'next/link'
import { RunLog } from '@/types'
import Header from '../components/Header'

// Format run result for Telegram notification (same as in lib/telegram.ts)
function formatRunNotification(runLog: RunLog): string {
  const status = runLog.status === 'success' ? '✅' : '❌'
  const statusText = runLog.status === 'success' ? 'SUCCESS' : 'FAILED'
  const duration = (runLog.ms / 1000).toFixed(1)
  
  const time = new Date(runLog.finishedAt).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'short',
    timeStyle: 'medium',
  })

  let message = `<b>${status} Login ${statusText}</b>\n\n`
  message += `<b>User:</b> ${runLog.userName}\n`
  message += `<b>Status:</b> ${statusText}\n`
  message += `<b>Time:</b> ${time} IST\n`
  message += `<b>Duration:</b> ${duration}s\n`

  if (runLog.tokenGenerated) {
    message += `<b>Token:</b> ✅ Generated\n`
  }

  if (runLog.message) {
    const messageText = runLog.message.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    message += `\n<b>Message:</b>\n<code>${messageText}</code>\n`
  }

  if (runLog.finalUrl) {
    message += `\n<b>Final URL:</b> ${runLog.finalUrl}\n`
  }

  if (runLog.status === 'fail' && runLog.artifactDir) {
    message += `\n⚠️ <i>Check artifacts for error details</i>`
  }

  return message
}

// Format batch results for Telegram notification (same as in lib/telegram.ts)
function formatBatchNotification(runLogs: RunLog[]): string {
  const total = runLogs.length
  const successful = runLogs.filter(r => r.status === 'success').length
  const unsuccessful = runLogs.filter(r => r.status === 'fail').length

  let message = `<b>📊 Batch Results</b>\n\n`
  message += `Total: ${total} | ✅ ${successful} | ❌ ${unsuccessful}\n\n`

  // Successful runs
  const successfulRuns = runLogs.filter(r => r.status === 'success')
  if (successfulRuns.length > 0) {
    message += `<b>✅ Successful</b>\n`
    for (const run of successfulRuns) {
      const time = new Date(run.finishedAt).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).toLowerCase()
      const duration = (run.ms / 1000).toFixed(1)
      const tokenText = run.tokenGenerated ? ' ✅ Token' : ''
      message += `${run.userName} - ${time} (${duration}s)${tokenText}\n`
    }
    message += `\n`
  }

  // Unsuccessful runs
  const unsuccessfulRuns = runLogs.filter(r => r.status === 'fail')
  if (unsuccessfulRuns.length > 0) {
    message += `<b>❌ Unsuccessful</b>\n`
    for (const run of unsuccessfulRuns) {
      const time = new Date(run.finishedAt).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).toLowerCase()
      const duration = (run.ms / 1000).toFixed(1)
      message += `${run.userName} - ${time} (${duration}s)\n`
      if (run.message) {
        const errorMessage = run.message.replace(/</g, '&lt;').replace(/>/g, '&gt;')
        message += `Error: ${errorMessage}\n`
      }
    }
    message += `\n`
    message += `⚠️ Check artifacts for details`
  }

  return message
}

// Convert HTML to plain text for display (simplified)
function htmlToText(html: string): string {
  return html
    .replace(/<b>(.*?)<\/b>/g, '**$1**')
    .replace(/<i>(.*?)<\/i>/g, '*$1*')
    .replace(/<code>(.*?)<\/code>/g, '`$1`')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n/g, '\n')
}

export default function TelegramPreview() {
  // Sample data for preview
  const now = new Date()
  const sampleSuccessRun: RunLog = {
    id: 'sample-1',
    userId: 'user-1',
    userName: 'ARUN',
    startedAt: new Date(now.getTime() - 18000).toISOString(),
    finishedAt: now.toISOString(),
    ms: 18000,
    status: 'success',
    message: 'Token generated successfully',
    tokenGenerated: true,
    finalUrl: 'https://flattrade.tradetron.tech/dashboard',
  }

  const sampleFailedRun: RunLog = {
    id: 'sample-2',
    userId: 'user-2',
    userName: 'SACHIN',
    startedAt: new Date(now.getTime() - 20000).toISOString(),
    finishedAt: new Date(now.getTime() - 2000).toISOString(),
    ms: 20000,
    status: 'fail',
    message: 'Authentication failed - Error detected on page',
    artifactDir: 'run-1234567890',
  }

  const sampleBatchRuns: RunLog[] = [
    {
      id: 'batch-1',
      userId: 'user-1',
      userName: 'SP',
      startedAt: new Date(now.getTime() - 20000).toISOString(),
      finishedAt: new Date(now.getTime() - 2000).toISOString(),
      ms: 18000,
      status: 'success',
      message: 'Token generated successfully',
      tokenGenerated: true,
    },
    {
      id: 'batch-2',
      userId: 'user-2',
      userName: 'SACHIN',
      startedAt: new Date(now.getTime() - 20000).toISOString(),
      finishedAt: new Date(now.getTime() - 2000).toISOString(),
      ms: 18000,
      status: 'success',
      message: 'Token generated successfully',
      tokenGenerated: true,
    },
    {
      id: 'batch-3',
      userId: 'user-3',
      userName: 'RISHU',
      startedAt: new Date(now.getTime() - 20000).toISOString(),
      finishedAt: new Date(now.getTime() - 2000).toISOString(),
      ms: 18000,
      status: 'success',
      message: 'Token generated successfully',
      tokenGenerated: true,
    },
    {
      id: 'batch-4',
      userId: 'user-4',
      userName: 'ARUN',
      startedAt: new Date(now.getTime() - 20000).toISOString(),
      finishedAt: new Date(now.getTime() - 2000).toISOString(),
      ms: 20000,
      status: 'fail',
      message: 'Authentication failed - Error detected on page',
    },
  ]

  const successMessage = formatRunNotification(sampleSuccessRun)
  const failedMessage = formatRunNotification(sampleFailedRun)
  const batchMessage = formatBatchNotification(sampleBatchRuns)

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .telegram-message b {
          font-weight: 700;
        }
        .telegram-message code {
          background-color: rgba(0, 0, 0, 0.1);
          padding: 2px 4px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
          font-size: 0.9em;
          color: #1f2937;
        }
        .telegram-message {
          color: #111827;
        }
        .telegram-message b {
          color: #111827;
        }
        .telegram-message i {
          font-style: italic;
        }
      `}} />
      <div className="min-h-screen bg-geometric relative">
        <Header />
        <div className="p-8 pt-24">
        <div className="bg-geometric-shapes">
          <div className="geometric-triangle triangle-1"></div>
          <div className="geometric-triangle triangle-2"></div>
          <div className="geometric-triangle triangle-3"></div>
        </div>
        <div className="max-w-4xl mx-auto relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 bg-clip-text text-transparent">Telegram Message Preview</h1>
          <p className="text-gray-400">Preview of how notifications appear in Telegram</p>
        </div>

        {/* Success Notification */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-green-600">✅ Success Notification</h2>
          <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-green-500 mb-4">
            <div 
              className="text-sm leading-relaxed telegram-message whitespace-pre-wrap text-gray-900"
              dangerouslySetInnerHTML={{ __html: successMessage }}
            />
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700 mb-2">
              <strong>Raw HTML (as sent to Telegram):</strong>
            </p>
            <pre className="text-xs bg-gray-800 text-green-400 p-3 rounded overflow-x-auto whitespace-pre-wrap">
              {successMessage}
            </pre>
          </div>
        </div>

        {/* Failed Notification */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-red-600">❌ Failed Notification</h2>
          <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-red-500 mb-4">
            <div 
              className="text-sm leading-relaxed telegram-message whitespace-pre-wrap text-gray-900"
              dangerouslySetInnerHTML={{ __html: failedMessage }}
            />
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700 mb-2">
              <strong>Raw HTML (as sent to Telegram):</strong>
            </p>
            <pre className="text-xs bg-gray-800 text-green-400 p-3 rounded overflow-x-auto whitespace-pre-wrap">
              {failedMessage}
            </pre>
          </div>
        </div>

        {/* Batch Notification */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-600">📊 Batch Results Notification</h2>
          <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500 mb-4">
            <div 
              className="text-sm leading-relaxed telegram-message whitespace-pre-wrap text-gray-900"
              dangerouslySetInnerHTML={{ __html: batchMessage }}
            />
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700 mb-2">
              <strong>Raw HTML (as sent to Telegram):</strong>
            </p>
            <pre className="text-xs bg-gray-800 text-green-400 p-3 rounded overflow-x-auto whitespace-pre-wrap">
              {batchMessage}
            </pre>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">ℹ️ About Telegram Notifications</h3>
          <ul className="list-disc list-inside text-sm text-blue-800 space-y-2">
            <li>Messages are sent in HTML format with parse_mode: 'HTML'</li>
            <li>Bold text uses <code className="bg-blue-100 px-1 rounded">&lt;b&gt;</code> tags</li>
            <li>Code blocks use <code className="bg-blue-100 px-1 rounded">&lt;code&gt;</code> tags</li>
            <li>Italic text uses <code className="bg-blue-100 px-1 rounded">&lt;i&gt;</code> tags</li>
            <li>Individual notifications are sent after each user run completes</li>
            <li>Batch notifications summarize all runs when running multiple users</li>
          </ul>
        </div>
        </div>
        </div>
      </div>
    </>
  )
}

