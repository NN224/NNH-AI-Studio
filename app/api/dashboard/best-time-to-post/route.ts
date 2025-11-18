import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBestTimeToPost } from '@/app/[locale]/(dashboard)/dashboard/actions';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/best-time-to-post
 * Returns the best time to post based on historical data
 */
export async function GET(request: NextRequest) {
  try {
    const result = await getBestTimeToPost();
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Best Time to Post] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to calculate best time',
        data: { hour: 15, minute: 0, confidence: 'low' as const }
      },
      { status: 500 }
    );
  }
}

