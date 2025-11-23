import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({
        success: false,
        error: 'Unauthorized - No user session',
      }, { status: 401 });
    }

    // Check GMB accounts for OAuth status
    const { data: accounts, error: accountsError } = await supabase
      .from('gmb_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (accountsError) {
      return Response.json({
        success: false,
        error: `Database error: ${accountsError.message}`,
        details: { accountsError },
      });
    }

    if (!accounts || accounts.length === 0) {
      return Response.json({
        success: false,
        details: {
          status: 'missing',
          message: 'No GMB account found for this user',
          user_id: user.id,
        },
      });
    }

    const account = accounts[0];
    const isActive = account.is_active;
    const hasRecentSync = account.last_sync ?
      (new Date(account.last_sync).getTime() > Date.now() - 24 * 60 * 60 * 1000) : false;

    return Response.json({
      success: isActive,
      details: {
        status: isActive ? 'active' : 'inactive',
        account_id: account.id,
        account_name: account.account_name,
        is_active: isActive,
        last_sync: account.last_sync,
        last_error: account.last_error,
        has_recent_sync: hasRecentSync,
        user_id: user.id,
      },
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
