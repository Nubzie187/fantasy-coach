import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import DraftClient from './DraftClient'

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

async function getBaseUrl(): Promise<string> {
  const headersList = await headers()
  const host = headersList.get('host')
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  return process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`
}

async function getDraft(draftId: string): Promise<Draft> {
  const baseUrl = await getBaseUrl()
  const res = await fetch(`${baseUrl}/api/draft/${draftId}`, {
    cache: 'no-store'
  })
  
  if (!res.ok) {
    throw new Error('Failed to fetch draft')
  }
  
  return res.json()
}

async function getDraftPicks(draftId: string): Promise<DraftPick[]> {
  const baseUrl = await getBaseUrl()
  const res = await fetch(`${baseUrl}/api/draft/${draftId}/picks`, {
    cache: 'no-store'
  })
  
  if (!res.ok) {
    throw new Error('Failed to fetch draft picks')
  }
  
  return res.json()
}

async function getPlayers(): Promise<Record<string, Player>> {
  const baseUrl = await getBaseUrl()
  const res = await fetch(`${baseUrl}/api/players`, {
    cache: 'no-store'
  })
  
  if (!res.ok) {
    throw new Error('Failed to fetch players')
  }
  
  return res.json()
}

export default async function DraftPage({
  params
}: {
  params: { draftId: string }
}) {
  const { draftId } = params

  try {
    // Fetch all data server-side in parallel
    const [draft, picks, players] = await Promise.all([
      getDraft(draftId),
      getDraftPicks(draftId),
      getPlayers()
    ])

    return (
      <DraftClient
        initialDraft={draft}
        initialPicks={picks}
        players={players}
        draftId={draftId}
      />
    )
  } catch (error) {
    return (
      <div className="container">
        <div className="error">
          {error instanceof Error ? error.message : 'Failed to load draft'}
        </div>
        <Link href="/" className="btn" style={{ display: 'inline-block', marginTop: '1rem' }}>
          Back to Home
        </Link>
      </div>
    )
  }
}

