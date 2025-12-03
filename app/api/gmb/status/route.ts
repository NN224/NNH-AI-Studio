// GMB Status API - Returns connection status for authenticated user
import { createClient } from '@/lib/supabase/server'
import { gmbLogger, toError } from '@/lib/utils/logger'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First, try to fetch active GMB account
    let { data: account, error: dbError } = await supabase
      .from('gmb_accounts')
      .select(
        'id, account_id, account_name, email, is_active, last_sync, created_at, token_expires_at',
      )
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    // If no active account found, check for any account
    if (!account || (dbError && dbError.code === 'PGRST116')) {
      const { data: inactiveAccount } = await supabase
        .from('gmb_accounts')
        .select(
          'id, account_id, account_name, email, is_active, last_sync, created_at, token_expires_at',
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      // Auto-activate if we found an account (tokens are stored in gmb_secrets)
      if (inactiveAccount) {
        // Auto-activate the account
        const { error: updateError } = await supabase
          .from('gmb_accounts')
          .update({ is_active: true })
          .eq('id', inactiveAccount.id)

        if (!updateError) {
          account = { ...inactiveAccount, is_active: true }
          gmbLogger.warn('Auto-activated inactive account', {
            accountId: inactiveAccount.id,
            userId: user.id,
          })
        } else {
          gmbLogger.error('Failed to auto-activate account', toError(updateError), {
            accountId: inactiveAccount.id,
            userId: user.id,
          })
        }
      }
    } else if (dbError && dbError.code !== 'PGRST116') {
      gmbLogger.error('Failed to fetch GMB status', toError(dbError), { userId: user.id })
      return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 })
    }

    // Also check if user has locations (for better status reporting)
    const { count: locationsCount } = await supabase
      .from('gmb_locations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    // Return status object matching GMBStatus interface
    const status = {
      connected: !!account,
      activeAccount: account
        ? {
            id: account.id,
            name: account.account_name || account.email || 'GMB Account',
            accountName: account.account_name || '',
            state: 'VERIFIED',
            type: 'PERSONAL',
            is_active: account.is_active,
          }
        : null,
      lastSync: account?.last_sync || null,
      hasLocations: (locationsCount || 0) > 0,
      locationsCount: locationsCount || 0,
    }

    return NextResponse.json(status)
  } catch (error: unknown) {
    gmbLogger.error('Unexpected error in GMB status endpoint', toError(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
