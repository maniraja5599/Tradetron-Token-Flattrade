'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import Header from '../components/Header'

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [timeWindow, setTimeWindow] = useState({
    startHour: 8,
    startMinute: 15,
    endHour: 9,
    endMinute: 0,
    timezone: 'Asia/Kolkata',
  })
  const [enabled, setEnabled] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/time-window')
      const data = await response.json()

      if (data.success && data.timeWindow) {
        setTimeWindow(data.timeWindow)
        setEnabled(data.enabled !== false)
      }
    } catch (error: any) {
      setError(`Failed to load settings: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')
      setMessage('')

      const response = await fetch('/api/time-window', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...timeWindow,
          enabled,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage('Time window settings saved successfully!')
        setTimeout(() => {
          setMessage('')
        }, 3000)
      } else {
        setError(data.error || 'Failed to save settings')
      }
    } catch (error: any) {
      setError(`Failed to save settings: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-geometric relative">
        <Header />
        <div className="h-[80px] sm:h-[90px]"></div>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="bg-geometric-shapes">
            <div className="geometric-triangle triangle-1"></div>
            <div className="geometric-triangle triangle-2"></div>
            <div className="geometric-triangle triangle-3"></div>
            <div className="geometric-triangle triangle-4"></div>
            <div className="geometric-triangle triangle-5"></div>
            <div className="geometric-triangle triangle-6"></div>
          </div>
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center text-gray-400">Loading settings...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-geometric relative">
      <Header />
      <div className="h-[80px] sm:h-[90px]"></div>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="bg-geometric-shapes">
          <div className="geometric-triangle triangle-1"></div>
          <div className="geometric-triangle triangle-2"></div>
          <div className="geometric-triangle triangle-3"></div>
          <div className="geometric-triangle triangle-4"></div>
          <div className="geometric-triangle triangle-5"></div>
          <div className="geometric-triangle triangle-6"></div>
        </div>
        <div className="max-w-7xl mx-auto relative z-10 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
            <div className="flex-1 min-w-0 pr-4">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 bg-clip-text text-transparent flex items-center gap-3">
                <Settings className="w-8 h-8 text-pink-600" />
                Settings
              </h1>
              <p className="text-sm sm:text-base text-gray-400">Configure time window and server settings</p>
            </div>
            <Link
              href="/"
              className="bg-gray-200 text-gray-700 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg hover:bg-gray-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 font-semibold text-xs sm:text-sm text-center whitespace-nowrap"
            >
              ← Back to Dashboard
            </Link>
          </div>

          {/* Settings Card */}
          <div className="bg-white rounded-lg shadow-lg mb-6 sm:mb-8 border border-gray-200">
            <div className="p-4 sm:p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Time Window Settings
              </h2>
            </div>
            <div className="p-4 sm:p-6">
              {/* Enable/Disable Toggle */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                  <div className="flex-1">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-1">Enable Time Window</h3>
                    <p className="text-sm text-gray-600">Restrict server operations to specific time windows to save costs. When disabled, the server runs 24/7.</p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setEnabled(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 sm:hidden">Enable</span>
                  </label>
                </div>
              </div>

              {/* Time Window Settings */}
              {/* Time Window Settings */}
              {enabled && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Start Time */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          min="0"
                          max="23"
                          value={timeWindow.startHour}
                          onChange={(e) => setTimeWindow({ ...timeWindow, startHour: parseInt(e.target.value) || 0 })}
                          className="flex-1 px-2 sm:px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                          placeholder="Hour"
                        />
                        <span className="text-gray-600 text-lg sm:text-xl font-semibold">:</span>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={timeWindow.startMinute}
                          onChange={(e) => setTimeWindow({ ...timeWindow, startMinute: parseInt(e.target.value) || 0 })}
                          className="flex-1 px-2 sm:px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                          placeholder="Minute"
                        />
                      </div>
                    </div>

                    {/* End Time */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          min="0"
                          max="23"
                          value={timeWindow.endHour}
                          onChange={(e) => setTimeWindow({ ...timeWindow, endHour: parseInt(e.target.value) || 0 })}
                          className="flex-1 px-2 sm:px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                          placeholder="Hour"
                        />
                        <span className="text-gray-600 text-lg sm:text-xl font-semibold">:</span>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={timeWindow.endMinute}
                          onChange={(e) => setTimeWindow({ ...timeWindow, endMinute: parseInt(e.target.value) || 0 })}
                          className="flex-1 px-2 sm:px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                          placeholder="Minute"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Timezone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                    <select
                      value={timeWindow.timezone}
                      onChange={(e) => setTimeWindow({ ...timeWindow, timezone: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>

                  {/* Current Window Display */}
                  <div className="mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-700 text-xs sm:text-sm">
                      <span className="font-semibold">Current Window:</span>{' '}
                      {String(timeWindow.startHour).padStart(2, '0')}:{String(timeWindow.startMinute).padStart(2, '0')} - {String(timeWindow.endHour).padStart(2, '0')}:{String(timeWindow.endMinute).padStart(2, '0')} {timeWindow.timezone}
                    </p>
                  </div>
                </div>
              )}

              {/* Messages */}
              {message && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800">
                  {message}
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 font-semibold text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
                <button
                  onClick={() => router.back()}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 font-semibold text-sm sm:text-base"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

