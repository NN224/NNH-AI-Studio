import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponse, successResponse } from '@/lib/utils/api-response'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  console.log('[GMB Disconnect API] Request received')
  
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('[GMB Disconnect API] Authentication failed:', authError)
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401)
    }

    console.log('[GMB Disconnect API] User authenticated:', user.id)

    const body = await request.json().catch(() => ({}))
    const accountId = body.accountId

    // If accountId is provided, disconnect specific account
    if (accountId) {
      console.log('[GMB Disconnect API] Disconnecting account:', accountId)
      
      // Verify account belongs to user first
      const { data: account, error: verifyError } = await supabase
        .from('gmb_accounts')
        .select('id, account_name')
        .eq('id', accountId)
        .eq('user_id', user.id)
        .single()

      if (verifyError || !account) {
        console.error('[GMB Disconnect API] Account not found or unauthorized:', verifyError)
        return errorResponse('NOT_FOUND', 'Account not found or access denied', 404)
      }

      const { error } = await supabase
        .from('gmb_accounts')
        .update({ 
          is_active: false,
          disconnected_at: new Date().toISOString(),
          access_token: null,
          refresh_token: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', accountId)
        .eq('user_id', user.id)

      if (error) {
        console.error('[GMB Disconnect API] Error disconnecting account:', error)
        return errorResponse('DISCONNECT_ERROR', error.message || 'Failed to disconnect account', 500)
      }

      console.log('[GMB Disconnect API] Account disconnected successfully:', accountId)
      return successResponse({ 
        success: true,
        message: 'Account disconnected successfully' 
      })
    }

    // If no accountId, disconnect all accounts for this user
    console.log('[GMB Disconnect API] Disconnecting all accounts for user:', user.id)
    
    const { error } = await supabase
      .from('gmb_accounts')
      .update({ 
        is_active: false,
        disconnected_at: new Date().toISOString(),
        access_token: null,
        refresh_token: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (error) {
      console.error('[GMB Disconnect API] Error disconnecting all accounts:', error)
      return errorResponse('DISCONNECT_ERROR', error.message || 'Failed to disconnect all accounts', 500)
    }

    console.log('[GMB Disconnect API] All accounts disconnected successfully')
    return successResponse({ 
      success: true,
      message: 'All GMB accounts disconnected successfully' 
    })
  } catch (error: any) {
    console.error('[GMB Disconnect API] Unexpected error:', error)
    return errorResponse('INTERNAL_ERROR', error?.message || 'Failed to disconnect GMB account', 500)
  }
}

