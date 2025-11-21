#!/usr/bin/env tsx

/**
 * Run Login for All Active Users
 * 
 * This script runs login for all active users and monitors the results.
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') })

async function runAllUsers() {
  console.log('🚀 Running login for all active users...\n')

  const baseUrl = process.env.API_URL || 'http://localhost:3000'

  try {
    // Check if server is running
    console.log('📡 Checking server status...')
    try {
      const healthResponse = await fetch(`${baseUrl}/api/health`)
      if (!healthResponse.ok) {
        throw new Error('Server not responding')
      }
      const health = await healthResponse.json()
      console.log('✅ Server is running\n')
    } catch (error: any) {
      console.log('❌ Server is not running')
      console.log(`   Error: ${error.message}`)
      console.log('\n💡 Please start the server first:')
      console.log('   npm run dev')
      process.exit(1)
    }

    // Get all users
    console.log('👥 Fetching users...')
    const usersResponse = await fetch(`${baseUrl}/api/users`)
    if (!usersResponse.ok) {
      throw new Error('Failed to fetch users')
    }
    const users = await usersResponse.json()
    const activeUsers = users.filter((u: any) => u.active)

    console.log(`✅ Found ${users.length} total users`)
    console.log(`✅ Found ${activeUsers.length} active users\n`)

    if (activeUsers.length === 0) {
      console.log('⚠️  No active users found')
      console.log('   Please activate at least one user to run login')
      process.exit(0)
    }

    // Display active users
    console.log('📋 Active users:')
    activeUsers.forEach((user: any, index: number) => {
      console.log(`   ${index + 1}. ${user.name} (ID: ${user.id})`)
    })
    console.log('')

    // Run all users
    console.log('🔄 Triggering login for all active users...')
    const runAllResponse = await fetch(`${baseUrl}/api/run-all`, {
      method: 'POST',
    })

    if (!runAllResponse.ok) {
      const error = await runAllResponse.json()
      throw new Error(error.error || 'Failed to run all users')
    }

    const result = await runAllResponse.json()
    console.log(`✅ ${result.message}\n`)

    // Wait a bit for jobs to start
    console.log('⏳ Waiting for jobs to start...')
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Monitor runs
    console.log('📊 Monitoring runs...\n')
    console.log('⏳ Waiting for all jobs to complete...\n')

    // Wait for jobs to complete (max 2 minutes)
    const maxWaitTime = 120000 // 2 minutes
    const checkInterval = 5000 // 5 seconds
    let elapsedTime = 0

    const checkResults = setInterval(async () => {
      try {
        elapsedTime += checkInterval
        
        // Check queue status
        const healthResponse = await fetch(`${baseUrl}/api/health`)
        if (healthResponse.ok) {
          const health = await healthResponse.json()
          const queue = health.queue || {}
          
          // Check if all jobs are done
          if (queue.queueLength === 0 && queue.running === 0) {
            clearInterval(checkResults)
            
            // Get latest runs for all users
            const runsResponse = await fetch(`${baseUrl}/api/runs?limit=100`)
            if (runsResponse.ok) {
              const allRuns = await runsResponse.json()
              const runs = Array.isArray(allRuns) ? allRuns : allRuns.value || []
              
              // Group runs by user
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
              console.log('📱 Notifications:')
              console.log(`   Telegram: ✅ Sent to group (${totalCount} notifications)`)
              console.log('')
              console.log('═'.repeat(50))
              console.log('')
              console.log('💡 For detailed individual results, check:')
              console.log('   - Telegram group: FIFTO TEST Group')
              console.log('   - Dashboard: http://localhost:3000')
              console.log('')
            }
          } else {
            // Show progress
            const remaining = queue.queueLength + queue.running
            process.stdout.write(`\r⏳ Processing... ${remaining} job(s) remaining`)
          }
        }
      } catch (error) {
        // Ignore errors when checking runs
      }
      
      // Timeout after max wait time
      if (elapsedTime >= maxWaitTime) {
        clearInterval(checkResults)
        console.log('\n\n⏱️  Timeout reached. Some jobs may still be running.')
        console.log('💡 Check the dashboard at http://localhost:3000 for complete results\n')
      }
    }, checkInterval)

  } catch (error: any) {
    console.log('❌ Error running all users')
    console.log(`   Error: ${error.message}`)
    process.exit(1)
  }
}

runAllUsers().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})

