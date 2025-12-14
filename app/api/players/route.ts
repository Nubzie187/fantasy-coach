import { NextResponse } from 'next/server'

const SLEEPER_API_BASE = 'https://api.sleeper.app/v1'

// Simple in-memory cache
interface CacheEntry {
  data: Record<string, any>
  timestamp: number
}

let playersCache: CacheEntry | null = null
const CACHE_DURATION = 6 * 60 * 60 * 1000 // 6 hours in milliseconds

export async function GET() {
  try {
    const now = Date.now()

    // Check if cache is valid
    if (playersCache && (now - playersCache.timestamp) < CACHE_DURATION) {
      return NextResponse.json(playersCache.data)
    }

    // Fetch fresh data from Sleeper API
    const response = await fetch(`${SLEEPER_API_BASE}/players/nfl`)

    if (!response.ok) {
      throw new Error(`Sleeper API error: ${response.status}`)
    }

    const data = await response.json()

    // Update cache
    playersCache = {
      data,
      timestamp: now
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching players:', error)
    return NextResponse.json(
      { error: 'Failed to fetch players data' },
      { status: 500 }
    )
  }
}

