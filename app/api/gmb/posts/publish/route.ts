import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponse, getErrorCode } from '@/lib/utils/api-response'
import { publishPostSchema } from '@/lib/validations/gmb-post'

export const dynamic = 'force-dynamic'

async function refreshGoogleToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return null
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!resp.ok) return null
  return resp.json() as Promise<{ access_token: string; expires_in?: number }>
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401)
    }

    const body = await request.json()
    
    // Validate input with Zod
    const validationResult = publishPostSchema.safeParse(body)
    if (!validationResult.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid input data', 400, validationResult.error.errors)
    }
    
    const { postId } = validationResult.data

    // Load post + location + account
    const { data: post, error: postErr } = await supabase
      .from('gmb_posts')
      .select('id, user_id, location_id, title, content, media_url, call_to_action, call_to_action_url, scheduled_at, post_type')
      .eq('id', postId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (postErr || !post) return errorResponse('NOT_FOUND', 'Post not found', 404)

    // Validate: Event and Offer posts cannot be published
    if (post.post_type === 'event' || post.post_type === 'offer') {
      return errorResponse('UNSUPPORTED_POST_TYPE', 'Event and Offer posts cannot be published to Google', 400)
    }

    const { data: location } = await supabase
      .from('gmb_locations')
      .select('id, location_id, gmb_account_id, gmb_accounts!inner(id, account_id, access_token, refresh_token, token_expires_at, is_active)')
      .eq('id', post.location_id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!location) return errorResponse('LOCATION_NOT_FOUND', 'Location not found', 404)

    // Check if the location belongs to an active account
    const account = (location as any).gmb_accounts
    if (!account) return errorResponse('ACCOUNT_NOT_FOUND', 'Account not found', 404)
    if (!account.is_active) return errorResponse('FORBIDDEN', 'Cannot publish posts for inactive accounts', 403)

    let accessToken = account.access_token as string | null
    // Refresh token if expired
    const isExpired = account.token_expires_at ? new Date(account.token_expires_at) < new Date() : false
    if ((!accessToken || isExpired) && account.refresh_token) {
      try {
        const refreshed = await refreshGoogleToken(account.refresh_token)
        if (refreshed?.access_token) {
          accessToken = refreshed.access_token
          const expiresAt = new Date()
          if (refreshed.expires_in) expiresAt.setSeconds(expiresAt.getSeconds() + refreshed.expires_in)
          await supabase
            .from('gmb_accounts')
            .update({ access_token: accessToken, token_expires_at: expiresAt.toISOString() })
            .eq('id', account.id)
            .eq('user_id', user.id)
        } else {
          console.error('[GMB Publish] Token refresh failed - no access token returned')
          return errorResponse('TOKEN_REFRESH_FAILED', 'Token refresh failed', 401)
        }
      } catch (refreshError: any) {
        console.error('[GMB Publish] Token refresh error:', refreshError)
        return errorResponse('TOKEN_REFRESH_ERROR', 'Token refresh failed', 401)
      }
    }

    if (!accessToken) return errorResponse('MISSING_FIELDS', 'Access token not available', 400)

    // Build location resource and post payload (Business Information API v1)
    // location.location_id is expected like "locations/1234567890"
    const locationResource = location.location_id
    const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${locationResource}/localPosts`

    const payload: any = {
      languageCode: 'en',
      summary: post.content?.slice(0, 1500) || '',
    }
    if (post.media_url) {
      payload.media = [{ sourceUrl: post.media_url }]
    }
    if (post.call_to_action && post.call_to_action_url) {
      payload.callToAction = { actionType: 'LEARN_MORE', url: post.call_to_action_url }
    }

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    })

    const text = await resp.text()
    if (!resp.ok) {
      let errorData: any = {}
      try {
        errorData = JSON.parse(text)
      } catch {}

      // Check for insufficient scopes error
      if (errorData?.error?.message?.includes('insufficient') || 
          errorData?.error?.message?.includes('scope') ||
          resp.status === 403) {
        await supabase
          .from('gmb_posts')
          .update({ status: 'failed', error_message: 'Insufficient authentication scopes', updated_at: new Date().toISOString() })
          .eq('id', post.id)
          .eq('user_id', user.id)
        return errorResponse('INSUFFICIENT_SCOPES', 'Insufficient permissions', 403)
      }

      await supabase
        .from('gmb_posts')
        .update({ status: 'failed', error_message: 'Publish failed', updated_at: new Date().toISOString() })
        .eq('id', post.id)
        .eq('user_id', user.id)
      return errorResponse('SYNC_FAILED', 'Failed to publish to Google', 502)
    }
    let data: any
    try { data = JSON.parse(text) } catch { data = { name: 'post' } }

    await supabase
      .from('gmb_posts')
      .update({ status: 'published', provider_post_id: data.name || null, published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', post.id)
      .eq('user_id', user.id)

    return NextResponse.json({ ok: true, google: data })
  } catch (e: any) {
    const errorCode = getErrorCode(e)
    console.error('[GMB Publish] Error:', e)
    return errorResponse(errorCode, 'Failed to publish', 500)
  }
}


