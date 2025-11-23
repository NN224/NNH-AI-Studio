import { createClient, createAdminClient } from '@/lib/supabase/server';

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

    // Test admin client access
    const adminClient = createAdminClient();

    // Attempt to query gmb_accounts with admin privileges
    const { data: accounts, error: accountsError } = await adminClient
      .from('gmb_accounts')
      .select('id, account_name, created_at')
      .limit(5);

    if (accountsError) {
      return Response.json({
        success: false,
        error: `Admin access failed: ${accountsError.message}`,
        details: {
          admin_privileges: false,
          error_code: accountsError.code,
          error_details: accountsError.details,
        },
      });
    }

    // Test other critical tables
    const { count: locationsCount, error: locationsError } = await adminClient
      .from('gmb_locations')
      .select('*', { count: 'exact', head: true });

    const { count: reviewsCount, error: reviewsError } = await adminClient
      .from('gmb_reviews')
      .select('*', { count: 'exact', head: true });

    return Response.json({
      success: true,
      details: {
        admin_privileges: true,
        service_role_key_configured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        accounts_accessible: !accountsError,
        accounts_count: accounts?.length || 0,
        sample_accounts: accounts?.map(a => ({ id: a.id, name: a.account_name })) || [],
        locations_count: locationsCount || 0,
        reviews_count: reviewsCount || 0,
        locations_accessible: !locationsError,
        reviews_accessible: !reviewsError,
      },
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
