import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GBP_LOC_BASE = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const GBP_ACCOUNT_MGMT_BASE = 'https://mybusinessaccountmanagement.googleapis.com/v1';
const GMB_V4_BASE = 'https://mybusiness.googleapis.com/v4'; // v4 API for reviews and media

// Helper function for chunking arrays
const chunks = <T>(array: T[], size = 100): T[][] => {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
    array.slice(i * size, i * size + size)
  );
};

// Helper function to build full location resource name
function buildLocationResourceName(accountId: string, locationId: string): string {
  // Clean location_id from any existing prefix
  const cleanLocationId = locationId.replace(/^(accounts\/.*\/)?locations\//, '');

  // If accountId starts with "accounts/", use it directly, otherwise add prefix
  const accountResource = accountId.startsWith('accounts/') ? accountId : `accounts/${accountId}`;

  return `${accountResource}/locations/${cleanLocationId}`;
}

// Helper function to parse location resource name
function parseLocationResourceName(resourceName: string): { accountId: string; locationId: string } | null {
  const match = resourceName.match(/accounts\/([^\/]+)\/locations\/(.+)/);
  if (!match) return null;

  return {
    accountId: match[1],
    locationId: match[2]
  };
}

// Refresh Google access token
async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}> {
  console.log('[GMB Sync] Attempting to refresh access token...');

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Google OAuth configuration');
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('[GMB Sync] Token refresh failed:', data);
    if (data.error === 'invalid_grant') {
      throw new Error('invalid_grant');
    }
    throw new Error(`Token refresh failed: ${data.error || 'Unknown error'}`);
  }

  console.log('[GMB Sync] Access token refreshed successfully');
  return data;
}

// Get valid access token (refresh if needed)
async function getValidAccessToken(
  supabase: any,
  accountId: string
): Promise<string> {
  console.log('[GMB Sync] Getting valid access token for account:', accountId);

  const { data: account, error } = await supabase
    .from('gmb_accounts')
    .select('access_token, refresh_token, token_expires_at')
    .eq('id', accountId)
    .single();

  if (error || !account) {
    console.error('[GMB Sync] Failed to fetch account:', error);
    throw new Error('Account not found');
  }

  const now = new Date();
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at) : null;

  // Check if token is still valid (with 5 minute buffer)
  if (account.access_token && expiresAt && expiresAt > new Date(now.getTime() + 5 * 60000)) {
    console.log('[GMB Sync] Using existing valid access token');
    return account.access_token;
  }

  // Token expired or missing, refresh it
  if (!account.refresh_token) {
    console.error('[GMB Sync] No refresh token available');
    throw new Error('No refresh token available - reconnect required');
  }

  console.log('[GMB Sync] Token expired or missing, refreshing...');
  const tokens = await refreshAccessToken(account.refresh_token);

  // Update tokens in database
  const newExpiresAt = new Date();
  newExpiresAt.setSeconds(newExpiresAt.getSeconds() + tokens.expires_in);

  const updateData: any = {
    access_token: tokens.access_token,
    token_expires_at: newExpiresAt.toISOString(),
  };

  if (tokens.refresh_token) {
    updateData.refresh_token = tokens.refresh_token;
  }

  const { error: updateError } = await supabase
    .from('gmb_accounts')
    .update(updateData)
    .eq('id', accountId);

  if (updateError) {
    console.error('[GMB Sync] Failed to update tokens:', updateError);
  }

  return tokens.access_token;
}

// Fetch locations from Google My Business
async function fetchLocations(
  accessToken: string,
  accountResource: string,
  pageToken?: string
): Promise<{ locations: any[]; nextPageToken?: string }> {
  console.log('[GMB Sync] Fetching locations for account:', accountResource);

  const url = new URL(`${GBP_LOC_BASE}/${accountResource}/locations`);
  url.searchParams.set('readMask', 'name,title,storefrontAddress,phoneNumbers,websiteUri,categories');
  url.searchParams.set('pageSize', '100');
  url.searchParams.set('alt', 'json');
  if (pageToken) {
    url.searchParams.set('pageToken', pageToken);
  }

  const response = await fetch(url.toString(), {
    headers: { 
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  // Check if response failed
  if (!response.ok) {
    // Try to read error as JSON if Content-Type is correct
    const contentType = response.headers.get('content-type')?.toLowerCase();
    let errorData: any = {};

    if (contentType && contentType.includes('application/json')) {
      try {
        errorData = await response.json();
      } catch (e) {
        // Failed to parse JSON, continue with empty object
        console.error('[GMB Sync] Failed to parse error response as JSON');
      }
    } else {
      // Not JSON, try to read as text for debugging
      try {
        const errorText = await response.text();
        console.error('[GMB Sync] Non-JSON error response:', errorText.substring(0, 200));
      } catch (e) {
        // Ignore text parsing errors
      }
    }

    console.error('[GMB Sync] Failed to fetch locations:', errorData);
    throw new Error(`Failed to fetch locations: ${errorData.error?.message || 'Unknown error'}`);
  }

  // Response is OK, verify Content-Type before parsing
  const contentType = response.headers.get('content-type')?.toLowerCase();
  if (!contentType || !contentType.includes('application/json')) {
    console.error('[GMB Sync] Unexpected content type for locations:', contentType);
    throw new Error('Unexpected response format from Google API');
  }

  const data = await response.json();

  console.log(`[GMB Sync] Fetched ${data.locations?.length || 0} locations`);
  return {
    locations: data.locations || [],
    nextPageToken: data.nextPageToken,
  };
}

// Fetch reviews for a location using Google My Business v4 API
// v4 has a direct /reviews endpoint that should work for new projects
async function fetchReviews(
  accessToken: string,
  locationResource: string,
  accountResource?: string,
  pageToken?: string
): Promise<{ reviews: any[]; nextPageToken?: string }> {
  console.log('[GMB Sync] Fetching reviews for location:', locationResource);
  
  // Build full location resource if needed
  let fullLocationResource = locationResource;
  
  // If locationResource doesn't start with 'accounts/', try to build it
  if (!locationResource.startsWith('accounts/')) {
    // If we have accountResource, build the full path
    if (accountResource) {
      // Extract location ID from various formats
      let locationId = locationResource;
      if (locationResource.startsWith('locations/')) {
        locationId = locationResource.replace(/^locations\//, '');
      }
      
      // Ensure accountResource has 'accounts/' prefix
      const cleanAccountResource = accountResource.startsWith('accounts/') 
        ? accountResource 
        : `accounts/${accountResource}`;
      
      fullLocationResource = `${cleanAccountResource}/locations/${locationId}`;
      console.log('[GMB Sync API] Built location resource:', locationResource, '→', fullLocationResource);
    } else {
      console.warn('[GMB Sync] Location resource missing accounts/ prefix and no accountResource provided:', locationResource);
      return { reviews: [], nextPageToken: undefined };
    }
  }
  
  // Use Google My Business v4 API with direct /reviews endpoint
  const url = new URL(`${GMB_V4_BASE}/${fullLocationResource}/reviews`);
  if (pageToken) {
    url.searchParams.set('pageToken', pageToken);
  }
  url.searchParams.set('pageSize', '50');
  
  console.log('[GMB Sync] Reviews URL (v4 API):', url.toString());

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  // Check if response failed
  if (!response.ok) {
    const contentType = response.headers.get('content-type')?.toLowerCase();
    let errorData: any = {};

    if (contentType && contentType.includes('application/json')) {
      try {
        errorData = await response.json();
        console.error('[GMB Sync] v4 API error for reviews:', JSON.stringify(errorData));
      } catch (e) {
        console.error('[GMB Sync] Failed to parse error response as JSON');
      }
    } else {
      try {
        const errorText = await response.text();
        console.error('[GMB Sync] Non-JSON error response. Status:', response.status);
        console.error('[GMB Sync] Response preview:', errorText.substring(0, 500));
        console.error('[GMB Sync] Full URL that failed:', url.toString());
        // Try to extract more error info from HTML response
        if (errorText.includes('error')) {
          console.error('[GMB Sync] Error response body:', errorText.substring(0, 1000));
        }
      } catch (e) {
        console.error('[GMB Sync] Failed to read error text:', e);
      }
    }
    
    // Handle specific error cases
    if (response.status === 404) {
      // Location not found or has no reviews - this is normal for new locations
      console.warn('[GMB Sync] Location not found or has no reviews:', locationResource);
      console.warn('[GMB Sync] Attempted URL:', url.toString());
      if (errorData.error) {
        console.warn('[GMB Sync] Google API error:', JSON.stringify(errorData.error));
      }
      return { reviews: [], nextPageToken: undefined };
    }
    
    if (response.status === 403) {
      // Permission denied - might need different scope or API not enabled
      console.error('[GMB Sync] Permission denied when fetching reviews. Check API permissions and scopes.');
      console.error('[GMB Sync] Error details:', errorData);
      return { reviews: [], nextPageToken: undefined };
    }
    
    // For other errors, log but don't fail the entire sync
    console.warn('[GMB Sync] Failed to fetch reviews for location:', locationResource);
    console.warn('[GMB Sync] Status:', response.status, 'Error:', errorData);
    return { reviews: [], nextPageToken: undefined };
  }

  const contentType = response.headers.get('content-type')?.toLowerCase();
  if (!contentType || !contentType.includes('application/json')) {
    console.error('[GMB Sync] Unexpected content type for reviews:', contentType);
    return { reviews: [], nextPageToken: undefined };
  }

  const data = await response.json();
  
  // Extract reviews from v4 API response
  // v4 API returns reviews directly in the response
  const reviews = data.reviews || [];
  
  console.log('[GMB Sync] v4 API reviews response:', reviews.length, 'reviews');
  if (reviews.length > 0) {
    console.log('[GMB Sync] Sample review structure:', JSON.stringify(reviews[0], null, 2).substring(0, 200));
  } else {
    console.log('[GMB Sync] v4 API response structure:', JSON.stringify(Object.keys(data), null, 2));
  }
  
  return {
    reviews: reviews || [],
    nextPageToken: data.nextPageToken, // v4 API supports pagination
  };
}

// Fetch media for a location using Google My Business v4 API
// v4 has a direct /media endpoint that should work for new projects
async function fetchMedia(
  accessToken: string,
  locationResource: string,
  accountResource?: string,
  pageToken?: string
): Promise<{ media: any[]; nextPageToken?: string }> {
  console.log('[GMB Sync] Fetching media for location:', locationResource);
  
  // Build full location resource if needed
  let fullLocationResource = locationResource;
  
  // If locationResource doesn't start with 'accounts/', try to build it
  if (!locationResource.startsWith('accounts/')) {
    // If we have accountResource, build the full path
    if (accountResource) {
      // Extract location ID from various formats
      let locationId = locationResource;
      if (locationResource.startsWith('locations/')) {
        locationId = locationResource.replace(/^locations\//, '');
      }
      
      // Ensure accountResource has 'accounts/' prefix
      const cleanAccountResource = accountResource.startsWith('accounts/') 
        ? accountResource 
        : `accounts/${accountResource}`;
      
      fullLocationResource = `${cleanAccountResource}/locations/${locationId}`;
      console.log('[GMB Sync] Built media location resource:', locationResource, '→', fullLocationResource);
    } else {
      console.warn('[GMB Sync] Location resource missing accounts/ prefix and no accountResource provided:', locationResource);
      return { media: [], nextPageToken: undefined };
    }
  }
  
  // Use Google My Business v4 API with direct /media endpoint
  const url = new URL(`${GMB_V4_BASE}/${fullLocationResource}/media`);
  if (pageToken) {
    url.searchParams.set('pageToken', pageToken);
  }
  url.searchParams.set('pageSize', '100');

  console.log('[GMB Sync] Media URL (v4 API):', url.toString());
  console.log('[GMB Sync] Media location resource:', fullLocationResource);

  const response = await fetch(url.toString(), {
    headers: { 
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  // Check if response failed
  if (!response.ok) {
    const contentType = response.headers.get('content-type')?.toLowerCase();
    let errorData: any = {};

    if (contentType && contentType.includes('application/json')) {
      try {
        errorData = await response.json();
        console.error('[GMB Sync] Media API error:', JSON.stringify(errorData));
      } catch (e) {
        console.error('[GMB Sync] Failed to parse error response as JSON');
      }
    } else {
      try {
        const errorText = await response.text();
        console.error('[GMB Sync] Non-JSON error response. Status:', response.status);
        console.error('[GMB Sync] Response preview:', errorText.substring(0, 500));
        console.error('[GMB Sync] Full URL that failed:', url.toString());
        // Try to extract more error info from HTML response
        if (errorText.includes('error')) {
          console.error('[GMB Sync] Error response body:', errorText.substring(0, 1000));
        }
      } catch (e) {
        console.error('[GMB Sync] Failed to read error text:', e);
      }
    }
    
    // Handle specific error cases for media
    if (response.status === 404) {
      // Location not found or has no media - this is normal
      console.warn('[GMB Sync] Location not found or has no media:', locationResource);
      console.warn('[GMB Sync] Attempted URL:', url.toString());
      if (errorData.error) {
        console.warn('[GMB Sync] Google API error:', JSON.stringify(errorData.error));
      }
      return { media: [], nextPageToken: undefined };
    }
    
    if (response.status === 403) {
      // Permission denied
      console.error('[GMB Sync] Permission denied when fetching media. Check API permissions.');
      console.error('[GMB Sync] Error details:', errorData);
      return { media: [], nextPageToken: undefined };
    }
    
    console.warn('[GMB Sync] Media not available for:', locationResource);
    console.warn('[GMB Sync] Status:', response.status, 'Error:', errorData);
    return { media: [], nextPageToken: undefined };
  }

  const contentType = response.headers.get('content-type')?.toLowerCase();
  if (!contentType || !contentType.includes('application/json')) {
    console.error('[GMB Sync] Unexpected content type for media:', contentType);
    return { media: [], nextPageToken: undefined };
  }

  const data = await response.json();
  
  // Extract media from v4 API response
  // v4 API returns mediaItems directly in the response
  const media = data.mediaItems || [];
  
  console.log('[GMB Sync] v4 API media response:', media.length, 'items');
  if (media.length > 0) {
    console.log('[GMB Sync] Sample media structure:', JSON.stringify(media[0], null, 2).substring(0, 200));
  } else {
    console.log('[GMB Sync] v4 API media response structure:', JSON.stringify(Object.keys(data), null, 2));
  }
  
  return {
    media: media || [],
    nextPageToken: data.nextPageToken,
  };
}

export async function POST(request: NextRequest) {
  console.log('[GMB Sync API] Sync request received');
  const started = Date.now();

  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[GMB Sync API] Authentication failed:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[GMB Sync API] User authenticated:', user.id);

    // Parse request body
    const body = await request.json();
    const { accountId, syncType = 'full' } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: 'Missing accountId' },
        { status: 400 }
      );
    }

    console.log(`[GMB Sync API] Starting ${syncType} sync for account:`, accountId);

    // Get account details
    const { data: account, error: accountError } = await supabase
      .from('gmb_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      console.error('[GMB Sync API] Account not found:', accountError);
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    if (!account.is_active) {
      console.error('[GMB Sync API] Account is inactive');
      return NextResponse.json(
        { error: 'Account is inactive' },
        { status: 400 }
      );
    }

    // Get Google account resource name if not stored
    let accountResource = account.account_id;
    if (!accountResource) {
      console.log('[GMB Sync API] Account resource name missing, fetching from Google...');
      const accessToken = await getValidAccessToken(supabase, accountId);

      // Try to get account resource name from Google
      const accountsUrl = new URL('https://mybusinessaccountmanagement.googleapis.com/v1/accounts');
      accountsUrl.searchParams.set('alt', 'json');

      const accountsResponse = await fetch(accountsUrl.toString(), {
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        const accounts = accountsData.accounts || [];
        if (accounts.length > 0) {
          accountResource = accounts[0].name;
          console.log('[GMB Sync API] Found account resource:', accountResource);

          // Update account with resource name
          await supabase
            .from('gmb_accounts')
            .update({ account_id: accountResource })
            .eq('id', accountId);
        }
      }

      if (!accountResource) {
        console.error('[GMB Sync API] Could not find Google account resource');
        return NextResponse.json(
          { error: 'Could not find Google account' },
          { status: 400 }
        );
      }
    }

    // Get valid access token
    const accessToken = await getValidAccessToken(supabase, accountId);

    const counts = { locations: 0, reviews: 0, media: 0 };

    // Fetch and upsert locations
    console.log('[GMB Sync API] Starting location sync...');
    let locationsNextPageToken: string | undefined = undefined;

    do {
      const { locations, nextPageToken } = await fetchLocations(
        accessToken,
        accountResource,
        locationsNextPageToken
      );

      if (locations.length > 0) {
        // Log the first location to check format
        console.log('[GMB Sync API] Sample location from Google API:', {
          name: locations[0].name,
          title: locations[0].title
        });

        const locationRows = locations.map((location) => {
          const address = location.storefrontAddress;
          const addressStr = address
            ? `${(address.addressLines || []).join(', ')}${
                address.locality ? `, ${address.locality}` : ''
              }${address.administrativeArea ? `, ${address.administrativeArea}` : ''}${
                address.postalCode ? ` ${address.postalCode}` : ''
              }`
            : null;

          return {
            gmb_account_id: accountId,
            user_id: user.id,
            location_id: location.name,
            location_name: location.title || 'Unnamed Location',
            address: addressStr,
            phone: location.phoneNumbers?.primaryPhone || null,
            category: location.categories?.primaryCategory?.displayName || null,
            website: location.websiteUri || null,
            is_active: true,
            metadata: location,
            updated_at: new Date().toISOString(),
          };
        });

        // Upsert locations in chunks
        for (const chunk of chunks(locationRows)) {
          const { error } = await supabase
            .from('gmb_locations')
            .upsert(chunk, { onConflict: 'gmb_account_id,location_id' });

          if (error) {
            console.error('[GMB Sync API] Error upserting locations:', error);
          }
        }

        counts.locations += locations.length;
      }

      locationsNextPageToken = nextPageToken;

      // For incremental sync, only fetch first page
      if (syncType === 'incremental') break;
    } while (locationsNextPageToken);

    console.log(`[GMB Sync API] Synced ${counts.locations} locations`);

    // Fetch reviews and media for each location
    console.log('[GMB Sync API] Starting reviews and media sync...');
    const { data: dbLocations } = await supabase
      .from('gmb_locations')
      .select('id, location_id')
      .eq('gmb_account_id', accountId);

    if (dbLocations && Array.isArray(dbLocations)) {
      console.log(`[GMB Sync API] Processing ${dbLocations.length} locations for reviews/media sync`);

      for (const location of dbLocations) {
        // Build the full location resource name
        let fullLocationName = location.location_id;

        // If location_id doesn't start with 'accounts/', we need to build it
        if (!fullLocationName.startsWith('accounts/')) {
          // Check if location_id is just the ID part (e.g., "locations/123")
          if (fullLocationName.startsWith('locations/')) {
            // Extract just the location ID number
            const locationIdOnly = fullLocationName.replace(/^locations\//, '');
            fullLocationName = `${account.account_id}/locations/${locationIdOnly}`;
          } else {
            // Assume it's just the ID number
            fullLocationName = `${account.account_id}/locations/${fullLocationName}`;
          }
          console.log(`[GMB Sync API] Built location resource: ${location.location_id} → ${fullLocationName}`);
        } else {
          console.log(`[GMB Sync API] Using full location resource: ${fullLocationName}`);
        }
        
        // Validate that we have a proper resource name
        if (!fullLocationName.includes('/locations/')) {
          console.error(`[GMB Sync API] Invalid location resource format: ${fullLocationName}. Skipping reviews/media sync.`);
          continue;
        }
        
        // Fetch reviews
        let reviewsNextPageToken: string | undefined = undefined;
        do {
          const { reviews, nextPageToken } = await fetchReviews(
            accessToken,
            fullLocationName,
            account.account_id, // Pass account_id to help build resource if needed
            reviewsNextPageToken
          );

          if (reviews.length > 0) {
            const reviewRows = reviews.map((review) => ({
              gmb_account_id: accountId,
              user_id: user.id,
              location_id: location.id,  // Use UUID id, not location_id (resource name)
              external_review_id: review.name,
              reviewer_name: review.reviewer?.displayName || null,
              rating: review.starRating || null,
              review_text: review.comment || null,
              review_date: review.createTime || null,
              reply_text: review.reviewReply?.comment || null,
              reply_date: review.reviewReply?.updateTime || null,
              has_reply: !!review.reviewReply?.comment,
              updated_at: new Date().toISOString(),
            }));

            // Upsert reviews in chunks
            for (const chunk of chunks(reviewRows)) {
              const { error } = await supabase
                .from('gmb_reviews')
                .upsert(chunk, { onConflict: 'external_review_id' });

              if (error) {
                console.error('[GMB Sync API] Error upserting reviews:', error);
              }
            }

            counts.reviews += reviews.length;
          }

          reviewsNextPageToken = nextPageToken;
        } while (reviewsNextPageToken && syncType === 'full');

        // Fetch media
        let mediaNextPageToken: string | undefined = undefined;
        do {
          const { media, nextPageToken } = await fetchMedia(
            accessToken,
            fullLocationName,
            account.account_id, // Pass account_id to help build resource if needed
            mediaNextPageToken
          );

          if (media.length > 0) {
            const mediaRows = media.map((item) => ({
              gmb_account_id: accountId,
              location_id: location.id,  // Use UUID id, not location_id (resource name)
              user_id: user.id,
              external_media_id: item.name || item.mediaId || null,
              type: item.mediaFormat || item.type || null,
              url: item.googleUrl || item.sourceUrl || null,
              thumbnail_url: item.thumbnailUrl || null,
              created_at: item.createTime || null,
              updated_at: item.updateTime || null,
              metadata: item, // Store full media object
            }));
            
            // Upsert media in chunks
            for (const chunk of chunks(mediaRows)) {
              const { error } = await supabase
                .from('gmb_media')
                .upsert(chunk, { 
                  onConflict: 'external_media_id',
                  ignoreDuplicates: false 
                });
                
              if (error) {
                console.error('[GMB Sync API] Error upserting media:', error);
              } else {
                console.log(`[GMB Sync API] Upserted ${chunk.length} media items`);
              }
            }
            
            counts.media += media.length;
          }

          mediaNextPageToken = nextPageToken;
        } while (mediaNextPageToken && syncType === 'full');
      }
    }

    console.log(`[GMB Sync API] Synced ${counts.reviews} reviews and ${counts.media} media items`);

    // Update last sync timestamp
    await supabase
      .from('gmb_accounts')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', accountId);

    const took = Date.now() - started;
    console.log(`[GMB Sync API] Sync completed in ${took}ms`, counts);

    return NextResponse.json({
      ok: true,
      accountId,
      syncType,
      counts,
      took_ms: took,
    });

  } catch (error: any) {
    const took = Date.now() - started;
    console.error('[GMB Sync API] Sync failed:', error);

    // Handle specific error cases
    if (error.message === 'invalid_grant') {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_grant',
          message: 'Google authorization expired. Please reconnect your account.',
          took_ms: took,
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Sync failed',
        took_ms: took,
      },
      { status: 500 }
    );
  }
}