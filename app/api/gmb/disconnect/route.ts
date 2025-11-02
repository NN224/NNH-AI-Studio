import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponse, successResponse } from '@/lib/utils/api-response'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401)
    }

    const body = await request.json().catch(() => ({}))
    const accountId = body.accountId

    // If accountId is provided, disconnect specific account
    if (accountId) {
      const { error } = await supabase
        .from('gmb_accounts')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', accountId)
        .eq('user_id', user.id) // Ensure only the owner can disconnect

      if (error) {
        console.error('[GMB Disconnect] Error disconnecting account:', error)
        return errorResponse('DISCONNECT_ERROR', error.message || 'Failed to disconnect account', 500)
      }

      return successResponse({ 
        message: 'Account disconnected successfully' 
      })
    }

    // If no accountId, disconnect all accounts for this user
    const { error } = await supabase
      .from('gmb_accounts')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (error) {
      console.error('[GMB Disconnect] Error disconnecting all accounts:', error)
      return errorResponse('DISCONNECT_ERROR', error.message || 'Failed to disconnect all accounts', 500)
    }

    return successResponse({ 
      message: 'All GMB accounts disconnected successfully' 
    })
  } catch (error: any) {
    console.error('[GMB Disconnect] Unexpected error:', error)
    return errorResponse('INTERNAL_ERROR', error?.message || 'Failed to disconnect GMB account', 500)
  }
}

