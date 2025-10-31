import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

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

    // Use admin client to send invitation (bypasses RLS)
    const adminClient = createAdminClient()
    
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectTo || `${process.env.NEXT_PUBLIC_BASE_URL || 'https://nnh.ae'}/auth/login`,
      data: {
        invited_by: user.email,
      }
    })

    if (error) {
      console.error('[Send Invite] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ 
      message: 'Invitation sent successfully',
      user: data
    })
  } catch (e: any) {
    console.error('[Send Invite] Unexpected error:', e)
    return NextResponse.json({ error: e.message || 'Failed to send invitation' }, { status: 500 })
  }
}

