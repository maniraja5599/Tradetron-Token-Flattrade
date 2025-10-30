'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import { User, RunLog } from '@/types'

export default function UsersManagement() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const filterParam = searchParams.get('filter') as 'all' | 'success' | 'fail' | null
  const [users, setUsers] = useState<User[]>([])
  const [runs, setRuns] = useState<RunLog[]>([])
  const [loading, setLoading] = useState(true)
  const [resultFilter, setResultFilter] = useState<'all' | 'success' | 'fail'>('all')

  useEffect(() => {
    // Set filter from URL parameter
    if (filterParam && ['all', 'success', 'fail'].includes(filterParam)) {
      setResultFilter(filterParam)
    }
    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [filterParam])

  const loadData = async () => {
    try {
      const [usersRes, runsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/runs?limit=100'),
      ])
      if (usersRes.ok) setUsers(await usersRes.json())
      if (runsRes.ok) setRuns(await runsRes.json())
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
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
    if (!confirm('Are you sure you want to delete this user?')) return
    try {
      await fetch(`/api/users/${userId}`, { method: 'DELETE' })
      loadData()
    } catch (error) {
      alert('Failed to delete user')
    }
  }

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive }),
      })
      loadData()
    } catch (error) {
      alert('Failed to update user')
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

  const getTotalRuns = (userId: string) => {
    return runs.filter(r => r.userId === userId).length
  }

  const getSuccessRate = (userId: string) => {
    const userRuns = runs.filter(r => r.userId === userId)
    if (userRuns.length === 0) return 0
    const successful = userRuns.filter(r => r.status === 'success').length
    return Math.round((successful / userRuns.length) * 100)
  }

  const filteredUsers = users.filter(user => {
    if (resultFilter === 'all') return true
    const lastRun = getLastRun(user.id)
    if (!lastRun) return resultFilter === 'fail' // Show users with no run today as "unsuccessful"
    return resultFilter === 'success' ? lastRun.status === 'success' : lastRun.status === 'fail'
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              User Management
            </h1>
            <p className="text-gray-600">Manage all users and their login credentials</p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/"
              className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 font-semibold"
            >
              ← Back to Dashboard
            </Link>
            <Link
              href="/users/new"
              className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-green-800 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 font-semibold"
            >
              + Add User
            </Link>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-lg mb-8 border border-gray-200">
          <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50 flex justify-between items-center">
            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              All Users ({filteredUsers.length})
            </h2>
            <div className="flex gap-2">
              <span className="text-sm text-gray-600 mr-2">Filter:</span>
              <button
                onClick={() => {
                  setResultFilter('all')
                  router.push('/users')
                }}
                className={`px-3 py-1 text-sm rounded ${
                  resultFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => {
                  setResultFilter('success')
                  router.push('/users?filter=success')
                }}
                className={`px-3 py-1 text-sm rounded ${
                  resultFilter === 'success'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Success
              </button>
              <button
                onClick={() => {
                  setResultFilter('fail')
                  router.push('/users?filter=fail')
                }}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Broker Username</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Login URL</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Last Result</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Total Runs</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Success Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => {
                  const lastRun = getLastRun(user.id)
                  const totalRuns = getTotalRuns(user.id)
                  const successRate = getSuccessRate(user.id)
                  return (
                    <tr key={user.id} className="hover:bg-blue-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-semibold">{user.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{user.brokerUsername}</td>
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
                        <button
                          onClick={() => handleToggleActive(user.id, user.active)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            user.active
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          } transition-colors`}
                        >
                          {user.active ? '✓ Active' : '○ Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {lastRun ? (
                          lastRun.status === 'success' ? (
                            <span className="text-green-600 font-medium">✓ Success</span>
                          ) : (
                            <span className="text-red-600 font-medium">✗ Failed</span>
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{totalRuns}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                successRate >= 80 ? 'bg-green-500' : successRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${successRate}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-700 font-medium">{successRate}%</span>
                        </div>
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
      </div>
    </div>
  )
}

