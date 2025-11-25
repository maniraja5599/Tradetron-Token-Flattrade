import { NextResponse } from 'next/server'
import { getNextRunTime } from '@/lib/scheduler'
import { getScheduleConfig } from '@/lib/db'

export async function GET() {
    try {
        const config = await getScheduleConfig()
        const now = new Date()
        const nextRun = await getNextRunTime()

        // Re-run logic manually to debug
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: config.timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hourCycle: 'h23'
        })
        const parts = formatter.formatToParts(now)
        const tzNow = {
            hour: parseInt(parts.find(p => p.type === 'hour')?.value || '0'),
            minute: parseInt(parts.find(p => p.type === 'minute')?.value || '0')
        }

        return NextResponse.json({
            config,
            serverTime: {
                iso: now.toISOString(),
                local: now.toString(),
                tz: config.timezone,
                tzTime: tzNow
            },
            nextRun: {
                iso: nextRun.toISOString(),
                local: nextRun.toString(),
                diffMs: nextRun.getTime() - now.getTime()
            },
            env: {
                TIME_WINDOW_START: process.env.TIME_WINDOW_START,
                TIME_WINDOW_END: process.env.TIME_WINDOW_END,
                TIME_WINDOW_TIMEZONE: process.env.TIME_WINDOW_TIMEZONE,
            }
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
    }
}
