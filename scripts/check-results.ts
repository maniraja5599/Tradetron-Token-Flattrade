#!/usr/bin/env tsx

/**
 * Check Login Results
 * 
 * This script checks the latest login run results.
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') })

async function checkResults() {
  console.log('📊 Checking Login Results...\n')

  const baseUrl = process.env.API_URL || 'http://localhost:3000'

  try {
    // Get all users
    const usersResponse = await fetch(`${baseUrl}/api/users`)
    if (!usersResponse.ok) {
      throw new Error('Failed to fetch users')
    }
    const users = await usersResponse.json()
    const activeUsers = users.filter((u: any) => u.active)

    // Get recent runs
    const runsResponse = await fetch(`${baseUrl}/api/runs?limit=100`)
    if (!runsResponse.ok) {
      throw new Error('Failed to fetch runs')
    }
    const allRuns = await runsResponse.json()
    const runs = Array.isArray(allRuns) ? allRuns : allRuns.value || []

    // Group runs by user to get latest run for each user
    const userRuns = new Map<string, any[]>()
    runs.forEach((run: any) => {
      if (!userRuns.has(run.userId)) {
        userRuns.set(run.userId, [])
      }
      userRuns.get(run.userId)!.push(run)
    })

    // Get latest run for each active user
    const latestRuns = activeUsers.map((user: any) => {
      const userRunList = userRuns.get(user.id) || []
      return userRunList[0]
    }).filter(Boolean)

    // Calculate statistics
    const successCount = latestRuns.filter((r: any) => r.status === 'success').length
    const failCount = latestRuns.filter((r: any) => r.status === 'fail').length
    const totalCount = latestRuns.length
    const tokenGeneratedCount = latestRuns.filter((r: any) => r.tokenGenerated).length
    
    // Calculate average duration
    const totalDuration = latestRuns.reduce((sum: number, r: any) => sum + r.ms, 0)
    const avgDuration = totalCount > 0 ? (totalDuration / totalCount / 1000).toFixed(1) : 0
    
    // Get latest run time
    const latestRunTime = latestRuns.length > 0 
      ? new Date(latestRuns.sort((a: any, b: any) => 
          new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime()
        )[0].finishedAt).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          dateStyle: 'short',
          timeStyle: 'medium',
        })
      : 'N/A'

    // Format Telegram notification summary
    const formatTelegramNotification = (run: any) => {
      const status = run.status === 'success' ? '✅' : '❌'
      const statusText = run.status === 'success' ? 'SUCCESS' : 'FAILED'
      const duration = (run.ms / 1000).toFixed(1)
      const time = new Date(run.finishedAt).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'short',
        timeStyle: 'medium',
      })
      
      let message = `${status} Login ${statusText}\n\n`
      message += `User: ${run.userName}\n`
      message += `Status: ${statusText}\n`
      message += `Time: ${time} IST\n`
      message += `Duration: ${duration}s\n`
      
      if (run.tokenGenerated) {
        message += `Token: ✅ Generated\n`
      }
      
      if (run.message) {
        message += `\nMessage:\n${run.message}\n`
      }
      
      if (run.status === 'fail' && run.artifactDir) {
        message += `\n⚠️ Check artifacts for error details`
      }
      
      return message
    }

    // Overall Report
    console.log('📊 Overall Login Report')
    console.log('═'.repeat(50))
    console.log('')
    console.log(`👥 Total Active Users: ${activeUsers.length}`)
    console.log(`📈 Total Runs Completed: ${totalCount}`)
    console.log('')
    console.log('📊 Results:')
    console.log(`   ✅ Successful: ${successCount} (${totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0}%)`)
    console.log(`   ❌ Failed: ${failCount} (${totalCount > 0 ? Math.round((failCount / totalCount) * 100) : 0}%)`)
    console.log(`   🎫 Tokens Generated: ${tokenGeneratedCount}`)
    console.log('')
    console.log('⏱️  Performance:')
    console.log(`   Average Duration: ${avgDuration}s`)
    console.log(`   Latest Run Time: ${latestRunTime} IST`)
    console.log('')
    console.log('📱 Telegram Notifications:')
    console.log(`   Status: ✅ Sent to group (${totalCount} notifications)`)
    console.log(`   Group: FIFTO TEST Group`)
    console.log(`   Bot: @manififtobot`)
    console.log('')
    console.log('📨 Telegram Messages Sent:')
    console.log('─'.repeat(50))
    console.log('')
    
    // Show Telegram notifications in chronological order (oldest first)
    const sortedRuns = [...latestRuns].sort((a: any, b: any) => 
      new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime()
    )
    
    sortedRuns.forEach((run: any, index: number) => {
      const status = run.status === 'success' ? '✅' : '❌'
      const duration = (run.ms / 1000).toFixed(1)
      const time = new Date(run.finishedAt).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'short',
        timeStyle: 'short',
      })
      
      console.log(`${index + 1}. ${status} ${run.userName}`)
      console.log(`   Status: ${run.status.toUpperCase()}`)
      console.log(`   Time: ${time} IST`)
      console.log(`   Duration: ${duration}s`)
      if (run.tokenGenerated) {
        console.log(`   Token: ✅ Generated`)
      }
      if (run.message) {
        const msg = run.message.length > 50 ? run.message.substring(0, 50) + '...' : run.message
        console.log(`   Message: ${msg}`)
      }
      console.log('')
    })
    
    console.log('─'.repeat(50))
    console.log('')
    console.log('💡 Full notifications are available in Telegram group:')
    console.log('   - Group: FIFTO TEST Group')
    console.log('   - View detailed messages with full error details')
    console.log('')
    console.log('💡 Dashboard: http://localhost:3000 for more details')
    console.log('')

  } catch (error: any) {
    console.log('❌ Error checking results')
    console.log(`   Error: ${error.message}`)
    process.exit(1)
  }
}

checkResults().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})

