import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import crypto from 'crypto';

/**
 * Webhook handler for new GMB questions
 * Called by Google My Business when a new question is posted
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify webhook signature (if configured)
    const headersList = await headers();
    const signature = headersList.get('x-gmb-signature');
    const webhookSecret = process.env.GMB_WEBHOOK_SECRET;
    
    if (webhookSecret && signature) {
      // Verify signature
      const payload = await request.text();
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        console.error('Invalid webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    const body = await request.json();
    const { question, locationId, userId } = body;

    if (!question || !locationId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Save question to database
    const { data: savedQuestion, error: insertError } = await supabase
      .from('gmb_questions')
      .insert({
        user_id: userId,
        location_id: locationId,
        question_text: question.text,
        author_name: question.author?.displayName || 'Anonymous',
        create_time: question.createTime || new Date().toISOString(),
        update_time: question.updateTime || new Date().toISOString(),
        gmb_question_id: question.name,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving question:', insertError);
      return NextResponse.json(
        { error: 'Failed to save question' },
        { status: 500 }
      );
    }

    // Trigger auto-answer process (async)
    // Don't await - let it run in background
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/questions/auto-answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: savedQuestion.id,
      }),
    }).catch(err => {
      console.error('Failed to trigger auto-answer:', err);
    });

    return NextResponse.json({
      received: true,
      questionId: savedQuestion.id,
      message: 'Question received and auto-answer triggered',
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for webhook verification (Google verification)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('hub.challenge');
  const verifyToken = searchParams.get('hub.verify_token');
  
  const expectedToken = process.env.GMB_WEBHOOK_VERIFY_TOKEN;
  
  if (verifyToken === expectedToken) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
  
  return NextResponse.json({ error: 'Invalid verify token' }, { status: 403 });
}
