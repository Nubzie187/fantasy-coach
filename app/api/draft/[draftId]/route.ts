import { NextRequest, NextResponse } from 'next/server'

const SLEEPER_API_BASE = 'https://api.sleeper.app/v1'

export async function GET(
  request: NextRequest,
  { params }: { params: { draftId: string } }
) {
  try {
    const draftId = params.draftId

    if (!draftId) {
      return NextResponse.json(
        { error: 'Draft ID is required' },
        { status: 400 }
      )
    }

    const response = await fetch(`${SLEEPER_API_BASE}/draft/${draftId}`)

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Draft not found' },
          { status: 404 }
        )
      }
      throw new Error(`Sleeper API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching draft:', error)
    return NextResponse.json(
      { error: 'Failed to fetch draft data' },
      { status: 500 }
    )
  }
}

