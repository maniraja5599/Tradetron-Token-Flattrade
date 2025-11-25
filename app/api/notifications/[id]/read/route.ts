import { NextResponse } from 'next/server'
import { markNotificationAsRead } from '@/lib/notifications'

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const success = await markNotificationAsRead(params.id)

        if (!success) {
            return NextResponse.json(
                { error: 'Notification not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json(
            { error: `Failed to mark notification as read: ${error.message}` },
            { status: 500 }
        )
    }
}
