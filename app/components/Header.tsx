'use client'

import { Suspense, useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Send, Lock, AlertCircle, CheckCircle, Info, LayoutDashboard, Users, Activity, Settings } from 'lucide-react'
import { useNotifications } from '@/context/NotificationContext'
import { format } from 'date-fns'

function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNotificationClick = (id: string) => {
    markAsRead(id)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300 relative group"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-indigo-900"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="font-bold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No notifications yet
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.slice(0, 5).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${!notification.read ? 'bg-blue-50/30' : ''}`}
                    onClick={() => handleNotificationClick(notification.id)}
                  >
                    <div className="flex gap-3">
                      <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${notification.type === 'success' ? 'bg-green-100 text-green-600' :
                        notification.type === 'error' ? 'bg-red-100 text-red-600' :
                          notification.type === 'warning' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                        {notification.title.toLowerCase().includes('telegram') ? <Send className="w-4 h-4" /> :
                          notification.title.toLowerCase().includes('login') ? <Lock className="w-4 h-4" /> :
                            notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> :
                              notification.type === 'error' ? <AlertCircle className="w-4 h-4" /> :
                                <Info className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1.5">
                          {format(new Date(notification.createdAt), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-gray-100 bg-gray-50/50 text-center">
            <Link
              href="/notifications"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium block w-full"
              onClick={() => setIsOpen(false)}
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function HeaderContent() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/'
    }
    return pathname?.startsWith(path)
  }

  return (
    <header className="fixed top-0 left-0 right-0 bg-gradient-to-r from-indigo-900/40 via-purple-900/40 to-pink-900/40 backdrop-blur-3xl shadow-xl z-50 border-b border-white/20" style={{ backdropFilter: 'blur(24px)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-w-0 py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-90 transition-opacity flex-shrink-0 min-w-0 group">
            <div className="logo-brain-gear flex-shrink-0 group-hover:scale-110 transition-transform duration-300"></div>
            <div className="min-w-0">
              <div className="text-xl sm:text-2xl md:text-3xl font-bold tracking-normal truncate drop-shadow-lg" style={{
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontWeight: '700',
                letterSpacing: '-0.02em',
                color: '#E0E0E0'
              }}>TRADETRON</div>
              <div className="text-xs sm:text-xs font-semibold tracking-wide -mt-1 truncate" style={{ color: '#B0B0B0' }}>Token Generator for Flatrade</div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2 flex-shrink-0">
            <Link
              href="/"
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap transform hover:scale-105 flex items-center gap-2 ${isActive('/') && pathname === '/'
                ? 'bg-white/90 text-gray-900 shadow-lg backdrop-blur-sm'
                : 'hover:text-white hover:bg-white/20 backdrop-blur-sm'
                }`}
              style={!isActive('/') || pathname !== '/' ? { color: '#D0D0D0' } : undefined}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            <Link
              href="/users"
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap transform hover:scale-105 flex items-center gap-2 ${isActive('/users')
                ? 'bg-white/90 text-gray-900 shadow-lg backdrop-blur-sm'
                : 'hover:text-white hover:bg-white/20 backdrop-blur-sm'
                }`}
              style={!isActive('/users') ? { color: '#D0D0D0' } : undefined}
            >
              <Users className="w-4 h-4" />
              Users
            </Link>
            <Link
              href="/runs"
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap transform hover:scale-105 flex items-center gap-2 ${isActive('/runs')
                ? 'bg-white/90 text-gray-900 shadow-lg backdrop-blur-sm'
                : 'hover:text-white hover:bg-white/20 backdrop-blur-sm'
                }`}
              style={!isActive('/runs') ? { color: '#D0D0D0' } : undefined}
            >
              <Activity className="w-4 h-4" />
              All Runs
            </Link>
            <Link
              href="/telegram-preview"
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap transform hover:scale-105 flex items-center gap-2 ${isActive('/telegram-preview')
                ? 'bg-white/90 text-gray-900 shadow-lg backdrop-blur-sm'
                : 'hover:text-white hover:bg-white/20 backdrop-blur-sm'
                }`}
              style={!isActive('/telegram-preview') ? { color: '#D0D0D0' } : undefined}
            >
              <Send className="w-4 h-4" />
              Telegram Preview
            </Link>
            <Link
              href="/settings"
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap transform hover:scale-105 flex items-center gap-2 ${isActive('/settings')
                ? 'bg-white/90 text-gray-900 shadow-lg backdrop-blur-sm'
                : 'hover:text-white hover:bg-white/20 backdrop-blur-sm'
                }`}
              style={!isActive('/settings') ? { color: '#D0D0D0' } : undefined}
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </nav>

          {/* Notification Bell */}
          <div className="relative ml-auto md:ml-4 mr-2 md:mr-0">
            <NotificationBell />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl hover:bg-white/20 backdrop-blur-sm transition-all duration-300" style={{ color: '#D0D0D0' }}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/20 py-4 animate-in slide-in-from-top duration-300">
            <nav className="flex flex-col gap-2">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-xl text-base font-bold transition-all duration-300 flex items-center gap-3 ${isActive('/') && pathname === '/'
                  ? 'bg-white/90 text-gray-900 shadow-lg backdrop-blur-sm'
                  : 'hover:text-white hover:bg-white/20 backdrop-blur-sm'
                  }`}
                style={!isActive('/') || pathname !== '/' ? { color: '#D0D0D0' } : undefined}
              >
                <LayoutDashboard className="w-5 h-5" />
                Dashboard
              </Link>
              <Link
                href="/users"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-xl text-base font-bold transition-all duration-300 flex items-center gap-3 ${isActive('/users')
                  ? 'bg-white/90 text-gray-900 shadow-lg backdrop-blur-sm'
                  : 'hover:text-white hover:bg-white/20 backdrop-blur-sm'
                  }`}
                style={!isActive('/users') ? { color: '#D0D0D0' } : undefined}
              >
                <Users className="w-5 h-5" />
                Users
              </Link>
              <Link
                href="/runs"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-xl text-base font-bold transition-all duration-300 flex items-center gap-3 ${isActive('/runs')
                  ? 'bg-white/90 text-gray-900 shadow-lg backdrop-blur-sm'
                  : 'hover:text-white hover:bg-white/20 backdrop-blur-sm'
                  }`}
                style={!isActive('/runs') ? { color: '#D0D0D0' } : undefined}
              >
                <Activity className="w-5 h-5" />
                All Runs
              </Link>
              <Link
                href="/telegram-preview"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-xl text-base font-bold transition-all duration-300 flex items-center gap-3 ${isActive('/telegram-preview')
                  ? 'bg-white/90 text-gray-900 shadow-lg backdrop-blur-sm'
                  : 'hover:text-white hover:bg-white/20 backdrop-blur-sm'
                  }`}
                style={!isActive('/telegram-preview') ? { color: '#D0D0D0' } : undefined}
              >
                <Send className="w-5 h-5" />
                Telegram Preview
              </Link>
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-xl text-base font-bold transition-all duration-300 flex items-center gap-3 ${isActive('/settings')
                  ? 'bg-white/90 text-gray-900 shadow-lg backdrop-blur-sm'
                  : 'hover:text-white hover:bg-white/20 backdrop-blur-sm'
                  }`}
                style={!isActive('/settings') ? { color: '#D0D0D0' } : undefined}
              >
                <Settings className="w-5 h-5" />
                Settings
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

export default function Header() {
  return (
    <Suspense fallback={
      <header className="fixed top-0 left-0 right-0 bg-gradient-to-r from-indigo-900/40 via-purple-900/40 to-pink-900/40 backdrop-blur-3xl shadow-xl z-50 border-b border-white/20" style={{ backdropFilter: 'blur(24px)' }}>
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="logo-brain-gear"></div>
              <div>
                <div className="text-2xl font-extrabold tracking-tight drop-shadow-lg" style={{ color: '#E0E0E0' }}>TRADETRON</div>
                <div className="text-xs font-semibold tracking-wide -mt-1" style={{ color: '#B0B0B0' }}>Token Generator for Flatrade</div>
              </div>
            </div>
            <nav className="flex items-center gap-2">
              <div className="px-4 py-2 rounded-xl text-sm font-bold" style={{ color: '#D0D0D0' }}>Dashboard</div>
              <div className="px-4 py-2 rounded-xl text-sm font-bold" style={{ color: '#D0D0D0' }}>Users</div>
              <div className="px-4 py-2 rounded-xl text-sm font-bold" style={{ color: '#D0D0D0' }}>All Runs</div>
              <div className="px-4 py-2 rounded-xl text-sm font-bold" style={{ color: '#D0D0D0' }}>Telegram Preview</div>
            </nav>
          </div>
        </div>
      </header>
    }>
      <HeaderContent />
    </Suspense>
  )
}
