'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '../../components/Header'

export default function NewUserPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    tradetronUsername: '',
    brokerUsername: '',
    password: '',
    totpSecretOrDOB: '',
    isDOB: false,
    selectors: '',
  })
  const [loading, setLoading] = useState(false)

  // Auto-generate login URL from tradetronUsername
  const loginUrl = formData.tradetronUsername 
    ? `https://flattrade.tradetron.tech/auth/${formData.tradetronUsername}`
    : ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          tradetronUsername: formData.tradetronUsername,
          brokerUsername: formData.brokerUsername,
          password: formData.password,
          totpSecretOrDOB: formData.totpSecretOrDOB,
          isDOB: formData.isDOB,
          selectors: formData.selectors || undefined,
        }),
      })

      if (res.ok) {
        router.push('/')
      } else {
        const error = await res.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      alert('Failed to create user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-geometric relative">
      <Header />
      <div className="p-4 sm:p-6 lg:p-8 pt-20 sm:pt-24">
      <div className="bg-geometric-shapes">
        <div className="geometric-triangle triangle-1"></div>
        <div className="geometric-triangle triangle-2"></div>
        <div className="geometric-triangle triangle-3"></div>
        <div className="geometric-triangle triangle-4"></div>
        <div className="geometric-triangle triangle-5"></div>
        <div className="geometric-triangle triangle-6"></div>
      </div>
      <div className="max-w-2xl mx-auto relative z-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Add New User</h1>
        
        <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Profile Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Flatrade Account"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tradetron Username *
              </label>
              <input
                type="text"
                required
                value={formData.tradetronUsername}
                onChange={(e) => setFormData({ ...formData, tradetronUsername: e.target.value })}
                placeholder="724700"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              />
              <p className="text-xs text-gray-700 mt-1">
                Your Tradetron username (used in login URL)
              </p>
              {loginUrl && (
                <p className="text-xs text-green-600 mt-1 font-semibold">
                  Login URL: {loginUrl}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Broker Username (Flatrade User ID) *
              </label>
              <input
                type="text"
                required
                value={formData.brokerUsername}
                onChange={(e) => setFormData({ ...formData, brokerUsername: e.target.value })}
                placeholder="Your Flatrade username"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Broker Password *
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                2FA Method *
              </label>
              <div className="mb-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isDOB}
                    onChange={(e) => setFormData({ ...formData, isDOB: e.target.checked })}
                  />
                  <span className="text-sm">Use Date of Birth (DOB) instead of TOTP</span>
                </label>
              </div>
              <input
                type="text"
                required
                value={formData.totpSecretOrDOB}
                onChange={(e) => setFormData({ ...formData, totpSecretOrDOB: e.target.value })}
                placeholder={formData.isDOB ? "DDMMYYYY (e.g., 17111992)" : "Base32 TOTP secret"}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              />
              <p className="text-xs text-gray-700 mt-1">
                {formData.isDOB 
                  ? "Enter your Date of Birth in DDMMYYYY format (e.g., 17111992 for 17-Nov-1992)"
                  : "Enter TOTP secret (base32) from your authenticator app"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Selectors (JSON, optional)
              </label>
              <textarea
                value={formData.selectors}
                onChange={(e) => setFormData({ ...formData, selectors: e.target.value })}
                placeholder='{"username": ["input[name=\"username\"]"], "password": ["input[type=\"password\"]"]}'
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm text-gray-900"
              />
              <p className="text-xs text-gray-700 mt-1">
                Override default selectors if needed. Leave empty to use defaults.
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create User'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
      </div>
    </div>
  )
}

