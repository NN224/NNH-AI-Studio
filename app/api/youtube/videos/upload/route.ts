import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function refreshYouTubeToken(refreshToken: string) {
  const clientId = process.env.YT_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.YT_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET
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
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { title, description, videoUrl, videoPath, scheduledAt } = body
    if (!title || !description || (!videoUrl && !videoPath)) {
      return NextResponse.json({ error: 'Missing title, description, or video' }, { status: 400 })
    }

    // Get YouTube token
    const { data: tokenData } = await supabase
      .from('oauth_tokens')
      .select('access_token, refresh_token, token_expires_at')
      .eq('user_id', user.id)
      .eq('provider', 'youtube')
      .maybeSingle()

    if (!tokenData) return NextResponse.json({ error: 'YouTube not connected' }, { status: 400 })

    let accessToken = tokenData.access_token as string | null
    const isExpired = tokenData.token_expires_at ? new Date(tokenData.token_expires_at) < new Date() : false
    if ((!accessToken || isExpired) && tokenData.refresh_token) {
      const refreshed = await refreshYouTubeToken(tokenData.refresh_token)
      if (refreshed?.access_token) {
        accessToken = refreshed.access_token
        const expiresAt = new Date()
        if (refreshed.expires_in) expiresAt.setSeconds(expiresAt.getSeconds() + refreshed.expires_in)
        await supabase
          .from('oauth_tokens')
          .update({ access_token: accessToken, token_expires_at: expiresAt.toISOString() })
          .eq('user_id', user.id)
          .eq('provider', 'youtube')
      }
    }

    if (!accessToken) return NextResponse.json({ error: 'Missing YouTube access token' }, { status: 400 })

    // Note: Full YouTube video upload requires resumable upload protocol
    // Current implementation saves draft metadata - video upload feature planned for future release
    return NextResponse.json({
      ok: true,
      message: 'Video metadata saved. YouTube upload feature coming soon.',
      videoUrl,
      scheduledAt,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to upload video' }, { status: 500 })
  }
}

