import { NextRequest, NextResponse } from 'next/server'
import { getBatchProgress } from '@/lib/jobs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { batchId } = await params
    const progress = getBatchProgress(batchId)

    if (!progress) {
      return NextResponse.json(
        { error: 'Batch not found or completed' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      batchId,
      ...progress,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}


