'use client'

import { Suspense } from 'react'
import Header from '../components/Header'
import { useNotifications } from '@/context/NotificationContext'
import { format } from 'date-fns'
import { CheckCheck, Trash2, Bell, Send, Lock, AlertCircle, CheckCircle, Info } from 'lucide-react'

function NotificationsContent() {
    const { notifications, markAsRead, markAllAsRead, clearAll } = useNotifications()

    return (
        <div className="min-h-screen bg-geometric relative">
            <Header />
            <div className="h-[80px] sm:h-[90px]"></div>

            <div className="p-4 sm:p-6 lg:p-8">
                <div className="bg-geometric-shapes">
                    {/* Background shapes same as other pages */}
                    <div className="geometric-triangle triangle-1"></div>
                    <div className="geometric-triangle triangle-2"></div>
                    <div className="geometric-triangle triangle-3"></div>
                    <div className="geometric-triangle triangle-4"></div>
                    <div className="geometric-triangle triangle-5"></div>
                    <div className="geometric-triangle triangle-6"></div>
                    <div className="geometric-triangle triangle-7"></div>
                    <div className="geometric-triangle triangle-8"></div>
                </div>

                <div className="max-w-4xl mx-auto relative z-10 px-4 sm:px-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 bg-clip-text text-transparent flex items-center gap-3">
                                <Bell className="w-8 h-8 text-pink-600" />
                                Notifications
                            </h1>
                            <p className="text-gray-500">Stay updated with your automation status</p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => markAllAsRead()}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm text-sm font-medium"
                            >
                                <CheckCheck className="w-4 h-4" />
                                Mark all read
                            </button>
                            <button
                                onClick={() => {
                                    if (confirm('Are you sure you want to clear all notifications?')) {
                                        clearAll()
                                    }
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 rounded-lg border border-gray-200 hover:bg-red-50 hover:border-red-200 transition-all shadow-sm text-sm font-medium"
                            >
                                <Trash2 className="w-4 h-4" />
                                Clear all
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                        {notifications.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Bell className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">No notifications</h3>
                                <p className="text-gray-500 mt-1">You're all caught up!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`p-6 hover:bg-gray-50 transition-all duration-200 ${!notification.read ? 'bg-blue-50/40' : ''}`}
                                        onClick={() => markAsRead(notification.id)}
                                    >
                                        <div className="flex gap-4 items-start">
                                            <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${notification.type === 'success' ? 'bg-green-100 text-green-600 ring-4 ring-green-50' :
                                                    notification.type === 'error' ? 'bg-red-100 text-red-600 ring-4 ring-red-50' :
                                                        notification.type === 'warning' ? 'bg-yellow-100 text-yellow-600 ring-4 ring-yellow-50' : 'bg-blue-100 text-blue-600 ring-4 ring-blue-50'
                                                }`}>
                                                {notification.title.toLowerCase().includes('telegram') ? <Send className="w-5 h-5" /> :
                                                    notification.title.toLowerCase().includes('login') ? <Lock className="w-5 h-5" /> :
                                                        notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> :
                                                            notification.type === 'error' ? <AlertCircle className="w-5 h-5" /> :
                                                                <Info className="w-5 h-5" />}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start gap-4">
                                                    <h3 className={`text-base font-semibold ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                                                        {notification.title}
                                                    </h3>
                                                    <span className="text-xs text-gray-400 whitespace-nowrap font-medium">
                                                        {format(new Date(notification.createdAt), 'MMM d, h:mm a')}
                                                    </span>
                                                </div>

                                                <p className="text-gray-600 mt-1 leading-relaxed">
                                                    {notification.message}
                                                </p>

                                                {notification.link && (
                                                    <a
                                                        href={notification.link}
                                                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-3 font-medium group"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        View details
                                                        <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function NotificationsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center py-20">Loading...</div>
                </div>
            </div>
        }>
            <NotificationsContent />
        </Suspense>
    )
}
