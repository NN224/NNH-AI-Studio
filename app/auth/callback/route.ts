import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const state = requestUrl.searchParams.get('state')

  if (code) {
    const supabase = await createClient()
    
    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=${encodeURIComponent(error.message)}`)
    }

    // Redirect to accounts page with success
    return NextResponse.redirect(`${requestUrl.origin}/accounts#success=true`)
  }

  // Handle OAuth callback from Google
  if (state) {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=no_session`)
    }

    // Call google-oauth-callback Edge Function
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/google-oauth-callback${requestUrl.search}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return NextResponse.redirect(
          `${requestUrl.origin}/accounts#error=${encodeURIComponent(errorData.error || 'OAuth callback failed')}`
        )
      }

      return NextResponse.redirect(`${requestUrl.origin}/accounts#success=true&autosync=true`)
    } catch (error: any) {
      return NextResponse.redirect(
        `${requestUrl.origin}/accounts#error=${encodeURIComponent(error.message || 'OAuth callback failed')}`
      )
    }
  }

  return NextResponse.redirect(requestUrl.origin)
}
