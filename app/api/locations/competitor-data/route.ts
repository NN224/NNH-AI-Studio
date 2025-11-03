// app/api/locations/competitor-data/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface CompetitorData {
    id: string;
    name: string;
    lat: number;
    lng: number;
    rating: number;
}

// 💡 يجب تعيين هذا المتغير في ملف .env.local أو استخدامه من process.env
const GOOGLE_PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY; 


/**
 * مسار API لجلب بيانات المنافسين المحتملين حول المواقع النشطة.
 * يستخدم Google Places API لإيجاد المنافسين.
 */
export async function GET(request: Request) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!GOOGLE_PLACES_API_KEY) {
        return NextResponse.json({ error: 'Google Places API key is missing.' }, { status: 500 });
    }

    try {
        // 1. جلب إحداثيات المواقع النشطة للمستخدم
        const { data: activeLocations, error: locationsError } = await supabase
            .from('gmb_locations')
            .select('location_id, lat, lng, type') // 💡 افتراض وجود أعمدة lat, lng, و type (فئة النشاط)
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

            if (!location.lat || !location.lng || !location.type) continue;

            // 💡 ملاحظة: يجب أن تكون 'type' فئة متوافقة مع Google Places API (مثل 'restaurant' أو 'gym')
            const locationType = location.type.toLowerCase().split(',')[0].trim() || 'establishment'; // استخدام أول نوع نشاط

            const radius = 5000; // دائرة بحث 5 كيلومتر

            const placesApiUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.lat},${location.lng}&radius=${radius}&type=${locationType}&key=${GOOGLE_PLACES_API_KEY}`;

            const placesResponse = await fetch(placesApiUrl);
            const placesData = await placesResponse.json();

            if (placesData.status !== 'OK') {
                console.error(`Places API error for ${location.location_id}:`, placesData.error_message);
                continue; // الانتقال إلى الموقع التالي
            }

            // 3. معالجة بيانات المنافسين وتصفية التكرارات
            placesData.results.forEach((place: any) => {
                const placeId = place.place_id;

                // تجاهل الموقع الخاص بالمستخدم نفسه (إذا كان لديه place_id مسجل)
                if (placeId === location.location_id) return; 

                // تجاهل المنافسين المكررين
                if (processedCompetitorIds.has(placeId)) return;

                // تصفية المنافسين الذين لديهم تقييم
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
        console.error('API Error fetching competitor data:', error);
        return NextResponse.json({ error: error.message || 'Failed to process competitor data' }, { status: 500 });
    }
}