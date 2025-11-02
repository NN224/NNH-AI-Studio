import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { errorResponse, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// GET - Fetch questions for user's locations
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const locationId = searchParams.get('locationId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('gmb_questions')
      .select(`
        *,
        location:gmb_locations(id, location_name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);

    // Apply filters
    if (locationId) {
      query = query.eq('location_id', locationId);
    }
    if (status) {
      query = query.eq('answer_status', status);
    }

    const { data: questions, error: questionsError } = await query;

    if (questionsError) {
      console.error('[Questions API] Error fetching questions:', questionsError);
      return errorResponse('DATABASE_ERROR', 'Failed to fetch questions', 500);
    }

    // Get counts for different statuses
    const { data: statusCounts } = await supabase
      .from('gmb_questions')
      .select('answer_status')
      .eq('user_id', user.id);

    const counts = {
      total: statusCounts?.length || 0,
      pending: statusCounts?.filter(q => q.answer_status === 'pending').length || 0,
      answered: statusCounts?.filter(q => q.answer_status === 'answered').length || 0,
      draft: statusCounts?.filter(q => q.answer_status === 'draft').length || 0,
    };

    return successResponse({
      questions: questions || [],
      counts,
      pagination: {
        limit,
        offset,
        hasMore: questions?.length === limit
      }
    });

  } catch (error: any) {
    console.error('[Questions API] Unexpected error:', error);
    return errorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

// POST - Create a new question (manual entry or from sync)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    const body = await request.json();
    const { locationId, questionText, authorName, authorType } = body;

    // Validate required fields
    if (!locationId || !questionText) {
      return errorResponse('MISSING_FIELDS', 'Location ID and question text are required', 400);
    }

    // Verify location ownership
    const { data: location, error: locationError } = await supabase
      .from('gmb_locations')
      .select('id, gmb_account_id')
      .eq('id', locationId)
      .eq('user_id', user.id)
      .single();

    if (locationError || !location) {
      return errorResponse('NOT_FOUND', 'Location not found', 404);
    }

    // Create question
    const { data: question, error: createError } = await supabase
      .from('gmb_questions')
      .insert({
        user_id: user.id,
        location_id: locationId,
        gmb_account_id: location.gmb_account_id,
        question_text: questionText,
        author_name: authorName || 'Anonymous',
        author_type: authorType || 'CUSTOMER',
        answer_status: 'pending'
      })
      .select()
      .single();

    if (createError) {
      console.error('[Questions API] Error creating question:', createError);
      return errorResponse('DATABASE_ERROR', 'Failed to create question', 500);
    }

    return successResponse({
      question,
      message: 'Question created successfully'
    });

  } catch (error: any) {
    console.error('[Questions API] Unexpected error:', error);
    return errorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
