'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface League {
  name: string
  season: string
  total_rosters: number
  status: string
  [key: string]: any
}

interface Roster {
  roster_id: number
  owner_id: string
  players: string[]
  [key: string]: any
}

interface Matchup {
  matchup_id: number
  roster_id: number
  points: number
  [key: string]: any
}

export default function LeaguePage() {
  const params = useParams()
  const router = useRouter()
  const leagueId = params.leagueId as string
  const [league, setLeague] = useState<League | null>(null)
  const [rosters, setRosters] = useState<Roster[]>([])
  const [matchups, setMatchups] = useState<Matchup[]>([])
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMatchups, setLoadingMatchups] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchLeagueData = async () => {
      try {
        setLoading(true)
        
        const [leagueRes, rostersRes] = await Promise.all([
          fetch(`/api/league/${leagueId}`),
          fetch(`/api/rosters/${leagueId}`)
        ])

        if (!leagueRes.ok) {
          const errorData = await leagueRes.json()
          throw new Error(errorData.error || 'Failed to fetch league')
        }

        if (!rostersRes.ok) {
          const errorData = await rostersRes.json()
          throw new Error(errorData.error || 'Failed to fetch rosters')
        }

        const leagueData = await leagueRes.json()
        const rostersData = await rostersRes.json()

        setLeague(leagueData)
        setRosters(rostersData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    if (leagueId) {
      fetchLeagueData()
    }
  }, [leagueId])

  useEffect(() => {
    const fetchMatchups = async () => {
      if (!leagueId) return

      try {
        setLoadingMatchups(true)
        const response = await fetch(`/api/matchups/${leagueId}?week=${selectedWeek}`)
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch matchups')
        }

        const data = await response.json()
        setMatchups(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoadingMatchups(false)
      }
    }

    fetchMatchups()
  }, [leagueId, selectedWeek])

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading league...</div>
      </div>
    )
  }

  if (error && !league) {
    return (
      <div className="container">
        <div className="error">{error}</div>
        <Link href="/" className="btn" style={{ display: 'inline-block', marginTop: '1rem' }}>
          Back to Home
        </Link>
      </div>
    )
  }

  if (!league) {
    return null
  }

  // Create a map of roster_id to roster for easy lookup
  const rosterMap = new Map(rosters.map(r => [r.roster_id, r]))

  // Group matchups by matchup_id
  const matchupGroups = new Map<number, Matchup[]>()
  matchups.forEach(matchup => {
    if (!matchupGroups.has(matchup.matchup_id)) {
      matchupGroups.set(matchup.matchup_id, [])
    }
    matchupGroups.get(matchup.matchup_id)!.push(matchup)
  })

  return (
    <div className="container">
      <Link href="/" className="btn" style={{ display: 'inline-block', marginBottom: '2rem' }}>
        Back to Home
      </Link>

      <div className="card">
        <h1 style={{ marginBottom: '1rem' }}>{league.name}</h1>
        <div style={{ color: '#666', marginBottom: '0.5rem' }}>
          Season: {league.season}
        </div>
        <div style={{ color: '#666', marginBottom: '0.5rem' }}>
          Total Rosters: {league.total_rosters}
        </div>
        <div style={{ color: '#666', marginBottom: '0.5rem' }}>
          Status: {league.status}
        </div>
        <div style={{ color: '#666', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
          <strong>Draft Status:</strong>{' '}
          {league.draft_id ? (
            <Link href={`/draft/${league.draft_id}`} className="league-link">
              View Draft (ID: {league.draft_id})
            </Link>
          ) : (
            <span>No draft associated</span>
          )}
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">Rosters</h2>
        <div className="roster-grid">
          {rosters.map((roster) => (
            <div key={roster.roster_id} className="roster-card">
              <div className="roster-title">Roster {roster.roster_id}</div>
              <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
                Owner ID: {roster.owner_id}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
                Players: {roster.players?.length || 0}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">Matchups</h2>
        <div className="week-selector">
          <label htmlFor="week-select" style={{ marginRight: '0.5rem' }}>
            Week:
          </label>
          <select
            id="week-select"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(Number(e.target.value))}
          >
            {Array.from({ length: 18 }, (_, i) => i + 1).map((week) => (
              <option key={week} value={week}>
                Week {week}
              </option>
            ))}
          </select>
        </div>

        {loadingMatchups ? (
          <div className="loading">Loading matchups...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : matchupGroups.size === 0 ? (
          <div className="card">
            <p>No matchups found for week {selectedWeek}.</p>
          </div>
        ) : (
          <div className="matchup-grid">
            {Array.from(matchupGroups.entries()).map(([matchupId, matchupPair]) => {
              const [team1, team2] = matchupPair
              const roster1 = rosterMap.get(team1.roster_id)
              const roster2 = rosterMap.get(team2.roster_id)

              return (
                <div key={matchupId} className="matchup-card">
                  <div className="matchup-teams">
                    <div className="matchup-team">
                      <div>Roster {team1.roster_id}</div>
                      <div className="matchup-score">{team1.points?.toFixed(2) || '0.00'}</div>
                    </div>
                    <div style={{ fontSize: '1.5rem', color: '#999' }}>vs</div>
                    <div className="matchup-team" style={{ textAlign: 'right' }}>
                      <div>Roster {team2.roster_id}</div>
                      <div className="matchup-score">{team2.points?.toFixed(2) || '0.00'}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

