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
  starters?: string[]
  players_points?: Record<string, number>
  [key: string]: any
}

interface Player {
  full_name: string
  position: string
  team: string
  [key: string]: any
}

interface LeagueUser {
  user_id: string
  display_name: string
  metadata?: {
    team_name?: string
    [key: string]: any
  }
  [key: string]: any
}

export default function LeaguePage() {
  const params = useParams()
  const router = useRouter()
  const leagueId = params.leagueId as string
  const [league, setLeague] = useState<League | null>(null)
  const [rosters, setRosters] = useState<Roster[]>([])
  const [users, setUsers] = useState<LeagueUser[]>([])
  const [matchups, setMatchups] = useState<Matchup[]>([])
  const [players, setPlayers] = useState<Record<string, Player>>({})
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMatchups, setLoadingMatchups] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchLeagueData = async () => {
      try {
        setLoading(true)
        
        const [leagueRes, rostersRes, usersRes, playersRes] = await Promise.all([
          fetch(`/api/league/${leagueId}`),
          fetch(`/api/rosters/${leagueId}`),
          fetch(`/api/league/${leagueId}/users`),
          fetch(`/api/players`)
        ])

        if (!leagueRes.ok) {
          const errorData = await leagueRes.json()
          throw new Error(errorData.error || 'Failed to fetch league')
        }

        if (!rostersRes.ok) {
          const errorData = await rostersRes.json()
          throw new Error(errorData.error || 'Failed to fetch rosters')
        }

        if (!usersRes.ok) {
          const errorData = await usersRes.json()
          throw new Error(errorData.error || 'Failed to fetch league users')
        }

        const leagueData = await leagueRes.json()
        const rostersData = await rostersRes.json()
        const usersData = await usersRes.json()
        const playersData = playersRes.ok ? await playersRes.json() : {}

        setLeague(leagueData)
        setRosters(rostersData)
        setUsers(usersData)
        setPlayers(playersData)
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

  // Create a map of user_id to user for easy lookup
  const userMap = new Map(users.map(u => [u.user_id, u]))

  // Helper function to get team name from owner_id
  const getTeamName = (ownerId: string): string => {
    const user = userMap.get(ownerId)
    if (!user) return `Owner ${ownerId}`
    return user.metadata?.team_name || user.display_name || `Owner ${ownerId}`
  }

  // Helper function to get player info
  const getPlayerInfo = (playerId: string | null): Player | null => {
    if (!playerId) return null
    return players[playerId] || null
  }

  // Helper function to count positions in a lineup
  const countPositions = (starterIds: string[]): Record<string, number> => {
    const counts: Record<string, number> = { QB: 0, RB: 0, WR: 0, TE: 0, FLEX: 0, K: 0, DEF: 0 }
    starterIds.forEach(playerId => {
      const player = getPlayerInfo(playerId)
      if (player) {
        const pos = player.position
        if (pos === 'QB') counts.QB++
        else if (pos === 'RB') counts.RB++
        else if (pos === 'WR') counts.WR++
        else if (pos === 'TE') counts.TE++
        else if (pos === 'K') counts.K++
        else if (pos === 'DEF' || pos === 'DST') counts.DEF++
        // FLEX can be RB/WR/TE, but we'll count them in their base position
      }
    })
    return counts
  }

  // Helper function to generate coach insights
  const getCoachInsights = (
    team1Starters: string[],
    team2Starters: string[],
    team1Points: number,
    team2Points: number,
    team1Name: string,
    team2Name: string
  ) => {
    const team1Counts = countPositions(team1Starters)
    const team2Counts = countPositions(team2Starters)
    
    const insights: string[] = []
    const risks: string[] = []
    
    // Compare scores
    const scoreDiff = team1Points - team2Points
    const isAhead = scoreDiff > 0
    const isBehind = scoreDiff < 0
    const isTied = scoreDiff === 0
    
    // Position comparison
    const positionDiffs = {
      QB: team1Counts.QB - team2Counts.QB,
      RB: team1Counts.RB - team2Counts.RB,
      WR: team1Counts.WR - team2Counts.WR,
      TE: team1Counts.TE - team2Counts.TE
    }
    
    // Flag imbalances
    if (positionDiffs.RB < -1) {
      insights.push(`${team2Name} has ${Math.abs(positionDiffs.RB)} more RB(s) starting`)
    } else if (positionDiffs.RB > 1) {
      insights.push(`${team1Name} has ${positionDiffs.RB} more RB(s) starting`)
    }
    
    if (positionDiffs.WR < -1) {
      insights.push(`${team2Name} has ${Math.abs(positionDiffs.WR)} more WR(s) starting`)
    } else if (positionDiffs.WR > 1) {
      insights.push(`${team1Name} has ${positionDiffs.WR} more WR(s) starting`)
    }
    
    // Check for missing key positions
    if (team1Counts.QB === 0) {
      risks.push(`${team1Name} has no QB starting`)
    }
    if (team2Counts.QB === 0) {
      risks.push(`${team2Name} has no QB starting`)
    }
    
    // Check for low starter counts
    const team1Total = team1Starters.length
    const team2Total = team2Starters.length
    
    if (team1Total < 8) {
      risks.push(`${team1Name} has only ${team1Total} starter(s) - may be incomplete lineup`)
    }
    if (team2Total < 8) {
      risks.push(`${team2Name} has only ${team2Total} starter(s) - may be incomplete lineup`)
    }
    
    // Check for weak FLEX (no RB/WR/TE depth)
    const team1FlexDepth = team1Counts.RB + team1Counts.WR + team1Counts.TE
    const team2FlexDepth = team2Counts.RB + team2Counts.WR + team2Counts.TE
    
    if (team1FlexDepth < 4) {
      risks.push(`${team1Name} has limited RB/WR/TE depth (${team1FlexDepth} players)`)
    }
    if (team2FlexDepth < 4) {
      risks.push(`${team2Name} has limited RB/WR/TE depth (${team2FlexDepth} players)`)
    }
    
    return {
      isAhead,
      isBehind,
      isTied,
      scoreDiff: Math.abs(scoreDiff),
      insights,
      risks: risks.slice(0, 2) // Limit to 1-2 risk areas
    }
  }

  // Helper function to get suggested swaps for a team
  const getSuggestedSwaps = (
    roster: Roster | undefined,
    matchup: Matchup,
    teamName: string
  ): Array<{ benchPlayerId: string; starterPlayerId: string; pointDiff: number }> | null => {
    if (!roster || !matchup.starters || !matchup.players_points) {
      return null // No data available
    }

    const starters = matchup.starters
    const benchPlayers = roster.players.filter(playerId => !starters.includes(playerId))
    const playersPoints = matchup.players_points
    const swaps: Array<{ benchPlayerId: string; starterPlayerId: string; pointDiff: number }> = []

    // For each starter, check if there's a better bench option at the same position
    starters.forEach(starterId => {
      const starterPlayer = getPlayerInfo(starterId)
      if (!starterPlayer) return

      const starterPos = starterPlayer.position
      const starterPoints = playersPoints[starterId] ?? 0

      // Only consider RB, WR, TE for swaps (FLEX eligible positions)
      if (!['RB', 'WR', 'TE'].includes(starterPos)) return

      // Find bench players with same position
      const benchCandidates = benchPlayers
        .map(benchId => {
          const benchPlayer = getPlayerInfo(benchId)
          if (!benchPlayer) return null
          if (benchPlayer.position !== starterPos) return null
          const benchPoints = playersPoints[benchId] ?? 0
          return { benchId, benchPlayer, benchPoints }
        })
        .filter((candidate): candidate is { benchId: string; benchPlayer: Player; benchPoints: number } => 
          candidate !== null && candidate.benchPoints > starterPoints
        )

      // Find the best bench candidate (highest points)
      if (benchCandidates.length > 0) {
        const bestCandidate = benchCandidates.reduce((best, current) => 
          current.benchPoints > best.benchPoints ? current : best
        )
        swaps.push({
          benchPlayerId: bestCandidate.benchId,
          starterPlayerId: starterId,
          pointDiff: bestCandidate.benchPoints - starterPoints
        })
      }
    })

    return swaps.length > 0 ? swaps : []
  }

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
              <div className="roster-title">{getTeamName(roster.owner_id)}</div>
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
              const team1Name = roster1 ? getTeamName(roster1.owner_id) : `Roster ${team1.roster_id}`
              const team2Name = roster2 ? getTeamName(roster2.owner_id) : `Roster ${team2.roster_id}`
              const team1Starters = team1.starters || []
              const team2Starters = team2.starters || []
              const team1Points = team1.points || 0
              const team2Points = team2.points || 0
              
              const coachInsights = getCoachInsights(
                team1Starters,
                team2Starters,
                team1Points,
                team2Points,
                team1Name,
                team2Name
              )
              
              const team1Counts = countPositions(team1Starters)
              const team2Counts = countPositions(team2Starters)
              
              const team1Swaps = getSuggestedSwaps(roster1, team1, team1Name)
              const team2Swaps = getSuggestedSwaps(roster2, team2, team2Name)

              return (
                <div key={matchupId} className="matchup-card" style={{ padding: '1.5rem' }}>
                  <div className="matchup-teams" style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid #eee' }}>
                    <div className="matchup-team">
                      <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{team1Name}</div>
                      <div className="matchup-score" style={{ fontSize: '1.5rem', marginTop: '0.5rem' }}>{team1Points.toFixed(2)}</div>
                    </div>
                    <div style={{ fontSize: '1.5rem', color: '#999', alignSelf: 'center' }}>vs</div>
                    <div className="matchup-team" style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{team2Name}</div>
                      <div className="matchup-score" style={{ fontSize: '1.5rem', marginTop: '0.5rem' }}>{team2Points.toFixed(2)}</div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.5rem' }}>
                    {/* Team 1 Starting Lineup */}
                    <div>
                      <div style={{ fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>Starting Lineup</div>
                      {team1Starters.length === 0 ? (
                        <div style={{ fontSize: '0.875rem', color: '#999' }}>No starters</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {team1Starters.map((playerId) => {
                            const player = getPlayerInfo(playerId)
                            return (
                              <div key={playerId} style={{ fontSize: '0.875rem', padding: '0.5rem', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                                {player ? (
                                  <div>
                                    <div style={{ fontWeight: '500' }}>{player.full_name}</div>
                                    <div style={{ color: '#666', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                      {player.position} • {player.team}
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ color: '#999' }}>{playerId}</div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                      
                      {/* Team 1 Suggested Swaps */}
                      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
                        <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#333', fontSize: '0.875rem' }}>
                          Suggested Swaps
                        </div>
                        {team1Swaps === null ? (
                          <div style={{ fontSize: '0.75rem', color: '#999' }}>
                            No data to recommend swaps for this week
                          </div>
                        ) : team1Swaps.length === 0 ? (
                          <div style={{ fontSize: '0.75rem', color: '#666' }}>
                            No better bench options found
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {team1Swaps.map((swap, idx) => {
                              const benchPlayer = getPlayerInfo(swap.benchPlayerId)
                              const starterPlayer = getPlayerInfo(swap.starterPlayerId)
                              return (
                                <div key={idx} style={{ fontSize: '0.75rem', padding: '0.5rem', backgroundColor: '#fff3cd', borderRadius: '4px', border: '1px solid #ffc107' }}>
                                  <div style={{ fontWeight: '500', color: '#333' }}>
                                    Start {benchPlayer?.full_name || swap.benchPlayerId}
                                  </div>
                                  <div style={{ color: '#666', marginTop: '0.25rem' }}>
                                    over {starterPlayer?.full_name || swap.starterPlayerId}
                                  </div>
                                  <div style={{ color: '#22c55e', fontWeight: '500', marginTop: '0.25rem' }}>
                                    +{swap.pointDiff.toFixed(2)} pts
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Team 2 Starting Lineup */}
                    <div>
                      <div style={{ fontWeight: '600', marginBottom: '0.75rem', color: '#333' }}>Starting Lineup</div>
                      {team2Starters.length === 0 ? (
                        <div style={{ fontSize: '0.875rem', color: '#999' }}>No starters</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {team2Starters.map((playerId) => {
                            const player = getPlayerInfo(playerId)
                            return (
                              <div key={playerId} style={{ fontSize: '0.875rem', padding: '0.5rem', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                                {player ? (
                                  <div>
                                    <div style={{ fontWeight: '500' }}>{player.full_name}</div>
                                    <div style={{ color: '#666', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                      {player.position} • {player.team}
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ color: '#999' }}>{playerId}</div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                      
                      {/* Team 2 Suggested Swaps */}
                      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
                        <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#333', fontSize: '0.875rem' }}>
                          Suggested Swaps
                        </div>
                        {team2Swaps === null ? (
                          <div style={{ fontSize: '0.75rem', color: '#999' }}>
                            No data to recommend swaps for this week
                          </div>
                        ) : team2Swaps.length === 0 ? (
                          <div style={{ fontSize: '0.75rem', color: '#666' }}>
                            No better bench options found
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {team2Swaps.map((swap, idx) => {
                              const benchPlayer = getPlayerInfo(swap.benchPlayerId)
                              const starterPlayer = getPlayerInfo(swap.starterPlayerId)
                              return (
                                <div key={idx} style={{ fontSize: '0.75rem', padding: '0.5rem', backgroundColor: '#fff3cd', borderRadius: '4px', border: '1px solid #ffc107' }}>
                                  <div style={{ fontWeight: '500', color: '#333' }}>
                                    Start {benchPlayer?.full_name || swap.benchPlayerId}
                                  </div>
                                  <div style={{ color: '#666', marginTop: '0.25rem' }}>
                                    over {starterPlayer?.full_name || swap.starterPlayerId}
                                  </div>
                                  <div style={{ color: '#22c55e', fontWeight: '500', marginTop: '0.25rem' }}>
                                    +{swap.pointDiff.toFixed(2)} pts
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Coach Insight Panel */}
                  <div style={{ 
                    marginTop: '1.5rem', 
                    padding: '1rem', 
                    backgroundColor: '#f0f7ff', 
                    borderRadius: '8px',
                    border: '1px solid #cce5ff'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '0.75rem', color: '#333', fontSize: '1rem' }}>
                      Coach Insight
                    </div>
                    
                    {/* Score Status */}
                    <div style={{ marginBottom: '1rem' }}>
                      {coachInsights.isTied ? (
                        <div style={{ color: '#666', fontSize: '0.875rem' }}>Scores are tied</div>
                      ) : coachInsights.isAhead ? (
                        <div style={{ color: '#22c55e', fontSize: '0.875rem', fontWeight: '500' }}>
                          {team1Name} is ahead by {coachInsights.scoreDiff.toFixed(2)} points
                        </div>
                      ) : (
                        <div style={{ color: '#ef4444', fontSize: '0.875rem', fontWeight: '500' }}>
                          {team1Name} is behind by {coachInsights.scoreDiff.toFixed(2)} points
                        </div>
                      )}
                    </div>

                    {/* Position Comparison */}
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#333' }}>
                        Position Count Comparison
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', fontSize: '0.75rem' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: '#666' }}>QB</div>
                          <div style={{ fontWeight: '500' }}>{team1Counts.QB} vs {team2Counts.QB}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: '#666' }}>RB</div>
                          <div style={{ fontWeight: '500' }}>{team1Counts.RB} vs {team2Counts.RB}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: '#666' }}>WR</div>
                          <div style={{ fontWeight: '500' }}>{team1Counts.WR} vs {team2Counts.WR}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: '#666' }}>TE</div>
                          <div style={{ fontWeight: '500' }}>{team1Counts.TE} vs {team2Counts.TE}</div>
                        </div>
                      </div>
                    </div>

                    {/* Imbalance Flags */}
                    {coachInsights.insights.length > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#f59e0b' }}>
                          Lineup Imbalance
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: '#666' }}>
                          {coachInsights.insights.map((insight, idx) => (
                            <li key={idx} style={{ marginBottom: '0.25rem' }}>{insight}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Risk Areas */}
                    {coachInsights.risks.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#dc2626' }}>
                          Potential Risk Areas
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: '#666' }}>
                          {coachInsights.risks.map((risk, idx) => (
                            <li key={idx} style={{ marginBottom: '0.25rem' }}>{risk}</li>
                          ))}
                        </ul>
                      </div>
                    )}
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

