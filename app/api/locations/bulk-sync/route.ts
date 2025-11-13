// Bulk Sync Locations API
// Syncs multiple locations (reviews, media, questions, metrics) from Google My Business

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { GMB_CONSTANTS } from '@/lib/gmb/helpers';

export const dynamic = 'force-dynamic';

/**
 * Get valid access token for a GMB account
 */
async function getValidAccessToken(
  supabase: any,
  accountId: string
): Promise<string> {
  const { data: account, error } = await supabase
    .from('gmb_accounts')
    .select('access_token, refresh_token, token_expires_at, expires_at, account_id')
    .eq('id', accountId)
    .single();

  if (error || !account) {
    throw new Error(`Account not found: ${accountId}`);
  }

  // Check if token is expired (prefer token_expires_at but fall back to legacy expires_at)
  const now = Date.now();
  const expiresAt =
    account.token_expires_at
      ? new Date(account.token_expires_at).getTime()
      : account.expires_at
      ? new Date(account.expires_at).getTime()
      : 0;

  if (expiresAt && expiresAt > now) {
    return account.access_token;
  }

  // Token expired, refresh it
  console.log('[Bulk Sync] Refreshing access token for account:', accountId);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: account.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Failed to refresh token: ${errorData.error || 'Unknown error'}`);
  }

  const tokens = await response.json();
  const newExpiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

  // Update token in database
  await supabase
    .from('gmb_accounts')
    .update({
      access_token: tokens.access_token,
      token_expires_at: newExpiresAt.toISOString(),
      // keep legacy column in sync if it still exists
      expires_at: newExpiresAt.toISOString(),
    })
    .eq('id', accountId);

  return tokens.access_token;
}

/**
 * Fetch reviews for a location
 */
async function fetchReviews(
  accessToken: string,
  locationResource: string,
  accountResource: string,
  pageToken?: string
): Promise<{ reviews: any[]; nextPageToken?: string }> {
  const url = new URL(`${GMB_CONSTANTS.GBP_LOC_BASE}/${locationResource}/reviews`);
  url.searchParams.set('pageSize', '50');
  if (pageToken) {
    url.searchParams.set('pageToken', pageToken);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Failed to fetch reviews: ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return {
    reviews: data.reviews || [],
    nextPageToken: data.nextPageToken,
  };
}

/**
 * Fetch media for a location
 */
async function fetchMedia(
  accessToken: string,
  locationResource: string,
  accountResource: string,
  pageToken?: string
): Promise<{ media: any[]; nextPageToken?: string }> {
  const url = new URL(`${GMB_CONSTANTS.GBP_LOC_BASE}/${locationResource}/media`);
  url.searchParams.set('pageSize', '50');
  if (pageToken) {
    url.searchParams.set('pageToken', pageToken);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Failed to fetch media: ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return {
    media: data.mediaItems || [],
    nextPageToken: data.nextPageToken,
  };
}

/**
 * Sync a single location (reviews, media, questions, metrics)
 */
async function syncLocation(
  supabase: any,
  location: any,
  account: any,
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Build full location resource name
    let fullLocationName = location.location_id;
    if (!fullLocationName.startsWith('accounts/')) {
      if (fullLocationName.startsWith('locations/')) {
        const locationIdOnly = fullLocationName.replace(/^locations\//, '');
        fullLocationName = `${account.account_id}/locations/${locationIdOnly}`;
      } else {
        fullLocationName = `${account.account_id}/locations/${fullLocationName}`;
      }
    }

    if (!fullLocationName.includes('/locations/')) {
      return { success: false, error: 'Invalid location resource format' };
    }

    // Sync reviews
    let reviewsNextPageToken: string | undefined = undefined;
    let totalReviews = 0;
    do {
      const { reviews, nextPageToken } = await fetchReviews(
        accessToken,
        fullLocationName,
        account.account_id,
        reviewsNextPageToken
      );

      if (reviews.length > 0) {
        const reviewRows = reviews.map((review: any) => ({
          location_id: location.id,
          review_id: review.name,
          reviewer_name: review.reviewer?.displayName || 'Anonymous',
          reviewer_photo_uri: review.reviewer?.profilePhotoUrl || null,
          star_rating: review.starRating || 0,
          comment: review.review_text || null,
          create_time: review.createTime || new Date().toISOString(),
          update_time: review.updateTime || new Date().toISOString(),
          reply: review.reviewReply || null,
          reply_time: review.reviewReply?.updateTime || null,
          user_id: location.user_id,
        }));

        const { error: reviewsError } = await supabase
          .from('gmb_reviews')
          .upsert(reviewRows, { onConflict: 'review_id' });

        if (reviewsError) {
          console.error(`[Bulk Sync] Error upserting reviews for location ${location.id}:`, reviewsError);
        } else {
          totalReviews += reviews.length;
        }
      }

      reviewsNextPageToken = nextPageToken;
    } while (reviewsNextPageToken);

    // Sync media
    let mediaNextPageToken: string | undefined = undefined;
    let totalMedia = 0;
    do {
      const { media, nextPageToken } = await fetchMedia(
        accessToken,
        fullLocationName,
        account.account_id,
        mediaNextPageToken
      );

      if (media.length > 0) {
        const mediaRows = media.map((item: any) => ({
          location_id: location.id,
          media_id: item.name,
          media_format: item.mediaFormat || 'PHOTO',
          source_url: item.sourceUrl || null,
          thumbnail_url: item.googleUrl || null,
          create_time: item.createTime || new Date().toISOString(),
          user_id: location.user_id,
        }));

        const { error: mediaError } = await supabase
          .from('gmb_media')
          .upsert(mediaRows, { onConflict: 'media_id' });

        if (mediaError) {
          console.error(`[Bulk Sync] Error upserting media for location ${location.id}:`, mediaError);
        } else {
          totalMedia += media.length;
        }
      }

      mediaNextPageToken = nextPageToken;
    } while (mediaNextPageToken);

    // Update location metadata with last sync time
    await supabase
      .from('gmb_locations')
      .update({
        metadata: {
          ...(location.metadata || {}),
          last_sync: new Date().toISOString(),
          last_reviews_count: totalReviews,
          last_media_count: totalMedia,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', location.id);

    return { success: true };
  } catch (error: any) {
    console.error(`[Bulk Sync] Error syncing location ${location.id}:`, error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Bulk Sync Handler
 * Syncs multiple locations (reviews, media) from Google My Business
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // ✅ SECURITY: Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Authentication required. Please log in again.',
          code: 'AUTH_REQUIRED'
        },
        { status: 401 }
      );
    }

    // ✅ SECURITY: Rate limiting (stricter for bulk operations)
    const { success, headers: rateLimitHeaders } = await checkRateLimit(user.id);
    if (!success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retry_after: rateLimitHeaders['X-RateLimit-Reset']
        },
        {
          status: 429,
          headers: rateLimitHeaders as HeadersInit
        }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Request body must be valid JSON',
          code: 'INVALID_JSON'
        },
        { status: 400 }
      );
    });

    if (body instanceof NextResponse) {
      return body;
    }

    const { locationIds } = body;

    // ✅ SECURITY: Input validation
    if (!Array.isArray(locationIds) || locationIds.length === 0) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          message: 'locationIds must be a non-empty array',
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }

    // ✅ SECURITY: Limit bulk operations
    if (locationIds.length > 50) {
      return NextResponse.json(
        {
          error: 'Too many locations',
          message: 'Maximum 50 locations allowed per bulk sync operation',
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }

    // ✅ SECURITY: Validate location IDs format (UUIDs)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!locationIds.every(id => typeof id === 'string' && uuidRegex.test(id))) {
      return NextResponse.json(
        {
          error: 'Invalid location IDs',
          message: 'All location IDs must be valid UUIDs',
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }

    // ✅ SECURITY: Verify all locations belong to the user
    const { data: userLocations, error: locationsError } = await supabase
      .from('gmb_locations')
      .select('id, location_id, gmb_account_id, user_id, metadata')
      .eq('user_id', user.id)
      .in('id', locationIds)
      .eq('is_active', true);

    if (locationsError) {
      console.error('[POST /api/locations/bulk-sync] DB Error:', {
        error: locationsError.message,
        code: locationsError.code,
        userId: user.id,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        {
          error: 'Database error',
          message: 'Failed to verify location ownership',
          code: 'LOCATIONS_FETCH_ERROR'
        },
        { status: 500 }
      );
    }

    if (!userLocations || userLocations.length === 0) {
      return NextResponse.json(
        {
          error: 'Not found',
          message: 'No valid locations found to sync',
          code: 'NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Group locations by account to minimize token refresh calls
    const locationsByAccount = new Map<string, typeof userLocations>();
    for (const location of userLocations) {
      const accountId = location.gmb_account_id;
      if (!locationsByAccount.has(accountId)) {
        locationsByAccount.set(accountId, []);
      }
      locationsByAccount.get(accountId)!.push(location);
    }

    // Get account details for each unique account
    const accountIds = Array.from(locationsByAccount.keys());
    const { data: accounts, error: accountsError } = await supabase
      .from('gmb_accounts')
      .select('id, account_id, is_active')
      .in('id', accountIds)
      .eq('is_active', true);

    if (accountsError || !accounts || accounts.length === 0) {
      return NextResponse.json(
        {
          error: 'Account error',
          message: 'Failed to fetch account information or account is inactive',
          code: 'ACCOUNT_ERROR'
        },
        { status: 500 }
      );
    }

    const accountsMap = new Map(accounts.map(acc => [acc.id, acc]));

    // Sync each location
    const results: Array<{
      locationId: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const [accountId, locations] of locationsByAccount.entries()) {
      const account = accountsMap.get(accountId);
      if (!account) {
        // Account not found or inactive, mark all locations as failed
        for (const location of locations) {
          results.push({
            locationId: location.id,
            success: false,
            error: 'Account not found or inactive',
          });
        }
        continue;
      }

      // Get access token for this account
      let accessToken: string;
      try {
        accessToken = await getValidAccessToken(supabase, accountId);
      } catch (error: any) {
        console.error(`[Bulk Sync] Error getting access token for account ${accountId}:`, error);
        // Mark all locations in this account as failed
        for (const location of locations) {
          results.push({
            locationId: location.id,
            success: false,
            error: `Failed to get access token: ${error.message}`,
          });
        }
        continue;
      }

      // Sync each location in this account
      for (const location of locations) {
        const result = await syncLocation(supabase, location, account, accessToken);
        results.push({
          locationId: location.id,
          success: result.success,
          error: result.error,
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    // Convert headers object to Record<string, string>
    const responseHeaders: Record<string, string> = {};
    if (rateLimitHeaders) {
      Object.entries(rateLimitHeaders).forEach(([key, value]) => {
        if (typeof value === 'string') {
          responseHeaders[key] = value;
        }
      });
    }

    return NextResponse.json({
      success: true,
      synced: successful,
      failed: failed,
      total: results.length,
      results: results,
      message: `Successfully synced ${successful} ${successful === 1 ? 'location' : 'locations'}${failed > 0 ? `, ${failed} failed` : ''}`,
    }, {
      headers: responseHeaders
    });

  } catch (error: any) {
    console.error('[POST /api/locations/bulk-sync] Unexpected error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again later.',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

