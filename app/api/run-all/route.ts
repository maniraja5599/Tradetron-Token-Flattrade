import { NextRequest, NextResponse } from 'next/server'
import { getUsers } from '@/lib/db'
import { enqueueJob, startBatch } from '@/lib/jobs'

export async function POST(request: NextRequest) {
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

