import { NextRequest, NextResponse } from 'next/server'
import { getUsers } from '@/lib/db'
import { enqueueJob, startBatch } from '@/lib/jobs'
import { isWithinTimeWindow, getTimeWindowStatus } from '@/lib/timeWindow'
import { addNotification } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  // Check time window restriction
  if (!isWithinTimeWindow()) {
    const status = getTimeWindowStatus()
    return NextResponse.json(
      {
        error: 'Server is in sleep mode',
        message: status.message,
        nextWindow: status.nextWindow,
        timeWindowEnabled: true,
      },
      { status: 503 }
    )
  }

  try {
    const users = await getUsers()
    const activeUsers = users.filter(u => u.active)

    if (activeUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No active users to run`,
        count: 0,
      })
    }

    // Generate batch ID and start batch tracking
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    startBatch(batchId, activeUsers.length)

    // Notify that batch has started
    await addNotification({
      title: 'Manual Run Started',
      message: `🚀 Starting manual login for **${activeUsers.length}** active users.`,
      type: 'info',
    })

    // Enqueue all jobs with batch ID
    for (const user of activeUsers) {
      enqueueJob({ userId: user.id, batchId })
    }

    return NextResponse.json({
      success: true,
      message: `Enqueued ${activeUsers.length} users`,
      count: activeUsers.length,
      batchId,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

