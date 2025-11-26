import { getNextRunTime, getCurrentSchedule } from '../lib/scheduler'
import { getScheduleConfig } from '../lib/db'

async function debug() {
    console.log('--- Debugging Scheduler ---')

    const config = await getScheduleConfig()
    console.log('Config:', JSON.stringify(config, null, 2))

    const now = new Date()
    console.log('Now (Local):', now.toString())
    console.log('Now (ISO):', now.toISOString())

    const nextRun = await getNextRunTime()
    console.log('Next Run (Local):', nextRun.toString())
    console.log('Next Run (ISO):', nextRun.toISOString())

    const diff = nextRun.getTime() - now.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    console.log(`Countdown: ${hours}h ${minutes}m`)
}

debug().catch(console.error)
