import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponse, successResponse } from '@/lib/utils/api-response'
import { logAction } from '@/lib/monitoring/audit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  console.warn('[GMB Disconnect API] Request received')
  
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('[GMB Disconnect API] Authentication failed:', authError)
      await logAction('gmb_disconnect', 'gmb_account', 'N/A', {
        status: 'failed',
        error: authError?.message || 'Unauthorized',
      })
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401)
    }

    console.warn('[GMB Disconnect API] User authenticated:', user.id)

    const body = await request.json().catch(() => ({}))
    const accountId = body.accountId

    // If accountId is provided, disconnect specific account
    if (accountId) {
      console.warn('[GMB Disconnect API] Disconnecting account:', accountId)
      
      // Verify account belongs to user first
      const { data: account, error: verifyError } = await supabase
        .from('gmb_accounts')
        .select('id, account_name')
        .eq('id', accountId)
        .eq('user_id', user.id)
        .single()

      if (verifyError || !account) {
        console.error('[GMB Disconnect API] Account not found or unauthorized:', verifyError)
        await logAction('gmb_disconnect', 'gmb_account', accountId, {
          status: 'failed',
          error: verifyError?.message || 'Account not found',
        })
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
        await logAction('gmb_disconnect', 'gmb_account', accountId, {
          status: 'failed',
          error: error.message,
        })
        return errorResponse('DISCONNECT_ERROR', error.message || 'Failed to disconnect account', 500)
      }

      console.warn('[GMB Disconnect API] Account disconnected successfully:', accountId)
      console.warn('[GMB Disconnect API] Triggering dashboard refresh event')
      await logAction('gmb_disconnect', 'gmb_account', accountId, {
        status: 'success',
        scope: 'single',
        account_name: account.account_name,
      })
      return successResponse({ 
        success: true,
        message: 'Account disconnected successfully, dashboard refresh triggered' 
      })
    }

    // If no accountId, disconnect all accounts for this user
    console.warn('[GMB Disconnect API] Disconnecting all accounts for user:', user.id)
    
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
      await logAction('gmb_disconnect', 'gmb_account', 'bulk', {
        status: 'failed',
        error: error.message,
      })
      return errorResponse('DISCONNECT_ERROR', error.message || 'Failed to disconnect all accounts', 500)
    }

    console.warn('[GMB Disconnect API] All accounts disconnected successfully')
    console.warn('[GMB Disconnect API] Triggering dashboard refresh event for all accounts')
    await logAction('gmb_disconnect', 'gmb_account', 'bulk', {
      status: 'success',
      scope: 'all_accounts',
    })
    return successResponse({ 
      success: true,
      message: 'All GMB accounts disconnected successfully, dashboard refresh triggered' 
    })
  } catch (error: any) {
    console.error('[GMB Disconnect API] Unexpected error:', error)
    await logAction('gmb_disconnect', 'gmb_account', 'N/A', {
      status: 'failed',
      error: error?.message || 'Unexpected error',
    })
    return errorResponse('INTERNAL_ERROR', error?.message || 'Failed to disconnect GMB account', 500)
  }
}
