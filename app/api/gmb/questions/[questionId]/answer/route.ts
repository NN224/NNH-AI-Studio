import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { errorResponse, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

// POST - Answer a question
export async function POST(
  request: NextRequest,
  { params }: { params: { questionId: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    const { questionId } = params;
    const body = await request.json();
    const { answerText, isDraft = false } = body;

    // Validate required fields
    if (!answerText) {
      return errorResponse('MISSING_FIELDS', 'Answer text is required', 400);
    }

    // Verify question ownership
    const { data: question, error: questionError } = await supabase
      .from('gmb_questions')
      .select('*')
      .eq('id', questionId)
      .eq('user_id', user.id)
      .single();

    if (questionError || !question) {
      return errorResponse('NOT_FOUND', 'Question not found', 404);
    }

    // Update question with answer
    const { data: updatedQuestion, error: updateError } = await supabase
      .from('gmb_questions')
      .update({
        answer_text: answerText,
        answer_status: isDraft ? 'draft' : 'answered',
        answered_by: user.email || user.id,
        answered_at: isDraft ? null : new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', questionId)
      .select()
      .single();

    if (updateError) {
      console.error('[Questions API] Error updating answer:', updateError);
      return errorResponse('DATABASE_ERROR', 'Failed to update answer', 500);
    }

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        activity_type: isDraft ? 'question_draft' : 'question_answered',
        activity_message: isDraft 
          ? `Saved draft answer for question`
          : `Answered customer question`,
        metadata: { question_id: questionId }
      });

    return successResponse({
      question: updatedQuestion,
      message: isDraft ? 'Draft saved successfully' : 'Question answered successfully'
    });

  } catch (error: any) {
    console.error('[Questions API] Unexpected error:', error);
    return errorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

// DELETE - Delete an answer (revert to pending)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { questionId: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    const { questionId } = params;

    // Verify question ownership
    const { data: question, error: questionError } = await supabase
      .from('gmb_questions')
      .select('*')
      .eq('id', questionId)
      .eq('user_id', user.id)
      .single();

    if (questionError || !question) {
      return errorResponse('NOT_FOUND', 'Question not found', 404);
    }

    // Remove answer
    const { data: updatedQuestion, error: updateError } = await supabase
      .from('gmb_questions')
      .update({
        answer_text: null,
        answer_status: 'pending',
        answered_by: null,
        answered_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', questionId)
      .select()
      .single();

    if (updateError) {
      console.error('[Questions API] Error removing answer:', updateError);
      return errorResponse('DATABASE_ERROR', 'Failed to remove answer', 500);
    }

    return successResponse({
      question: updatedQuestion,
      message: 'Answer removed successfully'
    });

  } catch (error: any) {
    console.error('[Questions API] Unexpected error:', error);
    return errorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
