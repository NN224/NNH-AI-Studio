import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/notifications/clear-all
 * Delete all user notifications
 */
export async function DELETE(_request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 },
      )
    }

    // Delete all notifications for this user
    const { error } = await supabase.from('notifications').delete().eq('user_id', user.id)

    if (error) {
      console.error('[Notifications API] Error clearing all:', error)
      return NextResponse.json({ error: 'Failed to clear all notifications' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'All notifications cleared successfully',
    })
  } catch (error) {
    console.error('[Notifications API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
