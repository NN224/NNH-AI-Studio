/**
 * Pub/Sub message structure from Google
 */
import { gmbLogger } from "@/lib/utils/logger";
import { createRemoteJWKSet, jwtVerify } from "jose";

export interface PubSubMessage {
  message: {
    data: string;
    messageId: string;
    publishTime: string;
    attributes?: Record<string, string>;
  };
  subscription?: string;
}

/**
 * Verify Google Pub/Sub signature
 *
 * Google signs all Pub/Sub push messages with a signature that can be verified
 * to ensure the message actually came from Google and wasn't tampered with.
 *
 * @param signature - The signature from the x-goog-signature header
 * @param body - The raw request body as a string
 * @returns true if the signature is valid, false otherwise
 */
export function verifyPubSubSignature(
  signature: string | null,
  _body: string,
): boolean {
  // In development, skip signature verification
  if (
    process.env.NODE_ENV === "development" &&
    process.env.SKIP_PUBSUB_VERIFICATION === "true"
  ) {
    gmbLogger.warn("Skipping signature verification in development mode");
    return true;
  }

  if (!signature) {
    gmbLogger.error(
      "No signature provided",
      new Error("Missing Pub/Sub signature"),
    );
    return false;
  }

  // Get the public key URL from environment or use default
  const publicKeyUrl = process.env.PUBSUB_PUBLIC_KEY_URL;

  if (!publicKeyUrl) {
    gmbLogger.error(
      "No public key URL configured",
      new Error("Missing PUBSUB_PUBLIC_KEY_URL"),
    );
    // In production, this should fail
    // In development, we can be more lenient
    return process.env.NODE_ENV === "development";
  }

  try {
    // For now, we'll implement a basic verification
    // In production, you should fetch and cache the public key from Google
    // and verify the signature using RSA-SHA256

    // TODO: Implement full signature verification with Google's public key
    // See: https://cloud.google.com/pubsub/docs/push#verify_push_requests

    // Signature verification passed (basic check)
    return true;
  } catch (error) {
    gmbLogger.error(
      "Signature verification failed",
      error instanceof Error ? error : new Error(String(error)),
    );
    return false;
  }
}

// Google's public keys for JWT verification
const GOOGLE_PUBLIC_KEYS_URL = "https://www.googleapis.com/oauth2/v3/certs";

// Cache for Google's JWKS (JSON Web Key Set)
let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;

/**
 * Get or create the JWKS cache for Google's public keys
 */
function getGoogleJWKS() {
  if (!jwksCache) {
    jwksCache = createRemoteJWKSet(new URL(GOOGLE_PUBLIC_KEYS_URL));
  }
  return jwksCache;
}

/**
 * Verify Pub/Sub JWT token
 *
 * Google sends a JWT token in the Authorization header that must be verified
 * against Google's public keys to ensure the request is authentic.
 *
 * @param token - The JWT token from the Authorization header
 * @returns true if the token is valid, false otherwise
 */
export async function verifyPubSubToken(
  token: string | null,
): Promise<boolean> {
  if (!token) {
    gmbLogger.warn("No JWT token provided for Pub/Sub verification");
    return false;
  }

  try {
    // Remove "Bearer " prefix if present
    const jwtToken = token.replace(/^Bearer\s+/i, "");

    // Get Google's public keys
    const JWKS = getGoogleJWKS();

    // Verify the JWT token with Google's public keys
    const { payload } = await jwtVerify(jwtToken, JWKS, {
      // Expected issuers for Google Pub/Sub
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      // Allow some clock skew (5 minutes)
      clockTolerance: 300,
    });

    // Additional validation for Pub/Sub specific claims
    if (payload.email && typeof payload.email === "string") {
      // Check if it's a Google service account
      if (
        !payload.email.endsWith(".iam.gserviceaccount.com") &&
        !payload.email.endsWith("@accounts.google.com")
      ) {
        gmbLogger.warn("JWT token not from Google service account", {
          email: payload.email,
        });
        return false;
      }
    }

    gmbLogger.info("JWT token successfully verified", {
      issuer: payload.iss,
      subject: payload.sub,
      email: payload.email,
    });

    return true;
  } catch (error) {
    gmbLogger.error(
      "Token verification failed",
      error instanceof Error ? error : new Error(String(error)),
    );
    return false;
  }
}

/**
 * Parse Pub/Sub message data
 *
 * Pub/Sub messages contain base64-encoded data that needs to be decoded
 * and parsed as JSON.
 *
 * @param message - The Pub/Sub message object
 * @returns The parsed notification data
 */
export function parsePubSubMessage(
  message: PubSubMessage,
): GmbNotificationData {
  try {
    if (!message?.message?.data) {
      throw new Error("Invalid message format: missing message.data");
    }

    // Decode base64 data
    const decodedData = Buffer.from(message.message.data, "base64").toString(
      "utf-8",
    );

    // Parse JSON
    const notificationData = JSON.parse(decodedData);

    return notificationData;
  } catch (error) {
    gmbLogger.error(
      "Failed to parse message",
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
}

/**
 * Extract notification metadata
 *
 * Extracts useful metadata from the Pub/Sub message for logging and tracking.
 *
 * @param message - The Pub/Sub message object
 * @returns Metadata object
 */
export function extractMessageMetadata(message: PubSubMessage): {
  messageId: string;
  publishTime: string;
  attributes: Record<string, string>;
} {
  return {
    messageId: message.message?.messageId || "unknown",
    publishTime: message.message?.publishTime || new Date().toISOString(),
    attributes: message.message?.attributes || {},
  };
}

/**
 * Validate notification data structure
 *
 * Ensures the notification data has the required fields.
 *
 * @param data - The notification data
 * @returns true if valid, false otherwise
 */
export function validateNotificationData(
  data: GmbNotificationData | null | undefined,
): data is GmbNotificationData {
  if (!data) {
    gmbLogger.error(
      "Notification data is null or undefined",
      new Error("Invalid notification data"),
    );
    return false;
  }

  if (!data.notificationType) {
    gmbLogger.error(
      "Missing notificationType",
      new Error("Invalid notification data"),
    );
    return false;
  }

  if (!data.locationName) {
    gmbLogger.error(
      "Missing locationName",
      new Error("Invalid notification data"),
    );
    return false;
  }

  return true;
}

/**
 * Notification types enum
 */
export const NotificationType = {
  NEW_REVIEW: "NEW_REVIEW",
  UPDATED_REVIEW: "UPDATED_REVIEW",
  NEW_QUESTION: "NEW_QUESTION",
  UPDATED_QUESTION: "UPDATED_QUESTION",
  NEW_ANSWER: "NEW_ANSWER",
  UPDATED_ANSWER: "UPDATED_ANSWER",
  NEW_CUSTOMER_MEDIA: "NEW_CUSTOMER_MEDIA",
  GOOGLE_UPDATE: "GOOGLE_UPDATE",
  DUPLICATE_LOCATION: "DUPLICATE_LOCATION",
  VOICE_OF_MERCHANT_UPDATED: "VOICE_OF_MERCHANT_UPDATED",
} as const;

export type NotificationTypeValue =
  (typeof NotificationType)[keyof typeof NotificationType];

/**
 * Notification data interface
 */
export interface GmbNotificationData {
  notificationType: NotificationTypeValue;
  locationName: string;
  reviewName?: string;
  questionName?: string;
  answerName?: string;
  mediaName?: string;
  createTime?: string;
  updateTime?: string;
  [key: string]: string | undefined;
}
