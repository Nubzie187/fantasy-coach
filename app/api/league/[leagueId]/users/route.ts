import { NextRequest, NextResponse } from 'next/server'

const SLEEPER_API_BASE = 'https://api.sleeper.app/v1'

export async function GET(
  request: NextRequest,
  { params }: { params: { leagueId: string } }
) {
  try {
    const leagueId = params.leagueId

    if (!leagueId) {
      return NextResponse.json(
        { error: 'League ID is required' },
        { status: 400 }
      )
    }

    const response = await fetch(`${SLEEPER_API_BASE}/league/${leagueId}/users`)

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'League users not found' },
          { status: 404 }
        )
      }
      throw new Error(`Sleeper API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching league users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch league users' },
      { status: 500 }
    )
  }
}

