import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type CreatePostBody = {
  locationId: string
  title?: string
  content: string
  mediaUrl?: string
  callToAction?: string
  callToActionUrl?: string
  scheduledAt?: string | null
  postType?: 'whats_new' | 'event' | 'offer'
  aiGenerated?: boolean
  // Event fields
  eventTitle?: string
  eventStartDate?: string
  eventEndDate?: string
  // Offer fields
  offerTitle?: string
  couponCode?: string
  redeemUrl?: string
  terms?: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as CreatePostBody
    if (!body?.locationId || !body?.content) {
      return NextResponse.json({ error: 'Missing locationId or content' }, { status: 400 })
    }

    // Ensure location belongs to user
    const { data: loc } = await supabase
      .from('gmb_locations')
      .select('id')
      .eq('id', body.locationId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!loc) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    // Build metadata for Event/Offer posts
    const metadata: any = {}
    if (body.postType === 'event') {
      metadata.eventTitle = body.eventTitle
      metadata.eventStartDate = body.eventStartDate
      metadata.eventEndDate = body.eventEndDate
    } else if (body.postType === 'offer') {
      metadata.offerTitle = body.offerTitle
      metadata.couponCode = body.couponCode
      metadata.redeemUrl = body.redeemUrl
      metadata.terms = body.terms
    }
    if (body.aiGenerated) {
      metadata.aiGenerated = true
    }

    const { data, error } = await supabase
      .from('gmb_posts')
      .insert({
        user_id: user.id,
        location_id: body.locationId,
        title: body.title ?? null,
        content: body.content,
        media_url: body.mediaUrl ?? null,
        call_to_action: body.callToAction ?? null,
        call_to_action_url: body.callToActionUrl ?? null,
        status: body.scheduledAt ? 'queued' : 'draft',
        scheduled_at: body.scheduledAt ?? null,
        post_type: body.postType || 'whats_new',
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (error) {
      // Handle missing column error specifically
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.error('[GMB Posts API] Database schema error:', error.message)
        return NextResponse.json({ 
          error: 'Database schema mismatch. Please run the migration: 20250131_add_missing_columns.sql',
          details: error.message 
        }, { status: 500 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ post: data }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create post' }, { status: 500 })
  }
}


