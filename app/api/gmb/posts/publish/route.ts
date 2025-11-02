import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { postId } = await request.json()
    if (!postId) return NextResponse.json({ error: 'Missing postId' }, { status: 400 })

    // Load post + location + account
    const { data: post, error: postErr } = await supabase
      .from('gmb_posts')
      .select('id, user_id, location_id, title, content, media_url, call_to_action, call_to_action_url, scheduled_at, post_type')
      .eq('id', postId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (postErr || !post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    // Validate: Event and Offer posts cannot be published
    if (post.post_type === 'event' || post.post_type === 'offer') {
      return NextResponse.json({ 
        error: 'Event and Offer posts cannot be published to Google. Google Business Profile API only supports "What\'s New" posts.',
        code: 'UNSUPPORTED_POST_TYPE'
      }, { status: 400 })
    }

    const { data: location } = await supabase
      .from('gmb_locations')
      .select('id, location_id, gmb_account_id')
      .eq('id', post.location_id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!location) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

    const { data: account } = await supabase
      .from('gmb_accounts')
      .select('id, account_id, access_token, refresh_token, token_expires_at')
      .eq('id', location.gmb_account_id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

    let accessToken = account.access_token as string | null
    // Refresh token if expired
    const isExpired = account.token_expires_at ? new Date(account.token_expires_at) < new Date() : false
    if ((!accessToken || isExpired) && account.refresh_token) {
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
      }
    }

    if (!accessToken) return NextResponse.json({ error: 'Missing Google access token' }, { status: 400 })

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
          .update({ status: 'failed', error_message: 'Insufficient authentication scopes. Please reconnect your GMB account.', updated_at: new Date().toISOString() })
          .eq('id', post.id)
          .eq('user_id', user.id)
        return NextResponse.json({ 
          error: 'Insufficient authentication scopes. Please reconnect your Google Business Profile account with the required permissions.',
          code: 'INSUFFICIENT_SCOPES',
          requiresReconnect: true
        }, { status: 403 })
      }

      await supabase
        .from('gmb_posts')
        .update({ status: 'failed', error_message: text, updated_at: new Date().toISOString() })
        .eq('id', post.id)
        .eq('user_id', user.id)
      return NextResponse.json({ error: 'Google publish failed', details: text }, { status: 502 })
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
    return NextResponse.json({ error: e?.message || 'Failed to publish' }, { status: 500 })
  }
}


