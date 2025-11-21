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
    <header className="bg-gray-900/95 backdrop-blur-md border-b border-gray-700 shadow-lg fixed top-0 left-0 right-0 z-50 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="logo-brain-gear"></div>
            <div className="hidden sm:block">
              <div className="text-xl font-bold text-white tracking-tight">TRADETRON</div>
              <div className="text-xs text-gray-300 font-semibold tracking-widest uppercase -mt-1">Token Generator</div>
            </div>
            <div className="sm:hidden text-lg font-bold text-white">TRADETRON</div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                isActive('/') && pathname === '/'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/users"
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                isActive('/users')
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              Users
            </Link>
            <Link
              href="/runs"
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                isActive('/runs')
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              All Runs
            </Link>
            <Link
              href="/telegram-preview"
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                isActive('/telegram-preview')
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              Telegram Preview
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-700 py-4">
            <nav className="flex flex-col gap-2">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  isActive('/') && pathname === '/'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/users"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  isActive('/users')
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                Users
              </Link>
              <Link
                href="/runs"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  isActive('/runs')
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                All Runs
              </Link>
              <Link
                href="/telegram-preview"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  isActive('/telegram-preview')
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
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
      <header className="bg-gray-900/95 backdrop-blur-md border-b border-gray-700 shadow-lg fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="logo-brain-gear"></div>
              <div>
                <div className="text-xl font-bold text-white tracking-tight">TRADETRON</div>
                <div className="text-xs text-gray-300 font-semibold tracking-widest uppercase -mt-1">Token Generator</div>
              </div>
            </div>
            <nav className="flex items-center gap-1">
              <div className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-300">Dashboard</div>
              <div className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-300">Users</div>
              <div className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-300">All Runs</div>
              <div className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-300">Telegram Preview</div>
            </nav>
          </div>
        </div>
      </header>
    }>
      <HeaderContent />
    </Suspense>
  )
}

