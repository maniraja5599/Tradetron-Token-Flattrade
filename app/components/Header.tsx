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
    <header className="bg-black/30 backdrop-blur-md shadow-xl sticky top-0 z-50 border-b border-white/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-w-0 py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity flex-shrink-0 min-w-0 group">
            <div className="logo-brain-gear flex-shrink-0 group-hover:scale-110 transition-transform duration-300"></div>
            <div className="min-w-0">
              <div className="text-lg sm:text-xl md:text-2xl font-extrabold text-white tracking-tight truncate drop-shadow-lg">TRADETRON</div>
              <div className="text-xs sm:text-xs text-white/90 font-semibold tracking-wide -mt-1 truncate">Token Generator for Flatrade</div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2 flex-shrink-0">
            <Link
              href="/"
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap transform hover:scale-105 ${
                isActive('/') && pathname === '/'
                  ? 'bg-white/90 text-gray-900 shadow-lg backdrop-blur-sm'
                  : 'text-white/90 hover:text-white hover:bg-white/20 backdrop-blur-sm'
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/users"
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap transform hover:scale-105 ${
                isActive('/users')
                  ? 'bg-white/90 text-gray-900 shadow-lg backdrop-blur-sm'
                  : 'text-white/90 hover:text-white hover:bg-white/20 backdrop-blur-sm'
              }`}
            >
              Users
            </Link>
            <Link
              href="/runs"
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap transform hover:scale-105 ${
                isActive('/runs')
                  ? 'bg-white/90 text-gray-900 shadow-lg backdrop-blur-sm'
                  : 'text-white/90 hover:text-white hover:bg-white/20 backdrop-blur-sm'
              }`}
            >
              All Runs
            </Link>
            <Link
              href="/telegram-preview"
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap transform hover:scale-105 ${
                isActive('/telegram-preview')
                  ? 'bg-white/90 text-gray-900 shadow-lg backdrop-blur-sm'
                  : 'text-white/90 hover:text-white hover:bg-white/20 backdrop-blur-sm'
              }`}
            >
              Telegram Preview
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-white hover:bg-white/20 backdrop-blur-sm transition-all duration-300"
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
                    : 'text-white/90 hover:text-white hover:bg-white/20 backdrop-blur-sm'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/users"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-xl text-base font-bold transition-all duration-300 ${
                  isActive('/users')
                    ? 'bg-white/90 text-gray-900 shadow-lg backdrop-blur-sm'
                    : 'text-white/90 hover:text-white hover:bg-white/20 backdrop-blur-sm'
                }`}
              >
                Users
              </Link>
              <Link
                href="/runs"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-xl text-base font-bold transition-all duration-300 ${
                  isActive('/runs')
                    ? 'bg-white/90 text-gray-900 shadow-lg backdrop-blur-sm'
                    : 'text-white/90 hover:text-white hover:bg-white/20 backdrop-blur-sm'
                }`}
              >
                All Runs
              </Link>
              <Link
                href="/telegram-preview"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-xl text-base font-bold transition-all duration-300 ${
                  isActive('/telegram-preview')
                    ? 'bg-white/90 text-gray-900 shadow-lg backdrop-blur-sm'
                    : 'text-white/90 hover:text-white hover:bg-white/20 backdrop-blur-sm'
                }`}
              >
                Telegram Preview
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
      <header className="bg-black/30 backdrop-blur-md shadow-xl sticky top-0 z-50 border-b border-white/20">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="logo-brain-gear"></div>
              <div>
                <div className="text-2xl font-extrabold text-white tracking-tight drop-shadow-lg">TRADETRON</div>
                <div className="text-xs text-white/90 font-semibold tracking-wide -mt-1">Token Generator for Flatrade</div>
              </div>
            </div>
            <nav className="flex items-center gap-2">
              <div className="px-4 py-2 rounded-xl text-sm font-bold text-white/90">Dashboard</div>
              <div className="px-4 py-2 rounded-xl text-sm font-bold text-white/90">Users</div>
              <div className="px-4 py-2 rounded-xl text-sm font-bold text-white/90">All Runs</div>
              <div className="px-4 py-2 rounded-xl text-sm font-bold text-white/90">Telegram Preview</div>
            </nav>
          </div>
        </div>
      </header>
    }>
      <HeaderContent />
    </Suspense>
  )
}
