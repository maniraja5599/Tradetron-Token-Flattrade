import { NextRequest, NextResponse } from 'next/server'
import { getRunById } from '@/lib/db'
import { statSync, readdirSync } from 'fs'
import path from 'path'
import archiver from 'archiver'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params
    const run = await getRunById(runId)
    if (!run || !run.artifactDir) {
      return NextResponse.json(
        { error: 'Artifacts not found' },
        { status: 404 }
      )
    }

    const artifactPath = path.join(process.cwd(), run.artifactDir)
    
    try {
      statSync(artifactPath)
    } catch {
      return NextResponse.json(
        { error: 'Artifact directory not found on disk' },
        { status: 404 }
      )
    }

    // Create zip archive stream
    const archive = archiver('zip', { zlib: { level: 9 } })
    
    // Add files from artifact directory
    const files = readdirSync(artifactPath)
    for (const file of files) {
      const filePath = path.join(artifactPath, file)
      archive.file(filePath, { name: file })
    }
    
    archive.finalize()

    const stream = new ReadableStream({
      start(controller) {
        archive.on('data', (chunk) => {
          controller.enqueue(chunk)
        })
        archive.on('end', () => {
          controller.close()
        })
        archive.on('error', (err) => {
          controller.error(err)
        })
      },
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="artifacts-${runId}.zip"`,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

