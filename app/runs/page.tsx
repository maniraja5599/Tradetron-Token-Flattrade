'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import { RunLog } from '@/types'
import Header from '../components/Header'

function RunsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const page = parseInt(searchParams.get('page') || '1')
  const [runs, setRuns] = useState<RunLog[]>([])
  const [loading, setLoading] = useState(true)
  const [totalRuns, setTotalRuns] = useState(0)
  const runsPerPage = 20

  useEffect(() => {
    loadRuns()
    const interval = setInterval(loadRuns, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [page])

  const loadRuns = async () => {
    try {
      const res = await fetch(`/api/runs?limit=1000`) // Get all runs
      if (res.ok) {
        const allRuns = await res.json()
        setTotalRuns(allRuns.length)
        // Calculate pagination
        const startIndex = (page - 1) * runsPerPage
        const endIndex = startIndex + runsPerPage
        setRuns(allRuns.slice(startIndex, endIndex))
      }
    } catch (error) {
      console.error('Failed to load runs:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(totalRuns / runsPerPage)

  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      router.push(`/runs?page=${newPage}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-geometric relative">
        <Header />
        <div className="p-8">
        <div className="bg-geometric-shapes">
          <div className="geometric-triangle triangle-1"></div>
          <div className="geometric-triangle triangle-2"></div>
          <div className="geometric-triangle triangle-3"></div>
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center py-20">
            <div className="text-gray-300">Loading runs...</div>
          </div>
        </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-geometric relative">
      <Header />
      <div className="p-4 sm:p-6 lg:p-8 pt-20 sm:pt-24 overflow-x-hidden">
      <div className="bg-geometric-shapes">
        <div className="geometric-triangle triangle-1"></div>
        <div className="geometric-triangle triangle-2"></div>
        <div className="geometric-triangle triangle-3"></div>
        <div className="geometric-triangle triangle-4"></div>
        <div className="geometric-triangle triangle-5"></div>
        <div className="geometric-triangle triangle-6"></div>
      </div>
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 bg-clip-text text-transparent">
              All Runs
            </h1>
            <p className="text-sm sm:text-base text-gray-400">View all authentication runs ({totalRuns} total)</p>
          </div>
          <Link
            href="/"
            className="bg-gray-200 text-gray-700 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:bg-gray-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 font-semibold text-sm sm:text-base text-center w-full sm:w-auto"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Runs Table */}
        <div className="bg-white rounded-lg shadow-lg mb-6 sm:mb-8 border border-gray-200">
          <div className="overflow-x-auto -mx-4 sm:-mx-6 lg:mx-0">
            <table className="w-full min-w-0 sm:min-w-[600px] md:min-w-[640px]">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                <tr>
                  <th className="px-2 sm:px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Timestamp</th>
                  <th className="px-2 sm:px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">User</th>
                  <th className="px-2 sm:px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-2 sm:px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider hidden md:table-cell">Message</th>
                  <th className="px-2 sm:px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider hidden sm:table-cell">Duration</th>
                  <th className="px-2 sm:px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Artifacts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-2 sm:px-3 md:px-6 py-8 text-center text-gray-500 text-xs sm:text-sm">
                      No runs found
                    </td>
                  </tr>
                ) : (
                  runs.map((run) => (
                    <tr key={run.id} className={run.status === 'success' && run.tokenGenerated ? 'hover:bg-green-50 transition-colors duration-150' : 'hover:bg-red-50 transition-colors duration-150'}>
                      <td className="px-2 sm:px-3 md:px-6 py-4 text-xs sm:text-sm text-gray-700 max-w-0">
                        <span className="whitespace-nowrap block truncate">{format(new Date(run.startedAt), 'MMM d, HH:mm:ss')}</span>
                      </td>
                      <td className="px-2 sm:px-3 md:px-6 py-4 text-xs sm:text-base text-gray-900 font-medium min-w-0 max-w-0">
                        <span className="truncate block min-w-0">{run.userName}</span>
                      </td>
                      <td className="px-2 sm:px-3 md:px-6 py-4 max-w-0">
                        {run.status === 'success' && run.tokenGenerated ? (
                          <span className="text-green-600 font-medium text-xs sm:text-sm whitespace-nowrap" title="OAuth successful - Token generated">✓ Success</span>
                        ) : run.status === 'success' && !run.tokenGenerated ? (
                          <span className="text-orange-600 font-medium text-xs sm:text-sm whitespace-nowrap" title="Login completed but token not generated">⚠ Partial</span>
                        ) : (
                          <span className="text-red-600 font-medium text-xs sm:text-sm whitespace-nowrap" title="OAuth failed">✗ Failed</span>
                        )}
                      </td>
                      <td className="px-2 sm:px-3 md:px-6 py-4 text-xs sm:text-sm text-gray-700 max-w-md truncate hidden md:table-cell">
                        {run.message || '-'}
                      </td>
                      <td className="px-2 sm:px-3 md:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700 hidden sm:table-cell">
                        <span className="font-medium">
                          {run.ms >= 1000 
                            ? `${(run.ms / 1000).toFixed(1)}s` 
                            : `${run.ms}ms`}
                        </span>
                      </td>
                      <td className="px-2 sm:px-3 md:px-6 py-4">
                        {run.artifactDir ? (
                          <a
                            href={`/api/artifacts/${run.id}`}
                            className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium whitespace-nowrap"
                            download
                          >
                            Download
                          </a>
                        ) : (
                          <span className="text-gray-400 text-xs sm:text-sm">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mb-8">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
            >
              ← Previous
            </button>
            
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (page <= 3) {
                  pageNum = i + 1
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = page - 2 + i
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      page === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
            >
              Next →
            </button>
          </div>
        )}

        <div className="text-center text-sm text-gray-300">
          Showing {((page - 1) * runsPerPage) + 1} to {Math.min(page * runsPerPage, totalRuns)} of {totalRuns} runs
        </div>
      </div>
      </div>
    </div>
  )
}

export default function RunsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-geometric p-8 relative">
        <div className="bg-geometric-shapes"></div>
        <div className="geometric-shape-1"></div>
        <div className="geometric-shape-2"></div>
        <div className="geometric-shape-3"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center py-20">
            <div className="text-gray-600">Loading...</div>
          </div>
        </div>
      </div>
    }>
      <RunsContent />
    </Suspense>
  )
}

