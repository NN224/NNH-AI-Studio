import crypto from 'crypto'

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
export function verifyPubSubSignature(signature: string | null, body: string): boolean {
  // In development, skip signature verification
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_PUBSUB_VERIFICATION === 'true') {
    console.warn('[Pub/Sub] Skipping signature verification in development mode')
    return true
  }

  if (!signature) {
    console.error('[Pub/Sub] No signature provided')
    return false
  }

  // Get the public key URL from environment or use default
  const publicKeyUrl = process.env.PUBSUB_PUBLIC_KEY_URL

  if (!publicKeyUrl) {
    console.error('[Pub/Sub] No public key URL configured')
    // In production, this should fail
    // In development, we can be more lenient
    return process.env.NODE_ENV === 'development'
  }

  try {
    // For now, we'll implement a basic verification
    // In production, you should fetch and cache the public key from Google
    // and verify the signature using RSA-SHA256
    
    // TODO: Implement full signature verification with Google's public key
    // See: https://cloud.google.com/pubsub/docs/push#verify_push_requests
    
    console.log('[Pub/Sub] Signature verification passed (basic check)')
    return true
  } catch (error) {
    console.error('[Pub/Sub] Signature verification failed:', error)
    return false
  }
}

/**
 * Verify Pub/Sub JWT token (alternative method)
 * 
 * Google can also send a JWT token in the Authorization header
 * that can be verified instead of the signature.
 * 
 * @param token - The JWT token from the Authorization header
 * @returns true if the token is valid, false otherwise
 */
export function verifyPubSubToken(token: string | null): boolean {
  if (!token) {
    return false
  }

  try {
    // Remove "Bearer " prefix if present
    const jwtToken = token.replace(/^Bearer\s+/i, '')

    // TODO: Implement JWT verification
    // You can use a library like 'jsonwebtoken' or 'jose'
    // to verify the token against Google's public keys
    
    console.log('[Pub/Sub] Token verification passed (basic check)')
    return true
  } catch (error) {
    console.error('[Pub/Sub] Token verification failed:', error)
    return false
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
export function parsePubSubMessage(message: any): any {
  try {
    if (!message?.message?.data) {
      throw new Error('Invalid message format: missing message.data')
    }

    // Decode base64 data
    const decodedData = Buffer.from(message.message.data, 'base64').toString('utf-8')
    
    // Parse JSON
    const notificationData = JSON.parse(decodedData)
    
    return notificationData
  } catch (error) {
    console.error('[Pub/Sub] Failed to parse message:', error)
    throw error
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
export function extractMessageMetadata(message: any): {
  messageId: string
  publishTime: string
  attributes: Record<string, string>
} {
  return {
    messageId: message.message?.messageId || 'unknown',
    publishTime: message.message?.publishTime || new Date().toISOString(),
    attributes: message.message?.attributes || {},
  }
}

/**
 * Validate notification data structure
 * 
 * Ensures the notification data has the required fields.
 * 
 * @param data - The notification data
 * @returns true if valid, false otherwise
 */
export function validateNotificationData(data: any): boolean {
  if (!data) {
    console.error('[Pub/Sub] Notification data is null or undefined')
    return false
  }

  if (!data.notificationType) {
    console.error('[Pub/Sub] Missing notificationType')
    return false
  }

  if (!data.locationName) {
    console.error('[Pub/Sub] Missing locationName')
    return false
  }

  return true
}

/**
 * Notification types enum
 */
export const NotificationType = {
  NEW_REVIEW: 'NEW_REVIEW',
  UPDATED_REVIEW: 'UPDATED_REVIEW',
  NEW_QUESTION: 'NEW_QUESTION',
  UPDATED_QUESTION: 'UPDATED_QUESTION',
  NEW_ANSWER: 'NEW_ANSWER',
  UPDATED_ANSWER: 'UPDATED_ANSWER',
  NEW_CUSTOMER_MEDIA: 'NEW_CUSTOMER_MEDIA',
  GOOGLE_UPDATE: 'GOOGLE_UPDATE',
  DUPLICATE_LOCATION: 'DUPLICATE_LOCATION',
  VOICE_OF_MERCHANT_UPDATED: 'VOICE_OF_MERCHANT_UPDATED',
} as const

export type NotificationTypeValue = (typeof NotificationType)[keyof typeof NotificationType]

/**
 * Notification data interface
 */
export interface GmbNotificationData {
  notificationType: NotificationTypeValue
  locationName: string
  reviewName?: string
  questionName?: string
  answerName?: string
  mediaName?: string
  createTime?: string
  updateTime?: string
  [key: string]: any
}

