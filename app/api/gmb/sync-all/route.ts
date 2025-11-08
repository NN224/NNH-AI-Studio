import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { refreshAccessToken as refreshGoogleAccessToken } from '@/lib/gmb/helpers';

export const dynamic = 'force-dynamic';

// Rate limiting cache - prevents too frequent syncs
const lastSyncTimes = new Map<string, number>();
const SYNC_COOLDOWN_MS = 60000; // 60 seconds between syncs

const GOOGLE_LOCATIONS_ENDPOINT = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const READ_MASK =
  'name,title,storefrontAddress,phoneNumbers,categories,websiteUri,regularHours,profile';
const PAGE_SIZE = 100;

type GoogleLocation = {
  name: string;
  title?: string;
  locationName?: string;
  storefrontAddress?: {
    addressLines?: string[];
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
    regionCode?: string;
    latlng?: {
      latitude?: number;
      longitude?: number;
    };
  };
  phoneNumbers?: {
    primaryPhone?: string;
    additionalPhones?: string[];
  };
  categories?: {
    primaryCategory?: {
      displayName?: string;
    };
    additionalCategories?: { displayName?: string }[];
  };
  websiteUri?: string;
  regularHours?: Record<string, unknown>;
  profile?: Record<string, unknown>;
  [key: string]: any;
};

function ensureAccountResource(accountId: string): string {
  if (!accountId) return '';
  return accountId.startsWith('accounts/') ? accountId : `accounts/${accountId}`;
}

function formatAddress(addr: GoogleLocation['storefrontAddress']) {
  if (!addr) return null;
  return [
    addr.addressLines?.join(', '),
    addr.locality,
    addr.administrativeArea,
    addr.postalCode,
    addr.regionCode,
  ]
    .filter(Boolean)
    .join(', ');
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchLocationsPage(
  token: string,
  accountResource: string,
  pageToken?: string,
  attempt = 0,
  maxRetries = 3,
): Promise<{ locations: GoogleLocation[]; nextPageToken?: string }> {
  const url = new URL(`${GOOGLE_LOCATIONS_ENDPOINT}/${accountResource}/locations`);
  url.searchParams.set('readMask', READ_MASK);
  url.searchParams.set('pageSize', String(PAGE_SIZE));
  if (pageToken) {
    url.searchParams.set('pageToken', pageToken);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 429) {
    if (attempt >= maxRetries - 1) {
      throw new Error('Google API rate limit exceeded. Please try again later.');
    }

    const retryAfterHeader = response.headers.get('retry-after');
    const waitTime =
      retryAfterHeader !== null
        ? Math.max(Number(retryAfterHeader) * 1000, 1000)
        : Math.pow(2, attempt) * 1000;

    console.warn(`[GMB Sync-All] Rate limited. Waiting ${waitTime}ms before retrying...`);
    await delay(waitTime);
    return fetchLocationsPage(token, accountResource, pageToken, attempt + 1, maxRetries);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    const message = errorText ? `${response.status}: ${errorText}` : `HTTP ${response.status}`;

    if (attempt >= maxRetries - 1) {
      throw new Error(`Failed to fetch locations from Google API - ${message}`);
    }

    const waitTime = Math.pow(2, attempt) * 1000;
    console.warn(
      `[GMB Sync-All] Request failed with status ${response.status}. Retrying in ${waitTime}ms...`,
    );
    await delay(waitTime);
    return fetchLocationsPage(token, accountResource, pageToken, attempt + 1, maxRetries);
  }

  const data = (await response.json().catch(() => ({}))) as {
    locations?: GoogleLocation[];
    nextPageToken?: string;
  };

  return {
    locations: data.locations || [],
    nextPageToken: data.nextPageToken,
  };
}

async function fetchLocationsWithRetry(
  token: string,
  accountResource: string,
  maxRetries = 3,
): Promise<GoogleLocation[]> {
  const allLocations: GoogleLocation[] = [];
  let pageToken: string | undefined;

  do {
    const { locations, nextPageToken } = await fetchLocationsPage(
      token,
      accountResource,
      pageToken,
      0,
      maxRetries,
    );
    if (locations.length > 0) {
      allLocations.push(...locations);
    }
    pageToken = nextPageToken;
  } while (pageToken);

  return allLocations;
}

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

export async function POST(req: Request) {
  const supabase = await createClient();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: authError?.status || 401 },
      );
    }

    const nowRate = Date.now();
    const lastSyncTime = lastSyncTimes.get(user.id) || 0;
    const timeSinceLastSync = nowRate - lastSyncTime;

    if (timeSinceLastSync < SYNC_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((SYNC_COOLDOWN_MS - timeSinceLastSync) / 1000);
      console.log(`[GMB Sync-All] Rate limited. User must wait ${remainingSeconds} more seconds`);

      return NextResponse.json(
        {
          success: false,
          error: `Please wait ${remainingSeconds} seconds before syncing again`,
          cooldownRemaining: remainingSeconds,
          rateLimited: true,
        },
        { status: 429 },
      );
    }

    lastSyncTimes.set(user.id, nowRate);
    console.log(`[GMB Sync-All] Rate limit check passed. Starting sync for user ${user.id}`);

    const {
      data: account,
      error: accountError,
    } = await supabase
      .from('gmb_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('last_sync', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (accountError || !account) {
      return NextResponse.json(
        { success: false, error: 'No active GMB account found' },
        { status: 404 },
      );
    }

    if (!account.refresh_token) {
      return NextResponse.json(
        { success: false, error: 'Missing refresh token. Please reconnect your Google account.' },
        { status: 400 },
      );
    }

    const now = Date.now();
    const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0;
    const bufferMs = 5 * 60 * 1000; // 5 minutes

    let accessToken: string | null = account.access_token || null;

    const needsRefresh = !accessToken || !expiresAt || expiresAt - bufferMs <= now;

    if (needsRefresh) {
      console.log('[GMB Sync-All] Access token expired or missing. Refreshing…');
      const tokens = await refreshGoogleAccessToken(account.refresh_token);
      accessToken = tokens.access_token;

      const newExpiresAt = new Date();
      newExpiresAt.setSeconds(newExpiresAt.getSeconds() + (tokens.expires_in || 3600));

      const updatePayload: Record<string, any> = {
        access_token: tokens.access_token,
        token_expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (tokens.refresh_token) {
        updatePayload.refresh_token = tokens.refresh_token;
      }

      const { error: updateError } = await supabase
        .from('gmb_accounts')
        .update(updatePayload)
        .eq('id', account.id);

      if (updateError) {
        console.error('[GMB Sync-All] Failed to persist refreshed token', updateError);
      }
    }

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Unable to obtain Google access token' },
        { status: 500 },
      );
    }

    const accountResource = ensureAccountResource(account.account_id);
    if (!accountResource) {
      return NextResponse.json(
        { success: false, error: 'Missing Google account identifier' },
        { status: 400 },
      );
    }

    const locations = await fetchLocationsWithRetry(accessToken, accountResource);

    if (locations.length === 0) {
      await supabase
        .from('gmb_accounts')
        .update({ last_sync: new Date().toISOString() })
        .eq('id', account.id);

      return NextResponse.json({
        success: true,
        count: 0,
        message: 'No locations returned by Google Business Profile API',
      });
    }

    const locationRows = locations.map((loc) => {
      const address = formatAddress(loc.storefrontAddress);
      const latlng = loc.storefrontAddress?.latlng;
      const phone =
        loc.phoneNumbers?.primaryPhone || loc.phoneNumbers?.additionalPhones?.[0] || null;
      const category =
        loc.categories?.primaryCategory?.displayName ||
        loc.categories?.additionalCategories?.[0]?.displayName ||
        null;

      const metadata = {
        profile: loc.profile ?? null,
        categories: loc.categories ?? null,
        regularHours: loc.regularHours ?? null,
      };

      return {
        gmb_account_id: account.id,
        user_id: user.id,
        location_id: loc.name,
        location_name: loc.title || 'Unnamed Location',
        address,
        phone,
        category,
        website: loc.websiteUri || null,
        latitude: latlng?.latitude ?? null,
        longitude: latlng?.longitude ?? null,
        business_hours: loc.regularHours ? JSON.stringify(loc.regularHours) : null,
        is_active: true,
        metadata,
        updated_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
      };
    });

    const chunkSize = 50;
    for (const chunk of chunkArray(locationRows, chunkSize)) {
      const { error: upsertError } = await supabase
        .from('gmb_locations')
        .upsert(chunk, { onConflict: 'location_id,user_id' });

      if (upsertError) {
        console.error('[GMB Sync-All] Failed to upsert locations chunk', upsertError);
        throw new Error(upsertError.message || 'Failed to save locations');
      }
    }

    const { error: syncUpdateError } = await supabase
      .from('gmb_accounts')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', account.id);

    if (syncUpdateError) {
      console.warn('[GMB Sync-All] Failed to update last_sync timestamp', syncUpdateError);
    }

    return NextResponse.json({
      success: true,
      count: locations.length,
      message: `Successfully synced ${locations.length} locations`,
    });
  } catch (error) {
    console.error('[GMB Sync-All] Sync failed:', error);

    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

