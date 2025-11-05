import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/locations/[id]/logo
 * Get logo photo for a location from GMB media
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const locationId = params.id;

    // Get location from database to find GMB resource name
    const { data: location, error: locationError } = await supabase
      .from('gmb_locations')
      .select('name, gmb_account_id, store_code')
      .eq('id', locationId)
      .eq('user_id', user.id)
      .single();

    if (locationError || !location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    // Get OAuth token for this GMB account
    const { data: tokenData, error: tokenError } = await supabase
      .from('oauth_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .eq('gmb_account_id', location.gmb_account_id)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'No OAuth token found. Please reconnect your GMB account.' },
        { status: 401 }
      );
    }

    // Check if token is expired and refresh if needed
    let accessToken = tokenData.access_token;
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);

    if (now >= expiresAt && tokenData.refresh_token) {
      // Token expired, refresh it
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: tokenData.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        accessToken = refreshData.access_token;

        // Update token in database
        const newExpiresAt = new Date(now.getTime() + refreshData.expires_in * 1000);
        await supabase
          .from('oauth_tokens')
          .update({
            access_token: refreshData.access_token,
            expires_at: newExpiresAt.toISOString(),
          })
          .eq('user_id', user.id)
          .eq('provider', 'google')
          .eq('gmb_account_id', location.gmb_account_id);
      }
    }

    // Fetch media from Google My Business API
    const mediaUrl = `https://mybusiness.googleapis.com/v4/${location.name}/media`;
    const mediaResponse = await fetch(mediaUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!mediaResponse.ok) {
      console.error('GMB API error:', await mediaResponse.text());
      return NextResponse.json(
        { error: 'Failed to fetch media from GMB' },
        { status: mediaResponse.status }
      );
    }

    const mediaData = await mediaResponse.json();
    const mediaItems = mediaData.mediaItems || [];

    // Find logo photo (LOGO category)
    const logoPhoto = mediaItems.find(
      (item: any) => item.locationAssociation?.category === 'LOGO'
    );

    if (logoPhoto && logoPhoto.googleUrl) {
      return NextResponse.json({
        url: logoPhoto.googleUrl,
        mediaFormat: logoPhoto.mediaFormat,
        name: logoPhoto.name,
      });
    }

    // If no logo, try to find PROFILE photo as fallback
    const profilePhoto = mediaItems.find(
      (item: any) => item.locationAssociation?.category === 'PROFILE'
    );

    if (profilePhoto && profilePhoto.googleUrl) {
      return NextResponse.json({
        url: profilePhoto.googleUrl,
        mediaFormat: profilePhoto.mediaFormat,
        name: profilePhoto.name,
      });
    }

    // No logo found
    return NextResponse.json(
      { error: 'No logo found', url: null },
      { status: 404 }
    );

  } catch (error: any) {
    console.error('Error fetching logo:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
