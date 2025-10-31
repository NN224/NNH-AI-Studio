import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email, redirectTo } = await request.json()
    
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo || `${process.env.NEXT_PUBLIC_BASE_URL || 'https://nnh.ae'}/auth/reset-password`,
    })

    if (error) {
      console.error('[Send Reset Password] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ 
      message: 'Password reset email sent successfully',
      data
    })
  } catch (e: any) {
    console.error('[Send Reset Password] Unexpected error:', e)
    return NextResponse.json({ error: e.message || 'Failed to send reset password email' }, { status: 500 })
  }
}

