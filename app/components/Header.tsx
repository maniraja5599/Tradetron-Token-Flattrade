'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

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
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap transform hover:scale-105 ${
                isActive('/') && pathname === '/'
                  ? 'bg-white/90 text-gray-900 shadow-lg backdrop-blur-sm'
                  : 'hover:text-white hover:bg-white/20 backdrop-blur-sm'
              }`}
              style={!isActive('/') || pathname !== '/' ? { color: '#D0D0D0' } : undefined}
            >
              Dashboard
            </Link>
            <Link
              href="/users"
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap transform hover:scale-105 ${
                isActive('/users')
                  ? 'bg-white/90 text-gray-900 shadow-lg backdrop-blur-sm'
                  : 'hover:text-white hover:bg-white/20 backdrop-blur-sm'
              }`}
              style={!isActive('/users') ? { color: '#D0D0D0' } : undefined}
            >
              Users
            </Link>
            <Link
              href="/runs"
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap transform hover:scale-105 ${
                isActive('/runs')
                  ? 'bg-white/90 text-gray-900 shadow-lg backdrop-blur-sm'
                  : 'hover:text-white hover:bg-white/20 backdrop-blur-sm'
              }`}
              style={!isActive('/runs') ? { color: '#D0D0D0' } : undefined}
            >
              All Runs
            </Link>
            <Link
              href="/telegram-preview"
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap transform hover:scale-105 ${
                isActive('/telegram-preview')
                  ? 'bg-white/90 text-gray-900 shadow-lg backdrop-blur-sm'
                  : 'hover:text-white hover:bg-white/20 backdrop-blur-sm'
              }`}
              style={!isActive('/telegram-preview') ? { color: '#D0D0D0' } : undefined}
            >
              Telegram Preview
            </Link>
            <Link
              href="/settings"
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap transform hover:scale-105 ${
                isActive('/settings')
                  ? 'bg-white/90 text-gray-900 shadow-lg backdrop-blur-sm'
                  : 'hover:text-white hover:bg-white/20 backdrop-blur-sm'
              }`}
              style={!isActive('/settings') ? { color: '#D0D0D0' } : undefined}
            >
              Settings
            </Link>
          </nav>

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
                className={`px-4 py-3 rounded-xl text-base font-bold transition-all duration-300 ${
                  isActive('/') && pathname === '/'
                    ? 'bg-white/90 text-gray-900 shadow-lg backdrop-blur-sm'
                    : 'hover:text-white hover:bg-white/20 backdrop-blur-sm'
                }`}
                style={!isActive('/') || pathname !== '/' ? { color: '#D0D0D0' } : undefined}
              >
                Dashboard
              </Link>
              <Link
                href="/users"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-xl text-base font-bold transition-all duration-300 ${
                  isActive('/users')
                    ? 'bg-white/90 text-gray-900 shadow-lg backdrop-blur-sm'
                    : 'hover:text-white hover:bg-white/20 backdrop-blur-sm'
                }`}
                style={!isActive('/users') ? { color: '#D0D0D0' } : undefined}
              >
                Users
              </Link>
              <Link
                href="/runs"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-xl text-base font-bold transition-all duration-300 ${
                  isActive('/runs')
                    ? 'bg-white/90 text-gray-900 shadow-lg backdrop-blur-sm'
                    : 'hover:text-white hover:bg-white/20 backdrop-blur-sm'
                }`}
                style={!isActive('/runs') ? { color: '#D0D0D0' } : undefined}
              >
                All Runs
              </Link>
              <Link
                href="/telegram-preview"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-xl text-base font-bold transition-all duration-300 ${
                  isActive('/telegram-preview')
                    ? 'bg-white/90 text-gray-900 shadow-lg backdrop-blur-sm'
                    : 'hover:text-white hover:bg-white/20 backdrop-blur-sm'
                }`}
                style={!isActive('/telegram-preview') ? { color: '#D0D0D0' } : undefined}
              >
                Telegram Preview
              </Link>
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-xl text-base font-bold transition-all duration-300 ${
                  isActive('/settings')
                    ? 'bg-white/90 text-gray-900 shadow-lg backdrop-blur-sm'
                    : 'hover:text-white hover:bg-white/20 backdrop-blur-sm'
                }`}
                style={!isActive('/settings') ? { color: '#D0D0D0' } : undefined}
              >
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
