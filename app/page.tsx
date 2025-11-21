'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import { User, RunLog } from '@/types'
import Header from './components/Header'

export default function Dashboard() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [runs, setRuns] = useState<RunLog[]>([])
  const [health, setHealth] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editingSchedule, setEditingSchedule] = useState(false)
  const [scheduleTime, setScheduleTime] = useState({ hour: 8, minute: 30 })
  const editingScheduleRef = useRef(false)
  const [resultFilter, setResultFilter] = useState<'all' | 'success' | 'fail'>('all')
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [sheetUrl, setSheetUrl] = useState('https://docs.google.com/spreadsheets/d/1W7i5AQ77-pklRv0BkDRkFILSkjq4bkvN5vTCQU7YrLA/edit?gid=0#gid=0')
  const [sheetRange, setSheetRange] = useState('Users!A:Z')
  const [updateExisting, setUpdateExisting] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [])

  // Calculate and update remaining time every second
  useEffect(() => {
    const updateTimeRemaining = () => {
      if (health?.scheduler?.nextRun) {
        const nextRun = new Date(health.scheduler.nextRun)
        const now = new Date()
        const diff = nextRun.getTime() - now.getTime()

        if (diff <= 0) {
          setTimeRemaining('Due now')
          return
        }

        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)

        if (hours > 0) {
          setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`)
        } else if (minutes > 0) {
          setTimeRemaining(`${minutes}m ${seconds}s`)
        } else {
          setTimeRemaining(`${seconds}s`)
        }
      } else {
        setTimeRemaining('')
      }
    }

    updateTimeRemaining()
    const interval = setInterval(updateTimeRemaining, 1000)
    return () => clearInterval(interval)
  }, [health?.scheduler?.nextRun])

  const loadData = async () => {
    try {
      setError(null)
      // Add timeout to prevent indefinite loading on cold starts
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
      }, 30000) // 30 second timeout
      
      try {
        const [usersRes, runsRes, healthRes, scheduleRes] = await Promise.all([
          fetch('/api/users', { signal: controller.signal }),
          fetch('/api/runs?limit=20', { signal: controller.signal }),
          fetch('/api/health', { signal: controller.signal }),
          fetch('/api/schedule', { signal: controller.signal }),
        ])
        
        clearTimeout(timeoutId)
        
        if (usersRes.ok) setUsers(await usersRes.json())
        if (runsRes.ok) setRuns(await runsRes.json())
        if (healthRes.ok) {
          const healthData = await healthRes.json()
          
          // If schedule endpoint is available, use it as source of truth for schedule
          if (scheduleRes.ok) {
            const scheduleData = await scheduleRes.json()
            // Merge schedule data into health data
            healthData.scheduler = {
              ...healthData.scheduler,
              schedule: {
                hour: scheduleData.hour,
                minute: scheduleData.minute,
                timezone: scheduleData.timezone,
                timeString: scheduleData.timeString,
              },
            }
          }
          
          setHealth(healthData)
          // Set schedule time from health data only when NOT editing
          if (healthData.scheduler?.schedule && !editingScheduleRef.current) {
            setScheduleTime({
              hour: healthData.scheduler.schedule?.hour || 8,
              minute: healthData.scheduler.schedule?.minute || 30,
            })
          }
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        throw fetchError
      }
    } catch (error: any) {
      console.error('Failed to load data:', error)
      if (error.name === 'AbortError') {
        setError('Request timeout - the server may be starting up. Please wait a moment and refresh.')
      } else if (error.message?.includes('fetch')) {
        setError('Failed to connect to server. The server may be starting up (Render free tier takes ~30-60 seconds). Please wait and refresh.')
      } else {
        setError('Failed to load data. Please refresh the page.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRunAll = async () => {
    try {
      await fetch('/api/run-all', { method: 'POST' })
      alert('All active users enqueued for login')
      loadData()
    } catch (error) {
      alert('Failed to run all users')
    }
  }

  const handleRunUser = async (userId: string) => {
    try {
      await fetch(`/api/run/${userId}`, { method: 'POST' })
      alert('Login job enqueued')
      loadData()
    } catch (error) {
      alert('Failed to run user')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return
    }
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' })
      if (res.ok) {
        alert('User deleted successfully')
        loadData()
      } else {
        const error = await res.json()
        alert(`Failed to delete user: ${error.error}`)
      }
    } catch (error) {
      alert('Failed to delete user')
    }
  }

  const handleRunFilteredUsers = async () => {
    if (resultFilter === 'all') {
      alert('Please select either "Success" or "Unsuccess" filter to run specific users.')
      return
    }
    
    if (filteredUsers.length === 0) {
      alert(`No ${resultFilter === 'success' ? 'successful' : 'unsuccessful'} users found to run.`)
      return
    }

    if (!confirm(`Are you sure you want to run ${filteredUsers.length} ${resultFilter === 'success' ? 'successful' : 'unsuccessful'} users?`)) {
      return
    }

    let successCount = 0
    let failCount = 0
    
    for (const user of filteredUsers) {
      try {
        await fetch(`/api/run/${user.id}`, { method: 'POST' })
        successCount++
      } catch (error) {
        console.error(`Failed to enqueue run for user ${user.name}:`, error)
        failCount++
      }
    }
    
    alert(`Enqueued ${successCount} users for login. ${failCount > 0 ? `Failed to enqueue ${failCount} users.` : ''}`)
    loadData()
  }

  const handleUpdateSchedule = async () => {
    try {
      const res = await fetch('/api/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hour: scheduleTime.hour,
          minute: scheduleTime.minute,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        editingScheduleRef.current = false
        setEditingSchedule(false)
        
        // Update local state immediately with the response
        if (data.schedule) {
          setScheduleTime({
            hour: data.schedule.hour,
            minute: data.schedule.minute,
          })
          
          // Update health state immediately to reflect the change in UI
          if (health) {
            setHealth({
              ...health,
              scheduler: {
                ...health.scheduler,
                schedule: {
                  ...health.scheduler?.schedule,
                  hour: data.schedule.hour,
                  minute: data.schedule.minute,
                  timeString: data.schedule.timeString,
                },
              },
            })
          }
        }
        
        // Also fetch schedule endpoint to ensure we have latest data
        try {
          const scheduleRes = await fetch('/api/schedule')
          if (scheduleRes.ok) {
            const scheduleData = await scheduleRes.json()
            // Update health state with latest schedule from schedule endpoint
            if (health) {
              setHealth({
                ...health,
                scheduler: {
                  ...health.scheduler,
                  schedule: {
                    hour: scheduleData.hour,
                    minute: scheduleData.minute,
                    timezone: scheduleData.timezone,
                    timeString: scheduleData.timeString,
                  },
                },
              })
            }
            setScheduleTime({
              hour: scheduleData.hour,
              minute: scheduleData.minute,
            })
          }
        } catch (e) {
          console.error('Failed to fetch updated schedule:', e)
        }
        
        // Wait a moment for scheduler to restart, then refresh to get updated nextRun time
        setTimeout(() => {
          loadData()
        }, 1000)
        
        alert('Schedule updated successfully!')
      } else {
        const error = await res.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      alert('Failed to update schedule')
    }
  }

  const handleSyncFromSheet = async () => {
    if (!sheetUrl.trim()) {
      alert('Please enter a Google Sheets URL or ID')
      return
    }

    setSyncLoading(true)
    try {
      const res = await fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetUrlOrId: sheetUrl.trim(),
          range: sheetRange.trim() || 'Users!A:Z',
          updateExisting,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        alert(`Sync completed!\n${data.message}\n\nCreated: ${data.results.created}\nUpdated: ${data.results.updated}\nSkipped: ${data.results.skipped}\n\n✅ Google Sheets auto-update enabled!\nResults will be written back to the sheet after each run.${data.results.errors.length > 0 ? `\n\nErrors:\n${data.results.errors.slice(0, 5).join('\n')}` : ''}`)
        setShowSyncModal(false)
        setSheetUrl('')
        loadData()
      } else {
        alert(`Sync failed: ${data.error}`)
      }
    } catch (error: any) {
      alert(`Failed to sync: ${error.message}`)
    } finally {
      setSyncLoading(false)
    }
  }

  const getLastRun = (userId: string) => {
    const userRuns = runs.filter(r => r.userId === userId)
    if (userRuns.length === 0) return null
    
    // Get today's date in local timezone for comparison
    const now = new Date()
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    // Filter runs from today (using local date, not UTC)
    const todayRuns = userRuns.filter(r => {
      const runDate = new Date(r.startedAt)
      const runDateLocal = new Date(runDate.getFullYear(), runDate.getMonth(), runDate.getDate())
      return runDateLocal.getTime() === todayLocal.getTime()
    })
    
    // Sort by startedAt descending to get the MOST RECENT run from today
    if (todayRuns.length > 0) {
      // Sort in descending order (most recent first)
      const sorted = [...todayRuns].sort((a, b) => 
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      )
      return sorted[0] // Return the most recent run from today
    }
    return null
  }

  // Check if OAuth/login was successful (token generated)
  const isOAuthSuccessful = (run: RunLog | null): boolean => {
    return run !== null && run.status === 'success' && run.tokenGenerated === true
  }

  const filteredUsers = users.filter(user => {
    if (resultFilter === 'all') return true
    const lastRun = getLastRun(user.id)
    if (!lastRun) return resultFilter === 'fail' // Show users with no run today as "unsuccessful"
    const oauthSuccess = isOAuthSuccessful(lastRun)
    return resultFilter === 'success' ? oauthSuccess : !oauthSuccess
  })

  // Calculate verification stats - only count OAuth successful (token generated)
  const successVerifications = users.filter(user => {
    const lastRun = getLastRun(user.id)
    return isOAuthSuccessful(lastRun)
  }).length

  const pendingVerifications = users.filter(user => {
    const lastRun = getLastRun(user.id)
    return !isOAuthSuccessful(lastRun)
  }).length

  const activeUsers = users.filter(u => u.active)
  const lastRun = runs.length > 0 ? runs[0] : null

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-700 font-medium">Loading dashboard...</div>
          <div className="text-sm text-gray-700 mt-2">If this takes longer than 30 seconds, the server may be starting up.</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="max-w-md bg-white rounded-lg shadow-lg p-6 border border-red-200">
          <div className="text-red-600 font-bold text-lg mb-2">⚠️ Error Loading Dashboard</div>
          <div className="text-gray-700 mb-4">{error}</div>
          <button
            onClick={() => {
              setError(null)
              setLoading(true)
              loadData()
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

      return (
        <div className="min-h-screen bg-geometric relative">
          <Header />
          <div className="p-8 pt-24">
          <div className="bg-geometric-shapes">
            <div className="geometric-triangle triangle-1"></div>
            <div className="geometric-triangle triangle-2"></div>
            <div className="geometric-triangle triangle-3"></div>
            <div className="geometric-triangle triangle-4"></div>
            <div className="geometric-triangle triangle-5"></div>
            <div className="geometric-triangle triangle-6"></div>
            <div className="geometric-triangle triangle-7"></div>
            <div className="geometric-triangle triangle-8"></div>
            <div className="geometric-triangle triangle-9"></div>
            <div className="geometric-triangle triangle-10"></div>
            <div className="geometric-triangle triangle-11"></div>
            <div className="geometric-triangle triangle-12"></div>
            <div className="geometric-triangle triangle-13"></div>
            <div className="geometric-triangle triangle-14"></div>
            <div className="geometric-triangle triangle-15"></div>
            <div className="geometric-triangle triangle-16"></div>
            <div className="geometric-triangle triangle-17"></div>
            <div className="geometric-triangle triangle-18"></div>
            <div className="geometric-triangle triangle-19"></div>
            <div className="geometric-triangle triangle-20"></div>
            <div className="geometric-triangle triangle-21"></div>
            <div className="geometric-triangle triangle-22"></div>
            <div className="geometric-triangle triangle-23"></div>
            <div className="geometric-triangle triangle-24"></div>
            <div className="geometric-triangle triangle-25"></div>
            <div className="geometric-triangle triangle-26"></div>
            <div className="geometric-triangle triangle-27"></div>
            <div className="geometric-triangle triangle-28"></div>
            <div className="geometric-triangle triangle-29"></div>
            <div className="geometric-triangle triangle-30"></div>
          </div>
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="mb-8 text-center">
              <h1 className="text-5xl font-bold mb-2 flex items-center justify-center gap-2">
                <span className="text-white tracking-tight drop-shadow-lg">TRADE</span>
                <span className="logo-brain-gear"></span>
                <span className="text-white tracking-tight drop-shadow-lg">TRON</span>
              </h1>
              <p className="text-xs text-gray-300 font-semibold tracking-widest uppercase mb-1">ALGO STRATEGY MARKETPLACE</p>
              <p className="text-lg text-gray-200 font-medium">Token Generator</p>
            </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Link href="/users" className="group relative bg-white/40 backdrop-blur-md p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:shadow-blue-500/20 border border-white/30 hover:border-blue-400/60 transition-all duration-300 cursor-pointer overflow-hidden hover:scale-[1.02] hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-400/30 to-blue-600/15 rounded-full -mr-12 -mt-12 group-hover:scale-150 group-hover:opacity-80 transition-all duration-500"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs font-semibold text-white/90 uppercase tracking-wider">Total Users</div>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-blue-500/50 group-hover:scale-110 transition-all duration-300">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-5xl font-bold text-blue-200 mb-2 drop-shadow-lg">{users.length}</div>
              <div className="text-xs font-medium text-white/80">{activeUsers.length} active</div>
            </div>
          </Link>
          <div 
            onClick={() => {
              const element = document.getElementById('recent-runs')
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            }}
            className="group relative bg-white/40 backdrop-blur-md p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:shadow-green-500/20 border border-white/30 hover:border-green-400/60 transition-all duration-300 cursor-pointer overflow-hidden hover:scale-[1.02] hover:-translate-y-1"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-400/30 to-green-600/15 rounded-full -mr-12 -mt-12 group-hover:scale-150 group-hover:opacity-80 transition-all duration-500"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs font-semibold text-white/90 uppercase tracking-wider">Last Run</div>
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-green-500/50 group-hover:scale-110 transition-all duration-300">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              {lastRun ? (
                <>
                  <div className="text-5xl font-bold text-green-200 mb-2 drop-shadow-lg">{format(new Date(lastRun.startedAt), 'HH:mm')}</div>
                  <div className="text-xs font-medium text-white/80">{format(new Date(lastRun.startedAt), 'MMM d')}</div>
                </>
              ) : (
                <div className="text-xs font-medium text-white/80">No runs yet</div>
              )}
            </div>
          </div>
          <div className="group relative bg-white/40 backdrop-blur-md p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:shadow-purple-500/20 border border-white/30 hover:border-purple-400/60 transition-all duration-300 overflow-hidden hover:scale-[1.02] hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-400/30 to-purple-600/15 rounded-full -mr-12 -mt-12 group-hover:scale-150 group-hover:opacity-80 transition-all duration-500"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs font-semibold text-white/90 uppercase tracking-wider">Next Scheduled</div>
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-purple-500/50 group-hover:scale-110 transition-all duration-300">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              {health?.scheduler?.schedule ? (
                <>
                  {editingSchedule ? (
                    <div className="mt-3 space-y-3">
                      <div className="flex flex-col gap-3 items-center">
                        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 border-2 border-purple-400/50 shadow-md">
                          <input
                            type="number"
                            min="0"
                            max="23"
                            value={scheduleTime.hour}
                            onChange={(e) => setScheduleTime({ ...scheduleTime, hour: parseInt(e.target.value) || 0 })}
                            className="w-16 px-3 py-2 border-0 text-center text-xl font-bold text-white bg-white/10 focus:outline-none focus:ring-2 focus:ring-purple-400 rounded"
                            placeholder="HH"
                          />
                          <span className="text-white/80 text-2xl font-bold">:</span>
                          <input
                            type="number"
                            min="0"
                            max="59"
                            value={scheduleTime.minute}
                            onChange={(e) => setScheduleTime({ ...scheduleTime, minute: parseInt(e.target.value) || 0 })}
                            className="w-16 px-3 py-2 border-0 text-center text-xl font-bold text-white bg-white/10 focus:outline-none focus:ring-2 focus:ring-purple-400 rounded"
                            placeholder="MM"
                          />
                        </div>
                        <div className="flex gap-2 w-full justify-center">
                          <button
                            onClick={handleUpdateSchedule}
                            className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold text-sm flex items-center gap-1.5 min-w-[100px] justify-center"
                            title="Save schedule"
                          >
                            <span>✓</span>
                            <span>Save</span>
                          </button>
                          <button
                            onClick={() => {
                              editingScheduleRef.current = false
                              setEditingSchedule(false)
                            }}
                            className="bg-red-500 text-white px-5 py-2 rounded-lg hover:bg-red-600 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold text-sm flex items-center gap-1.5 min-w-[100px] justify-center"
                            title="Cancel editing"
                          >
                            <span>✗</span>
                            <span>Cancel</span>
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-center text-white/70 italic">Editing schedule time</div>
                    </div>
                  ) : (
                    <>
                      <div className="text-5xl font-bold text-purple-200 mb-2 drop-shadow-lg cursor-pointer hover:opacity-80 transition-opacity" onClick={() => {
                        if (health.scheduler?.schedule) {
                          setScheduleTime({
                            hour: health.scheduler.schedule?.hour || 8,
                            minute: health.scheduler.schedule?.minute || 30,
                          })
                        }
                        editingScheduleRef.current = true
                        setEditingSchedule(true)
                      }}>
                        {health.scheduler?.schedule?.timeString}
                      </div>
                      <div className="text-xs font-medium text-white/80 mb-2">{health.scheduler?.running ? 'Running' : 'Scheduled'}</div>
                      {timeRemaining && (
                        <div className="text-xs text-purple-200 font-semibold mb-2 bg-purple-500/25 px-3 py-1.5 rounded-lg inline-block backdrop-blur-sm">
                          ⏱️ {timeRemaining}
                        </div>
                      )}
                      <button
                        onClick={() => {
                          if (health.scheduler?.schedule) {
                            setScheduleTime({
                              hour: health.scheduler.schedule?.hour || 8,
                              minute: health.scheduler.schedule?.minute || 30,
                            })
                          }
                          editingScheduleRef.current = true
                          setEditingSchedule(true)
                        }}
                        className="text-xs bg-purple-500/30 hover:bg-purple-500/50 text-purple-100 px-4 py-2 rounded-lg mt-2 transition-all font-medium shadow-md hover:shadow-purple-500/30"
                      >
                        Edit
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="text-xs font-medium text-white/80">Not scheduled</div>
              )}
            </div>
          </div>
          <div className="group relative bg-white/40 backdrop-blur-md p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:shadow-orange-500/20 border border-white/30 hover:border-orange-400/60 transition-all duration-300 overflow-hidden hover:scale-[1.02] hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-400/30 to-orange-600/15 rounded-full -mr-12 -mt-12 group-hover:scale-150 group-hover:opacity-80 transition-all duration-500"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs font-semibold text-white/90 uppercase tracking-wider">Queue Status</div>
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-orange-500/50 group-hover:scale-110 transition-all duration-300">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </div>
              </div>
              <div className="text-5xl font-bold text-orange-200 mb-2 drop-shadow-lg">
                {health?.queue?.running || 0}/{health?.queue?.maxConcurrency || 4}
              </div>
              <div className="text-xs font-medium text-white/80">{health?.queue?.queueLength || 0} queued</div>
            </div>
          </div>
          <div 
            onClick={() => {
              setResultFilter('success')
              setTimeout(() => {
                const element = document.getElementById('users-section')
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              }, 100)
            }}
            className="group relative bg-white/40 backdrop-blur-md p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:shadow-emerald-500/20 border border-white/30 hover:border-emerald-400/60 transition-all duration-300 cursor-pointer overflow-hidden hover:scale-[1.02] hover:-translate-y-1"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-400/30 to-emerald-600/15 rounded-full -mr-12 -mt-12 group-hover:scale-150 group-hover:opacity-80 transition-all duration-500"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs font-semibold text-white/90 uppercase tracking-wider">Success Verification</div>
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-emerald-500/50 group-hover:scale-110 transition-all duration-300">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-5xl font-bold text-emerald-200 mb-2 drop-shadow-lg">{successVerifications}</div>
              <div className="text-xs font-medium text-white/80">verified today</div>
            </div>
          </div>
          <div 
            onClick={() => {
              setResultFilter('fail')
              setTimeout(() => {
                const element = document.getElementById('users-section')
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              }, 100)
            }}
            className="group relative bg-white/40 backdrop-blur-md p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:shadow-amber-500/20 border border-white/30 hover:border-amber-400/60 transition-all duration-300 cursor-pointer overflow-hidden hover:scale-[1.02] hover:-translate-y-1"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-400/30 to-amber-600/15 rounded-full -mr-12 -mt-12 group-hover:scale-150 group-hover:opacity-80 transition-all duration-500"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs font-semibold text-white/90 uppercase tracking-wider">Pending Verification</div>
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-amber-500/50 group-hover:scale-110 transition-all duration-300">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-5xl font-bold text-amber-200 mb-2 drop-shadow-lg">{pendingVerifications}</div>
              <div className="text-xs font-medium text-white/80">pending today</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={handleRunAll}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 font-semibold"
          >
            Run All Now
          </button>
          <Link
            href="/users/new"
            className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-green-800 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 font-semibold"
          >
            Add User
          </Link>
          <button
            onClick={() => setShowSyncModal(true)}
            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-purple-800 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 font-semibold"
          >
            Sync from Google Sheets
          </button>
        </div>

        {/* Users Table - Detailed List View */}
        <div id="users-section" className="bg-white rounded-lg shadow-lg mb-8 border border-gray-200">
          <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50 flex justify-between items-center">
            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
              <span className="text-2xl">👥</span>
              <span>Users</span>
            </h2>
            <div className="flex gap-2 items-center">
              {resultFilter !== 'all' && (
                <button
                  onClick={handleRunFilteredUsers}
                  className={`px-4 py-2 text-sm rounded-lg font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 ${
                    resultFilter === 'success'
                      ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800'
                      : 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800'
                  }`}
                >
                  Run {resultFilter === 'success' ? 'Success' : 'Unsuccess'} Users ({filteredUsers.length})
                </button>
              )}
              <span className="text-sm text-gray-600 mr-2">Filter:</span>
              <button
                onClick={() => setResultFilter('all')}
                className={`px-3 py-1 text-sm rounded ${
                  resultFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setResultFilter('success')}
                className={`px-3 py-1 text-sm rounded ${
                  resultFilter === 'success'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Success
              </button>
              <button
                onClick={() => setResultFilter('fail')}
                className={`px-3 py-1 text-sm rounded ${
                  resultFilter === 'fail'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Unsuccess
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Login URL</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Last Result</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Last Run Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => {
                  const lastRun = getLastRun(user.id)
                  return (
                    <tr key={user.id} className="hover:bg-blue-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900 font-bold text-lg">{user.name}</span>
                          {!user.active && (
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-semibold">
                              Inactive
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {lastRun ? (
                          isOAuthSuccessful(lastRun) ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                              Success
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                              Failed
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                            <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                            No Run
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <a
                          href={user.loginUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                        >
                          {user.loginUrl.replace('https://', '')}
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {lastRun ? (
                          isOAuthSuccessful(lastRun) ? (
                            <span className="text-green-600 font-bold text-lg" title="OAuth successful - Token generated">✓</span>
                          ) : (
                            <span className="text-red-600 font-bold text-lg" title="OAuth failed or token not generated">✗</span>
                          )
                        ) : (
                          <span className="text-gray-400" title="No run today">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {lastRun ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900">{format(new Date(lastRun.startedAt), 'MMM d, HH:mm:ss')}</span>
                            <span className="text-xs text-gray-500 mt-0.5">{format(new Date(lastRun.startedAt), 'EEE')}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {lastRun ? (
                          <span className="font-semibold text-gray-900">
                            {lastRun.ms >= 1000 
                              ? `${(lastRun.ms / 1000).toFixed(1)}s` 
                              : `${lastRun.ms}ms`}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRunUser(user.id)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1 rounded text-sm font-semibold transition-all duration-150"
                          >
                            Run
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/test-user/${user.id}`)
                                const data = await res.json()
                                if (res.ok) {
                                  alert(`User: ${data.user.name}\n\nCredentials Check:\n- Password: ${data.credentials.password} (length: ${data.credentials.passwordLength})\n- DOB/TOTP: ${data.credentials.dob} (length: ${data.credentials.dobLength})\n- DOB Format: ${data.credentials.dobFormat}\n\nValidation:\n- Password Valid: ${data.validation.passwordValid ? '✓' : '✗'}\n- DOB/TOTP Valid: ${data.validation.dobValid ? '✓' : '✗'}\n- All Valid: ${data.validation.allValid ? '✓' : '✗'}`)
                                } else {
                                  alert(`Error: ${data.error}`)
                                }
                              } catch (error: any) {
                                alert(`Failed to check credentials: ${error.message}`)
                              }
                            }}
                            className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 px-3 py-1 rounded text-sm font-semibold transition-all duration-150"
                            title="Check credentials format"
                          >
                            Check
                          </button>
                          <Link
                            href={`/users/${user.id}/edit`}
                            className="text-green-600 hover:text-green-800 hover:bg-green-50 px-3 py-1 rounded text-sm font-semibold transition-all duration-150"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1 rounded text-sm font-semibold transition-all duration-150"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Runs */}
        <div id="recent-runs" className="bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-pink-50 flex justify-between items-center">
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
              <span className="text-2xl">📊</span>
              <span>Recent Runs</span>
            </h2>
            {runs.length > 10 && (
              <Link
                href="/runs"
                className="text-blue-600 hover:text-blue-800 font-medium text-sm hover:underline"
              >
                View All ({runs.length}) →
              </Link>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Message</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Artifacts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {runs.slice(0, 10).map((run) => (
                  <tr key={run.id} className={run.status === 'success' && run.tokenGenerated ? 'hover:bg-green-50 transition-colors duration-150' : 'hover:bg-red-50 transition-colors duration-150'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {format(new Date(run.startedAt), 'MMM d, HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">{run.userName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {run.status === 'success' && run.tokenGenerated ? (
                        <span className="text-green-600 font-medium" title="OAuth successful - Token generated">✓ Success</span>
                      ) : run.status === 'success' && !run.tokenGenerated ? (
                        <span className="text-orange-600 font-medium" title="Login completed but token not generated">⚠ Partial</span>
                      ) : (
                        <span className="text-red-600 font-medium" title="OAuth failed">✗ Failed</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-md truncate">
                      {run.message || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <span className="font-medium">
                        {run.ms >= 1000 
                          ? `${(run.ms / 1000).toFixed(1)}s` 
                          : `${run.ms}ms`}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {run.artifactDir ? (
                        <a
                          href={`/api/artifacts/${run.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          download
                        >
                          Download
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 py-6 text-center text-sm text-gray-600 border-t-2 border-gray-300 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg">
          <p className="font-medium">
            © {new Date().getFullYear()}{' '}
            <a
              href="https://www.instagram.com/maniraja__/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 font-semibold hover:text-blue-800 hover:underline transition-colors duration-200"
            >
              FiFTO
            </a>
            . All rights reserved.
          </p>
        </footer>
      </div>

      {/* Sync Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Sync from Google Sheets</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Google Sheets URL or ID *
                </label>
                <input
                  type="text"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/SHEET_ID/edit or just SHEET_ID"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                />
                <p className="text-xs text-gray-700 mt-1">
                  Paste the full Google Sheets URL or just the Sheet ID
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sheet Range (Optional)
                </label>
                <input
                  type="text"
                  value={sheetRange}
                  onChange={(e) => setSheetRange(e.target.value)}
                  placeholder="Users!A:Z"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                />
                <p className="text-xs text-gray-700 mt-1">
                  Default: Users!A:Z (entire Users sheet). Format: SheetName!A1:Z100
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="updateExisting"
                  checked={updateExisting}
                  onChange={(e) => setUpdateExisting(e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label htmlFor="updateExisting" className="ml-2 block text-sm text-gray-700">
                  Update existing users (based on Tradetron Username)
                </label>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-900 mb-2">Expected Sheet Format:</p>
                <p className="text-xs text-blue-800 mb-1">
                  The first row should contain headers. Required columns (case-insensitive):
                </p>
                <ul className="text-xs text-blue-800 list-disc list-inside space-y-1">
                  <li><strong>NAME</strong> or <strong>Name</strong> - User name</li>
                  <li><strong>TRADETRON ID</strong> or <strong>TradetronUsername</strong> - Tradetron ID (e.g., 1967985)</li>
                  <li><strong>FLATTRADE ID</strong> or <strong>BrokerUsername</strong> - FlatTrade/Broker ID (e.g., FZ07651)</li>
                  <li><strong>PASSWORD</strong> or <strong>Password</strong> - User password</li>
                  <li><strong>DOB</strong> or <strong>TOTPSecretOrDOB</strong> - Date of birth (8 digits: MMDDYYYY or DDMMYYYY) or TOTP secret</li>
                  <li><strong>IsDOB</strong> (optional) - Auto-detected if DOB column exists, or true/false</li>
                  <li><strong>Active</strong> (optional) - true/false, defaults to true</li>
                </ul>
                <p className="text-xs text-blue-700 mt-2 font-medium">
                  📋 Example format: NAME | TRADETRON ID | FLATTRADE ID | PASSWORD | DOB
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-yellow-900 mb-2">Authentication:</p>
                <p className="text-xs text-yellow-800">
                  Set either <code className="bg-yellow-100 px-1 rounded">GOOGLE_SHEETS_API_KEY</code> (for public sheets) or <code className="bg-yellow-100 px-1 rounded">GOOGLE_SERVICE_ACCOUNT_KEY</code> (for private sheets) in your environment variables.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSyncFromSheet}
                disabled={syncLoading || !sheetUrl.trim()}
                className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-purple-800 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {syncLoading ? 'Syncing...' : 'Sync Now'}
              </button>
              <button
                onClick={() => {
                  setShowSyncModal(false)
                  setSheetUrl('https://docs.google.com/spreadsheets/d/1W7i5AQ77-pklRv0BkDRkFILSkjq4bkvN5vTCQU7YrLA/edit?gid=0#gid=0')
                  setSheetRange('Users!A:Z')
                }}
                disabled={syncLoading}
                className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
          </div>
        </div>
      )
    }

