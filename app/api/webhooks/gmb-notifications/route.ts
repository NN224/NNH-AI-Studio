import { NextRequest, NextResponse } from 'next/server';
import {
  verifyGoogleWebhookSignature,
  validateWebhookPayload,
  extractLocationInfo,
  WebhookSecurityErrorCode,
} from '@/lib/security/webhook-verification';
import { createClient } from '@/lib/supabase/server';
import { checkKeyRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GMB Webhook Handler with Comprehensive Security
 *
 * Security Features:
 * - HMAC-SHA256 signature verification
 * - Timestamp validation (prevents replay attacks)
 * - Rate limiting (100 requests/hour per IP)
 * - Payload validation
 * - Constant-time signature comparison
 *
 * Supported Notification Types:
 * - NEW_REVIEW: New customer review posted
 * - UPDATED_REVIEW: Existing review updated
 * - NEW_QUESTIONS: New customer question posted
 * - UPDATED_QUESTIONS: Existing question updated
 * - NEW_ANSWERS: New answer to question
 * - UPDATED_ANSWERS: Answer updated
 * - LOCATION_VERIFICATION: Location verification status changed
 * - VOICE_OF_MERCHANT: Voice of merchant feedback
 *
 * @see https://developers.google.com/my-business/content/notifications
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  try {
    console.log('[GMB Webhook] Received notification from IP:', ip);

    // Step 1: Rate Limiting (prevent spam attacks)
    const rateLimitKey = `webhook:gmb:${ip}`;

    const rateLimit = await checkKeyRateLimit(
      rateLimitKey,
      100, // Max 100 webhooks per hour per IP
      60 * 60 * 1000, // 1 hour window
      'ratelimit:webhooks'
    );

    if (!rateLimit.success) {
      console.warn('[GMB Webhook] Rate limit exceeded for IP:', ip, {
        limit: rateLimit.limit,
        remaining: rateLimit.remaining,
        reset: rateLimit.reset,
      });

      return NextResponse.json(
        {
          error: 'Too many requests',
          retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimit.reset - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(rateLimit.limit),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(rateLimit.reset),
          },
        }
      );
    }

    // Step 2: Get webhook secret
    const webhookSecret = process.env.GOOGLE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('[GMB Webhook] GOOGLE_WEBHOOK_SECRET not configured in environment');
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      );
    }

    // Step 3: Read raw payload (needed for signature verification)
    const payload = await request.text();

    if (!payload) {
      console.warn('[GMB Webhook] Empty payload received from IP:', ip);
      return NextResponse.json(
        { error: 'Empty payload' },
        { status: 400 }
      );
    }

    // Step 4: Verify signature
    const signature = request.headers.get('x-goog-signature');

    const isValid = verifyGoogleWebhookSignature(payload, signature, webhookSecret);

    if (!isValid) {
      console.warn('[GMB Webhook] Invalid signature from IP:', ip, {
        hasSignature: !!signature,
        payloadLength: payload.length,
      });

      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    console.log('[GMB Webhook] Signature verified successfully');

    // Step 5: Parse and validate payload
    let data: any;

    try {
      data = JSON.parse(payload);
    } catch (error) {
      console.error('[GMB Webhook] Invalid JSON payload:', error);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    if (!validateWebhookPayload(data)) {
      console.warn('[GMB Webhook] Invalid payload structure:', {
        name: data?.name,
        types: data?.notificationTypes,
      });

      return NextResponse.json(
        { error: 'Invalid payload structure' },
        { status: 400 }
      );
    }

    // Step 6: Extract location information
    const locationInfo = extractLocationInfo(data);

    if (!locationInfo) {
      console.warn('[GMB Webhook] Could not extract location info from payload:', data.name);
      // Still process but log warning
    }

    console.log('[GMB Webhook] Valid notification received:', {
      resourceName: data.name,
      accountId: locationInfo?.accountId,
      locationId: locationInfo?.locationId,
      notificationTypes: data.notificationTypes,
      processingTime: Date.now() - startTime,
    });

    // Step 7: Process notification types
    const supabase = await createClient();
    const processedTypes: string[] = [];
    const errors: string[] = [];

    for (const notificationType of data.notificationTypes) {
      try {
        await processNotification(supabase, notificationType, data, locationInfo);
        processedTypes.push(notificationType);
      } catch (error) {
        console.error(`[GMB Webhook] Error processing ${notificationType}:`, error);
        errors.push(`${notificationType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Step 8: Log webhook receipt (for debugging and audit)
    const totalTime = Date.now() - startTime;

    if (errors.length === 0) {
      console.log('[GMB Webhook] Successfully processed all notifications:', {
        types: processedTypes,
        totalTime,
      });
    } else {
      console.warn('[GMB Webhook] Processed with errors:', {
        processed: processedTypes,
        errors,
        totalTime,
      });
    }

    // Always return 200 OK to acknowledge receipt
    // (Even if processing had errors - we don't want Google to retry immediately)
    return NextResponse.json({
      success: true,
      message: 'Webhook received and processed',
      processed: processedTypes,
      errors: errors.length > 0 ? errors : undefined,
      processingTime: totalTime,
    });
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('[GMB Webhook] Unexpected error:', error);

    // Log error to monitoring system (e.g., Sentry)
    if (typeof window === 'undefined' && (global as any).Sentry) {
      (global as any).Sentry.captureException(error, {
        tags: {
          webhook: 'gmb-notifications',
          ip,
        },
      });
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        processingTime: totalTime,
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for webhook verification
 *
 * Google may send verification requests during webhook setup
 *
 * @see https://developers.google.com/my-business/content/notifications#verification
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('hub.challenge');
  const verifyToken = searchParams.get('hub.verify_token');

  console.log('[GMB Webhook] Verification request received:', {
    hasChallenge: !!challenge,
    hasToken: !!verifyToken,
  });

  const expectedToken = process.env.GOOGLE_WEBHOOK_VERIFY_TOKEN;

  if (!expectedToken) {
    console.warn('[GMB Webhook] GOOGLE_WEBHOOK_VERIFY_TOKEN not configured');
    return NextResponse.json({ error: 'Verification not configured' }, { status: 500 });
  }

  if (verifyToken === expectedToken && challenge) {
    console.log('[GMB Webhook] Verification successful');
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  console.warn('[GMB Webhook] Verification failed - invalid token');
  return NextResponse.json({ error: 'Invalid verify token' }, { status: 403 });
}

/**
 * Process individual notification type
 *
 * @param supabase - Supabase client
 * @param notificationType - Type of notification (NEW_REVIEW, NEW_QUESTIONS, etc.)
 * @param payload - Full webhook payload
 * @param locationInfo - Extracted location information
 */
async function processNotification(
  supabase: any,
  notificationType: string,
  payload: any,
  locationInfo: { accountId: string; locationId: string } | null
): Promise<void> {
  switch (notificationType) {
    case 'NEW_REVIEW':
    case 'UPDATED_REVIEW':
      await processReviewNotification(supabase, notificationType, payload, locationInfo);
      break;

    case 'NEW_QUESTIONS':
    case 'UPDATED_QUESTIONS':
      await processQuestionNotification(supabase, notificationType, payload, locationInfo);
      break;

    case 'NEW_ANSWERS':
    case 'UPDATED_ANSWERS':
      await processAnswerNotification(supabase, notificationType, payload, locationInfo);
      break;

    case 'LOCATION_VERIFICATION':
      await processVerificationNotification(supabase, payload, locationInfo);
      break;

    case 'VOICE_OF_MERCHANT':
    case 'GOOGLE_UPDATE':
    case 'DUPLICATE':
      // Log but don't process these types yet
      console.log(`[GMB Webhook] Received ${notificationType} notification (not yet implemented)`);
      break;

    default:
      console.warn('[GMB Webhook] Unknown notification type:', notificationType);
  }
}

/**
 * Process review notifications
 */
async function processReviewNotification(
  supabase: any,
  notificationType: string,
  payload: any,
  locationInfo: { accountId: string; locationId: string } | null
): Promise<void> {
  if (!locationInfo) {
    throw new Error('Cannot process review notification without location info');
  }

  console.log(`[GMB Webhook] Processing ${notificationType} for location:`, locationInfo.locationId);

  // Find the location in our database using the GMB location ID
  const { data: location, error: locationError } = await supabase
    .from('gmb_locations')
    .select('id, user_id, gmb_account_id')
    .eq('location_id', `accounts/${locationInfo.accountId}/locations/${locationInfo.locationId}`)
    .maybeSingle();

  if (locationError || !location) {
    console.warn('[GMB Webhook] Location not found in database:', locationInfo.locationId);
    // Don't throw - might be a new location not yet synced
    return;
  }

  // Trigger incremental sync for reviews
  // Use a background job or queue for this
  const syncEndpoint = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/gmb/sync`;

  console.log('[GMB Webhook] Triggering review sync for location:', location.id);

  // Fire and forget - don't wait for sync to complete
  fetch(syncEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Trigger': 'true',
    },
    body: JSON.stringify({
      accountId: location.gmb_account_id,
      types: ['reviews'], // Only sync reviews
      locationId: location.id,
    }),
  }).catch((err) => {
    console.error('[GMB Webhook] Failed to trigger review sync:', err);
  });
}

/**
 * Process question notifications
 */
async function processQuestionNotification(
  supabase: any,
  notificationType: string,
  payload: any,
  locationInfo: { accountId: string; locationId: string } | null
): Promise<void> {
  if (!locationInfo) {
    throw new Error('Cannot process question notification without location info');
  }

  console.log(`[GMB Webhook] Processing ${notificationType} for location:`, locationInfo.locationId);

  // Find the location in our database
  const { data: location, error: locationError } = await supabase
    .from('gmb_locations')
    .select('id, user_id, gmb_account_id')
    .eq('location_id', `accounts/${locationInfo.accountId}/locations/${locationInfo.locationId}`)
    .maybeSingle();

  if (locationError || !location) {
    console.warn('[GMB Webhook] Location not found in database:', locationInfo.locationId);
    return;
  }

  // Trigger incremental sync for questions
  const syncEndpoint = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/gmb/sync`;

  console.log('[GMB Webhook] Triggering question sync for location:', location.id);

  fetch(syncEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Trigger': 'true',
    },
    body: JSON.stringify({
      accountId: location.gmb_account_id,
      types: ['questions'], // Only sync questions
      locationId: location.id,
    }),
  }).catch((err) => {
    console.error('[GMB Webhook] Failed to trigger question sync:', err);
  });
}

/**
 * Process answer notifications
 */
async function processAnswerNotification(
  supabase: any,
  notificationType: string,
  payload: any,
  locationInfo: { accountId: string; locationId: string } | null
): Promise<void> {
  console.log(`[GMB Webhook] Processing ${notificationType} (delegating to question sync)`);
  // Answers are part of questions, so trigger question sync
  await processQuestionNotification(supabase, 'UPDATED_QUESTIONS', payload, locationInfo);
}

/**
 * Process verification notifications
 */
async function processVerificationNotification(
  supabase: any,
  payload: any,
  locationInfo: { accountId: string; locationId: string } | null
): Promise<void> {
  if (!locationInfo) {
    throw new Error('Cannot process verification notification without location info');
  }

  console.log('[GMB Webhook] Processing LOCATION_VERIFICATION for:', locationInfo.locationId);

  // Update verification status in database
  const { error } = await supabase
    .from('gmb_locations')
    .update({
      // Add verification_status field if needed
      updated_at: new Date().toISOString(),
    })
    .eq('location_id', `accounts/${locationInfo.accountId}/locations/${locationInfo.locationId}`);

  if (error) {
    console.error('[GMB Webhook] Failed to update verification status:', error);
  }
}
