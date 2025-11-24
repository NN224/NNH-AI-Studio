import { createClient } from '@/lib/supabase/server';
import { getValidAccessToken, GMB_CONSTANTS, buildLocationResourceName } from '@/lib/gmb/helpers';

/**
 * GMB API Connectivity Test
 * Tests all major GMB API endpoints to ensure full connectivity
 */
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

    // Get GMB account
    const { data: account, error: accountError } = await supabase
      .from('gmb_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (accountError || !account) {
      return Response.json({
        success: false,
        error: 'No active GMB account found',
        details: { accountError: accountError?.message },
      });
    }

    // Get access token
    let accessToken: string;
    try {
      accessToken = await getValidAccessToken(supabase, account.id);
    } catch (error) {
      return Response.json({
        success: false,
        error: 'Failed to get valid access token',
        details: { token_error: error instanceof Error ? error.message : 'Unknown error' },
      });
    }

    // Get a test location for location-specific tests
    const { data: location } = await supabase
      .from('gmb_locations')
      .select('id, location_id, account_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    const apiTests = {
      accounts: { success: false, error: null as string | null, response_time_ms: 0 },
      locations: { success: false, error: null as string | null, response_time_ms: 0 },
      reviews: { success: false, error: null as string | null, response_time_ms: 0 },
      questions: { success: false, error: null as string | null, response_time_ms: 0 },
      posts: { success: false, error: null as string | null, response_time_ms: 0 },
      media: { success: false, error: null as string | null, response_time_ms: 0 },
      insights: { success: false, error: null as string | null, response_time_ms: 0 },
    };

    // Test 1: Accounts API
    try {
      const startTime = Date.now();
      const response = await fetch(`${GMB_CONSTANTS.BUSINESS_INFORMATION_BASE}/accounts`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      apiTests.accounts.response_time_ms = Date.now() - startTime;
      apiTests.accounts.success = response.ok;
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        apiTests.accounts.error = errorData.error?.message || `HTTP ${response.status}`;
      }
    } catch (error) {
      apiTests.accounts.error = error instanceof Error ? error.message : 'Unknown error';
    }

    // Only test location-specific endpoints if we have a location
    if (location && location.location_id && location.account_id) {
      const locationName = buildLocationResourceName(location.account_id, location.location_id);

      // Test 2: Locations API
      try {
        const startTime = Date.now();
        const response = await fetch(
          `${GMB_CONSTANTS.BUSINESS_INFORMATION_BASE}/${locationName}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        apiTests.locations.response_time_ms = Date.now() - startTime;
        apiTests.locations.success = response.ok;
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          apiTests.locations.error = errorData.error?.message || `HTTP ${response.status}`;
        }
      } catch (error) {
        apiTests.locations.error = error instanceof Error ? error.message : 'Unknown error';
      }

      // Test 3: Reviews API
      try {
        const startTime = Date.now();
        const response = await fetch(
          `${GMB_CONSTANTS.BUSINESS_INFORMATION_BASE}/${locationName}/reviews?pageSize=1`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        apiTests.reviews.response_time_ms = Date.now() - startTime;
        apiTests.reviews.success = response.ok;
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          apiTests.reviews.error = errorData.error?.message || `HTTP ${response.status}`;
        }
      } catch (error) {
        apiTests.reviews.error = error instanceof Error ? error.message : 'Unknown error';
      }

      // Test 4: Questions API
      try {
        const startTime = Date.now();
        const response = await fetch(
          `${GMB_CONSTANTS.QANDA_BASE}/${locationName}/questions?pageSize=1`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        apiTests.questions.response_time_ms = Date.now() - startTime;
        apiTests.questions.success = response.ok;
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          apiTests.questions.error = errorData.error?.message || `HTTP ${response.status}`;
        }
      } catch (error) {
        apiTests.questions.error = error instanceof Error ? error.message : 'Unknown error';
      }

      // Test 5: Posts API (Local Posts)
      try {
        const startTime = Date.now();
        const response = await fetch(
          `${GMB_CONSTANTS.BUSINESS_INFORMATION_BASE}/${locationName}/localPosts?pageSize=1`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        apiTests.posts.response_time_ms = Date.now() - startTime;
        apiTests.posts.success = response.ok;
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          apiTests.posts.error = errorData.error?.message || `HTTP ${response.status}`;
        }
      } catch (error) {
        apiTests.posts.error = error instanceof Error ? error.message : 'Unknown error';
      }

      // Test 6: Media API
      try {
        const startTime = Date.now();
        const response = await fetch(
          `${GMB_CONSTANTS.BUSINESS_INFORMATION_BASE}/${locationName}/media?pageSize=1`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        apiTests.media.response_time_ms = Date.now() - startTime;
        apiTests.media.success = response.ok;
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          apiTests.media.error = errorData.error?.message || `HTTP ${response.status}`;
        }
      } catch (error) {
        apiTests.media.error = error instanceof Error ? error.message : 'Unknown error';
      }

      // Test 7: Insights API (Performance Metrics)
      try {
        const startTime = Date.now();
        const response = await fetch(
          `${GMB_CONSTANTS.BUSINESS_INFORMATION_BASE}/${locationName}:fetchInsights`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              insightTypes: ['INSIGHT_TYPE_UNSPECIFIED'],
            }),
          }
        );
        apiTests.insights.response_time_ms = Date.now() - startTime;
        apiTests.insights.success = response.ok;
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          apiTests.insights.error = errorData.error?.message || `HTTP ${response.status}`;
        }
      } catch (error) {
        apiTests.insights.error = error instanceof Error ? error.message : 'Unknown error';
      }
    } else {
      apiTests.locations.error = 'No active location found';
      apiTests.reviews.error = 'No active location found';
      apiTests.questions.error = 'No active location found';
      apiTests.posts.error = 'No active location found';
      apiTests.media.error = 'No active location found';
      apiTests.insights.error = 'No active location found';
    }

    const totalTests = Object.keys(apiTests).length;
    const passedTests = Object.values(apiTests).filter(test => test.success).length;
    const allPassed = passedTests === totalTests;
    const avgResponseTime = Math.round(
      Object.values(apiTests).reduce((sum, test) => sum + test.response_time_ms, 0) / totalTests
    );

    return Response.json({
      success: allPassed,
      details: {
        connectivity_status: allPassed ? 'all_apis_accessible' : 'some_apis_failed',
        total_tests: totalTests,
        passed_tests: passedTests,
        failed_tests: totalTests - passedTests,
        average_response_time_ms: avgResponseTime,
        api_tests: apiTests,
        test_location: location ? {
          id: location.id,
          location_id: location.location_id,
        } : null,
        account_id: account.id,
      },
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
