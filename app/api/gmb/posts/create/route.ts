import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPostSchema } from '@/lib/validations/gmb-post'
import { errorResponse, getErrorCode } from '@/lib/utils/api-response'

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
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401)
    }

    const body = (await request.json()) as CreatePostBody
    
    // Validate input with Zod
    const validationResult = createPostSchema.safeParse(body)
    if (!validationResult.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid input data', 400, validationResult.error.errors)
    }
    
    const validated = validationResult.data

    // Ensure location belongs to user
    const { data: loc } = await supabase
      .from('gmb_locations')
      .select('id')
      .eq('id', validated.locationId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!loc) {
      return errorResponse('LOCATION_NOT_FOUND', 'Location not found', 404)
    }

    // Build metadata for Event/Offer posts
    const metadata: any = {}
    if (validated.postType === 'event') {
      metadata.eventTitle = validated.eventTitle
      metadata.eventStartDate = validated.eventStartDate
      metadata.eventEndDate = validated.eventEndDate
    } else if (validated.postType === 'offer') {
      metadata.offerTitle = validated.offerTitle
      metadata.couponCode = validated.couponCode
      metadata.redeemUrl = validated.redeemUrl
      metadata.terms = validated.terms
    }
    if (validated.aiGenerated) {
      metadata.aiGenerated = true
    }

    const { data, error } = await supabase
      .from('gmb_posts')
      .insert({
        user_id: user.id,
        location_id: validated.locationId,
        title: validated.title ?? null,
        content: validated.content,
        media_url: validated.mediaUrl ?? null,
        call_to_action: validated.callToAction ?? null,
        call_to_action_url: validated.callToActionUrl ?? null,
        status: validated.scheduledAt ? 'queued' : 'draft',
        scheduled_at: validated.scheduledAt ?? null,
        post_type: validated.postType || 'whats_new',
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (error) {
      const errorCode = getErrorCode(error)
      console.error('[GMB Posts API] Database error:', error)
      return errorResponse(errorCode, 'Failed to create post', 500)
    }

    return NextResponse.json({ post: data }, { status: 201 })
  } catch (e: any) {
    const errorCode = getErrorCode(e)
    console.error('[GMB Posts API] Error:', e)
    return errorResponse(errorCode, 'Failed to create post', 500)
  }
}


