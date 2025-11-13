import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { replyToReview } from '@/server/actions/reviews-management';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  reviewId: z.string().uuid(),
  locationId: z.string().uuid().optional(), // currently unused but kept for forwards compatibility
  replyText: z.string().min(1).max(4096, 'Reply must be less than 4096 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawBody = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request payload', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { reviewId, replyText } = parsed.data;

    // Delegate to existing server action which:
    // - Validates ownership
    // - Calls Google Business Profile API
    // - Updates gmb_reviews row
    const result = await replyToReview(reviewId, replyText);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to post reply',
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message ?? 'Reply posted successfully',
      data: result.data ?? null,
    });
  } catch (error: any) {
    console.error('[GMB Reviews][Reply] Unexpected error', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 },
    );
  }
}


