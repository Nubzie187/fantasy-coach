'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Draft {
  draft_id: string
  status: string
  type: string
  season: string
  [key: string]: any
}

interface DraftPick {
  pick_no: number
  player_id: string | null
  picked_by: string
  roster_id: number
  [key: string]: any
}

interface Player {
  full_name: string
  position: string
  team: string
  [key: string]: any
}

export default function DraftPage() {
  const params = useParams()
  const draftId = params.draftId as string
  const [draft, setDraft] = useState<Draft | null>(null)
  const [picks, setPicks] = useState<DraftPick[]>([])
  const [players, setPlayers] = useState<Record<string, Player>>({})
  const [loading, setLoading] = useState(true)
  const [liveMode, setLiveMode] = useState(false)
  const [error, setError] = useState('')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchDraftData = useCallback(async () => {
    if (!draftId) return

    try {
      const [draftRes, picksRes] = await Promise.all([
        fetch(`/api/draft/${draftId}`),
        fetch(`/api/draft/${draftId}/picks`)
      ])

      if (!draftRes.ok) {
        const errorData = await draftRes.json()
        throw new Error(errorData.error || 'Failed to fetch draft')
      }

      if (!picksRes.ok) {
        const errorData = await picksRes.json()
        throw new Error(errorData.error || 'Failed to fetch draft picks')
      }

      const draftData = await draftRes.json()
      const picksData = await picksRes.json()

      setDraft(draftData)
      setPicks(picksData)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [draftId])

  useEffect(() => {
    fetchDraftData()
  }, [fetchDraftData])

  useEffect(() => {
    // Fetch players data
    const fetchPlayers = async () => {
      try {
        const response = await fetch('/api/players')
        if (response.ok) {
          const playersData = await response.json()
          setPlayers(playersData)
        }
      } catch (err) {
        // Silently fail - we'll show player_id as fallback
        console.error('Failed to fetch players:', err)
      }
    }

    fetchPlayers()
  }, [])

  useEffect(() => {
    if (liveMode && draftId) {
      // Poll every 3 seconds
      intervalRef.current = setInterval(() => {
        fetchDraftData()
      }, 3000)
    } else {
      // Clear interval when live mode is disabled
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [liveMode, draftId, fetchDraftData])

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading draft...</div>
      </div>
    )
  }

  if (error && !draft) {
    return (
      <div className="container">
        <div className="error">{error}</div>
        <Link href="/" className="btn" style={{ display: 'inline-block', marginTop: '1rem' }}>
          Back to Home
        </Link>
      </div>
    )
  }

  if (!draft) {
    return null
  }

  // Sort picks by pick number
  const sortedPicks = [...picks].sort((a, b) => a.pick_no - b.pick_no)

  // Helper function to get player info
  const getPlayerInfo = (playerId: string | null) => {
    if (!playerId) return null
    return players[playerId] || null
  }

  return (
    <div className="container">
      <Link href="/" className="btn" style={{ display: 'inline-block', marginBottom: '2rem' }}>
        Back to Home
      </Link>

      <div className="card">
        <h1 style={{ marginBottom: '1rem' }}>Draft Details</h1>
        <div style={{ color: '#666', marginBottom: '0.5rem' }}>
          <strong>Status:</strong> {draft.status}
        </div>
        <div style={{ color: '#666', marginBottom: '0.5rem' }}>
          <strong>Type:</strong> {draft.type}
        </div>
        <div style={{ color: '#666', marginBottom: '0.5rem' }}>
          <strong>Season:</strong> {draft.season}
        </div>
        <div style={{ color: '#666', marginBottom: '0.5rem' }}>
          <strong>Draft ID:</strong> {draft.draft_id}
        </div>
      </div>

      <div className="section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="section-title" style={{ margin: 0 }}>Picks</h2>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={liveMode}
              onChange={(e) => setLiveMode(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span>Live mode</span>
            {liveMode && (
              <span style={{ fontSize: '0.875rem', color: '#0070f3' }}>● Polling every 3s</span>
            )}
          </label>
        </div>

        {error && <div className="error">{error}</div>}

        {sortedPicks.length === 0 ? (
          <div className="card">
            <p>No picks yet.</p>
          </div>
        ) : (
          <div className="card">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #eee' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Pick #</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Player</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Position</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Team</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Picked By</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Roster ID</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPicks.map((pick, index) => {
                    const playerInfo = getPlayerInfo(pick.player_id)
                    return (
                      <tr
                        key={index}
                        style={{
                          borderBottom: '1px solid #eee',
                          backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9'
                        }}
                      >
                        <td style={{ padding: '0.75rem' }}>{pick.pick_no}</td>
                        <td style={{ padding: '0.75rem' }}>
                          {pick.player_id ? (
                            playerInfo ? (
                              <span>{playerInfo.full_name || 'N/A'}</span>
                            ) : (
                              <span style={{ color: '#999' }}>{pick.player_id}</span>
                            )
                          ) : (
                            <span style={{ color: '#999' }}>Not picked</span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {playerInfo?.position || '-'}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {playerInfo?.team || '-'}
                        </td>
                        <td style={{ padding: '0.75rem' }}>{pick.picked_by}</td>
                        <td style={{ padding: '0.75rem' }}>{pick.roster_id}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '1rem', color: '#666', fontSize: '0.875rem' }}>
              Total picks: {sortedPicks.length}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

