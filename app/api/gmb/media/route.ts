import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { errorResponse, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

const GBP_LOC_BASE = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

/**
 * Get media from Google My Business locations
 * Since Media API v4 is deprecated, we fetch media from Posts using Business Information API
 * 
 * Usage:
 *   GET /api/gmb/media?locationId=xxx
 *   GET /api/gmb/media  (gets media from all locations)
 */

async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}> {
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
    throw new Error(`Token refresh failed: ${data.error || 'Unknown error'}`);
  }

  return data;
}

async function getValidAccessToken(supabase: any): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: accounts, error } = await supabase
    .from('gmb_accounts')
    .select('id, access_token, refresh_token, token_expires_at')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1);

  if (error || !accounts || accounts.length === 0) {
    return null;
  }

  const account = accounts[0];
  const now = new Date();
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at) : null;

  if (!expiresAt || now >= expiresAt) {
    if (!account.refresh_token) {
      throw new Error('No refresh token available');
    }

    const tokens = await refreshAccessToken(account.refresh_token);
    const newExpiresAt = new Date();
    newExpiresAt.setSeconds(newExpiresAt.getSeconds() + tokens.expires_in);

    await supabase
      .from('gmb_accounts')
      .update({
        access_token: tokens.access_token,
        token_expires_at: newExpiresAt.toISOString(),
        ...(tokens.refresh_token && { refresh_token: tokens.refresh_token }),
      })
      .eq('id', account.id);

    return tokens.access_token;
  }

  return account.access_token;
}

// Fetch localPosts from Google Business Information API and extract media
// Note: Business Information API may not support GET /localPosts directly
// Alternative: We can fetch from database posts that were synced, or use a different approach
async function fetchMediaFromPosts(
  accessToken: string,
  locationResource: string
): Promise<any[]> {
  // Try to fetch from Google API first
  const url = `${GBP_LOC_BASE}/${locationResource}/localPosts`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      // Business Information API might not support GET /localPosts
      // Check if it's a 405 (Method Not Allowed) or 404
      if (response.status === 404 || response.status === 405) {
        console.log('[Media API] GET /localPosts not supported, will fetch from database posts instead');
        return [];
      }
      
      const errorText = await response.text().catch(() => '');
      let errorData: any = {};
      
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      console.warn('[Media API] Failed to fetch posts from Google:', {
        status: response.status,
        url,
        error: errorData.error?.message || errorData.message || errorText.substring(0, 200)
      });
      
      // If method not allowed, return empty to fall back to database
      if (response.status === 405) {
        return [];
      }
      
      return [];
    }

    const data = await response.json();
    const posts = data.localPosts || [];
    
    // Extract media from posts
    const mediaItems: any[] = [];
    
    posts.forEach((post: any) => {
      if (post.media && Array.isArray(post.media)) {
        post.media.forEach((media: any, index: number) => {
          mediaItems.push({
            id: `${post.name || post.createTime}_${index}`,
            name: post.name || null,
            sourceUrl: media.sourceUrl || media.googleUrl || null,
            mediaFormat: media.mediaFormat || (media.sourceUrl?.match(/\.(jpg|jpeg|png|gif|webp|webm|mp4)$/i) ? 'PHOTO' : 'VIDEO'),
            createTime: post.createTime || null,
            updateTime: post.updateTime || null,
            postTitle: post.summary || null,
            postName: post.name || null,
          });
        });
      }
    });
    
    return mediaItems;
  } catch (error: any) {
    console.error('[Media API] Error fetching posts from Google:', error.message);
    return [];
  }
}

// Fetch media from database posts (fallback when Google API doesn't support GET)
async function fetchMediaFromDatabasePosts(
  supabase: any,
  locationId: string
): Promise<any[]> {
  try {
    const { data: posts, error } = await supabase
      .from('gmb_posts')
      .select('id, location_id, media_url, created_at, title, content')
      .eq('location_id', locationId)
      .not('media_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[Media API] Error fetching posts from database:', error);
      return [];
    }

    if (!posts || posts.length === 0) {
      return [];
    }

    // Convert database posts to media format
    const mediaItems: any[] = [];
    
    posts.forEach((post: any) => {
      if (post.media_url) {
        // Determine media format from URL
        const isPhoto = /\.(jpg|jpeg|png|gif|webp)$/i.test(post.media_url);
        
        mediaItems.push({
          id: `db_post_${post.id}`,
          name: post.id,
          sourceUrl: post.media_url,
          mediaFormat: isPhoto ? 'PHOTO' : 'VIDEO',
          createTime: post.created_at || null,
          updateTime: post.created_at || null,
          postTitle: post.title || post.content || null,
          postName: post.id,
          fromDatabase: true, // Flag to indicate this came from database
        });
      }
    });

    return mediaItems;
  } catch (error: any) {
    console.error('[Media API] Error processing database posts:', error.message);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    const searchParams = request.nextUrl.searchParams;
    const locationId = searchParams.get('locationId');

    const accessToken = await getValidAccessToken(supabase);

    if (!accessToken) {
      return successResponse({
        media: [],
        message: 'No active GMB account connected'
      });
    }

    // Build query for locations
    let locationsQuery = supabase
      .from('gmb_locations')
      .select('id, location_id, gmb_accounts!inner(is_active, id)')
      .eq('user_id', user.id)
      .eq('gmb_accounts.is_active', true);

    if (locationId) {
      locationsQuery = locationsQuery.eq('id', locationId);
    }

    const { data: locations, error: locationsError } = await locationsQuery;

    if (locationsError || !locations || locations.length === 0) {
      return successResponse({
        media: [],
        message: 'No locations found'
      });
    }

    // Fetch media from posts for each location
    const allMedia: any[] = [];
    
    for (const location of locations) {
      const locationResource = location.location_id;
      if (!locationResource) continue;

      // Try to fetch from Google API first
      let mediaItems = await fetchMediaFromPosts(accessToken, locationResource);
      
      // If Google API doesn't return media, fall back to database posts
      if (mediaItems.length === 0) {
        mediaItems = await fetchMediaFromDatabasePosts(supabase, location.id);
      }
      
      // Add location info to each media item
      mediaItems.forEach(media => {
        allMedia.push({
          ...media,
          location_id: location.id,
          location_resource: locationResource,
        });
      });
    }

    return successResponse({
      media: allMedia,
      total: allMedia.length,
      note: 'Media is fetched from Posts via Business Information API since Media API v4 is deprecated'
    });

  } catch (error: any) {
    console.error('[Media API] Error:', {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      error: error
    });
    return errorResponse(
      'INTERNAL_ERROR',
      error?.message || 'Failed to fetch media',
      500
    );
  }
}

