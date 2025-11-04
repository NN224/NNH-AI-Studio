// app/api/locations/bulk-publish/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
// 💡 افتراض: استيراد الدوال المساعدة من ملفات الـ Helpers لديك
import { getValidAccessToken, buildLocationResourceName } from '@/lib/gmb/helpers'; // ⭐️ يجب تعديل هذا المسار
// 💡 افتراض: استيراد دالة جلب المنشور من Supabase
import { fetchPostContent } from '@/lib/posts/posts-crud'; // ⭐️ يجب تعديل هذا المسار

// 💡 افتراض: هذا الثابت موجود لديك في ملف الـ helpers
const GMB_V4_BASE = 'https://mybusiness.googleapis.com/v4'; 


/**
 * مسار API لتنفيذ النشر الجماعي لمنشور GMB واحد على عدة مواقع.
 * هذا المنطق ينشر المنشور المخزن لدينا في DB إلى المواقع المحددة.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { locationIds, postId } = await request.json();

    if (!Array.isArray(locationIds) || locationIds.length === 0 || !postId) {
      return NextResponse.json({ error: 'Missing required locationIds or postId' }, { status: 400 });
    }

    // 1. جلب محتوى المنشور من قاعدة البيانات (لدينا)
    // 💡 افتراض أن هذه الدالة تجلب محتوى المنشور وكائن CTA و mediaUrl
    const postData = await fetchPostContent(supabase, postId); 

    if (!postData) {
        return NextResponse.json({ error: 'Post content not found or user unauthorized to publish.' }, { status: 404 });
    }

    // 2. الحصول على الحساب الرئيسي للمستخدم لجلب الـ Access Token
    const { data: account } = await supabase
        .from('gmb_accounts')
        .select('id, account_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

    if (!account) {
        return NextResponse.json({ error: 'No active GMB account found.' }, { status: 403 });
    }

    if (!account.account_id) {
        return NextResponse.json({ error: 'Active GMB account is missing account_id.' }, { status: 422 });
    }

    const accessToken = await getValidAccessToken(supabase, account.id);

    let successfulPublishes = 0;
    let failedPublishes = 0;

    // 3. التكرار على كل موقع وتنفيذ النشر
    for (const locationId of locationIds) {

        // بناء مسار المورد المطلوب لـ GMB API
        const locationResource = buildLocationResourceName(account.account_id, locationId);

        // 💡 تحويل كائن المنشور (Post object) من Supabase إلى كائن (LocalPost) مناسب لـ GMB API
        const localPostData = {
            summary: postData.content,
            languageCode: 'en-US', // 💡 يجب أن يكون هذا ديناميكياً
            // ... يمكنك إضافة حقول أخرى مثل actionType و media و topicType

            // مثال على إضافة CTA
            callToAction: (postData.callToAction && postData.callToActionUrl) ? {
                actionType: postData.callToAction, // مثال: 'CALL' أو 'LEARN_MORE'
                url: postData.callToActionUrl,
            } : undefined,

            // مثال على إضافة صورة (صورة واحدة)
            media: postData.mediaUrl ? [{ mediaFormat: 'PHOTO', sourceUrl: postData.mediaUrl }] : undefined,
        };

        const publishUrl = `${GMB_V4_BASE}/${locationResource}/localPosts`;

        const response = await fetch(publishUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(localPostData),
        });

        if (response.ok) {
            successfulPublishes++;
        } else {
            failedPublishes++;
            const error = await response.json();
            console.error(`[Bulk Publish] Failed for ${locationId}:`, error);
        }
    }

    // 4. إرجاع النتيجة
    return NextResponse.json({ 
        success: successfulPublishes > 0,
        message: `Bulk publish complete: ${successfulPublishes} successful, ${failedPublishes} failed.`,
        successfulCount: successfulPublishes,
        failedCount: failedPublishes,
    });

  } catch (error: any) {
    console.error('API Error during bulk publish:', error);
    return NextResponse.json({ error: error.message || 'Failed to process bulk publish' }, { status: 500 });
  }
}