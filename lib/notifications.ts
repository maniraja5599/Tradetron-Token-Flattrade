import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { readJsonFile, writeJsonFile } from './db'

const DATA_DIR = path.join(process.cwd(), 'data')
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json')

export interface Notification {
    id: string
    title: string
    message: string
    type: 'success' | 'error' | 'info' | 'warning'
    read: boolean
    createdAt: string
    link?: string
}

export async function getNotifications(limit: number = 100): Promise<Notification[]> {
    const notifications = await readJsonFile<Notification[]>(NOTIFICATIONS_FILE, [])
    // Sort by createdAt descending (most recent first)
    return notifications.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ).slice(0, limit)
}

export async function addNotification(
    notification: Omit<Notification, 'id' | 'createdAt' | 'read'>
): Promise<Notification> {
    const notifications = await readJsonFile<Notification[]>(NOTIFICATIONS_FILE, [])

    const newNotification: Notification = {
        ...notification,
        id: uuidv4(),
        read: false,
        createdAt: new Date().toISOString(),
    }

    notifications.unshift(newNotification)

    // Keep only last 1000 notifications
    const limited = notifications.slice(0, 1000)

    await writeJsonFile(NOTIFICATIONS_FILE, limited)
    return newNotification
}

export async function markNotificationAsRead(id: string): Promise<boolean> {
    const notifications = await readJsonFile<Notification[]>(NOTIFICATIONS_FILE, [])
    const notification = notifications.find(n => n.id === id)

    if (!notification) return false

    notification.read = true
    await writeJsonFile(NOTIFICATIONS_FILE, notifications)
    return true
}

export async function markAllNotificationsAsRead(): Promise<void> {
    const notifications = await readJsonFile<Notification[]>(NOTIFICATIONS_FILE, [])
    notifications.forEach(n => n.read = true)
    await writeJsonFile(NOTIFICATIONS_FILE, notifications)
}

export async function clearAllNotifications(): Promise<void> {
    await writeJsonFile(NOTIFICATIONS_FILE, [])
}

export async function getUnreadCount(): Promise<number> {
    const notifications = await readJsonFile<Notification[]>(NOTIFICATIONS_FILE, [])
    return notifications.filter(n => !n.read).length
}
