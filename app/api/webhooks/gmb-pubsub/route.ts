/**
 * Google Cloud Pub/Sub Webhook Handler for GMB Notifications
 *
 * This endpoint receives push notifications from Google Cloud Pub/Sub
 * for Google My Business events (reviews, questions, updates, etc.)
 *
 * Endpoint: https://nnh.ae/api/webhooks/gmb-pubsub?secret=YOUR_SECRET
 *
 * Security:
 * - Basic secret-based authentication via query parameter
 * - For production: Consider upgrading to OIDC token verification
 *
 * Important:
 * - Always returns 200 OK to prevent infinite retries from Pub/Sub
 * - Errors are logged but don't fail the request
 *
 * @see https://cloud.google.com/pubsub/docs/push
 * @see https://developers.google.com/my-business/content/notifications
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  parsePubSubMessage,
  extractLocationInfo,
  verifyPubSubSecret,
  getUnknownNotificationTypes,
  type PubSubPushMessage,
  type GMBNotification,
} from "@/lib/gmb/pubsub-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST handler for Pub/Sub push messages
 *
 * Pub/Sub sends messages with this structure:
 * {
 *   message: {
 *     data: "base64-encoded-gmb-notification",
 *     messageId: "...",
 *     publishTime: "..."
 *   },
 *   subscription: "projects/..."
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const ip =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";

  console.log("[GMB Pub/Sub] Received push notification from IP:", ip);

  try {
    // Step 1: Verify webhook secret (basic security)
    const webhookSecret = process.env.GMB_PUBSUB_SECRET;

    if (!webhookSecret) {
      console.error(
        "[GMB Pub/Sub] GMB_PUBSUB_SECRET not configured in environment",
      );
      // Return 200 OK to prevent retries, but log the error
      return NextResponse.json({
        received: true,
        error: "Webhook not configured",
        messageId: "unknown",
      });
    }

    const isValidSecret = verifyPubSubSecret(request.url, webhookSecret);

    if (!isValidSecret) {
      console.warn(
        "[GMB Pub/Sub] Invalid or missing secret parameter from IP:",
        ip,
      );
      // Return 200 OK to prevent retries, but mark as unauthorized
      return NextResponse.json({
        received: true,
        error: "Unauthorized",
        messageId: "unknown",
      });
    }

    console.log("[GMB Pub/Sub] Secret verified successfully");

    // Step 2: Parse request body
    let pubsubMessage: PubSubPushMessage;

    try {
      pubsubMessage = await request.json();
    } catch (error) {
      console.error("[GMB Pub/Sub] Failed to parse request body:", error);
      // Return 200 OK to prevent retries
      return NextResponse.json({
        received: true,
        error: "Invalid JSON body",
        messageId: "unknown",
      });
    }

    const messageId = pubsubMessage.message?.messageId || "unknown";

    console.log("[GMB Pub/Sub] Message ID:", messageId);
    console.log("[GMB Pub/Sub] Subscription:", pubsubMessage.subscription);
    console.log(
      "[GMB Pub/Sub] Publish Time:",
      pubsubMessage.message?.publishTime,
    );

    // Step 3: Parse GMB notification from Base64-encoded message.data
    let notification: GMBNotification;

    try {
      notification = parsePubSubMessage(pubsubMessage);
    } catch (error) {
      console.error("[GMB Pub/Sub] Failed to parse notification:", error);
      // Return 200 OK to acknowledge receipt (invalid format, no need to retry)
      return NextResponse.json({
        received: true,
        error:
          error instanceof Error
            ? error.message
            : "Failed to parse notification",
        messageId,
      });
    }

    console.log("[GMB Pub/Sub] Parsed notification:", {
      resourceName: notification.name,
      notificationTypes: notification.notificationTypes,
      topicName: notification.topicName,
    });

    // Step 4: Extract location information
    const locationInfo = extractLocationInfo(notification);

    if (!locationInfo) {
      console.warn(
        "[GMB Pub/Sub] Could not extract location info from:",
        notification.name,
      );
      // Still return 200 OK but log warning
      return NextResponse.json({
        received: true,
        messageId,
        warning: "Could not extract location info",
        resourceName: notification.name,
      });
    }

    console.log("[GMB Pub/Sub] Location info:", {
      accountId: locationInfo.accountId,
      locationId: locationInfo.locationId,
    });

    // Step 5: Check for unknown notification types
    const unknownTypes = getUnknownNotificationTypes(
      notification.notificationTypes,
    );

    if (unknownTypes.length > 0) {
      console.warn("[GMB Pub/Sub] Unknown notification types:", unknownTypes);
    }

    // Step 6: Process each notification type
    const supabase = await createClient();
    const processedTypes: string[] = [];
    const errors: { type: string; error: string }[] = [];

    for (const notificationType of notification.notificationTypes) {
      try {
        await processNotification(
          supabase,
          notificationType,
          notification,
          locationInfo,
          messageId,
        );
        processedTypes.push(notificationType);
        console.log(`[GMB Pub/Sub] ✓ Processed ${notificationType}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(
          `[GMB Pub/Sub] ✗ Error processing ${notificationType}:`,
          errorMessage,
        );
        errors.push({
          type: notificationType,
          error: errorMessage,
        });
      }
    }

    const totalTime = Date.now() - startTime;

    // Step 7: Return success response (always 200 OK)
    console.log("[GMB Pub/Sub] Processing complete:", {
      messageId,
      processed: processedTypes.length,
      errors: errors.length,
      totalTime: `${totalTime}ms`,
    });

    return NextResponse.json({
      received: true,
      messageId,
      resourceName: notification.name,
      accountId: locationInfo.accountId,
      locationId: locationInfo.locationId,
      processed: processedTypes,
      errors: errors.length > 0 ? errors : undefined,
      processingTime: totalTime,
    });
  } catch (error) {
    // Catch-all error handler
    const totalTime = Date.now() - startTime;
    console.error("[GMB Pub/Sub] Unexpected error:", error);

    // Log to Sentry if available
    if (typeof window === "undefined" && (global as any).Sentry) {
      (global as any).Sentry.captureException(error, {
        tags: {
          webhook: "gmb-pubsub",
          ip,
        },
      });
    }

    // Always return 200 OK to prevent Pub/Sub retries
    return NextResponse.json({
      received: true,
      error: "Internal server error",
      processingTime: totalTime,
    });
  }
}

/**
 * Process individual notification type
 *
 * This function delegates to specific handlers based on notification type
 */
async function processNotification(
  supabase: any,
  notificationType: string,
  notification: GMBNotification,
  locationInfo: { accountId: string; locationId: string },
  messageId: string,
): Promise<void> {
  switch (notificationType) {
    case "NEW_REVIEW":
    case "UPDATED_REVIEW":
      await processReviewNotification(
        supabase,
        notificationType,
        locationInfo,
        messageId,
      );
      break;

    case "NEW_QUESTIONS":
    case "UPDATED_QUESTIONS":
      await processQuestionNotification(
        supabase,
        notificationType,
        locationInfo,
        messageId,
      );
      break;

    case "NEW_ANSWERS":
    case "UPDATED_ANSWERS":
      await processAnswerNotification(
        supabase,
        notificationType,
        locationInfo,
        messageId,
      );
      break;

    case "LOCATION_VERIFICATION":
      await processVerificationNotification(supabase, locationInfo, messageId);
      break;

    case "MEDIA_ITEM_REQUIRES_REVIEW":
      await processMediaNotification(supabase, locationInfo, messageId);
      break;

    case "VOICE_OF_MERCHANT":
    case "GOOGLE_UPDATE":
    case "DUPLICATE":
    case "REVIEWABLE_BUSINESS_CATEGORIES":
      // Log but don't process these types yet
      console.log(
        `[GMB Pub/Sub] ${notificationType} received (not yet implemented)`,
        {
          locationId: locationInfo.locationId,
          messageId,
        },
      );
      break;

    default:
      console.warn(
        "[GMB Pub/Sub] Unknown notification type:",
        notificationType,
      );
  }
}

/**
 * Process review notifications (NEW_REVIEW, UPDATED_REVIEW)
 */
async function processReviewNotification(
  supabase: any,
  notificationType: string,
  locationInfo: { accountId: string; locationId: string },
  messageId: string,
): Promise<void> {
  console.log(
    `[GMB Pub/Sub] Processing ${notificationType} for location ${locationInfo.locationId}`,
  );

  // Find the location in our database
  const resourceName = `accounts/${locationInfo.accountId}/locations/${locationInfo.locationId}`;

  const { data: location, error: locationError } = await supabase
    .from("gmb_locations")
    .select("id, user_id, gmb_account_id, name")
    .eq("location_id", resourceName)
    .maybeSingle();

  if (locationError || !location) {
    console.warn("[GMB Pub/Sub] Location not found in database:", resourceName);
    // Don't throw - might be a new location not yet synced
    return;
  }

  console.log(
    `[GMB Pub/Sub] Found location in DB: ${location.name} (ID: ${location.id})`,
  );

  // Trigger incremental sync for reviews
  const syncEndpoint = `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/gmb/sync`;

  console.log("[GMB Pub/Sub] Triggering review sync...");

  // Fire and forget - don't wait for sync to complete
  fetch(syncEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Trigger": "pubsub",
      "X-Message-ID": messageId,
    },
    body: JSON.stringify({
      accountId: location.gmb_account_id,
      types: ["reviews"],
      locationId: location.id,
      incremental: true, // Only sync new/updated reviews
    }),
  }).catch((err) => {
    console.error("[GMB Pub/Sub] Failed to trigger review sync:", err);
  });

  // Log the notification for audit trail
  await logNotification(supabase, {
    location_id: location.id,
    notification_type: notificationType,
    message_id: messageId,
    processed_at: new Date().toISOString(),
  });
}

/**
 * Process question notifications (NEW_QUESTIONS, UPDATED_QUESTIONS)
 */
async function processQuestionNotification(
  supabase: any,
  notificationType: string,
  locationInfo: { accountId: string; locationId: string },
  messageId: string,
): Promise<void> {
  console.log(
    `[GMB Pub/Sub] Processing ${notificationType} for location ${locationInfo.locationId}`,
  );

  const resourceName = `accounts/${locationInfo.accountId}/locations/${locationInfo.locationId}`;

  const { data: location, error: locationError } = await supabase
    .from("gmb_locations")
    .select("id, user_id, gmb_account_id, name")
    .eq("location_id", resourceName)
    .maybeSingle();

  if (locationError || !location) {
    console.warn("[GMB Pub/Sub] Location not found in database:", resourceName);
    return;
  }

  console.log(
    `[GMB Pub/Sub] Found location in DB: ${location.name} (ID: ${location.id})`,
  );

  // Trigger incremental sync for questions
  const syncEndpoint = `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/gmb/sync`;

  console.log("[GMB Pub/Sub] Triggering question sync...");

  fetch(syncEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Trigger": "pubsub",
      "X-Message-ID": messageId,
    },
    body: JSON.stringify({
      accountId: location.gmb_account_id,
      types: ["questions"],
      locationId: location.id,
      incremental: true,
    }),
  }).catch((err) => {
    console.error("[GMB Pub/Sub] Failed to trigger question sync:", err);
  });

  await logNotification(supabase, {
    location_id: location.id,
    notification_type: notificationType,
    message_id: messageId,
    processed_at: new Date().toISOString(),
  });
}

/**
 * Process answer notifications (NEW_ANSWERS, UPDATED_ANSWERS)
 */
async function processAnswerNotification(
  supabase: any,
  notificationType: string,
  locationInfo: { accountId: string; locationId: string },
  messageId: string,
): Promise<void> {
  console.log(
    `[GMB Pub/Sub] Processing ${notificationType} (delegating to question sync)`,
  );
  // Answers are part of questions, so trigger question sync
  await processQuestionNotification(
    supabase,
    "UPDATED_QUESTIONS",
    locationInfo,
    messageId,
  );
}

/**
 * Process verification notifications (LOCATION_VERIFICATION)
 */
async function processVerificationNotification(
  supabase: any,
  locationInfo: { accountId: string; locationId: string },
  messageId: string,
): Promise<void> {
  console.log("[GMB Pub/Sub] Processing LOCATION_VERIFICATION");

  const resourceName = `accounts/${locationInfo.accountId}/locations/${locationInfo.locationId}`;

  const { error } = await supabase
    .from("gmb_locations")
    .update({
      updated_at: new Date().toISOString(),
      // Add verification_status field if needed in future
    })
    .eq("location_id", resourceName);

  if (error) {
    console.error(
      "[GMB Pub/Sub] Failed to update location verification:",
      error,
    );
    throw error;
  }

  await logNotification(supabase, {
    location_id: resourceName,
    notification_type: "LOCATION_VERIFICATION",
    message_id: messageId,
    processed_at: new Date().toISOString(),
  });
}

/**
 * Process media notifications (MEDIA_ITEM_REQUIRES_REVIEW)
 */
async function processMediaNotification(
  supabase: any,
  locationInfo: { accountId: string; locationId: string },
  messageId: string,
): Promise<void> {
  console.log("[GMB Pub/Sub] Processing MEDIA_ITEM_REQUIRES_REVIEW");

  const resourceName = `accounts/${locationInfo.accountId}/locations/${locationInfo.locationId}`;

  // Trigger media sync (if implemented)
  const syncEndpoint = `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/gmb/sync`;

  fetch(syncEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Trigger": "pubsub",
      "X-Message-ID": messageId,
    },
    body: JSON.stringify({
      accountId: locationInfo.accountId,
      types: ["media"],
      resourceName,
      incremental: true,
    }),
  }).catch((err) => {
    console.error("[GMB Pub/Sub] Failed to trigger media sync:", err);
  });

  await logNotification(supabase, {
    location_id: resourceName,
    notification_type: "MEDIA_ITEM_REQUIRES_REVIEW",
    message_id: messageId,
    processed_at: new Date().toISOString(),
  });
}

/**
 * Log notification for audit trail
 *
 * Note: You may want to create a gmb_webhook_logs table for this
 */
async function logNotification(
  supabase: any,
  data: {
    location_id: string | number;
    notification_type: string;
    message_id: string;
    processed_at: string;
  },
): Promise<void> {
  // Optional: Store in database for audit trail
  // For now, just log to console
  console.log("[GMB Pub/Sub] Notification logged:", data);

  // TODO: Implement database logging
  // await supabase.from('gmb_webhook_logs').insert(data);
}
