'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { Notification } from '@/lib/notifications'

interface NotificationContextType {
    notifications: Notification[]
    unreadCount: number
    loading: boolean
    refreshNotifications: () => Promise<void>
    markAsRead: (id: string) => Promise<void>
    markAllAsRead: () => Promise<void>
    clearAll: () => Promise<void>
    notify: (title: string, message: string, type?: 'success' | 'error' | 'info' | 'warning', link?: string) => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)
    const lastSeenRef = React.useRef<string | null>(null)
    const toastedIdsRef = React.useRef<Set<string>>(new Set())
    const firstLoadRef = React.useRef(true)

    const refreshNotifications = useCallback(async () => {
        try {
            const res = await fetch('/api/notifications?limit=20')
            if (res.ok) {
                const data: Notification[] = await res.json()

                // On first load, just set the last seen ref to the latest notification
                if (firstLoadRef.current) {
                    if (data.length > 0) {
                        lastSeenRef.current = data[0].createdAt
                    }
                    firstLoadRef.current = false
                    setNotifications(data)
                    return
                }

                // Check for new notifications
                if (lastSeenRef.current && data.length > 0) {
                    const newNotifications = data.filter(n =>
                        new Date(n.createdAt).getTime() > new Date(lastSeenRef.current!).getTime()
                    )

                    // Toast new notifications if not already toasted
                    newNotifications.forEach(n => {
                        if (!toastedIdsRef.current.has(n.id)) {
                            // Determine icon based on content
                            let icon = n.type === 'warning' ? '⚠️' : 'ℹ️'
                            if (n.title.toLowerCase().includes('telegram')) icon = '✈️'
                            else if (n.title.toLowerCase().includes('login') && n.type === 'success') icon = '🔐'
                            else if (n.title.toLowerCase().includes('login') && n.type === 'error') icon = '❌'
                            else if (n.title.toLowerCase().includes('batch')) icon = '🚀'
                            else if (n.type === 'success') icon = '✅'
                            else if (n.type === 'error') icon = '❌'

                            // Show toast
                            toast(n.message, {
                                icon,
                                duration: 4000,
                                style: {
                                    borderRadius: '10px',
                                    background: '#333',
                                    color: '#fff',
                                },
                            })
                            toastedIdsRef.current.add(n.id)
                        }
                    })

                    if (data.length > 0) {
                        lastSeenRef.current = data[0].createdAt
                    }
                } else if (!lastSeenRef.current && data.length > 0) {
                    // Case where we had no notifications before, but now we do
                    // We should probably toast them if they are recent? 
                    // Or just treat them as new. Let's treat as new.
                    data.forEach(n => {
                        if (!toastedIdsRef.current.has(n.id)) {
                            switch (n.type) {
                                case 'success':
                                    toast.success(n.message)
                                    break
                                case 'error':
                                    toast.error(n.message)
                                    break
                                default:
                                    toast(n.message, { icon: n.type === 'warning' ? '⚠️' : 'ℹ️' })
                            }
                            toastedIdsRef.current.add(n.id)
                        }
                    })
                    lastSeenRef.current = data[0].createdAt
                }

                setNotifications(data)
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    // Initial load and polling
    useEffect(() => {
        refreshNotifications()
        const interval = setInterval(refreshNotifications, 10000) // Poll every 10s for faster feedback
        return () => clearInterval(interval)
    }, [refreshNotifications])

    const markAsRead = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))

        try {
            await fetch(`/api/notifications/${id}/read`, { method: 'POST' })
        } catch (error) {
            console.error('Failed to mark as read:', error)
            refreshNotifications() // Revert on error
        }
    }

    const markAllAsRead = async () => {
        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))

        try {
            await fetch('/api/notifications', { method: 'PATCH' })
        } catch (error) {
            console.error('Failed to mark all as read:', error)
            refreshNotifications()
        }
    }

    const clearAll = async () => {
        // Optimistic update
        setNotifications([])

        try {
            await fetch('/api/notifications', { method: 'DELETE' })
        } catch (error) {
            console.error('Failed to clear notifications:', error)
            refreshNotifications()
        }
    }

    const notify = async (
        title: string,
        message: string,
        type: 'success' | 'error' | 'info' | 'warning' = 'info',
        link?: string
    ) => {
        // Determine icon based on content
        let icon = type === 'warning' ? '⚠️' : 'ℹ️'
        if (title.toLowerCase().includes('telegram')) icon = '✈️'
        else if (title.toLowerCase().includes('login') && type === 'success') icon = '🔐'
        else if (title.toLowerCase().includes('login') && type === 'error') icon = '❌'
        else if (title.toLowerCase().includes('batch')) icon = '🚀'
        else if (type === 'success') icon = '✅'
        else if (type === 'error') icon = '❌'

        // Show toast immediately
        toast(message, {
            icon,
            duration: 4000,
            style: {
                borderRadius: '10px',
                background: '#333',
                color: '#fff',
            },
        })

        // Save to backend
        try {
            const res = await fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, message, type, link }),
            })

            if (res.ok) {
                const newNotification = await res.json()
                // Add to toasted set so we don't toast again on refresh
                toastedIdsRef.current.add(newNotification.id)
            }

            refreshNotifications()
        } catch (error) {
            console.error('Failed to save notification:', error)
        }
    }

    const unreadCount = notifications.filter(n => !n.read).length

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            loading,
            refreshNotifications,
            markAsRead,
            markAllAsRead,
            clearAll,
            notify
        }}>
            {children}
            <Toaster position="top-right" />
        </NotificationContext.Provider>
    )
}

export function useNotifications() {
    const context = useContext(NotificationContext)
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider')
    }
    return context
}
