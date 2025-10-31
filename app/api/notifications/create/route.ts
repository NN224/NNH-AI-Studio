import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Helper function to create notifications
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type, title, message, link, metadata } = await request.json()

    if (!type || !title || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('notifications')
      .insert({
        user_id: user.id,
        type,
        title,
        message,
        link: link || null,
        metadata: metadata || {},
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ notification: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to create notification' }, { status: 500 })
  }
}

