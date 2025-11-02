import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponse, successResponse } from '@/lib/utils/api-response'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401)
    }

    // First get active GMB account IDs to filter locations
    const { data: activeAccounts } = await supabase
      .from('gmb_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)

    const activeAccountIds = activeAccounts?.map(acc => acc.id) || []

    if (activeAccountIds.length === 0) {
      // No active accounts, return empty list
      return successResponse({ items: [] })
    }

    // Get active location IDs
    const { data: activeLocations } = await supabase
      .from('gmb_locations')
      .select('id')
      .eq('user_id', user.id)
      .in('gmb_account_id', activeAccountIds)

    const activeLocationIds = activeLocations?.map(loc => loc.id) || []

    if (activeLocationIds.length === 0) {
      // No active locations, return empty list
      return successResponse({ items: [] })
    }

    // Try to select all columns, but handle missing columns gracefully
    let selectColumns = 'id, location_id, title, content, status, scheduled_at, published_at, created_at'
    
    // Try to add optional columns (they might not exist yet if migration hasn't run)
    // First check if columns exist by trying to select them
    const { data, error } = await supabase
      .from('gmb_posts')
      .select(selectColumns + ', post_type, metadata')
      .eq('user_id', user.id)
      .in('location_id', activeLocationIds)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      // If post_type or metadata don't exist, try without them
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.error('[GMB Posts API] Some columns missing, falling back to basic columns:', error.message)
        
        // Retry with basic columns only
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('gmb_posts')
          .select(selectColumns)
          .eq('user_id', user.id)
          .in('location_id', activeLocationIds)
          .order('created_at', { ascending: false })
          .limit(50)
        
        if (fallbackError) {
          console.error('[GMB Posts API] Database error:', fallbackError)
          return errorResponse(
            'DATABASE_ERROR',
            'Database schema mismatch. Please run the migration: 20251031_gmb_posts.sql',
            500,
            fallbackError.message
          )
        }
        
        // Return data with default values for missing columns
        return successResponse({ 
          items: (fallbackData || []).map((post: any) => ({
            ...post,
            post_type: 'whats_new',
            metadata: null
          }))
        })
      }
      
      console.error('[GMB Posts API] Database error:', error)
      return errorResponse('DATABASE_ERROR', 'Failed to fetch posts', 500, error.message)
    }
    
    return successResponse({ items: data || [] })
  } catch (e:any) {
    console.error('[GMB Posts API] Unexpected error:', e)
    return errorResponse('INTERNAL_ERROR', 'Failed to list posts', 500)
  }
}


