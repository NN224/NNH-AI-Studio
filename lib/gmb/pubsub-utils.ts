/**
 * Google Cloud Pub/Sub Utilities for GMB Notifications
 *
 * This module provides utilities for parsing and processing
 * Google Cloud Pub/Sub messages from GMB (Google My Business).
 *
 * @see https://cloud.google.com/pubsub/docs/push
 * @see https://developers.google.com/my-business/content/notifications
 */

/**
 * Pub/Sub Push Message Structure
 *
 * Google Cloud Pub/Sub sends messages in this format:
 * {
 *   message: {
 *     data: "base64-encoded-string",
 *     messageId: "unique-message-id",
 *     publishTime: "2024-01-01T00:00:00.000Z",
 *     attributes: { ... }
 *   },
 *   subscription: "projects/PROJECT_ID/subscriptions/SUBSCRIPTION_NAME"
 * }
 */
export interface PubSubPushMessage {
  message: {
    data: string; // Base64-encoded payload
    messageId: string;
    publishTime: string;
    attributes?: Record<string, string>;
  };
  subscription: string;
}

/**
 * GMB Notification Structure (inside Pub/Sub message.data)
 *
 * After decoding the Base64 data, you'll get this structure:
 */
export interface GMBNotification {
  name: string; // Resource name: accounts/{accountId}/locations/{locationId}
  notificationTypes: GMBNotificationType[];
  topicName?: string;
}

/**
 * GMB Notification Types
 *
 * These are the types of notifications Google sends for GMB updates
 */
export type GMBNotificationType =
  | "NEW_REVIEW" // New customer review posted
  | "UPDATED_REVIEW" // Existing review updated
  | "NEW_QUESTIONS" // New customer question posted
  | "UPDATED_QUESTIONS" // Existing question updated
  | "NEW_ANSWERS" // New answer to question
  | "UPDATED_ANSWERS" // Answer updated
  | "LOCATION_VERIFICATION" // Location verification status changed
  | "VOICE_OF_MERCHANT" // Voice of merchant feedback
  | "GOOGLE_UPDATE" // Google made an update to the listing
  | "DUPLICATE" // Duplicate location detected
  | "MEDIA_ITEM_REQUIRES_REVIEW" // Media item needs review
  | "REVIEWABLE_BUSINESS_CATEGORIES"; // Business categories need review

/**
 * Location Info extracted from notification
 */
export interface LocationInfo {
  accountId: string;
  locationId: string;
  resourceName: string; // Full resource name
}

/**
 * Decodes Base64-encoded Pub/Sub message data
 *
 * @param base64Data - Base64-encoded string from message.data
 * @returns Decoded string (usually JSON)
 *
 * @example
 * const decoded = decodePubSubData(message.data);
 * const notification = JSON.parse(decoded) as GMBNotification;
 */
export function decodePubSubData(base64Data: string): string {
  if (!base64Data) {
    throw new Error("Empty base64 data provided");
  }

  try {
    // Decode from Base64 to UTF-8 string
    const decoded = Buffer.from(base64Data, "base64").toString("utf-8");
    return decoded;
  } catch (error) {
    throw new Error(
      `Failed to decode Base64 data: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Parses a Pub/Sub push message to extract GMB notification
 *
 * @param pubsubMessage - Raw Pub/Sub push message
 * @returns Parsed GMB notification
 *
 * @example
 * const notification = parsePubSubMessage(request.body);
 * console.log(notification.notificationTypes);
 */
export function parsePubSubMessage(
  pubsubMessage: PubSubPushMessage,
): GMBNotification {
  if (!pubsubMessage?.message?.data) {
    throw new Error("Invalid Pub/Sub message structure: missing message.data");
  }

  try {
    // Step 1: Decode Base64 data
    const decodedData = decodePubSubData(pubsubMessage.message.data);

    // Step 2: Parse JSON
    const notification = JSON.parse(decodedData) as GMBNotification;

    // Step 3: Validate required fields
    if (!notification.name) {
      throw new Error('GMB notification missing "name" field');
    }

    if (
      !notification.notificationTypes ||
      !Array.isArray(notification.notificationTypes)
    ) {
      throw new Error(
        'GMB notification missing or invalid "notificationTypes" field',
      );
    }

    if (notification.notificationTypes.length === 0) {
      throw new Error("GMB notification has empty notificationTypes array");
    }

    return notification;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `Failed to parse GMB notification JSON: ${error.message}`,
      );
    }
    throw error;
  }
}

/**
 * Extracts location information from GMB notification
 *
 * Resource name format: accounts/{accountId}/locations/{locationId}
 *
 * @param notification - GMB notification
 * @returns Location info or null if extraction fails
 *
 * @example
 * const location = extractLocationInfo(notification);
 * if (location) {
 *   console.log(`Account: ${location.accountId}, Location: ${location.locationId}`);
 * }
 */
export function extractLocationInfo(
  notification: GMBNotification,
): LocationInfo | null {
  if (!notification?.name) {
    return null;
  }

  // Format: accounts/{accountId}/locations/{locationId}
  const match = notification.name.match(
    /^accounts\/([^/]+)\/locations\/([^/]+)$/,
  );

  if (!match) {
    console.warn(
      "[Pub/Sub Utils] Could not extract location info from:",
      notification.name,
    );
    return null;
  }

  return {
    accountId: match[1],
    locationId: match[2],
    resourceName: notification.name,
  };
}

/**
 * Validates GMB notification structure
 *
 * @param notification - Notification object to validate
 * @returns true if valid, false otherwise
 */
export function validateGMBNotification(
  notification: any,
): notification is GMBNotification {
  if (!notification || typeof notification !== "object") {
    return false;
  }

  if (!notification.name || typeof notification.name !== "string") {
    return false;
  }

  if (!Array.isArray(notification.notificationTypes)) {
    return false;
  }

  if (notification.notificationTypes.length === 0) {
    return false;
  }

  // Validate notification types are strings
  if (
    !notification.notificationTypes.every(
      (type: any) => typeof type === "string",
    )
  ) {
    return false;
  }

  return true;
}

/**
 * Validates known GMB notification types
 *
 * @param types - Array of notification types
 * @returns Array of unknown types (empty if all are valid)
 */
export function getUnknownNotificationTypes(types: string[]): string[] {
  const validTypes: GMBNotificationType[] = [
    "NEW_REVIEW",
    "UPDATED_REVIEW",
    "NEW_QUESTIONS",
    "UPDATED_QUESTIONS",
    "NEW_ANSWERS",
    "UPDATED_ANSWERS",
    "LOCATION_VERIFICATION",
    "VOICE_OF_MERCHANT",
    "GOOGLE_UPDATE",
    "DUPLICATE",
    "MEDIA_ITEM_REQUIRES_REVIEW",
    "REVIEWABLE_BUSINESS_CATEGORIES",
  ];

  return types.filter(
    (type) => !validTypes.includes(type as GMBNotificationType),
  );
}

/**
 * Checks if a Pub/Sub message is a duplicate based on messageId
 *
 * This is useful for implementing idempotency in webhook handlers.
 * Store processed message IDs in your database and check against them.
 *
 * @param messageId - Pub/Sub message ID
 * @param processedIds - Set or array of already processed message IDs
 * @returns true if message is a duplicate
 */
export function isDuplicateMessage(
  messageId: string,
  processedIds: Set<string> | string[],
): boolean {
  if (processedIds instanceof Set) {
    return processedIds.has(messageId);
  }
  return processedIds.includes(messageId);
}

/**
 * Verifies webhook secret from query parameter
 *
 * This is a basic security measure for Pub/Sub push endpoints.
 * For production, consider using Google's OIDC token verification.
 *
 * @see https://cloud.google.com/pubsub/docs/push#setting_up_for_push_authentication
 *
 * @param requestUrl - Full request URL
 * @param expectedSecret - Secret from environment variable
 * @returns true if secret matches
 */
export function verifyPubSubSecret(
  requestUrl: string,
  expectedSecret: string,
): boolean {
  if (!expectedSecret) {
    console.warn("[Pub/Sub Security] No webhook secret configured");
    return false;
  }

  try {
    const url = new URL(requestUrl);
    const secret = url.searchParams.get("secret");

    if (!secret) {
      console.warn("[Pub/Sub Security] No secret parameter in request");
      return false;
    }

    // Use constant-time comparison to prevent timing attacks
    if (secret.length !== expectedSecret.length) {
      return false;
    }

    // Simple constant-time comparison for strings
    let matches = true;
    for (let i = 0; i < secret.length; i++) {
      if (secret[i] !== expectedSecret[i]) {
        matches = false;
      }
    }

    return matches;
  } catch (error) {
    console.error("[Pub/Sub Security] Error verifying secret:", error);
    return false;
  }
}

/**
 * Creates a standardized error response for Pub/Sub webhooks
 *
 * Note: For Pub/Sub, it's recommended to return 200 OK even on processing errors
 * to prevent Google from retrying indefinitely. Log errors instead.
 *
 * @param error - Error object
 * @param messageId - Pub/Sub message ID (for logging)
 * @returns Error details object
 */
export function createPubSubErrorResponse(error: unknown, messageId?: string) {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  const errorStack = error instanceof Error ? error.stack : undefined;

  return {
    error: true,
    message: errorMessage,
    messageId,
    timestamp: new Date().toISOString(),
    // Don't expose stack trace in production
    ...(process.env.NODE_ENV === "development" && { stack: errorStack }),
  };
}
