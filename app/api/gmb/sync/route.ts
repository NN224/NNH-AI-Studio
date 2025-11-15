import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiError, errorResponse } from '@/utils/api-error';
import { encryptToken, resolveTokenValue } from '@/lib/security/encryption';
import { acquireLock, extendLock, releaseLock } from '@/lib/redis/lock-manager';
import { CacheBucket, refreshCache } from '@/lib/cache/cache-manager';
import { GMB_CONSTANTS } from '@/lib/gmb/helpers';
import { logAction } from '@/lib/monitoring/audit';
import { trackSyncResult } from '@/lib/monitoring/metrics';
import { checkKeyRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// Limit verbose logging to non‑production environments
const IS_DEV = process.env.NODE_ENV !== 'production';

// Granular sync types to allow partial refresh from dashboard
const VALID_SYNC_TYPES = [
  'full',
  'locations',
  'reviews',
  'questions',
  'media',
  'performance',
  'keywords'
];

type SyncStatusState = 'running' | 'success' | 'failed'
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>
type PhaseCounts = Record<string, number | undefined>
type JsonRecord = Record<string, unknown>
type ApiDisplayValue = { displayName?: string; name?: string; merchantDescription?: string }
type ApiMediaItem = { mediaFormat?: string; googleUrl?: string | null }
const SYNC_LIMIT_PER_HOUR = 10
const SYNC_WINDOW_MS = 60 * 60 * 1000

function extractDisplayString(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const record = value as ApiDisplayValue
    return record.displayName || record.name || record.merchantDescription || null
  }
  return null
}

function collectDisplayStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => extractDisplayString(entry))
    .filter((entry): entry is string => Boolean(entry))
}

function isApiMediaItem(value: unknown): value is ApiMediaItem {
  return typeof value === 'object' && value !== null
}

async function createSyncStatusRecord(supabase: SupabaseServerClient, userId: string) {
  try {
    const { data, error } = await supabase
      .from('sync_status')
      .insert({
        user_id: userId,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) {
      console.warn('[GMB Sync API] Failed to create sync status record', error)
      return null
    }

    return data?.id || null
  } catch (error) {
    console.warn('[GMB Sync API] Exception while creating sync status record', error)
    return null
  }
}

async function finalizeSyncStatusRecord(
  supabase: SupabaseServerClient,
  statusId: string | null,
  state: SyncStatusState,
  errorMessage?: string | null
) {
  if (!statusId) {
    return
  }

  try {
    await supabase
      .from('sync_status')
      .update({
        status: state,
        completed_at: new Date().toISOString(),
        error: errorMessage || null,
      })
      .eq('id', statusId)
  } catch (error) {
    console.warn('[GMB Sync API] Failed to finalize sync status record', error)
  }
}

// Phase logging helpers (minimal; replaces later with structured service)
async function startPhaseLog(
  supabase: SupabaseServerClient,
  accountId: string,
  userId: string,
  phase: string
) {
  try {
    const { data, error } = await supabase
      .from('gmb_sync_logs')
      .insert({ gmb_account_id: accountId, user_id: userId, phase, status: 'started' })
      .select('id')
      .single();
    if (error) {
      console.warn('[GMB Sync API] Failed to start phase log', phase, error.message);
      return null;
    }
    return data?.id || null;
  } catch (error) {
    console.warn('[GMB Sync API] Exception starting phase log', phase, error);
    return null;
  }
}

async function finishPhaseLog(
  supabase: SupabaseServerClient,
  id: string | null,
  status: string,
  counts: PhaseCounts | null,
  error?: string | null
) {
  if (!id) return;
  try {
    await supabase
      .from('gmb_sync_logs')
      .update({ status, ended_at: new Date().toISOString(), counts, error: error ? String(error) : null })
      .eq('id', id);
  } catch (error) {
    console.warn('[GMB Sync API] Failed to finish phase log', id, error);
  }
}

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GBP_LOC_BASE = GMB_CONSTANTS.GBP_LOC_BASE;
const GMB_V4_BASE = GMB_CONSTANTS.GMB_V4_BASE; // v4 API for reviews and media
const QANDA_API_BASE = GMB_CONSTANTS.QANDA_BASE; // Q&A API for questions
const PERFORMANCE_API_BASE = 'https://businessprofileperformance.googleapis.com/v1'; // Performance API for metrics
// Metrics upsert helper: accumulate totals and runs per phase
async function upsertMetrics(
  supabase: SupabaseServerClient,
  accountId: string,
  userId: string,
  phase: 'locations' | 'reviews' | 'media' | 'questions' | 'performance' | 'keywords',
  durationMs: number,
  itemsCount: number
) {
  try {
    // Try to get existing row
    const { data: existing, error: selError } = await supabase
      .from('gmb_metrics')
      .select('id, runs_count, total_duration_ms, total_items_count')
      .eq('gmb_account_id', accountId)
      .eq('phase', phase)
      .maybeSingle();

    if (selError && selError.code !== 'PGRST116') {
      console.warn('[GMB Metrics] Select error:', selError.message);
    }

    if (existing && existing.id) {
      const { error: updError } = await supabase
        .from('gmb_metrics')
        .update({
          runs_count: (existing.runs_count || 0) + 1,
          total_duration_ms: (existing.total_duration_ms || 0) + Math.max(0, durationMs),
          total_items_count: (existing.total_items_count || 0) + Math.max(0, itemsCount),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (updError) {
        console.warn('[GMB Metrics] Update error:', updError.message);
      }
    } else {
      const { error: insError } = await supabase
        .from('gmb_metrics')
        .insert({
          gmb_account_id: accountId,
          user_id: userId,
          phase,
          runs_count: 1,
          total_duration_ms: Math.max(0, durationMs),
          total_items_count: Math.max(0, itemsCount),
        });
      if (insError) {
        console.warn('[GMB Metrics] Insert error:', insError.message);
      }
    }
  } catch (error) {
    console.warn('[GMB Metrics] Exception upserting metrics for phase', phase, error);
  }
}


// Helper function for chunking arrays
const chunks = <T>(array: T[], size = 100): T[][] => {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
    array.slice(i * size, i * size + size)
  );
};

// Helper function to convert starRating enum to number
// API v4 returns starRating as enum string: "ONE", "TWO", "THREE", "FOUR", "FIVE"
function convertStarRatingToNumber(starRating: string | undefined | null): number {
  if (!starRating) return 0;
  
  const ratingMap: Record<string, number> = {
    'ONE': 1,
    'TWO': 2,
    'THREE': 3,
    'FOUR': 4,
    'FIVE': 5,
    'STAR_RATING_UNSPECIFIED': 0,
  };
  
  // If it's already a number (legacy support), return it
  if (typeof starRating === 'number') {
    return starRating >= 1 && starRating <= 5 ? starRating : 0;
  }
  
  // Convert enum string to number
  return ratingMap[starRating.toUpperCase()] || 0;
}

// Refresh Google access token
async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}> {
  if (IS_DEV) {
    console.warn('[GMB Sync] Attempting to refresh access token...');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
  throw new ApiError('Missing Google OAuth configuration', 500);
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
      throw new ApiError('invalid_grant', 401);
    }
    throw new ApiError(`Token refresh failed: ${data.error || 'Unknown error'}`, 401);
  }

  if (IS_DEV) {
    console.warn('[GMB Sync] Access token refreshed successfully');
  }
  return data;
}

// Get valid access token (refresh if needed)
async function getValidAccessToken(
  supabase: SupabaseServerClient,
  accountId: string
): Promise<string> {
  if (IS_DEV) {
    console.warn('[GMB Sync] Getting valid access token for account:', accountId);
  }

  const { data: account, error } = await supabase
    .from('gmb_accounts')
    .select('access_token, refresh_token, token_expires_at')
    .eq('id', accountId)
    .single();

  if (error || !account) {
    console.error('[GMB Sync] Failed to fetch account:', error);
  throw new ApiError('Account not found', 404);
  }

  const accessToken = resolveTokenValue(account.access_token, {
    context: `gmb_accounts.access_token:${accountId}`,
  });
  const refreshToken = resolveTokenValue(account.refresh_token, {
    context: `gmb_accounts.refresh_token:${accountId}`,
  });

  const now = new Date();
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at) : null;

  // Check if token is still valid (with 10 minute buffer)
  const BUFFER_MINUTES = 10;
  if (accessToken && expiresAt && expiresAt > new Date(now.getTime() + BUFFER_MINUTES * 60000)) {
    if (IS_DEV) {
      console.warn('[GMB Sync] Using existing valid access token');
    }
    return accessToken;
  }

  // Token expired or missing, refresh it
  if (!refreshToken) {
    console.error('[GMB Sync] No refresh token available');
  throw new ApiError('No refresh token available - reconnect required', 401);
  }

  if (IS_DEV) {
    console.warn('[GMB Sync] Token expired or missing, refreshing...');
  }
  const tokens = await refreshAccessToken(refreshToken);

  // Update tokens in database
  const newExpiresAt = new Date();
  newExpiresAt.setSeconds(newExpiresAt.getSeconds() + tokens.expires_in);

  const updateData: {
    access_token: string
    token_expires_at: string
    refresh_token?: string
  } = {
    access_token: encryptToken(tokens.access_token),
    token_expires_at: newExpiresAt.toISOString(),
  };

  if (tokens.refresh_token) {
    updateData.refresh_token = encryptToken(tokens.refresh_token);
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
type RawGoogleLocation = Record<string, JsonRecord | string | number | boolean | null>;

async function fetchLocations(
  accessToken: string,
  accountResource: string,
  pageToken?: string
): Promise<{ locations: RawGoogleLocation[]; nextPageToken?: string }> {
  if (IS_DEV) {
    console.warn('[GMB Sync] Fetching locations for account:', accountResource);
  }

  const url = new URL(`${GBP_LOC_BASE}/${accountResource}/locations`);
  url.searchParams.set(
    'readMask',
    'name,title,storefrontAddress,phoneNumbers,websiteUri,categories,profile,regularHours,specialHours,moreHours,serviceItems,openInfo,metadata,latlng,labels'
  );
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
    let errorData: JsonRecord = {};

    if (contentType && contentType.includes('application/json')) {
      try {
        errorData = await response.json();
      } catch (error) {
        // Failed to parse JSON, continue with empty object
        console.error('[GMB Sync] Failed to parse error response as JSON', error);
      }
    } else {
      // Not JSON, try to read as text for debugging
      try {
        const errorText = await response.text();
        console.error('[GMB Sync] Non-JSON error response:', errorText.substring(0, 200));
      } catch (error) {
        console.warn('[GMB Sync] Failed to read non-JSON error response', error);
      }
    }

    console.error('[GMB Sync] Failed to fetch locations:', errorData);
    throw new ApiError(
      `Failed to fetch locations: ${errorData.error?.message || 'Unknown error'}`,
      500,
      errorData.error
    );
  }

  // Response is OK, verify Content-Type before parsing
  const contentType = response.headers.get('content-type')?.toLowerCase();
  if (!contentType || !contentType.includes('application/json')) {
    console.error('[GMB Sync] Unexpected content type for locations:', contentType);
    throw new ApiError('Unexpected response format from Google API', 500);
  }

  const data = await response.json();

  if (IS_DEV) {
    console.warn(`[GMB Sync] Fetched ${data.locations?.length || 0} locations`);
  }
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
): Promise<{ reviews: JsonRecord[]; nextPageToken?: string }> {
  if (IS_DEV) {
    console.warn('[GMB Sync] Fetching reviews for location:', locationResource);
  }
  
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
      if (IS_DEV) {
        console.warn('[GMB Sync API] Built location resource:', locationResource, '?', fullLocationResource);
      }
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
  
  if (IS_DEV) {
    console.warn('[GMB Sync] Reviews URL (v4 API):', url.toString());
  }

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
    let errorData: JsonRecord = {};

    if (contentType && contentType.includes('application/json')) {
      try {
        errorData = await response.json();
        console.error('[GMB Sync] v4 API error for reviews:', JSON.stringify(errorData));
      } catch (error) {
        console.error('[GMB Sync] Failed to parse error response as JSON', error);
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
      } catch (error) {
        console.error('[GMB Sync] Failed to read error text:', error);
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
  
  if (IS_DEV) {
    console.warn('[GMB Sync] v4 API reviews response:', reviews.length, 'reviews');
    if (reviews.length > 0) {
      console.warn('[GMB Sync] Sample review structure:', JSON.stringify(reviews[0], null, 2).substring(0, 200));
    } else {
      console.warn('[GMB Sync] v4 API response structure:', JSON.stringify(Object.keys(data), null, 2));
    }
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
): Promise<{ media: JsonRecord[]; nextPageToken?: string }> {
  if (IS_DEV) {
    console.warn('[GMB Sync] Fetching media for location:', locationResource);
  }
  
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
      if (IS_DEV) {
        console.warn('[GMB Sync] Built media location resource:', locationResource, '?', fullLocationResource);
      }
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

  if (IS_DEV) {
    console.warn('[GMB Sync] Media URL (v4 API):', url.toString());
    console.warn('[GMB Sync] Media location resource:', fullLocationResource);
  }

  const response = await fetch(url.toString(), {
    headers: { 
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  // Check if response failed
  if (!response.ok) {
    const contentType = response.headers.get('content-type')?.toLowerCase();
    let errorData: JsonRecord = {};

    if (contentType && contentType.includes('application/json')) {
      try {
        errorData = await response.json();
        console.error('[GMB Sync] Media API error:', JSON.stringify(errorData));
      } catch (error) {
        console.error('[GMB Sync] Failed to parse error response as JSON', error);
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
      } catch (error) {
        console.error('[GMB Sync] Failed to read error text:', error);
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
  
  if (IS_DEV) {
    console.warn('[GMB Sync] v4 API media response:', media.length, 'items');
    console.warn('[GMB Sync] Response keys:', Object.keys(data));
  
    if (media.length > 0) {
      const sampleMedia = media[0];
      console.warn('[GMB Sync] Sample media structure:', {
        name: sampleMedia.name,
        mediaFormat: sampleMedia.mediaFormat,
        googleUrl: sampleMedia.googleUrl ? 'present' : 'missing',
        sourceUrl: sampleMedia.sourceUrl ? 'present' : 'missing',
        thumbnailUrl: sampleMedia.thumbnailUrl ? 'present' : 'missing',
        createTime: sampleMedia.createTime ? 'present' : 'missing',
        updateTime: sampleMedia.updateTime ? 'present' : 'missing',
        allKeys: Object.keys(sampleMedia),
      });
    } else {
      console.warn(
        '[GMB Sync] No media items in response. Full response structure:',
        JSON.stringify(Object.keys(data), null, 2),
      );
    }
  }
  
  return {
    media: media || [],
    nextPageToken: data.nextPageToken,
  };
}

// Fetch questions for a location using Google My Business Q&A API v1
// Q&A API uses format: locations/{location_id}/questions (NOT accounts/{account}/locations/{location}/questions)
async function fetchQuestions(
  accessToken: string,
  locationResource: string,
  accountResource?: string,
  pageToken?: string
): Promise<{ questions: JsonRecord[]; nextPageToken?: string }> {
  if (IS_DEV) {
    console.warn('[GMB Sync] Fetching questions for location:', locationResource);
  }
  
  // Extract location ID from various formats
  // Q&A API expects just: locations/{location_id} (NOT accounts/.../locations/...)
  let locationId = locationResource;
  
  // Handle different input formats
  if (locationResource.startsWith('accounts/')) {
    // Extract from: accounts/{account}/locations/{location_id}
    const match = locationResource.match(/accounts\/[^/]+\/locations\/(.+)$/);
    if (match) {
      locationId = match[1];
    } else {
      console.warn('[GMB Sync] Could not extract location ID from:', locationResource);
      return { questions: [], nextPageToken: undefined };
    }
  } else if (locationResource.startsWith('locations/')) {
    // Already in correct format: locations/{location_id}
    locationId = locationResource;
  } else {
    // Just the location ID number
    locationId = `locations/${locationResource}`;
  }
  
  // Q&A API uses format: locations/{location_id}/questions
  const url = new URL(`${QANDA_API_BASE}/${locationId}/questions`);
  if (pageToken) {
    url.searchParams.set('pageToken', pageToken);
  }
  url.searchParams.set('pageSize', '10'); // Max 10 per API spec
  
  if (IS_DEV) {
    console.warn('[GMB Sync] Questions URL (Q&A API v1):', url.toString());
  }

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
    let errorData: JsonRecord = {};

    if (contentType && contentType.includes('application/json')) {
      try {
        errorData = await response.json();
        console.error('[GMB Sync] Questions API error:', JSON.stringify(errorData));
      } catch (error) {
        console.error('[GMB Sync] Failed to parse error response as JSON', error);
      }
    } else {
      try {
        const errorText = await response.text();
        console.error('[GMB Sync] Non-JSON error response. Status:', response.status);
        console.error('[GMB Sync] Response preview:', errorText.substring(0, 500));
      } catch (error) {
        console.error('[GMB Sync] Failed to read error text:', error);
      }
    }
    
    // Handle specific error cases
    if (response.status === 404) {
      // Location not found or has no questions - this is normal
      console.warn('[GMB Sync] Location not found or has no questions:', locationResource);
      return { questions: [], nextPageToken: undefined };
    }
    
    if (response.status === 403) {
      // Permission denied
      console.error('[GMB Sync] Permission denied when fetching questions. Check API permissions.');
      console.error('[GMB Sync] Error details:', errorData);
      return { questions: [], nextPageToken: undefined };
    }
    
    console.warn('[GMB Sync] Failed to fetch questions for location:', locationResource);
    console.warn('[GMB Sync] Status:', response.status, 'Error:', errorData);
    return { questions: [], nextPageToken: undefined };
  }

  const contentType = response.headers.get('content-type')?.toLowerCase();
  if (!contentType || !contentType.includes('application/json')) {
    console.error('[GMB Sync] Unexpected content type for questions:', contentType);
    return { questions: [], nextPageToken: undefined };
  }

  const data = await response.json();
  
  // Extract questions from Q&A API response
  // Q&A API v1 returns questions in response.questions array
  const questions = data.questions || [];
  
  if (IS_DEV) {
    console.warn('[GMB Sync] Q&A API questions response:', questions.length, 'questions');
    if (questions.length > 0) {
      console.warn('[GMB Sync] Sample question structure:', JSON.stringify(questions[0], null, 2).substring(0, 500));
    }
  }
  
  return {
    questions: questions || [],
    nextPageToken: data.nextPageToken,
  };
}

// Fetch daily metrics for a location using Business Profile Performance API
// Performance API uses location_id format: locations/{location_id} (without accounts/ prefix)
async function fetchDailyMetrics(
  accessToken: string,
  locationId: string, // Should be just the location ID number (e.g., "11247391224469965786")
  startDate: Date,
  endDate: Date,
  metrics: string[] = [
    'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
    'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
    'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
    'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
    'BUSINESS_CONVERSATIONS',
    'BUSINESS_DIRECTION_REQUESTS',
    'CALL_CLICKS',
    'WEBSITE_CLICKS',
    'BUSINESS_BOOKINGS',
    'BUSINESS_FOOD_ORDERS',
    'BUSINESS_FOOD_MENU_CLICKS',
  ]
): Promise<{ metrics: JsonRecord[] }> {
  if (IS_DEV) {
    console.warn('[GMB Sync] Fetching daily metrics for location:', locationId);
  }
  
  // Performance API uses format: locations/{location_id} (just the ID, not full resource)
  // Extract just the location ID if it has prefixes
  let cleanLocationId = locationId;
  if (locationId.includes('/locations/')) {
    cleanLocationId = locationId.split('/locations/')[1];
  } else if (locationId.startsWith('locations/')) {
    cleanLocationId = locationId.replace(/^locations\//, '');
  } else if (locationId.includes('accounts/')) {
    // Extract location ID from accounts/.../locations/... format
    const match = locationId.match(/locations\/([^/]+)/);
    if (match) {
      cleanLocationId = match[1];
    }
  }
  
  const locationResource = `locations/${cleanLocationId}`;
  
  // Build URL for fetchMultiDailyMetricsTimeSeries
  const url = new URL(`${PERFORMANCE_API_BASE}/${locationResource}:fetchMultiDailyMetricsTimeSeries`);
  
  // Add date range
  url.searchParams.set('daily_range.start_date.year', startDate.getFullYear().toString());
  url.searchParams.set('daily_range.start_date.month', (startDate.getMonth() + 1).toString());
  url.searchParams.set('daily_range.start_date.day', startDate.getDate().toString());
  url.searchParams.set('daily_range.end_date.year', endDate.getFullYear().toString());
  url.searchParams.set('daily_range.end_date.month', (endDate.getMonth() + 1).toString());
  url.searchParams.set('daily_range.end_date.day', endDate.getDate().toString());
  
  // Add metrics
  metrics.forEach(metric => {
    url.searchParams.append('dailyMetrics', metric);
  });
  
  if (IS_DEV) {
    console.warn('[GMB Sync] Performance API URL:', url.toString());
  }
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const contentType = response.headers.get('content-type')?.toLowerCase();
    let errorData: JsonRecord = {};
    
    if (contentType && contentType.includes('application/json')) {
      try {
        errorData = await response.json();
        console.error('[GMB Sync] Performance API error:', JSON.stringify(errorData));
      } catch (error) {
        console.error('[GMB Sync] Failed to parse error response as JSON', error);
      }
    } else {
      try {
        const errorText = await response.text();
        console.error('[GMB Sync] Performance API error response. Status:', response.status);
        console.error('[GMB Sync] Response preview:', errorText.substring(0, 500));
      } catch (error) {
        console.error('[GMB Sync] Failed to read error text:', error);
      }
    }
    
    if (response.status === 404) {
      console.warn('[GMB Sync] Performance metrics not available for location:', locationId);
      return { metrics: [] };
    }
    
    if (response.status === 403) {
      console.error('[GMB Sync] Permission denied for Performance API. Check if API is enabled.');
      console.error('[GMB Sync] Error details:', errorData);
      return { metrics: [] };
    }
    
    console.warn('[GMB Sync] Failed to fetch performance metrics:', response.status, errorData);
    return { metrics: [] };
  }
  
  const contentType = response.headers.get('content-type')?.toLowerCase();
  if (!contentType || !contentType.includes('application/json')) {
    console.error('[GMB Sync] Unexpected content type for performance metrics:', contentType);
    return { metrics: [] };
  }
  
  const data = await response.json();
  
  // Extract metrics from response
  // Response structure: { multiDailyMetricTimeSeries: [{ dailyMetricTimeSeries: [...] }] }
  const allMetrics: JsonRecord[] = [];
  
  if (data.multiDailyMetricTimeSeries) {
    for (const multiSeries of data.multiDailyMetricTimeSeries) {
      if (multiSeries.dailyMetricTimeSeries) {
        for (const metricSeries of multiSeries.dailyMetricTimeSeries) {
          const metricType = metricSeries.dailyMetric;
          const timeSeries = metricSeries.timeSeries;
          
          if (timeSeries && timeSeries.datedValues) {
            for (const datedValue of timeSeries.datedValues) {
              if (datedValue.date && datedValue.value !== undefined) {
                allMetrics.push({
                  metric_type: metricType,
                  metric_date: `${datedValue.date.year}-${String(datedValue.date.month || 1).padStart(2, '0')}-${String(datedValue.date.day || 1).padStart(2, '0')}`,
                  metric_value: parseInt(datedValue.value) || 0,
                  sub_entity_type: metricSeries.dailySubEntityType || {},
                });
              }
            }
          }
        }
      }
    }
  }
  
  if (IS_DEV) {
    console.warn('[GMB Sync] Performance API returned', allMetrics.length, 'metric data points');
  }
  
  return { metrics: allMetrics };
}

// Fetch search keywords impressions for a location using Business Profile Performance API
async function fetchSearchKeywords(
  accessToken: string,
  locationId: string, // Should be just the location ID number
  startMonth: Date,
  endMonth: Date,
  pageToken?: string
): Promise<{ keywords: JsonRecord[]; nextPageToken?: string }> {
  if (IS_DEV) {
    console.warn('[GMB Sync] Fetching search keywords for location:', locationId);
  }
  
  // Extract just the location ID if it has prefixes
  let cleanLocationId = locationId;
  if (locationId.includes('/locations/')) {
    cleanLocationId = locationId.split('/locations/')[1];
  } else if (locationId.startsWith('locations/')) {
    cleanLocationId = locationId.replace(/^locations\//, '');
  } else if (locationId.includes('accounts/')) {
    const match = locationId.match(/locations\/([^/]+)/);
    if (match) {
      cleanLocationId = match[1];
    }
  }
  
  const locationResource = `locations/${cleanLocationId}`;
  
  // Build URL for search keywords
  const url = new URL(`${PERFORMANCE_API_BASE}/${locationResource}/searchkeywords/impressions/monthly`);
  
  // Add date range
  url.searchParams.set('monthly_range.start_month.year', startMonth.getFullYear().toString());
  url.searchParams.set('monthly_range.start_month.month', (startMonth.getMonth() + 1).toString());
  url.searchParams.set('monthly_range.end_month.year', endMonth.getFullYear().toString());
  url.searchParams.set('monthly_range.end_month.month', (endMonth.getMonth() + 1).toString());
  
  if (pageToken) {
    url.searchParams.set('pageToken', pageToken);
  }
  
  url.searchParams.set('pageSize', '100');
  
  if (IS_DEV) {
    console.warn('[GMB Sync] Search Keywords URL:', url.toString());
  }
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const contentType = response.headers.get('content-type')?.toLowerCase();
    let errorData: JsonRecord = {};
    
    if (contentType && contentType.includes('application/json')) {
      try {
        errorData = await response.json();
        console.error('[GMB Sync] Search Keywords API error:', JSON.stringify(errorData));
      } catch (error) {
        console.error('[GMB Sync] Failed to parse error response as JSON', error);
      }
    }
    
    if (response.status === 404) {
      console.warn('[GMB Sync] Search keywords not available for location:', locationId);
      return { keywords: [] };
    }
    
    if (response.status === 403) {
      console.error('[GMB Sync] Permission denied for Search Keywords API.');
      return { keywords: [] };
    }
    
    console.warn('[GMB Sync] Failed to fetch search keywords:', response.status, errorData);
    return { keywords: [] };
  }
  
  const contentType = response.headers.get('content-type')?.toLowerCase();
  if (!contentType || !contentType.includes('application/json')) {
    console.error('[GMB Sync] Unexpected content type for search keywords:', contentType);
    return { keywords: [] };
  }
  
  const data = await response.json();
  
  // Extract keywords from response
  // Response structure: { searchKeywordsCounts: [{ searchKeyword: "...", insightsValue: {...} }] }
  const keywords: JsonRecord[] = [];
  
  if (data.searchKeywordsCounts) {
    for (const keywordCount of data.searchKeywordsCounts) {
      const keyword = keywordCount.searchKeyword;
      const insightsValue = keywordCount.insightsValue;
      
      // insightsValue can be either { value: "..." } or { threshold: "..." }
      const impressions = insightsValue?.value 
        ? parseInt(insightsValue.value) 
        : (insightsValue?.threshold ? parseInt(insightsValue.threshold) : 0);
      
      // We'll store data for the end month (most recent)
      keywords.push({
        search_keyword: keyword,
        impressions_count: impressions,
        threshold_value: insightsValue?.threshold ? parseInt(insightsValue.threshold) : null,
        month_year: `${endMonth.getFullYear()}-${String(endMonth.getMonth() + 1).padStart(2, '0')}-01`,
      });
    }
  }
  
  if (IS_DEV) {
    console.warn('[GMB Sync] Search Keywords API returned', keywords.length, 'keywords');
  }
  
  return {
    keywords: keywords || [],
    nextPageToken: data.nextPageToken,
  };
}

export async function POST(request: NextRequest) {
  if (IS_DEV) {
    console.warn('[GMB Sync API] Sync request received');
  }
  const started = Date.now();
  const supabase = await createClient();
  const LOCK_TTL_SEC = 60 * 5;
  const LOCK_REFRESH_INTERVAL_MS = Math.max(60_000, (LOCK_TTL_SEC - 60) * 1000);
  let lockKey: string | null = null;
  let lockToken: string | null = null;
  let lockRefreshTimer: NodeJS.Timeout | null = null;
  let syncStatusId: string | null = null;
  let syncStatusState: SyncStatusState = 'failed';
  let syncStatusError: string | null = null;

  try {

    // Check if this is an internal cron request (for scheduled syncs)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isCronRequest = cronSecret && authHeader === `Bearer ${cronSecret}`;
    
    let user: { id: string } | null = null;
    
    // If it's a cron request, skip user authentication check
    if (!isCronRequest) {
      // Get authenticated user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        console.error('[GMB Sync API] Authentication failed:', authError);
        return errorResponse(new ApiError('Authentication required', 401));
      }
      user = authUser;
      if (IS_DEV) {
        console.warn('[GMB Sync API] User authenticated:', user.id);
      }
    } else {
      if (IS_DEV) {
        console.warn('[GMB Sync API] Cron request detected - skipping user auth');
      }
    }

    // Parse request body with proper error handling
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error('[GMB Sync API] Invalid JSON in request body:', jsonError);
      return errorResponse(new ApiError('Request body must be valid JSON', 400));
    }

    const bodyFields = body as {
      accountId?: string
      account_id?: string
      syncType?: string
      sync_type?: string
    }

    // Support both naming conventions: account_id/accountId and sync_type/syncType
    const accountId = bodyFields.accountId || bodyFields.account_id;
    const syncType = (bodyFields.syncType || bodyFields.sync_type || 'full').toLowerCase();

    if (!VALID_SYNC_TYPES.includes(syncType)) {
      console.error('[GMB Sync API] Invalid syncType supplied:', syncType);
      return errorResponse(new ApiError(`syncType must be one of: ${VALID_SYNC_TYPES.join(', ')}`, 400));
    }

    if (!accountId) {
      console.error('[GMB Sync API] Missing accountId in request body:', body);
      return errorResponse(new ApiError('accountId is required in request body', 400));
    }

    if (IS_DEV) {
      console.warn(`[GMB Sync API] Starting ${syncType} sync for account:`, accountId);
    }

    lockKey = `locks:gmb:sync:${accountId}`;
    lockToken = await acquireLock(lockKey, LOCK_TTL_SEC);
    if (!lockToken) {
      const conflictMessage = 'Sync already running. المزامنة قيد التنفيذ حالياً.';
      return errorResponse(new ApiError(conflictMessage, 409));
    }

    lockRefreshTimer = setInterval(() => {
      if (!lockKey || !lockToken) return;
      extendLock(lockKey, lockToken, LOCK_TTL_SEC).catch((error) => {
        console.warn('[GMB Sync API] Failed to extend sync lock', error);
      });
    }, LOCK_REFRESH_INTERVAL_MS);
    lockRefreshTimer.unref?.();

    // Get account details
    const accountQuery = supabase
      .from('gmb_accounts')
      .select('*')
      .eq('id', accountId);
    
    // Only filter by user_id if not a cron request
    if (!isCronRequest && user) {
      accountQuery.eq('user_id', user.id);
    }
    
    const { data: account, error: accountError } = await accountQuery.single();

    if (accountError || !account) {
      console.error('[GMB Sync API] Account not found:', accountError);
      return errorResponse(new ApiError('Account not found', 404));
    }

    if (!account.is_active) {
      console.error('[GMB Sync API] Account is inactive');
      return errorResponse(new ApiError('Account is inactive', 400));
    }

    // Get user_id from account for cron requests (where user might be null)
    const userId = user?.id || account.user_id;
    if (!userId) {
      console.error('[GMB Sync API] Cannot determine user_id');
      return errorResponse(new ApiError('Cannot determine user_id', 400));
    }

    const syncRateKey = `sync:${userId}:${accountId}`;
    const syncRateResult = await checkKeyRateLimit(syncRateKey, SYNC_LIMIT_PER_HOUR, SYNC_WINDOW_MS, 'ratelimit:sync');
    if (!syncRateResult.success) {
      const retryAfterSeconds = Math.max(0, syncRateResult.reset - Math.floor(Date.now() / 1000));
      return NextResponse.json(
        {
          error: 'Sync rate limit exceeded',
          retryAfter: retryAfterSeconds,
          message: `Sync operations limited to ${SYNC_LIMIT_PER_HOUR} per hour.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfterSeconds.toString(),
            ...syncRateResult.headers,
          },
        }
      );
    }

    syncStatusId = await createSyncStatusRecord(supabase, userId);

    // Get Google account resource name if not stored
    let accountResource = account.account_id;
    if (!accountResource) {
      if (IS_DEV) {
        console.warn('[GMB Sync API] Account resource name missing, fetching from Google...');
      }
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
          if (IS_DEV) {
            console.warn('[GMB Sync API] Found account resource:', accountResource);
          }

          // Update account with resource name
          await supabase
            .from('gmb_accounts')
            .update({ account_id: accountResource })
            .eq('id', accountId);
        }
      }

      if (!accountResource) {
        console.error('[GMB Sync API] Could not find Google account resource');
        return errorResponse(new ApiError('Could not find Google account', 400));
      }
    }

    // Get valid access token
    const accessToken = await getValidAccessToken(supabase, accountId);

  const counts = { locations: 0, reviews: 0, media: 0, questions: 0, performance_metrics: 0, search_keywords: 0 };
  const skipped: string[] = [];
  const doLocations = syncType === 'full' || syncType === 'locations';
  const doReviews = syncType === 'full' || syncType === 'reviews';
  const doMedia = syncType === 'full' || syncType === 'media';
  const doQuestions = syncType === 'full' || syncType === 'questions';
  const doPerformance = syncType === 'full' || syncType === 'performance';
  const doKeywords = syncType === 'full' || syncType === 'keywords';

  if (!doLocations) skipped.push('locations');
  if (!doReviews) skipped.push('reviews');
  if (!doMedia) skipped.push('media');
  if (!doQuestions) skipped.push('questions');
  if (!doPerformance) skipped.push('performance');
  if (!doKeywords) skipped.push('keywords');
    // Note: media count will remain 0 as Media API is deprecated

    // Fetch and upsert locations
    let phaseLocationsId: string | null = null;
    if (doLocations) {
      phaseLocationsId = await startPhaseLog(supabase, accountId, userId, 'locations');
      if (IS_DEV) {
        console.warn('[GMB Sync API] Starting location sync...');
      }
      let locationsNextPageToken: string | undefined = undefined;
      const phaseStart = Date.now();
      do {
        const { locations, nextPageToken } = await fetchLocations(
          accessToken,
          accountResource,
          locationsNextPageToken
        );
        // Fetch cover photo for each location using Google My Business v4 API
        for (const loc of locations) {
          const locationId = loc.name.split('/').pop();
          const mediaUrl = `${GMB_V4_BASE}/${accountResource}/locations/${locationId}/media`;
          let coverPhotoUrl = null;

          try {
            const res = await fetch(mediaUrl, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (res.ok) {
              const data = await res.json();
              const mediaItems = Array.isArray(data.mediaItems) ? data.mediaItems : [];
              const cover = mediaItems.find(
                (item): item is ApiMediaItem => isApiMediaItem(item) && item.mediaFormat === 'COVER'
              );
              coverPhotoUrl = cover?.googleUrl || null;
            } else {
              console.warn(`[GMB Sync API] Failed to fetch media for location ${locationId}`);
            }
          } catch (err) {
            console.error(`[GMB Sync API] Error fetching cover photo for location ${locationId}:`, err);
          }

          // Attach cover photo URL to location object for database insert
          loc.cover_photo_url = coverPhotoUrl;
        }
        if (locations.length > 0 && IS_DEV) {
          console.warn('[GMB Sync API] Sample location from Google API:', {
            name: locations[0].name,
            title: locations[0].title,
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
            const metadata = location.metadata || {};
            const latlng = location.latlng || {};
            const profile = location.profile || {};
            const openInfo = location.openInfo || {};
            const enhancedMetadata = {
              ...location,
              profile,
              regularHours: location.regularHours,
              specialHours: location.specialHours,
              moreHours: location.moreHours,
              serviceItems: location.serviceItems,
              openInfo,
              latlng,
              labels: location.labels || [],
              placeId: metadata.placeId,
              mapsUri: metadata.mapsUri,
              newReviewUri: metadata.newReviewUri,
              canHaveFoodMenus: metadata.canHaveFoodMenus,
              canHaveBusinessCalls: metadata.canHaveBusinessCalls,
              hasVoiceOfMerchant: metadata.hasVoiceOfMerchant,
              hasPendingEdits: metadata.hasPendingEdits,
              canDelete: metadata.canDelete,
              canOperateHealthData: metadata.canOperateHealthData,
              canOperateLodgingData: metadata.canOperateLodgingData,
              canModifyServiceList: metadata.canModifyServiceList,
            };
            // Generate normalized_location_id as per architecture requirements
            const normalizedLocationId = location.name.replace(/[^a-zA-Z0-9]/g, '_');
            
            // Extract profile data
            const profileData = location.profile || {};
            const description = profileData.description || '';
            const shortDescription = profileData.shortDescription || profileData.merchantDescription || null;
            const additionalCategories = collectDisplayStrings(
              (location.categories as { additionalCategories?: unknown[] } | undefined)?.additionalCategories ?? []
            );
            
            // Extract from_the_business (attributes from "From the Business" section)
            const fromTheBusiness: string[] = [];
            fromTheBusiness.push(...collectDisplayStrings(profileData.fromTheBusiness));
            fromTheBusiness.push(...collectDisplayStrings(profileData.attributes));
            
            // Extract opening date
            const openingDate = profileData.openingDate || openInfo?.openingDate || null;
            const parsedOpeningDate = openingDate ? (typeof openingDate === 'string' ? openingDate : 
              `${openingDate.year || ''}-${String(openingDate.month || 1).padStart(2, '0')}-${String(openingDate.day || 1).padStart(2, '0')}`) : null;
            
            // Extract service area enabled
            const serviceAreaEnabled = openInfo?.status === 'SERVICE_AREA' || 
              metadata.serviceAreaEnabled === true || 
              location.serviceArea?.enabled === true || 
              false;
            
            // Extract special links (menu, booking, order, appointment)
            const specialLinks = profileData.specialLinks || profileData.moreHours || {};
            const menuUrl = specialLinks.menu || specialLinks.menuUrl || null;
            const bookingUrl = specialLinks.booking || specialLinks.bookingUrl || null;
            const orderUrl = specialLinks.order || specialLinks.orderUrl || null;
            const appointmentUrl = specialLinks.appointment || specialLinks.appointmentUrl || null;
            
            // Extract location ID external (just the ID part, not full resource name)
            const locationIdExternal = location.name.includes('/locations/') 
              ? location.name.split('/locations/')[1] 
              : location.name.replace(/^locations\//, '');
            
            // Format latlng as string
            const latlngStr = (latlng?.latitude && latlng?.longitude) 
              ? `${latlng.latitude},${latlng.longitude}` 
              : null;
            
            // Extract status and type
            const locationStatus = location.status || metadata.status || openInfo?.status || 'pending';
            const locationType = location.type || metadata.type || null;
            
            return {
              gmb_account_id: accountId,
              user_id: userId,
              location_id: location.name,
              normalized_location_id: normalizedLocationId,
              location_name: location.title || 'Unnamed Location',
              address: addressStr,
              phone: location.phoneNumbers?.primaryPhone || null,
              category: location.categories?.primaryCategory?.displayName || null,
              website: location.websiteUri || null,
              description: description || null,
              short_description: shortDescription || null,
              additional_categories: additionalCategories.length > 0 ? additionalCategories : null,
              from_the_business: fromTheBusiness.length > 0 ? fromTheBusiness : null,
              opening_date: parsedOpeningDate || null,
              service_area_enabled: serviceAreaEnabled,
              menu_url: menuUrl || null,
              booking_url: bookingUrl || null,
              order_url: orderUrl || null,
              appointment_url: appointmentUrl || null,
              regularhours: location.regularHours || null,
              status: locationStatus || null,
              type: locationType || null,
              account_id: accountResource || null,
              location_id_external: locationIdExternal || null,
              latlng: latlngStr || null,
              is_active: true,
              latitude: latlng?.latitude ?? null,
              longitude: latlng?.longitude ?? null,
              // Store cover photo url
              cover_photo_url: location.cover_photo_url || null,
              metadata: enhancedMetadata,
              updated_at: new Date().toISOString(),
              last_synced_at: new Date().toISOString(),
            };
          });
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
      } while (locationsNextPageToken);
      const phaseDuration = Date.now() - phaseStart;
      if (IS_DEV) {
        console.warn(`[GMB Sync API] Synced ${counts.locations} locations in ${phaseDuration}ms`);
      }
      await finishPhaseLog(supabase, phaseLocationsId, 'completed', { locations: counts.locations });
      await upsertMetrics(supabase, accountId, userId, 'locations', phaseDuration, counts.locations);
    }

    // Fetch reviews and media for each location
    if (IS_DEV) {
      console.warn('[GMB Sync API] Starting reviews and media sync...');
    }
    const { data: dbLocations } = await supabase
      .from('gmb_locations')
      .select('id, location_id')
      .eq('gmb_account_id', accountId);

    let phaseReviewsId: string | null = null;
    let phaseMediaId: string | null = null;
    let phaseQuestionsId: string | null = null;
    if (doReviews) phaseReviewsId = await startPhaseLog(supabase, accountId, userId, 'reviews');
    if (doMedia) phaseMediaId = await startPhaseLog(supabase, accountId, userId, 'media');
    if (doQuestions) phaseQuestionsId = await startPhaseLog(supabase, accountId, userId, 'questions');

    if (dbLocations && Array.isArray(dbLocations)) {
      if (IS_DEV) {
        console.warn(`[GMB Sync API] Processing ${dbLocations.length} locations for reviews/media sync`);
      }

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
          if (IS_DEV) {
            console.warn(`[GMB Sync API] Built location resource: ${location.location_id} ? ${fullLocationName}`);
          }
        } else if (IS_DEV) {
          console.warn(`[GMB Sync API] Using full location resource: ${fullLocationName}`);
        }
        
        // Validate that we have a proper resource name
        if (!fullLocationName.includes('/locations/')) {
          console.error(`[GMB Sync API] Invalid location resource format: ${fullLocationName}. Skipping reviews/media sync.`);
          skipped.push(`invalid_location_resource:${location.location_id}`);
          continue;
        }

        // Fetch reviews for this location using Google My Business v4 API
        if (doReviews) {
          const phaseReviewsStart = Date.now();
          let reviewsNextPageToken: string | undefined = undefined;

          do {
            const { reviews, nextPageToken } = await fetchReviews(
              accessToken,
              fullLocationName,
              account.account_id,
              reviewsNextPageToken
            );

            if (reviews.length > 0) {
              if (IS_DEV) {
                console.warn(
                  `[GMB Sync API] Processing ${reviews.length} reviews for location ${location.id}`,
                );
              }

              const reviewRows = reviews
                .map((review) => {
                  const externalReviewId =
                    review.reviewId ||
                    review.name?.split('/').pop() ||
                    review.reviewReply?.reviewId ||
                    null;

                  if (!externalReviewId) {
                    console.warn('[GMB Sync API] Skipping review without identifiable reviewId', review);
                    return null;
                  }

                  const rating = convertStarRatingToNumber(review.starRating);
                  const reviewerName =
                    review.reviewer?.displayName?.trim() || 'Anonymous';
                  const reviewCreateTime =
                    review.createTime || new Date().toISOString();
                  const replyUpdateTime =
                    review.reviewReply?.updateTime || null;
                  const replyComment = review.reviewReply?.comment?.trim() || null;
                  const hasReply = Boolean(replyComment);
                  const normalizedStatus = hasReply ? 'responded' : 'pending';

                  return {
                    gmb_account_id: accountId,
                    location_id: location.id,
                    user_id: userId,
                    external_review_id: externalReviewId,
                    rating,
                    review_text: review.comment || null,
                    review_date: reviewCreateTime,
                    reviewer_name: reviewerName,
                    reviewer_display_name: reviewerName,
                    reviewer_profile_photo_url:
                      review.reviewer?.profilePhotoUrl || null,
                    review_reply: replyComment,
                    response_text: replyComment,
                    reply_date: replyUpdateTime,
                    responded_at: replyUpdateTime,
                    has_reply: hasReply,
                    has_response: hasReply,
                    status: normalizedStatus,
                    google_my_business_name: review.name || null,
                    review_url: review.reviewUrl || null,
                    synced_at: new Date().toISOString(),
                    metadata: review,
                  };
                })
                .filter((row): row is NonNullable<typeof row> => !!row);

              if (IS_DEV) {
                console.warn(
                  `[GMB Sync API] Prepared ${reviewRows.length} review rows from ${reviews.length} reviews`,
                );
              }

              let upsertedCount = 0;
              for (const chunk of chunks(reviewRows)) {
                const { data, error } = await supabase
                  .from('gmb_reviews')
                  .upsert(chunk, {
                    onConflict: 'external_review_id',
                    ignoreDuplicates: false,
                  })
                  .select();

                if (error) {
                  console.error('[GMB Sync API] Error upserting reviews:', error);
                } else if (data) {
                  upsertedCount += data.length;
                } else {
                  upsertedCount += chunk.length;
                }
              }

              if (IS_DEV) {
                console.warn(
                  `[GMB Sync API] Completed reviews sync: upserted ${upsertedCount} reviews`,
                );
              }
              counts.reviews += reviews.length;

              const phaseReviewsDuration = Date.now() - phaseReviewsStart;
              await upsertMetrics(
                supabase,
                accountId,
                userId,
                'reviews',
                phaseReviewsDuration,
                reviews.length
              );
            } else if (IS_DEV) {
              console.warn(
                `[GMB Sync API] No reviews returned for location ${location.id}`,
              );
            }

            reviewsNextPageToken = nextPageToken;
          } while (reviewsNextPageToken && syncType === 'full');
        }

        // Try to fetch media using Google My Business v4 API
        // Note: This API requires Google My Business API to be enabled in Google Cloud Console
        if (doMedia) {
          const phaseMediaStart = Date.now();
        let mediaNextPageToken: string | undefined = undefined;
        do {
          const { media, nextPageToken } = await fetchMedia(
            accessToken,
            fullLocationName,
            account.account_id,
            mediaNextPageToken
          );

          if (media.length > 0) {
            if (IS_DEV) {
              console.warn(
                `[GMB Sync API] Processing ${media.length} media items for location ${location.id}`,
              );
            }
            
            const mediaRows = media.map((item) => {
              // Log first item structure for debugging
              if (media.indexOf(item) === 0 && IS_DEV) {
                console.warn('[GMB Sync API] First media item structure:', {
                  name: item.name,
                  mediaFormat: item.mediaFormat,
                  type: item.type,
                  googleUrl: item.googleUrl,
                  sourceUrl: item.sourceUrl,
                  thumbnailUrl: item.thumbnailUrl,
                  createTime: item.createTime,
                  updateTime: item.updateTime,
                  allKeys: Object.keys(item),
                });
              }
              
              return {
                gmb_account_id: accountId,
                location_id: location.id,
                user_id: userId,
                external_media_id: item.name || item.mediaId || null,
                type: item.mediaFormat || item.type || null,
                url: item.googleUrl || item.sourceUrl || null,
                thumbnail_url: item.thumbnailUrl || null,
                created_at: item.createTime || null,
                updated_at: item.updateTime || null,
                metadata: item,
              };
            }).filter((item) => {
              // Filter out items without external_media_id (required for upsert)
              if (!item.external_media_id) {
                console.warn('[GMB Sync API] Skipping media item without external_media_id:', item);
                return false;
              }
              return true;
            });
            
            if (IS_DEV) {
              console.warn(
                `[GMB Sync API] Prepared ${mediaRows.length} valid media rows from ${media.length} items`,
              );
            }

            let upsertedCount = 0;
            for (const chunk of chunks(mediaRows)) {
              if (IS_DEV) {
                console.warn(`[GMB Sync API] Upserting chunk of ${chunk.length} media items...`);
              }
              
              const { error } = await supabase
                .from('gmb_media')
                .upsert(chunk, { 
                  onConflict: 'external_media_id',
                  ignoreDuplicates: false 
                });
                
                if (error) {
                  console.error('[GMB Sync API] Error upserting media:', error);
                  if (IS_DEV) {
                    console.error(
                      '[GMB Sync API] Failed chunk sample:',
                      JSON.stringify(chunk[0], null, 2),
                    );
                  }
                } else {
                upsertedCount += chunk.length;
                  if (IS_DEV) {
                    console.warn(
                      `[GMB Sync API] Successfully upserted ${chunk.length} media items (total: ${upsertedCount})`,
                    );
                  }
              }
            }
            
            if (IS_DEV) {
              console.warn(
                `[GMB Sync API] Completed media sync: ${upsertedCount}/${mediaRows.length} items saved`,
              );
            }
            counts.media += media.length;
            const phaseMediaDuration = Date.now() - phaseMediaStart;
            await upsertMetrics(supabase, accountId, userId, 'media', phaseMediaDuration, media.length);
          } else if (IS_DEV) {
            console.warn(`[GMB Sync API] No media found for location ${location.id}`);
          }

          mediaNextPageToken = nextPageToken;
        } while (mediaNextPageToken && syncType === 'full');
        }

        // Fetch questions for this location using Google My Business Q&A API v1
        // Q&A API requires just the location ID number (not the full resource path)
        if (doQuestions) {
          const phaseQuestionsStart = Date.now();
          let questionsNextPageToken: string | undefined = undefined;
        
        // Extract location ID from fullLocationName for Q&A API
        let locationIdForQandA: string;
        if (fullLocationName.includes('/locations/')) {
          // Extract from: accounts/{account}/locations/{location_id}
          const match = fullLocationName.match(/locations\/([^/]+)$/);
          locationIdForQandA = match ? match[1] : fullLocationName.split('/').pop() || '';
        } else if (fullLocationName.startsWith('locations/')) {
          locationIdForQandA = fullLocationName.replace(/^locations\//, '');
        } else {
          locationIdForQandA = fullLocationName;
        }
        
        if (IS_DEV) {
          console.warn(
            `[GMB Sync API] Extracted location ID for Q&A: ${fullLocationName} -> ${locationIdForQandA}`,
          );
        }
        
        do {
          const { questions, nextPageToken } = await fetchQuestions(
            accessToken,
            locationIdForQandA, // Pass just the location ID, not the full resource
            account.account_id,
            questionsNextPageToken
          );

          if (questions.length > 0) {
            if (IS_DEV) {
              console.warn(
                `[GMB Sync API] Processing ${questions.length} questions for location ${location.id}`,
              );
            }
            
            const questionRows = questions.map((question) => {
              // Get the best answer (first from topAnswers, or use existing answer)
              const bestAnswer = question.topAnswers && question.topAnswers.length > 0 
                ? question.topAnswers[0] 
                : null;
              
              // Determine answer status
              let answerStatus: 'pending' | 'answered' | 'draft' = 'pending';
              let answerText: string | null = null;
              let answeredAt: string | null = null;
              
              if (bestAnswer && bestAnswer.text) {
                answerText = bestAnswer.text;
                answeredAt = bestAnswer.createTime || bestAnswer.updateTime || null;
                // If answered by merchant, mark as answered, otherwise it's a customer answer
                answerStatus = bestAnswer.author?.type === 'MERCHANT' ? 'answered' : 'pending';
              }

              return {
                gmb_account_id: accountId,
                user_id: userId,
                location_id: location.id,  // Use UUID id, not location_id (resource name)
                external_question_id: question.name,
                question_text: question.text || '',
              author_name: question.author?.displayName || 'Anonymous',
              author_type: question.author?.type === 'MERCHANT' ? 'MERCHANT' : 
                            question.author?.type === 'LOCAL_GUIDE' ? 'GOOGLE_USER' :
                            question.author?.type === 'REGULAR_USER' ? 'CUSTOMER' : 'CUSTOMER',
                answer_text: answerText,
                answered_at: answeredAt,
                answer_status: answerStatus,
                upvote_count: question.upvoteCount || 0,
                created_at: question.createTime || new Date().toISOString(),
                updated_at: question.updateTime || question.createTime || new Date().toISOString(),
              };
            }).filter((q) => {
              // Filter out questions without question_text
              if (!q.question_text || q.question_text.trim().length === 0) {
                console.warn(
                  '[GMB Sync API] Skipping question without question_text:',
                  q.external_question_id,
                );
                return false;
              }
              return true;
            });

            if (IS_DEV) {
              console.warn(
                `[GMB Sync API] Prepared ${questionRows.length} valid question rows from ${questions.length} questions`,
              );
            }

            let upsertedCount = 0;
            for (const chunk of chunks(questionRows)) {
              if (IS_DEV) {
                console.warn(`[GMB Sync API] Upserting chunk of ${chunk.length} questions...`);
              }
              
              const { error } = await supabase
                .from('gmb_questions')
                .upsert(chunk, { 
                  onConflict: 'external_question_id',
                  ignoreDuplicates: false 
                });

              if (error) {
                console.error('[GMB Sync API] Error upserting questions:', error);
                if (IS_DEV) {
                  console.error(
                    '[GMB Sync API] Failed chunk sample:',
                    JSON.stringify(chunk[0], null, 2),
                  );
                }
              } else {
                upsertedCount += chunk.length;
                if (IS_DEV) {
                  console.warn(
                    `[GMB Sync API] Successfully upserted ${chunk.length} questions (total: ${upsertedCount})`,
                  );
                }
              }
            }

            if (IS_DEV) {
              console.warn(
                `[GMB Sync API] Completed questions sync: ${upsertedCount}/${questionRows.length} questions saved`,
              );
            }
            counts.questions += questions.length;
            const phaseQuestionsDuration = Date.now() - phaseQuestionsStart;
            await upsertMetrics(supabase, accountId, userId, 'questions', phaseQuestionsDuration, questions.length);
          } else if (IS_DEV) {
            console.warn(`[GMB Sync API] No questions found for location ${location.id}`);
          }

          questionsNextPageToken = nextPageToken;
        } while (questionsNextPageToken && syncType === 'full');
        }
      }
    }
  await finishPhaseLog(supabase, phaseReviewsId, 'completed', { reviews: counts.reviews });
  if (doReviews && counts.reviews === 0) {
    await upsertMetrics(supabase, accountId, userId, 'reviews', 0, 0);
  }
  await finishPhaseLog(supabase, phaseMediaId, 'completed', { media: counts.media });
  await finishPhaseLog(supabase, phaseQuestionsId, 'completed', { questions: counts.questions });

    if (IS_DEV) {
      console.warn(
        `[GMB Sync API] Synced ${counts.reviews} reviews, ${counts.media} media items, and ${counts.questions} questions`,
      );
    }

    // Fetch performance metrics and search keywords for each location
    if (doPerformance || doKeywords && IS_DEV) {
      console.warn('[GMB Sync API] Starting performance metrics sync...');
    }
    let phasePerformanceId: string | null = null;
    let phaseKeywordsId: string | null = null;
    if (doPerformance) phasePerformanceId = await startPhaseLog(supabase, accountId, userId, 'performance');
    if (doKeywords) phaseKeywordsId = await startPhaseLog(supabase, accountId, userId, 'keywords');
    if (dbLocations && Array.isArray(dbLocations) && (doPerformance || doKeywords)) {
      if (IS_DEV) {
        console.warn(
          `[GMB Sync API] Processing ${dbLocations.length} locations for performance metrics sync`,
        );
      }

      // Calculate date range: last 30 days for daily metrics, last 3 months for search keywords
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Last 30 days

      const endMonth = new Date();
      const startMonth = new Date();
      startMonth.setMonth(startMonth.getMonth() - 3); // Last 3 months

      for (const location of dbLocations) {
        // Extract location ID for Performance API (just the ID, not full resource)
        let locationIdForPerformance = location.location_id;
        if (locationIdForPerformance.includes('/locations/')) {
          locationIdForPerformance = locationIdForPerformance.split('/locations/')[1];
        } else if (locationIdForPerformance.startsWith('locations/')) {
          locationIdForPerformance = locationIdForPerformance.replace(/^locations\//, '');
        } else if (locationIdForPerformance.includes('accounts/')) {
          const match = locationIdForPerformance.match(/locations\/([^/]+)/);
          if (match) {
            locationIdForPerformance = match[1];
          }
        }

        // Fetch daily metrics
        if (doPerformance) {
          const phasePerformanceStart = Date.now();
          try {
            if (IS_DEV) {
              console.warn(
                `[GMB Sync API] Fetching performance metrics for location: ${locationIdForPerformance}`,
              );
            }
            const { metrics } = await fetchDailyMetrics(
              accessToken,
              locationIdForPerformance,
              startDate,
              endDate
            );

            if (metrics.length > 0) {
              const metricRows = metrics.map((metric) => ({
                gmb_account_id: accountId,
                location_id: location.id, // Use UUID id, not location_id
                user_id: userId,
                metric_type: metric.metric_type,
                metric_date: metric.metric_date,
                metric_value: metric.metric_value,
                sub_entity_type: metric.sub_entity_type || {},
                metadata: {},
              }));

              // Upsert metrics in chunks
              for (const chunk of chunks(metricRows)) {
                const { error } = await supabase
                  .from('gmb_performance_metrics')
                  .upsert(chunk, { 
                    onConflict: 'location_id,metric_date,metric_type',
                    ignoreDuplicates: false 
                  });

                if (error) {
                  console.error('[GMB Sync API] Error upserting performance metrics:', error);
                } else if (IS_DEV) {
                  console.warn(`[GMB Sync API] Upserted ${chunk.length} performance metrics`);
                }
              }

              counts.performance_metrics += metrics.length;
              const phasePerformanceDuration = Date.now() - phasePerformanceStart;
              await upsertMetrics(supabase, accountId, userId, 'performance', phasePerformanceDuration, metrics.length);
            }
          } catch (error) {
            console.error(
              `[GMB Sync API] Error fetching performance metrics for location ${location.id}:`,
              error,
            );
          }
        }

        // Fetch search keywords
        try {
          if (!doKeywords) {
            continue;
          }
          if (IS_DEV) {
            console.warn(
              `[GMB Sync API] Fetching search keywords for location: ${locationIdForPerformance}`,
            );
          }
          let keywordsNextPageToken: string | undefined = undefined;
          
          do {
            const { keywords, nextPageToken } = await fetchSearchKeywords(
              accessToken,
              locationIdForPerformance,
              startMonth,
              endMonth,
              keywordsNextPageToken
            );

            if (keywords.length > 0) {
              const phaseKeywordsStart = Date.now();
              const keywordRows = keywords.map((keyword) => ({
                gmb_account_id: accountId,
                location_id: location.id, // Use UUID id
                user_id: userId,
                search_keyword: keyword.search_keyword,
                month_year: keyword.month_year,
                impressions_count: keyword.impressions_count,
                threshold_value: keyword.threshold_value,
                metadata: {},
              }));

              // Upsert keywords in chunks
              for (const chunk of chunks(keywordRows)) {
                const { error } = await supabase
                  .from('gmb_search_keywords')
                  .upsert(chunk, { 
                    onConflict: 'location_id,search_keyword,month_year',
                    ignoreDuplicates: false 
                  });

                if (error) {
                  console.error('[GMB Sync API] Error upserting search keywords:', error);
                } else if (IS_DEV) {
                  console.warn(`[GMB Sync API] Upserted ${chunk.length} search keywords`);
                }
              }

              counts.search_keywords += keywords.length;
              const phaseKeywordsDuration = Date.now() - phaseKeywordsStart;
              await upsertMetrics(supabase, accountId, userId, 'keywords', phaseKeywordsDuration, keywords.length);
            }

            keywordsNextPageToken = nextPageToken;
          } while (keywordsNextPageToken && syncType === 'full');
        } catch (error) {
          console.error(
            `[GMB Sync API] Error fetching search keywords for location ${location.id}:`,
            error,
          );
        }
      }
    }
  await finishPhaseLog(supabase, phasePerformanceId, 'completed', { performance_metrics: counts.performance_metrics });
  await finishPhaseLog(supabase, phaseKeywordsId, 'completed', { search_keywords: counts.search_keywords });

    if (IS_DEV) {
      console.warn(
        `[GMB Sync API] Synced ${counts.performance_metrics} performance metrics and ${counts.search_keywords} search keywords`,
      );
    }

    // Update last sync timestamp
    await supabase
      .from('gmb_accounts')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', accountId);

    const took = Date.now() - started;
    if (IS_DEV) {
      console.warn(`[GMB Sync API] Sync completed in ${took}ms`, counts);
    }

    await logAction('sync', 'gmb_account', accountId, {
      status: 'success',
      took_ms: took,
      sync_type: syncType,
      counts,
    });
    await trackSyncResult(userId ?? null, true, took);

    await refreshCache(CacheBucket.DASHBOARD_OVERVIEW, userId);

    const successPayload = {
      success: true, // For consistency with dashboard checks
      ok: true,
      accountId,
      syncType,
      counts,
      skipped_sections: skipped,
      took_ms: took,
    };

    syncStatusState = 'success';
    syncStatusError = null;
    return NextResponse.json(successPayload);

  } catch (error: unknown) {
    const took = Date.now() - started;
    console.error('[GMB Sync API] Sync failed:', error);
    const baseMessage = error instanceof Error ? error.message : 'Sync failed';
    syncStatusError = `${baseMessage} / فشلت عملية المزامنة.`;
    await logAction('sync', 'gmb_account', accountId, {
      status: 'failed',
      took_ms: took,
      sync_type: syncType,
      error: baseMessage,
    });
    await trackSyncResult(typeof userId === 'string' ? userId : null, false, took);
    return errorResponse(error);
  } finally {
    if (lockRefreshTimer) {
      clearInterval(lockRefreshTimer);
    }

    if (syncStatusId) {
      const statusErrorMessage =
        syncStatusState === 'failed'
          ? syncStatusError || 'Sync failed. فشلت عملية المزامنة.'
          : null
      await finalizeSyncStatusRecord(supabase, syncStatusId, syncStatusState, statusErrorMessage);
    }

    if (lockKey && lockToken) {
      try {
        await releaseLock(lockKey, lockToken);
      } catch (releaseError) {
        console.warn('[GMB Sync API] Failed to release sync lock', releaseError);
      }
    }
  }
}