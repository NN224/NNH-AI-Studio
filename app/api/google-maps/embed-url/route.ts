import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Server-side endpoint to generate secure Google Maps embed URLs
 * This prevents exposing the API key to the client
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Rate limiting
    const { success, headers: rateLimitHeaders } = await checkRateLimit(user.id);
    if (!success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
        },
        {
          status: 429,
          headers: rateLimitHeaders as HeadersInit
        }
      );
    }

    // Get request body
    const body = await request.json();
    const { mode, params } = body;

    // Validate mode
    const validModes = ['place', 'directions', 'search', 'view', 'streetview'];
    if (!mode || !validModes.includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid map mode' },
        { status: 400 }
      );
    }

    // Validate params based on mode
    if (!params || typeof params !== 'object') {
      return NextResponse.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    // Get API key from server environment
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('Google Maps API key not configured');
      return NextResponse.json(
        { error: 'Maps service not configured' },
        { status: 500 }
      );
    }

    // Build embed URL based on mode
    let embedUrl = `https://www.google.com/maps/embed/v1/${mode}?key=${apiKey}`;

    // Add parameters based on mode
    switch (mode) {
      case 'place':
        if (params.q) {
          embedUrl += `&q=${encodeURIComponent(params.q)}`;
        }
        if (params.center) {
          embedUrl += `&center=${encodeURIComponent(params.center)}`;
        }
        if (params.zoom) {
          embedUrl += `&zoom=${params.zoom}`;
        }
        break;
      
      case 'view':
        if (params.center) {
          embedUrl += `&center=${encodeURIComponent(params.center)}`;
        }
        if (params.zoom) {
          embedUrl += `&zoom=${params.zoom}`;
        }
        if (params.maptype) {
          embedUrl += `&maptype=${params.maptype}`;
        }
        break;
      
      case 'directions':
        if (params.origin) {
          embedUrl += `&origin=${encodeURIComponent(params.origin)}`;
        }
        if (params.destination) {
          embedUrl += `&destination=${encodeURIComponent(params.destination)}`;
        }
        break;
      
      // Add other modes as needed
    }

    // Return the embed URL
    return NextResponse.json({ embedUrl });

  } catch (error) {
    console.error('Maps embed URL error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
