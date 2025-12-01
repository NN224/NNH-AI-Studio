// app/api/locations/bulk-publish/route.ts

import { createClient } from "@/lib/supabase/server";
import { apiLogger } from "@/lib/utils/logger";
import { NextRequest, NextResponse } from "next/server";
// 💡 افتراض: استيراد الدوال المساعدة من ملفات الـ Helpers لديك
import {
  getValidAccessToken,
  buildLocationResourceName,
} from "@/lib/gmb/helpers"; // ⭐️ يجب تعديل هذا المسار
// 💡 افتراض: استيراد دالة جلب المنشور من Supabase
import { fetchPostContent } from "@/lib/posts/posts-crud"; // ⭐️ يجب تعديل هذا المسار

// Line 12 - Replace hardcoded API endpoint with environment variable
const GMB_V4_BASE =
  process.env.GMB_V4_BASE_URL || "https://mybusiness.googleapis.com/v4";

/**
 * مسار API لتنفيذ النشر الجماعي لمنشور GMB واحد على عدة مواقع.
 * هذا المنطق ينشر المنشور المخزن لدينا في DB إلى المواقع المحددة.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // ✅ SECURITY: Enhanced authentication validation
  // Using getUser() instead of getSession() for secure authentication
  // getUser() validates against Supabase Auth server, preventing cookie tampering
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    // Only log unexpected errors, not missing sessions (expected when user isn't logged in)
    if (authError && authError.name !== "AuthSessionMissingError") {
      apiLogger.error(
        "Authentication error",
        authError instanceof Error ? authError : new Error(String(authError)),
      );
    }
    return NextResponse.json(
      { error: "Unauthorized: Valid authentication required" },
      { status: 401 },
    );
  }

  try {
    const { locationIds, postId } = await request.json();

    // ✅ SECURITY: Input validation
    if (!Array.isArray(locationIds) || locationIds.length === 0) {
      return NextResponse.json(
        {
          error: "Invalid input",
          message: "locationIds must be a non-empty array",
        },
        { status: 400 },
      );
    }

    if (!postId || typeof postId !== "string") {
      return NextResponse.json(
        {
          error: "Invalid input",
          message: "postId is required and must be a string",
        },
        { status: 400 },
      );
    }

    // ✅ SECURITY: Limit bulk operations to prevent abuse
    if (locationIds.length > 100) {
      return NextResponse.json(
        {
          error: "Too many locations",
          message: "Maximum 100 locations allowed per bulk operation",
        },
        { status: 400 },
      );
    }

    // ✅ SECURITY: Validate location IDs format (UUIDs)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (
      !locationIds.every((id) => typeof id === "string" && uuidRegex.test(id))
    ) {
      return NextResponse.json(
        {
          error: "Invalid location IDs",
          message: "All location IDs must be valid UUIDs",
        },
        { status: 400 },
      );
    }

    // ✅ SECURITY: Verify all locations belong to the user
    const { data: userLocations, error: locationsError } = await supabase
      .from("gmb_locations")
      .select("id, gmb_account_id")
      .eq("user_id", user.id)
      .in("id", locationIds);

    if (locationsError) {
      apiLogger.error(
        "Error verifying locations",
        locationsError instanceof Error
          ? locationsError
          : new Error(String(locationsError)),
        { userId: user.id },
      );
      return NextResponse.json(
        {
          error: "Database error",
          message: "Failed to verify location ownership",
        },
        { status: 500 },
      );
    }

    if (!userLocations || userLocations.length !== locationIds.length) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Some locations do not belong to you or do not exist",
        },
        { status: 403 },
      );
    }

    // 1. جلب محتوى المنشور من قاعدة البيانات (لدينا)
    // 💡 افتراض أن هذه الدالة تجلب محتوى المنشور وكائن CTA و mediaUrl
    const postData = await fetchPostContent(supabase, postId);

    if (!postData) {
      return NextResponse.json(
        { error: "Post content not found or user unauthorized to publish." },
        { status: 404 },
      );
    }

    // 2. الحصول على الحساب الرئيسي للمستخدم لجلب الـ Access Token
    const { data: account } = await supabase
      .from("gmb_accounts")
      .select("id, account_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!account) {
      return NextResponse.json(
        { error: "No active GMB account found." },
        { status: 403 },
      );
    }

    if (!account.account_id) {
      return NextResponse.json(
        { error: "Active GMB account is missing account_id." },
        { status: 422 },
      );
    }

    const accessToken = await getValidAccessToken(supabase, account.id);

    let successfulPublishes = 0;
    let failedPublishes = 0;
    const errors: Array<{ locationId: string; error: string }> = [];

    // ✅ FIX: Process locations sequentially to prevent race conditions with proper error handling and synchronization
    for (const locationId of locationIds) {
      try {
        // بناء مسار المورد المطلوب لـ GMB API
        const locationResource = buildLocationResourceName(
          account.account_id,
          locationId,
        );

        // Process each location sequentially to prevent race conditions
        await processLocationPublish(
          locationResource,
          locationId,
          accessToken,
          supabase,
          postData,
        );
        successfulPublishes++;
      } catch (error) {
        failedPublishes++;
        errors.push({
          locationId,
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }

    // Helper function to ensure atomic operations per location
    async function processLocationPublish(
      locationResource: string,
      locationId: string,
      accessToken: string,
      supabase: any,
      postData: any,
    ) {
      // 💡 تحويل كائن المنشور (Post object) من Supabase إلى كائن (LocalPost) مناسب لـ GMB API
      const localPostData = {
        summary: postData.content,
        languageCode: "en-US", // 💡 يجب أن يكون هذا ديناميكياً
        // ... يمكنك إضافة حقول أخرى مثل actionType و media و topicType

        // مثال على إضافة CTA
        callToAction:
          postData.callToAction && postData.callToActionUrl
            ? {
                actionType: postData.callToAction, // مثال: 'CALL' أو 'LEARN_MORE'
                url: postData.callToActionUrl,
              }
            : undefined,

        // مثال على إضافة صورة (صورة واحدة)
        media: postData.mediaUrl
          ? [{ mediaFormat: "PHOTO", sourceUrl: postData.mediaUrl }]
          : undefined,
      };

      const publishUrl = `${GMB_V4_BASE}/${locationResource}/localPosts`;

      const response = await fetch(publishUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(localPostData),
      });

      if (!response.ok) {
        let errorMessage = "Unknown error";
        try {
          const error = await response.json();
          errorMessage =
            error.error?.message || error.message || `HTTP ${response.status}`;
          apiLogger.error(
            "[Bulk Publish] Failed for location",
            error instanceof Error ? error : new Error(String(error)),
            { locationId, status: response.status },
          );
        } catch (parseError) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          apiLogger.error(
            "[Bulk Publish] Failed to parse error response",
            parseError instanceof Error
              ? parseError
              : new Error(String(parseError)),
            { locationId, status: response.status },
          );
        }
        throw new Error(
          `Failed to publish location ${locationId}: ${errorMessage}`,
        );
      }
    }

    // 4. إرجاع النتيجة
    return NextResponse.json({
      success: successfulPublishes > 0,
      message: `Bulk publish complete: ${successfulPublishes} successful, ${failedPublishes} failed.`,
      successfulCount: successfulPublishes,
      failedCount: failedPublishes,
      errors: errors.length > 0 ? errors : undefined, // ✅ Include detailed errors
    });
  } catch (error: any) {
    // ✅ ERROR HANDLING: Enhanced error logging and user-friendly messages
    apiLogger.error(
      "API Error during bulk publish",
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: user?.id || "unknown",
        timestamp: new Date().toISOString(),
      },
    );

    // Don't expose internal error details to client
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to process bulk publish. Please try again later.",
        code: "BULK_PUBLISH_ERROR",
      },
      { status: 500 },
    );
  }
}
