/**
 * AI Usage API Route
 * Returns user's AI usage statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserAIUsage, userHasOwnAPIKey } from '@/lib/ai/fallback-provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET - Get AI usage for user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get usage from query params or use authenticated user
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || user.id;

    // Security: Only allow users to see their own usage
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get usage statistics
    const usage = await getUserAIUsage(userId);

    // Check if user has own API key
    const hasOwnKey = await userHasOwnAPIKey(userId);

    return NextResponse.json({
      usage,
      hasOwnKey,
    });
  } catch (error) {
    console.error('AI Usage GET Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

