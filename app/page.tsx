'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import { User, RunLog } from '@/types'

export default function Dashboard() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [runs, setRuns] = useState<RunLog[]>([])
  const [health, setHealth] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editingSchedule, setEditingSchedule] = useState(false)
  const [scheduleTime, setScheduleTime] = useState({ hour: 8, minute: 30 })
  const [resultFilter, setResultFilter] = useState<'all' | 'success' | 'fail'>('all')

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const [usersRes, runsRes, healthRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/runs?limit=20'),
        fetch('/api/health'),
      ])
      if (usersRes.ok) setUsers(await usersRes.json())
      if (runsRes.ok) setRuns(await runsRes.json())
      if (healthRes.ok) {
        const healthData = await healthRes.json()
        setHealth(healthData)
        // Set schedule time from health data
        if (healthData.scheduler?.schedule) {
          setScheduleTime({
            hour: healthData.scheduler.schedule.hour,
            minute: healthData.scheduler.schedule.minute,
          })
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error)
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
        setEditingSchedule(false)
        loadData()
        alert('Schedule updated successfully!')
      } else {
        const error = await res.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      alert('Failed to update schedule')
    }
  }

  const getLastRun = (userId: string) => {
    const userRuns = runs.filter(r => r.userId === userId)
    // Only show runs from today (reset status daily)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayRuns = userRuns.filter(r => {
      const runDate = new Date(r.startedAt)
      runDate.setHours(0, 0, 0, 0)
      return runDate.getTime() === today.getTime()
    })
    return todayRuns.length > 0 ? todayRuns[0] : null
  }

  const filteredUsers = users.filter(user => {
    if (resultFilter === 'all') return true
    const lastRun = getLastRun(user.id)
    if (!lastRun) return resultFilter === 'fail' // Show users with no run today as "unsuccessful"
    return resultFilter === 'success' ? lastRun.status === 'success' : lastRun.status === 'fail'
  })

  // Calculate verification stats
  const successVerifications = users.filter(user => {
    const lastRun = getLastRun(user.id)
    return lastRun && lastRun.status === 'success'
  }).length

  const pendingVerifications = users.filter(user => {
    const lastRun = getLastRun(user.id)
    return !lastRun || lastRun.status !== 'success'
  }).length

  const activeUsers = users.filter(u => u.active)
  const lastRun = runs.length > 0 ? runs[0] : null

  if (loading) {
    return <div className="min-h-screen bg-gray-50 p-8">Loading...</div>
  }

      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">TradeTron Token Generator</h1>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Link href="/users" className="bg-gradient-to-br from-blue-100 to-blue-200 p-6 rounded-lg shadow-md text-gray-800 transform hover:scale-105 transition-transform duration-200 border border-blue-200 cursor-pointer">
            <div className="text-sm font-medium text-gray-700">Total Users</div>
            <div className="text-3xl font-bold mt-1 text-gray-900">{users.length}</div>
            <div className="text-sm text-gray-600 mt-1">{activeUsers.length} active</div>
          </Link>
          <div 
            onClick={() => {
              const element = document.getElementById('recent-runs')
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            }}
            className="bg-gradient-to-br from-green-100 to-green-200 p-6 rounded-lg shadow-md text-gray-800 transform hover:scale-105 transition-transform duration-200 border border-green-200 cursor-pointer"
          >
            <div className="text-sm font-medium text-gray-700">Last Run</div>
            {lastRun ? (
              <>
                <div className="text-3xl font-bold mt-1 text-gray-900">{format(new Date(lastRun.startedAt), 'HH:mm')}</div>
                <div className="text-sm text-gray-600 mt-1">{format(new Date(lastRun.startedAt), 'MMM d')}</div>
              </>
            ) : (
              <div className="text-sm text-gray-600 mt-1">No runs yet</div>
            )}
          </div>
          <div className="bg-gradient-to-br from-purple-100 to-purple-200 p-6 rounded-lg shadow-md text-gray-800 transform hover:scale-105 transition-transform duration-200 border border-purple-200">
            <div className="text-sm font-medium text-gray-700">Next Scheduled</div>
            {health?.scheduler?.schedule ? (
              <>
                {editingSchedule ? (
                  <div className="mt-2 space-y-2">
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={scheduleTime.hour}
                        onChange={(e) => setScheduleTime({ ...scheduleTime, hour: parseInt(e.target.value) || 0 })}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="HH"
                      />
                      <span className="text-gray-600">:</span>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={scheduleTime.minute}
                        onChange={(e) => setScheduleTime({ ...scheduleTime, minute: parseInt(e.target.value) || 0 })}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="MM"
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={handleUpdateSchedule}
                          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setEditingSchedule(false)}
                          className="text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-400"
                        >
                          ✗
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold mt-1 text-gray-900 cursor-pointer hover:opacity-80" onClick={() => setEditingSchedule(true)}>
                      {health.scheduler.schedule.timeString}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{health.scheduler.running ? 'Running' : 'Scheduled'}</div>
                      <button
                        onClick={() => setEditingSchedule(true)}
                        className="text-xs bg-purple-300 bg-opacity-60 hover:bg-opacity-80 px-2 py-1 rounded mt-1 transition-all text-gray-700 font-medium"
                      >
                        Edit
                      </button>
                  </>
                )}
              </>
            ) : (
              <div className="text-sm text-gray-600">Not scheduled</div>
            )}
          </div>
          <div className="bg-gradient-to-br from-orange-100 to-orange-200 p-6 rounded-lg shadow-md text-gray-800 transform hover:scale-105 transition-transform duration-200 border border-orange-200">
            <div className="text-sm font-medium text-gray-700">Queue Status</div>
            <div className="text-3xl font-bold mt-1 text-gray-900">
              {health?.queue?.running || 0}/{health?.queue?.maxConcurrency || 4}
            </div>
            <div className="text-sm text-gray-600 mt-1">{health?.queue?.queueLength || 0} queued</div>
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
            className="bg-gradient-to-br from-green-100 to-emerald-200 p-6 rounded-lg shadow-md text-gray-800 transform hover:scale-105 transition-transform duration-200 border border-green-200 cursor-pointer"
          >
            <div className="text-sm font-medium text-gray-700">Success Verification</div>
            <div className="text-3xl font-bold mt-1 text-gray-900">{successVerifications}</div>
            <div className="text-sm text-gray-600 mt-1">verified today</div>
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
            className="bg-gradient-to-br from-yellow-100 to-amber-200 p-6 rounded-lg shadow-md text-gray-800 transform hover:scale-105 transition-transform duration-200 border border-yellow-200 cursor-pointer"
          >
            <div className="text-sm font-medium text-gray-700">Pending Verification</div>
            <div className="text-3xl font-bold mt-1 text-gray-900">{pendingVerifications}</div>
            <div className="text-sm text-gray-600 mt-1">pending today</div>
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
        </div>

        {/* Users Table */}
        <div id="users-section" className="bg-white rounded-lg shadow-lg mb-8 border border-gray-200">
          <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50 flex justify-between items-center">
            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Users</h2>
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
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-semibold">{user.name}</td>
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
                          lastRun.status === 'success' ? (
                            <span className="text-green-600 font-medium">✓</span>
                          ) : (
                            <span className="text-red-600 font-medium">✗</span>
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {lastRun ? (
                          <div className="flex flex-col">
                            <span className="font-medium">{format(new Date(lastRun.startedAt), 'MMM d, HH:mm:ss')}</span>
                            <span className="text-xs text-gray-500 mt-0.5">{format(new Date(lastRun.startedAt), 'EEE')}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {lastRun ? (
                          <span className="font-medium">
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
          <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-pink-50">
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Recent Runs</h2>
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
                {runs.map((run) => (
                  <tr key={run.id} className={run.status === 'success' ? 'hover:bg-green-50 transition-colors duration-150' : 'hover:bg-red-50 transition-colors duration-150'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {format(new Date(run.startedAt), 'MMM d, HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">{run.userName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {run.status === 'success' ? (
                        <span className="text-green-600 font-medium">✓ Success</span>
                      ) : (
                        <span className="text-red-600 font-medium">✗ Failed</span>
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
    </div>
  )
}

