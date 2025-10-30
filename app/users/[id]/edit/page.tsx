'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function EditUserPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params?.id as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    brokerUsername: '',
    tradetronUsername: '',
    password: '',
    totpSecretOrDOB: '',
    isDOB: false,
    selectors: '',
    active: true,
  })
  const [changePassword, setChangePassword] = useState(false)
  const [changeTotp, setChangeTotp] = useState(false)

  useEffect(() => {
    if (userId) loadUser()
  }, [userId])

  const loadUser = async () => {
    if (!userId) return
    try {
      const res = await fetch(`/api/users/${userId}`)
      if (res.ok) {
        const user = await res.json()
        setFormData({
          name: user.name,
          brokerUsername: user.brokerUsername,
          tradetronUsername: user.tradetronUsername || '',
          password: '',
          totpSecretOrDOB: '',
          isDOB: user.isDOB || false,
          selectors: user.selectors ? JSON.stringify(user.selectors, null, 2) : '',
          active: user.active,
        })
      }
    } catch (error) {
      alert('Failed to load user')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const payload: any = {
        name: formData.name,
        brokerUsername: formData.brokerUsername,
        tradetronUsername: formData.tradetronUsername,
        selectors: formData.selectors || undefined,
        active: formData.active,
      }

      if (changePassword && formData.password) {
        payload.password = formData.password
      }
      if (changeTotp && formData.totpSecretOrDOB) {
        payload.totpSecretOrDOB = formData.totpSecretOrDOB
        payload.isDOB = formData.isDOB
      }

      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        router.push('/')
      } else {
        const error = await res.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      alert('Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  // Auto-generate login URL from tradetronUsername
  const loginUrl = formData.tradetronUsername 
    ? `https://flattrade.tradetron.tech/auth/${formData.tradetronUsername}`
    : ''

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Edit User</h1>
        
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <p className="text-xs text-gray-500 mt-1">Used to generate login URL</p>
              {loginUrl && (
                <p className="text-xs text-green-600 mt-1 font-semibold">
                  Login URL: {loginUrl}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Broker Username *
              </label>
              <input
                type="text"
                required
                value={formData.brokerUsername}
                onChange={(e) => setFormData({ ...formData, brokerUsername: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={changePassword}
                  onChange={(e) => setChangePassword(e.target.checked)}
                />
                <span className="text-sm font-medium text-gray-700">Change Password</span>
              </label>
              {changePassword && (
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md mt-2"
                />
              )}
              {!changePassword && (
                <p className="text-xs text-gray-500 mt-1">Password is encrypted and not displayed</p>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={changeTotp}
                  onChange={(e) => setChangeTotp(e.target.checked)}
                />
                <span className="text-sm font-medium text-gray-700">Change TOTP Secret or DOB</span>
              </label>
              {changeTotp && (
                <>
                  <div className="mb-2 mt-2">
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
                    value={formData.totpSecretOrDOB}
                    onChange={(e) => setFormData({ ...formData, totpSecretOrDOB: e.target.value })}
                    placeholder={formData.isDOB ? "DDMMYYYY (e.g., 17111992)" : "Base32 TOTP secret"}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.isDOB 
                      ? "Enter DOB in DDMMYYYY format"
                      : "Enter TOTP secret (base32)"}
                  </p>
                </>
              )}
              {!changeTotp && (
                <p className="text-xs text-gray-500 mt-1">TOTP secret/DOB is encrypted and not displayed</p>
              )}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
              />
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">Inactive users will not be included in scheduled runs</p>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
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
  )
}

