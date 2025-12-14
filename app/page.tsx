'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) {
      setError('Please enter a username')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/user/${encodeURIComponent(username)}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to find user')
      }

      const userData = await response.json()
      router.push(`/leagues?userId=${userData.user_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div style={{ maxWidth: '500px', margin: '4rem auto' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem', textAlign: 'center' }}>
          Southern Charm
        </h1>
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem' }}>Find My Leagues</h2>
          <form onSubmit={handleSubmit}>
            {error && <div className="error">{error}</div>}
            <input
              type="text"
              className="input"
              placeholder="Enter Sleeper username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="btn"
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? 'Searching...' : 'Find my leagues'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

