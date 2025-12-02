/**
 * Google Places API Proxy
 *
 * SECURITY: This proxy prevents exposing the Google Maps API key to the client
 * by making server-side requests to the Google Places API
 */

import { createClient } from '@/lib/supabase/server'
import { apiLogger } from '@/lib/utils/logger'
import { NextRequest, NextResponse } from 'next/server'

// Cache for Places API responses (5 minutes)
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Authentication check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get and validate parameters
  const searchParams = request.nextUrl.searchParams
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const radius = searchParams.get('radius') || '5000'
  const type = searchParams.get('type') || 'establishment'

  // Validate coordinates
  if (!lat || !lng) {
    return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 })
  }

  const latitude = parseFloat(lat)
  const longitude = parseFloat(lng)

  if (
    isNaN(latitude) ||
    isNaN(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
  }

  // Validate radius
  const searchRadius = parseInt(radius, 10)
  if (isNaN(searchRadius) || searchRadius < 100 || searchRadius > 50000) {
    return NextResponse.json(
      { error: 'Invalid radius (must be between 100 and 50000)' },
      { status: 400 },
    )
  }

  // Sanitize type parameter
  const sanitizedType = type.replace(/[^a-z_]/g, '')

  // Check cache
  const cacheKey = `${latitude},${longitude},${searchRadius},${sanitizedType}`
  const cached = cache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data)
  }

  // Get API key from environment (never expose to client)
  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    apiLogger.error('Google Maps API key not configured')
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  try {
    // Make request to Google Places API
    const placesUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json')
    placesUrl.searchParams.set('location', `${latitude},${longitude}`)
    placesUrl.searchParams.set('radius', searchRadius.toString())
    placesUrl.searchParams.set('type', sanitizedType)
    placesUrl.searchParams.set('key', apiKey)

    const response = await fetch(placesUrl.toString())
    const data = await response.json()

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      apiLogger.error('Places API error', {
        status: data.status,
        error: data.error_message,
      })

      return NextResponse.json({ error: 'Failed to fetch places data' }, { status: 500 })
    }

    // Filter sensitive data before caching/returning
    const sanitizedData = {
      results:
        data.results?.map((place: any) => ({
          place_id: place.place_id,
          name: place.name,
          lat: place.geometry?.location?.lat,
          lng: place.geometry?.location?.lng,
          rating: place.rating,
          user_ratings_total: place.user_ratings_total,
          vicinity: place.vicinity,
          types: place.types,
        })) || [],
      status: data.status,
    }

    // Update cache
    cache.set(cacheKey, {
      data: sanitizedData,
      timestamp: Date.now(),
    })

    // Clean old cache entries
    if (cache.size > 100) {
      const entries = Array.from(cache.entries())
      const now = Date.now()
      entries.forEach(([key, value]) => {
        if (now - value.timestamp > CACHE_TTL) {
          cache.delete(key)
        }
      })
    }

    return NextResponse.json(sanitizedData)
  } catch (error) {
    apiLogger.error(
      'Google Places proxy error',
      error instanceof Error ? error : new Error(String(error)),
    )

    return NextResponse.json({ error: 'Service error' }, { status: 500 })
  }
}
