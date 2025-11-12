import { NextResponse } from 'next/server'
import { getCompetitors } from '@/server/actions/locations'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const latParam = searchParams.get('lat')
  const lngParam = searchParams.get('lng')

  if (!latParam || !lngParam) {
    return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 })
  }

  const lat = Number(latParam)
  const lng = Number(lngParam)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'Latitude and longitude must be valid numbers' }, { status: 400 })
  }

  try {
    const result = await getCompetitors({ lat, lng })
    return NextResponse.json({ success: true, competitors: result.competitors, error: result.error ?? null })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve competitors'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
