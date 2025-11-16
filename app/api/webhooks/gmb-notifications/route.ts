import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyPubSubSignature } from '@/lib/gmb/pubsub-helpers'

export const dynamic = 'force-dynamic'

/**
 * Webhook endpoint for Google Business Profile Pub/Sub notifications
 * 
 * This endpoint receives real-time notifications from Google when:
 * - New reviews are posted
 * - Questions are asked
 * - Customer media is uploaded
 * - Location updates occur
 * - And more...
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify Pub/Sub signature
    const signature = request.headers.get('x-goog-signature')
    const body = await request.text()

    if (!verifyPubSubSignature(signature, body)) {
      console.error('[GMB Webhook] Invalid Pub/Sub signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // 2. Parse the Pub/Sub message
    let message: any
    try {
      message = JSON.parse(body)
    } catch (error) {
      console.error('[GMB Webhook] Failed to parse message body:', error)
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 })
    }

    // 3. Decode the base64 data
    let notificationData: any
    try {
      const decodedData = Buffer.from(message.message.data, 'base64').toString('utf-8')
      notificationData = JSON.parse(decodedData)
    } catch (error) {
      console.error('[GMB Webhook] Failed to decode message data:', error)
      return NextResponse.json({ error: 'Invalid message data' }, { status: 400 })
    }

    console.log('[GMB Webhook] Received notification:', {
      type: notificationData.notificationType,
      location: notificationData.locationName,
      timestamp: notificationData.createTime,
    })

    // 4. Process the notification based on type
    const supabase = await createClient()
    
    switch (notificationData.notificationType) {
      case 'NEW_REVIEW':
        await handleNewReview(supabase, notificationData)
        break

      case 'UPDATED_REVIEW':
        await handleUpdatedReview(supabase, notificationData)
        break

      case 'NEW_QUESTION':
        await handleNewQuestion(supabase, notificationData)
        break

      case 'UPDATED_QUESTION':
        await handleUpdatedQuestion(supabase, notificationData)
        break

      case 'NEW_ANSWER':
        await handleNewAnswer(supabase, notificationData)
        break

      case 'UPDATED_ANSWER':
        await handleUpdatedAnswer(supabase, notificationData)
        break

      case 'NEW_CUSTOMER_MEDIA':
        await handleNewCustomerMedia(supabase, notificationData)
        break

      case 'GOOGLE_UPDATE':
        await handleGoogleUpdate(supabase, notificationData)
        break

      case 'DUPLICATE_LOCATION':
        await handleDuplicateLocation(supabase, notificationData)
        break

      case 'VOICE_OF_MERCHANT_UPDATED':
        await handleVoiceOfMerchantUpdate(supabase, notificationData)
        break

      default:
        console.warn('[GMB Webhook] Unknown notification type:', notificationData.notificationType)
    }

    // 5. Acknowledge receipt
    return NextResponse.json({ ok: true, messageId: message.message.messageId })
  } catch (error: any) {
    console.error('[GMB Webhook] Error processing notification:', {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      error,
    })

    // Return 200 to acknowledge receipt even on error
    // This prevents Pub/Sub from retrying indefinitely
    return NextResponse.json({ ok: false, error: error.message }, { status: 200 })
  }
}

/**
 * Handle NEW_REVIEW notification
 */
async function handleNewReview(supabase: any, data: any) {
  console.log('[GMB Webhook] Processing new review:', data.reviewName)

  // Find the location and user
  const { data: location } = await supabase
    .from('gmb_locations')
    .select('id, user_id, name')
    .eq('location_id', data.locationName)
    .single()

  if (!location) {
    console.warn('[GMB Webhook] Location not found:', data.locationName)
    return
  }

  // Create notification for the user
  await supabase.from('notifications').insert({
    user_id: location.user_id,
    type: 'new_review',
    notification_type: 'NEW_REVIEW',
    title: 'مراجعة جديدة',
    message: `تم نشر مراجعة جديدة على ${location.name}`,
    location_id: location.id,
    location_name: data.locationName,
    review_name: data.reviewName,
    raw_data: data,
    read: false,
    created_at: new Date().toISOString(),
  })

  console.log('[GMB Webhook] Created notification for new review')
}

/**
 * Handle UPDATED_REVIEW notification
 */
async function handleUpdatedReview(supabase: any, data: any) {
  console.log('[GMB Webhook] Processing updated review:', data.reviewName)

  const { data: location } = await supabase
    .from('gmb_locations')
    .select('id, user_id, name')
    .eq('location_id', data.locationName)
    .single()

  if (!location) {
    console.warn('[GMB Webhook] Location not found:', data.locationName)
    return
  }

  await supabase.from('notifications').insert({
    user_id: location.user_id,
    type: 'updated_review',
    notification_type: 'UPDATED_REVIEW',
    title: 'تحديث مراجعة',
    message: `تم تحديث مراجعة على ${location.name}`,
    location_id: location.id,
    location_name: data.locationName,
    review_name: data.reviewName,
    raw_data: data,
    read: false,
    created_at: new Date().toISOString(),
  })

  console.log('[GMB Webhook] Created notification for updated review')
}

/**
 * Handle NEW_QUESTION notification
 */
async function handleNewQuestion(supabase: any, data: any) {
  console.log('[GMB Webhook] Processing new question:', data.questionName)

  const { data: location } = await supabase
    .from('gmb_locations')
    .select('id, user_id, name')
    .eq('location_id', data.locationName)
    .single()

  if (!location) {
    console.warn('[GMB Webhook] Location not found:', data.locationName)
    return
  }

  await supabase.from('notifications').insert({
    user_id: location.user_id,
    type: 'new_question',
    notification_type: 'NEW_QUESTION',
    title: 'سؤال جديد',
    message: `تم طرح سؤال جديد على ${location.name}`,
    location_id: location.id,
    location_name: data.locationName,
    question_name: data.questionName,
    raw_data: data,
    read: false,
    created_at: new Date().toISOString(),
  })

  console.log('[GMB Webhook] Created notification for new question')
}

/**
 * Handle UPDATED_QUESTION notification
 */
async function handleUpdatedQuestion(supabase: any, data: any) {
  console.log('[GMB Webhook] Processing updated question:', data.questionName)

  const { data: location } = await supabase
    .from('gmb_locations')
    .select('id, user_id, name')
    .eq('location_id', data.locationName)
    .single()

  if (!location) {
    console.warn('[GMB Webhook] Location not found:', data.locationName)
    return
  }

  await supabase.from('notifications').insert({
    user_id: location.user_id,
    type: 'updated_question',
    notification_type: 'UPDATED_QUESTION',
    title: 'تحديث سؤال',
    message: `تم تحديث سؤال على ${location.name}`,
    location_id: location.id,
    location_name: data.locationName,
    question_name: data.questionName,
    raw_data: data,
    read: false,
    created_at: new Date().toISOString(),
  })

  console.log('[GMB Webhook] Created notification for updated question')
}

/**
 * Handle NEW_ANSWER notification
 */
async function handleNewAnswer(supabase: any, data: any) {
  console.log('[GMB Webhook] Processing new answer:', data.answerName)

  const { data: location } = await supabase
    .from('gmb_locations')
    .select('id, user_id, name')
    .eq('location_id', data.locationName)
    .single()

  if (!location) {
    console.warn('[GMB Webhook] Location not found:', data.locationName)
    return
  }

  await supabase.from('notifications').insert({
    user_id: location.user_id,
    type: 'new_answer',
    notification_type: 'NEW_ANSWER',
    title: 'إجابة جديدة',
    message: `تم نشر إجابة جديدة على ${location.name}`,
    location_id: location.id,
    location_name: data.locationName,
    question_name: data.questionName,
    answer_name: data.answerName,
    raw_data: data,
    read: false,
    created_at: new Date().toISOString(),
  })

  console.log('[GMB Webhook] Created notification for new answer')
}

/**
 * Handle UPDATED_ANSWER notification
 */
async function handleUpdatedAnswer(supabase: any, data: any) {
  console.log('[GMB Webhook] Processing updated answer:', data.answerName)

  const { data: location } = await supabase
    .from('gmb_locations')
    .select('id, user_id, name')
    .eq('location_id', data.locationName)
    .single()

  if (!location) {
    console.warn('[GMB Webhook] Location not found:', data.locationName)
    return
  }

  await supabase.from('notifications').insert({
    user_id: location.user_id,
    type: 'updated_answer',
    notification_type: 'UPDATED_ANSWER',
    title: 'تحديث إجابة',
    message: `تم تحديث إجابة على ${location.name}`,
    location_id: location.id,
    location_name: data.locationName,
    question_name: data.questionName,
    answer_name: data.answerName,
    raw_data: data,
    read: false,
    created_at: new Date().toISOString(),
  })

  console.log('[GMB Webhook] Created notification for updated answer')
}

/**
 * Handle NEW_CUSTOMER_MEDIA notification
 */
async function handleNewCustomerMedia(supabase: any, data: any) {
  console.log('[GMB Webhook] Processing new customer media:', data.mediaName)

  const { data: location } = await supabase
    .from('gmb_locations')
    .select('id, user_id, name')
    .eq('location_id', data.locationName)
    .single()

  if (!location) {
    console.warn('[GMB Webhook] Location not found:', data.locationName)
    return
  }

  await supabase.from('notifications').insert({
    user_id: location.user_id,
    type: 'new_media',
    notification_type: 'NEW_CUSTOMER_MEDIA',
    title: 'صورة/فيديو جديد',
    message: `تم رفع صورة أو فيديو جديد على ${location.name}`,
    location_id: location.id,
    location_name: data.locationName,
    media_name: data.mediaName,
    raw_data: data,
    read: false,
    created_at: new Date().toISOString(),
  })

  console.log('[GMB Webhook] Created notification for new customer media')
}

/**
 * Handle GOOGLE_UPDATE notification
 */
async function handleGoogleUpdate(supabase: any, data: any) {
  console.log('[GMB Webhook] Processing Google update:', data.locationName)

  const { data: location } = await supabase
    .from('gmb_locations')
    .select('id, user_id, name')
    .eq('location_id', data.locationName)
    .single()

  if (!location) {
    console.warn('[GMB Webhook] Location not found:', data.locationName)
    return
  }

  await supabase.from('notifications').insert({
    user_id: location.user_id,
    type: 'google_update',
    notification_type: 'GOOGLE_UPDATE',
    title: 'تحديث من Google',
    message: `قامت Google بتحديث معلومات ${location.name}`,
    location_id: location.id,
    location_name: data.locationName,
    raw_data: data,
    read: false,
    created_at: new Date().toISOString(),
  })

  console.log('[GMB Webhook] Created notification for Google update')
}

/**
 * Handle DUPLICATE_LOCATION notification
 */
async function handleDuplicateLocation(supabase: any, data: any) {
  console.log('[GMB Webhook] Processing duplicate location:', data.locationName)

  const { data: location } = await supabase
    .from('gmb_locations')
    .select('id, user_id, name')
    .eq('location_id', data.locationName)
    .single()

  if (!location) {
    console.warn('[GMB Webhook] Location not found:', data.locationName)
    return
  }

  await supabase.from('notifications').insert({
    user_id: location.user_id,
    type: 'duplicate_location',
    notification_type: 'DUPLICATE_LOCATION',
    title: 'موقع مكرر',
    message: `تم اكتشاف موقع مكرر لـ ${location.name}`,
    location_id: location.id,
    location_name: data.locationName,
    raw_data: data,
    read: false,
    created_at: new Date().toISOString(),
  })

  console.log('[GMB Webhook] Created notification for duplicate location')
}

/**
 * Handle VOICE_OF_MERCHANT_UPDATED notification
 */
async function handleVoiceOfMerchantUpdate(supabase: any, data: any) {
  console.log('[GMB Webhook] Processing Voice of Merchant update:', data.locationName)

  const { data: location } = await supabase
    .from('gmb_locations')
    .select('id, user_id, name')
    .eq('location_id', data.locationName)
    .single()

  if (!location) {
    console.warn('[GMB Webhook] Location not found:', data.locationName)
    return
  }

  await supabase.from('notifications').insert({
    user_id: location.user_id,
    type: 'vom_update',
    notification_type: 'VOICE_OF_MERCHANT_UPDATED',
    title: 'تحديث حالة الموقع',
    message: `تم تحديث حالة Voice of Merchant لـ ${location.name}`,
    location_id: location.id,
    location_name: data.locationName,
    raw_data: data,
    read: false,
    created_at: new Date().toISOString(),
  })

  console.log('[GMB Webhook] Created notification for VOM update')
}

