// Location Stats API
// Fetches statistics for a specific location including rating, reviews, and health score

import { NextResponse } from 'next/server'
import { getLocationStats } from '@/server/actions/locations'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  if (!params?.id) {
    return NextResponse.json({ error: 'Location ID is required' }, { status: 400 })
  }

  try {
    const result = await getLocationStats(params.id)
    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load location stats'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

