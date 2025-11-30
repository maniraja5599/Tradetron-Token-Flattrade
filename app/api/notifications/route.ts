import { NextResponse, NextRequest } from 'next/server'
import {
    getNotifications,
    addNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearAllNotifications
} from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get('limit') || '50')

        const notifications = await getNotifications(limit)
        return NextResponse.json(notifications)
    } catch (error: any) {
        return NextResponse.json(
            { error: `Failed to fetch notifications: ${error.message}` },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { title, message, type, link } = body

        if (!title || !message || !type) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        const notification = await addNotification({
            title,
            message,
            type,
            link
        })

        return NextResponse.json(notification)
    } catch (error: any) {
        return NextResponse.json(
            { error: `Failed to create notification: ${error.message}` },
            { status: 500 }
        )
    }
}

export async function DELETE() {
    try {
        await clearAllNotifications()
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json(
            { error: `Failed to clear notifications: ${error.message}` },
            { status: 500 }
        )
    }
}

export async function PATCH() {
    try {
        await markAllNotificationsAsRead()
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json(
            { error: `Failed to mark all as read: ${error.message}` },
            { status: 500 }
        )
    }
}
