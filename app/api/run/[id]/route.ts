import { NextRequest, NextResponse } from 'next/server'
import { getUserById } from '@/lib/db'
import { enqueueJob } from '@/lib/jobs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getUserById(id)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const headful = searchParams.get('headful') === '1'

    enqueueJob({ userId: id, headful })

    return NextResponse.json({
      success: true,
      message: 'Job enqueued',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

