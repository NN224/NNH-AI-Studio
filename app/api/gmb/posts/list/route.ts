import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Try to select all columns, but handle missing columns gracefully
    let selectColumns = 'id, location_id, title, content, status, scheduled_at, published_at, created_at'
    
    // Try to add optional columns (they might not exist yet if migration hasn't run)
    // First check if columns exist by trying to select them
    const { data, error } = await supabase
      .from('gmb_posts')
      .select(selectColumns + ', post_type, metadata')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      // If post_type or metadata don't exist, try without them
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.warn('[GMB Posts API] Some columns missing, falling back to basic columns:', error.message)
        
        // Retry with basic columns only
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('gmb_posts')
          .select(selectColumns)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50)
        
        if (fallbackError) {
          console.error('[GMB Posts API] Database error:', fallbackError)
          return NextResponse.json({ 
            error: 'Database schema mismatch. Please run the migration: 20251031_gmb_posts.sql',
            details: fallbackError.message 
          }, { status: 500 })
        }
        
        // Return data with default values for missing columns
        return NextResponse.json({ 
          items: (fallbackData || []).map((post: any) => ({
            ...post,
            post_type: 'whats_new',
            metadata: null
          }))
        })
      }
      
      console.error('[GMB Posts API] Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ items: data || [] })
  } catch (e:any) {
    console.error('[GMB Posts API] Unexpected error:', e)
    return NextResponse.json({ error: e.message || 'Failed to list posts' }, { status: 500 })
  }
}


