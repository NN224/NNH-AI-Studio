import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { resolveTokenValue } from '@/lib/security/encryption';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get account details
    const { data: account, error: accountError } = await supabase
      .from('gmb_accounts')
      .select('access_token, refresh_token, token_expires_at')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Account not found' 
      }, { status: 404 });
    }

    // Check token validity
    const now = new Date();
    const expiresAt = account.token_expires_at ? new Date(account.token_expires_at) : null;

    // Decrypt tokens - if decryption fails, account needs reconnection
    let accessToken: string | null;
    let refreshToken: string | null;

    try {
      accessToken = resolveTokenValue(account.access_token, { context: `gmb_accounts.access_token:${accountId}` });
      refreshToken = resolveTokenValue(account.refresh_token, { context: `gmb_accounts.refresh_token:${accountId}` });
    } catch (error) {
      console.error('[Validate Token] Token decryption failed for account:', accountId);

      // Mark account as inactive - requires reconnection
      await supabase
        .from('gmb_accounts')
        .update({
          is_active: false,
          last_error: 'Token decryption failed - reconnection required',
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountId);

      return NextResponse.json({
        valid: false,
        canRefresh: false,
        needsReconnection: true,
        error: 'Token decryption failed. Please reconnect your Google account. ' +
               'فشل فك تشفير الرمز. يُرجى إعادة توصيل حساب Google الخاص بك.',
      }, { status: 401 });
    }

    const valid = !!(
      accessToken && 
      refreshToken &&
      (!expiresAt || expiresAt > now)
    );

    const expiresIn = expiresAt ? Math.floor((expiresAt.getTime() - now.getTime()) / 1000) : null;
    const canRefresh = !!refreshToken;

    // If token is expired but we have refresh token, attempt refresh
    if (!valid && canRefresh) {
      // In a real implementation, we would refresh the token here
      return NextResponse.json({
        valid: false,
        canRefresh: true,
        needsRefresh: true,
        expiresIn: 0
      });
    }

    return NextResponse.json({
      valid,
      canRefresh,
      expiresIn,
      needsRefresh: expiresIn !== null && expiresIn < 3600 // Less than 1 hour
    });

  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json(
      { error: 'Validation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
