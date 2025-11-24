import { createClient } from '@/lib/supabase/server';
import { getValidAccessToken, GMB_CONSTANTS } from '@/lib/gmb/helpers';

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

    // ✅ NEW: Test actual Google API connectivity
    let googleApiTest = {
      success: false,
      error: null as string | null,
      response_time_ms: 0,
      accounts_accessible: false,
      token_valid: false,
    };

    if (isActive && account.id) {
      try {
        const startTime = Date.now();

        // Get valid access token (auto-refreshes if needed)
        const accessToken = await getValidAccessToken(supabase, account.id);

        // Test actual Google API call - fetch accounts
        const response = await fetch(`${GMB_CONSTANTS.BUSINESS_INFORMATION_BASE}/accounts`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        googleApiTest.response_time_ms = Date.now() - startTime;
        googleApiTest.token_valid = response.ok;
        googleApiTest.accounts_accessible = response.ok;

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          googleApiTest.error = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
          googleApiTest.success = false;
        } else {
          const data = await response.json();
          googleApiTest.success = true;
          googleApiTest.error = null;
        }
      } catch (error) {
        googleApiTest.error = error instanceof Error ? error.message : 'Unknown error';
        googleApiTest.success = false;
      }
    } else {
      googleApiTest.error = 'Account is inactive';
    }

    return Response.json({
      success: isActive && googleApiTest.success,
      details: {
        status: isActive && googleApiTest.success ? 'active' : 'inactive',
        account_id: account.id,
        account_name: account.account_name,
        is_active: isActive,
        last_sync: account.last_sync,
        last_error: account.last_error,
        has_recent_sync: hasRecentSync,
        user_id: user.id,
        google_api_test: googleApiTest,
        token_expires_at: account.token_expires_at,
      },
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
