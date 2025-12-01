import { gmbLogger } from "@/lib/utils/logger";
import crypto from "crypto";

/**
 * Verifies Google webhook signature
 *
 * Google sends a signature in the X-Goog-Signature header
 * Format: timestamp.signature (HMAC-SHA256)
 *
 * Security Features:
 * - HMAC-SHA256 signature verification
 * - Timestamp validation (5-minute window)
 * - Constant-time comparison (prevents timing attacks)
 * - Replay attack prevention
 *
 * @see https://developers.google.com/my-business/content/notifications
 *
 * @param payload - Raw request body as string
 * @param signature - X-Goog-Signature header value (format: timestamp.signature)
 * @param secret - Webhook secret from Google Cloud Console
 * @returns true if signature is valid, false otherwise
 *
 * @example
 * const isValid = verifyGoogleWebhookSignature(
 *   await request.text(),
 *   request.headers.get('x-goog-signature'),
 *   process.env.GOOGLE_WEBHOOK_SECRET
 * );
 */
export function verifyGoogleWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) {
    gmbLogger.warn("Missing X-Goog-Signature header");
    return false;
  }

  if (!secret) {
    gmbLogger.error(
      "Missing webhook secret",
      new Error("GOOGLE_WEBHOOK_SECRET not configured"),
    );
    return false;
  }

  try {
    // Google signature format: "timestamp.signature"
    const [timestamp, receivedSignature] = signature.split(".");

    if (!timestamp || !receivedSignature) {
      gmbLogger.warn(
        'Invalid signature format - expected "timestamp.signature"',
      );
      return false;
    }

    // Validate timestamp is a number
    const messageTime = parseInt(timestamp, 10);
    if (isNaN(messageTime)) {
      gmbLogger.warn("Invalid timestamp in signature");
      return false;
    }

    // Check timestamp to prevent replay attacks (5 minute window)
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDiff = Math.abs(currentTime - messageTime);

    if (timeDiff > 300) {
      // 5 minutes = 300 seconds
      gmbLogger.warn("Signature timestamp too old", {
        timeDiff,
        maxSeconds: 300,
      });
      return false;
    }

    // Compute expected signature
    // Format: HMAC-SHA256(timestamp.payload, secret)
    const signedPayload = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(signedPayload, "utf8")
      .digest("hex");

    // Constant-time comparison to prevent timing attacks
    // Both strings must be same length for timingSafeEqual
    if (receivedSignature.length !== expectedSignature.length) {
      gmbLogger.warn("Signature length mismatch");
      return false;
    }

    const isValid = crypto.timingSafeEqual(
      Buffer.from(receivedSignature, "hex"),
      Buffer.from(expectedSignature, "hex"),
    );

    if (!isValid) {
      gmbLogger.warn("Signature verification failed");
    }

    return isValid;
  } catch (error) {
    gmbLogger.error(
      "Signature verification error",
      error instanceof Error ? error : new Error(String(error)),
    );
    return false;
  }
}

/**
 * Validates Google webhook payload structure
 *
 * Ensures the payload contains required fields and valid notification types
 *
 * @see https://developers.google.com/my-business/reference/notifications/rest
 *
 * @param payload - Parsed JSON payload
 * @returns true if payload structure is valid, false otherwise
 */
export function validateWebhookPayload(payload: any): boolean {
  if (!payload || typeof payload !== "object") {
    gmbLogger.warn("Payload is not an object");
    return false;
  }

  // Required field: name (resource name like "accounts/{accountId}/locations/{locationId}")
  if (!payload.name || typeof payload.name !== "string") {
    gmbLogger.warn('Missing or invalid "name" field');
    return false;
  }

  // Required field: notificationTypes (array of notification types)
  if (!payload.notificationTypes || !Array.isArray(payload.notificationTypes)) {
    gmbLogger.warn('Missing or invalid "notificationTypes" field');
    return false;
  }

  if (payload.notificationTypes.length === 0) {
    gmbLogger.warn("Empty notificationTypes array");
    return false;
  }

  // Validate notification types against known valid types
  const validTypes = [
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
  ];

  const hasValidType = payload.notificationTypes.every((type: any) => {
    if (typeof type !== "string") {
      return false;
    }
    return validTypes.includes(type);
  });

  if (!hasValidType) {
    gmbLogger.warn("Invalid or unknown notification types", {
      notificationTypes: payload.notificationTypes,
    });
    return false;
  }

  // Optional: Validate resource name format
  // Format: accounts/{accountId}/locations/{locationId}
  const resourcePattern = /^accounts\/\d+\/locations\/\d+$/;
  if (!resourcePattern.test(payload.name)) {
    gmbLogger.warn("Resource name does not match expected pattern", {
      name: payload.name,
    });
    // Don't reject - Google might send different formats
  }

  return true;
}

/**
 * Extracts location information from webhook payload
 *
 * @param payload - Validated webhook payload
 * @returns Object with accountId and locationId, or null if extraction fails
 */
export function extractLocationInfo(payload: any): {
  accountId: string;
  locationId: string;
} | null {
  if (!payload?.name) {
    return null;
  }

  // Format: accounts/{accountId}/locations/{locationId}
  const match = payload.name.match(/^accounts\/(\d+)\/locations\/(\d+)$/);

  if (!match) {
    gmbLogger.warn("Could not extract location info", { name: payload.name });
    return null;
  }

  return {
    accountId: match[1],
    locationId: match[2],
  };
}

/**
 * Webhook security error codes
 */
export enum WebhookSecurityErrorCode {
  MISSING_SIGNATURE = "MISSING_SIGNATURE",
  INVALID_SIGNATURE_FORMAT = "INVALID_SIGNATURE_FORMAT",
  SIGNATURE_EXPIRED = "SIGNATURE_EXPIRED",
  SIGNATURE_MISMATCH = "SIGNATURE_MISMATCH",
  INVALID_PAYLOAD = "INVALID_PAYLOAD",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  MISSING_SECRET = "MISSING_SECRET",
}

/**
 * Custom error class for webhook security issues
 */
export class WebhookSecurityError extends Error {
  code: WebhookSecurityErrorCode;
  statusCode: number;

  constructor(
    code: WebhookSecurityErrorCode,
    message: string,
    statusCode: number = 401,
  ) {
    super(message);
    this.name = "WebhookSecurityError";
    this.code = code;
    this.statusCode = statusCode;
  }
}
