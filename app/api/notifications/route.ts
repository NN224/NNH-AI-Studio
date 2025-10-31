import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET - List notifications
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.eq('read', false)
    }

    const { data, error } = await query

    if (error) throw error

    // Get unread count
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)

    return NextResponse.json({
      notifications: data || [],
      unreadCount: count || 0
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch notifications' }, { status: 500 })
  }
}

// POST - Mark as read
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { notificationId, markAllAsRead } = await request.json()

    if (markAllAsRead) {
      // Mark all as read
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)

      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    if (notificationId) {
      // Mark one as read
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id)

      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Missing notificationId or markAllAsRead' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to update notification' }, { status: 500 })
  }
}

// DELETE - Delete notification
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const notificationId = request.nextUrl.searchParams.get('id')

    if (!notificationId) {
      return NextResponse.json({ error: 'Missing notification id' }, { status: 400 })
    }

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to delete notification' }, { status: 500 })
  }
}

