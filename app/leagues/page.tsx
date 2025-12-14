'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface League {
  league_id: string
  name: string
  season: string
}

function LeaguesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const userId = searchParams.get('userId')
  const [leagues, setLeagues] = useState<League[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!userId) {
      router.push('/')
      return
    }

    const fetchLeagues = async () => {
      try {
        setLoading(true)
        const currentSeason = new Date().getFullYear()
        const response = await fetch(`/api/leagues/${userId}?season=${currentSeason}`)
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch leagues')
        }

        const data = await response.json()
        setLeagues(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchLeagues()
  }, [userId, router])

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading leagues...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">{error}</div>
        <Link href="/" className="btn" style={{ display: 'inline-block', marginTop: '1rem' }}>
          Back to Home
        </Link>
      </div>
    )
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: '2rem' }}>My Leagues</h1>
      {leagues.length === 0 ? (
        <div className="card">
          <p>No leagues found for the current season.</p>
          <Link href="/" className="btn" style={{ display: 'inline-block', marginTop: '1rem' }}>
            Back to Home
          </Link>
        </div>
      ) : (
        <>
          <div className="card">
            <ul className="league-list">
              {leagues.map((league) => (
                <li key={league.league_id} className="league-item">
                  <Link href={`/league/${league.league_id}`} className="league-link">
                    {league.name}
                  </Link>
                  <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>
                    League ID: {league.league_id}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <Link href="/" className="btn" style={{ display: 'inline-block' }}>
            Back to Home
          </Link>
        </>
      )}
    </div>
  )
}

export default function LeaguesPage() {
  return (
    <Suspense fallback={
      <div className="container">
        <div className="loading">Loading leagues...</div>
      </div>
    }>
      <LeaguesContent />
    </Suspense>
  )
}

