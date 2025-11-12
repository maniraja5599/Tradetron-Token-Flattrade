import { NextRequest, NextResponse } from 'next/server'
import { getGoogleSheetsConfig, saveGoogleSheetsConfig } from '@/lib/db'

export async function GET() {
  try {
    const config = await getGoogleSheetsConfig()
    return NextResponse.json(config)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get Google Sheets config' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sheetUrlOrId, range, updateEnabled } = body

    await saveGoogleSheetsConfig({
      sheetUrlOrId: sheetUrlOrId || undefined,
      range: range || undefined,
      updateEnabled: updateEnabled !== undefined ? updateEnabled : true,
    })

    return NextResponse.json({
      success: true,
      message: 'Google Sheets config updated successfully',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to save Google Sheets config' },
      { status: 500 }
    )
  }
}

