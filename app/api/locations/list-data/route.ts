// Locations list API for the Locations tab
// Returns a normalized list of locations with insights and health/visibility scores

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/auth-middleware'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function handler(request: Request, user: any): Promise<Response> {
  const supabase = await createClient()

  // Parse query parameters for filtering and pagination
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || 'all'
  const category = searchParams.get('category') || 'all'
  const limit = parseInt(searchParams.get('limit') || '50', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  // Build query
  let query = supabase
    .from('gmb_locations')
    .select(`
      id,
      location_name,
      address,
      phone,
      website,
      rating,
      review_count,
      status,
      category,
      latlng,
      regularHours:regularhours,
      businessHours:business_hours,
      metadata,
      response_rate,
      is_syncing,
      ai_insights,
      updated_at,
      created_at
    `, { count: 'exact' })
    .eq('user_id', user.id)

  // Apply filters
  if (search) {
    query = query.or(`location_name.ilike.%${search}%,address.ilike.%${search}%`)
  }
  
  if (status !== 'all') {
    query = query.eq('status', status)
  }
  
  if (category !== 'all') {
    query = query.eq('category', category)
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1)

  const { data: locationsData, error: dbError, count } = await query

  if (dbError) {
    console.error('[GET /api/locations/list-data] DB Error:', dbError)
    return NextResponse.json(
      { error: dbError.message || 'Database error' },
      { status: 500 }
    )
  }

  const processed = (locationsData || []).map((loc: any) => {
    const metadata = (loc.metadata as Record<string, any> | null) || {}
    const insights = (metadata.insights_json || metadata.insights || {}) as Record<string, any>
    const derivedHealth = metadata.health_score ?? metadata.healthScore
    const derivedVisibility = metadata.visibility_score ?? metadata.visibilityScore
    const derivedPhotos = metadata.mediaCount ?? metadata.photos ?? 0
    const derivedPosts = metadata.postsCount ?? metadata.posts ?? 0
    const derivedAttributes = metadata.serviceItems ?? metadata.attributes ?? []
    const lastSync = metadata.last_sync ?? metadata.lastSync ?? loc.updated_at ?? loc.created_at

    return {
      id: loc.id,
      name: loc.location_name || 'Untitled Location',
      address: loc.address || 'N/A',
      phone: loc.phone || 'N/A',
      website: loc.website || '',
      rating: Number(loc.rating) || 0,
      reviewCount: Number(loc.review_count) || 0,
      status: (loc.status as 'verified' | 'pending' | 'suspended') || 'pending',
      category: loc.category || 'General',
      coordinates: loc.latlng || { lat: 0, lng: 0 },
      hours: loc.regularHours || loc.businessHours || {},
      attributes: Array.isArray(derivedAttributes) ? derivedAttributes : [],
      photos: Number(derivedPhotos) || 0,
      posts: Number(derivedPosts) || 0,
      healthScore: Number(derivedHealth ?? 0) || 0,
      visibility: Number(derivedVisibility ?? 0) || 0,
      lastSync: typeof lastSync === 'string' ? lastSync : (lastSync instanceof Date ? lastSync.toISOString() : new Date().toISOString()),
      insights: {
        views: Number(insights.views) || 0,
        viewsTrend: Number(insights.viewsTrend) || 0,
        clicks: Number(insights.clicks) || 0,
        clicksTrend: Number(insights.clicksTrend) || 0,
        calls: Number(insights.calls) || 0,
        callsTrend: Number(insights.callsTrend) || 0,
        directions: Number(insights.directions) || 0,
        directionsTrend: Number(insights.directionsTrend) || 0,
        weeklyGrowth: Number(insights.weeklyGrowth) || 0,
      },
    }
  })

  return NextResponse.json({
    data: processed,
    total: count || 0,
    limit,
    offset,
  })
}

export const GET = withAuth(handler)
