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

    const adminClient = createAdminClient();
    const issues: string[] = [];
    const checks: Record<string, boolean> = {};

    // Check 1: Verify gmb_accounts have valid user_id
    const { data: accounts, error: accountsError } = await adminClient
      .from('gmb_accounts')
      .select('id, user_id')
      .eq('user_id', user.id);

    if (accountsError) {
      issues.push(`Failed to query gmb_accounts: ${accountsError.message}`);
      checks.accounts_have_user_id = false;
    } else {
      const invalidAccounts = accounts?.filter(acc => !acc.user_id) || [];
      checks.accounts_have_user_id = invalidAccounts.length === 0;
      if (invalidAccounts.length > 0) {
        issues.push(`Found ${invalidAccounts.length} accounts without user_id`);
      }
    }

    // Check 2: Verify locations have matching account_id
    const { data: locations, error: locationsError } = await supabase
      .from('gmb_locations')
      .select('id, account_id')
      .eq('user_id', user.id);

    if (locationsError) {
      issues.push(`Failed to query gmb_locations: ${locationsError.message}`);
      checks.locations_have_account_id = false;
    } else {
      const invalidLocations = locations?.filter(loc => !loc.account_id) || [];
      checks.locations_have_account_id = invalidLocations.length === 0;
      if (invalidLocations.length > 0) {
        issues.push(`Found ${invalidLocations.length} locations without account_id`);
      }

      // Check for orphan locations (account_id doesn't exist)
      if (accounts && locations) {
        const accountIds = new Set(accounts.map(acc => acc.id));
        const orphanLocations = locations.filter(loc => loc.account_id && !accountIds.has(loc.account_id));
        checks.no_orphan_locations = orphanLocations.length === 0;
        if (orphanLocations.length > 0) {
          issues.push(`Found ${orphanLocations.length} orphan locations (account_id doesn't exist)`);
        }
      }
    }

    // Check 3: Verify reviews have matching location_id
    const { data: reviews, error: reviewsError } = await supabase
      .from('gmb_reviews')
      .select('id, location_id')
      .eq('user_id', user.id)
      .limit(1000);

    if (reviewsError) {
      issues.push(`Failed to query gmb_reviews: ${reviewsError.message}`);
      checks.reviews_have_location_id = false;
    } else {
      const invalidReviews = reviews?.filter(rev => !rev.location_id) || [];
      checks.reviews_have_location_id = invalidReviews.length === 0;
      if (invalidReviews.length > 0) {
        issues.push(`Found ${invalidReviews.length} reviews without location_id`);
      }

      // Check for orphan reviews
      if (locations && reviews) {
        const locationIds = new Set(locations.map(loc => loc.id));
        const orphanReviews = reviews.filter(rev => rev.location_id && !locationIds.has(rev.location_id));
        checks.no_orphan_reviews = orphanReviews.length === 0;
        if (orphanReviews.length > 0) {
          issues.push(`Found ${orphanReviews.length} orphan reviews (location_id doesn't exist)`);
        }
      }
    }

    // Check 4: Verify user profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    checks.user_profile_exists = !profileError && !!profile;
    if (profileError || !profile) {
      issues.push('User profile is missing or inaccessible');
    }

    const allChecksPass = Object.values(checks).every(check => check === true);

    return Response.json({
      success: allChecksPass,
      details: {
        integrity_status: allChecksPass ? 'healthy' : 'issues_found',
        checks,
        issues,
        total_checks: Object.keys(checks).length,
        passed_checks: Object.values(checks).filter(v => v === true).length,
        failed_checks: Object.values(checks).filter(v => v === false).length,
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
