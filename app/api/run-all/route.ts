import { NextRequest, NextResponse } from 'next/server'
import { getUsers } from '@/lib/db'
import { enqueueJob } from '@/lib/jobs'

export async function POST(request: NextRequest) {
  try {
    const users = await getUsers()
    const activeUsers = users.filter(u => u.active)

    for (const user of activeUsers) {
      enqueueJob({ userId: user.id })
    }

    return NextResponse.json({
      success: true,
      message: `Enqueued ${activeUsers.length} users`,
      count: activeUsers.length,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

