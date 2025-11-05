// app/api/locations/competitor-data/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { PostgrestError } from '@supabase/supabase-js'; // لتمكين TypeScript من فهم الأخطاء

interface CompetitorData {
    id: string;
    name: string;
    lat: number;
    lng: number;
    rating: number;
}

const GOOGLE_PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY; 


/**
 * مسار API لجلب بيانات المنافسين المحتملين حول المواقع النشطة.
 */
export async function GET(request: Request) {
    const supabase = await createClient();

    // ✅ SECURITY: Enhanced authentication validation
    // Using getUser() instead of getSession() for secure authentication
    // getUser() validates against Supabase Auth server, preventing cookie tampering
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        // Only log unexpected errors, not missing sessions (expected when user isn't logged in)
        if (authError && authError.name !== 'AuthSessionMissingError') {
            console.error('Authentication error:', authError);
        }
        return NextResponse.json(
            { 
                error: 'Unauthorized',
                message: 'Authentication required. Please sign in again.'
            }, 
            { status: 401 }
        );
    }

    if (!GOOGLE_PLACES_API_KEY) {
        console.error('Google Places API key is missing');
        return NextResponse.json(
            { 
                error: 'Configuration error',
                message: 'Google Places API key is missing. Please contact support.'
            }, 
            { status: 500 }
        );
    }

    try {
        // ✅ SECURITY: Input validation for query parameters - Added comprehensive input validation for radius parameter with proper error handling
        const url = new URL(request.url);
        
        // Validate and sanitize radius parameter
        const radiusParam = url.searchParams.get('radius');
        
        // Check if radius parameter exists and is a valid string
        if (radiusParam && typeof radiusParam !== 'string') {
            return NextResponse.json(
                { 
                    error: 'Invalid radius parameter', 
                    message: 'Radius parameter must be a valid number'
                },
                { status: 400 }
            );
        }
        
        // Parse radius with additional validation
        const radius = radiusParam ? parseInt(radiusParam.trim(), 10) : 5000;
        
        // Validate radius is a valid number and within acceptable range
        if (isNaN(radius) || !isFinite(radius) || radius < 100 || radius > 50000) {
            return NextResponse.json(
                { 
                    error: 'Invalid radius value', 
                    message: 'Radius must be a number between 100 and 50000 meters'
                },
                { status: 400 }
            );
        }
        // 1. جلب إحداثيات المواقع النشطة للمستخدم
        const { data: activeLocations, error: locationsError } = await supabase
            .from('gmb_locations')
            // ⭐️ تصحيح الأعمدة: استخدام "latitude" و "longitude"
            .select('location_id, latitude, longitude, type') 
            .eq('user_id', user.id)
            .eq('is_active', true);

        if (locationsError) throw locationsError;
        if (!activeLocations || activeLocations.length === 0) {
            return NextResponse.json([]); // لا توجد مواقع نشطة للبحث حولها
        }

        const allCompetitors: CompetitorData[] = [];
        const processedCompetitorIds = new Set<string>();

        // 2. التكرار على كل موقع نشط والبحث عن المنافسين القريبين
        for (const location of activeLocations) {

            // ⭐️ استخدام الأعمدة الصحيحة
            if (!location.latitude || !location.longitude || !location.type) continue;

            const locationType = location.type.toLowerCase().split(',')[0].trim() || 'establishment'; 

            // ✅ Use validated radius (defaults to 5000 if not provided)
            const searchRadius = radius || 5000;

            // ✅ SECURITY: Validate coordinates to prevent injection
            if (isNaN(location.latitude) || isNaN(location.longitude) ||
                location.latitude < -90 || location.latitude > 90 ||
                location.longitude < -180 || location.longitude > 180) {
                console.error(`Invalid coordinates for location ${location.location_id}`);
                continue;
            }

            // ✅ SECURITY: Sanitize location type to prevent injection
            const sanitizedType = locationType.replace(/[^a-z_]/g, '');

            // ⭐️ استخدام الأعمدة الصحيحة في URL
            const placesApiUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.latitude},${location.longitude}&radius=${searchRadius}&type=${sanitizedType}&key=${GOOGLE_PLACES_API_KEY}`;

            const placesResponse = await fetch(placesApiUrl);
            const placesData = await placesResponse.json();

            if (placesData.status !== 'OK') {
                console.error(`Places API error for ${location.location_id}:`, placesData.error_message);
                continue; 
            }

            // 3. معالجة بيانات المنافسين وتصفية التكرارات
            placesData.results.forEach((place: any) => {
                const placeId = place.place_id;

                if (placeId === location.location_id) return; 

                if (processedCompetitorIds.has(placeId)) return;

                if (place.rating) {
                    allCompetitors.push({
                        id: placeId,
                        name: place.name,
                        lat: place.geometry.location.lat,
                        lng: place.geometry.location.lng,
                        rating: place.rating,
                    });
                    processedCompetitorIds.add(placeId);
                }
            });
        }

        // 4. إرجاع القائمة النهائية للمنافسين
        return NextResponse.json(allCompetitors);

    } catch (error: any) {
        // ✅ ERROR HANDLING: Enhanced error logging
        console.error('API Error fetching competitor data:', {
            error: error.message,
            stack: error.stack,
            userId: user?.id || 'unknown',
            timestamp: new Date().toISOString(),
        });

        // Don't expose internal error details to client
        return NextResponse.json(
            { 
                error: 'Internal server error',
                message: 'Failed to fetch competitor data. Please try again later.',
                code: 'COMPETITOR_DATA_ERROR'
            }, 
            { status: 500 }
        );
    }
}