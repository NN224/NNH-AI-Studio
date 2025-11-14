import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logServerActivity } from '@/server/services/activity';
import { errorResponse, successResponse } from '@/lib/utils/api-response';
import { getValidAccessToken } from '@/lib/gmb/helpers';
import { validateBody } from '@/middleware/validate-request';
import { questionAnswerSchema } from '@/lib/validations/schemas';
import { sanitizeHtml } from '@/lib/security/sanitize-html';

export const dynamic = 'force-dynamic';

const QANDA_API_BASE = 'https://mybusinessqanda.googleapis.com/v1';

// Publish answer to Google Q&A API
async function publishAnswerToGoogle(
  accessToken: string,
  locationId: string,
  questionId: string,
  answerText: string
): Promise<any> {
  // Build resource name: locations/{location_id}/questions/{question_id}
  // locationId should be just the ID (e.g., "11247391224469965786") or "locations/11247391224469965786"
  let cleanLocationId = locationId;
  if (locationId.startsWith('locations/')) {
    cleanLocationId = locationId.replace(/^locations\//, '');
  }

  // questionId from external_question_id might be in format "questions/..." or just the ID
  let cleanQuestionId = questionId;
  if (questionId.includes('/questions/')) {
    cleanQuestionId = questionId.split('/questions/')[1];
  }

  const parentResource = `locations/${cleanLocationId}/questions/${cleanQuestionId}`;
  const url = `${QANDA_API_BASE}/${parentResource}/answers:upsert`;

  const payload = {
    answer: {
      text: answerText,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    let errorData: any = {};
    
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { message: errorText || 'Unknown error' };
    }
    
    console.error('[Q&A API] Failed to publish answer to Google:', {
      status: response.status,
      statusText: response.statusText,
      error: errorData,
      url: url,
    });

    throw new Error(errorData.error?.message || errorData.message || 'Failed to publish answer to Google');
  }

  return await response.json();
}

// Delete answer from Google Q&A API
async function deleteAnswerFromGoogle(
  accessToken: string,
  locationId: string,
  questionId: string,
  answerId?: string
): Promise<void> {
  // Build resource name: locations/{location_id}/questions/{question_id}
  let cleanLocationId = locationId;
  if (locationId.startsWith('locations/')) {
    cleanLocationId = locationId.replace(/^locations\//, '');
  }

  let cleanQuestionId = questionId;
  if (questionId.includes('/questions/')) {
    cleanQuestionId = questionId.split('/questions/')[1];
  }

  // If answerId is provided, use specific answer resource
  // Otherwise, try to get the answer first or use a default path
  const answerResource = answerId 
    ? `locations/${cleanLocationId}/questions/${cleanQuestionId}/answers/${answerId}`
    : `locations/${cleanLocationId}/questions/${cleanQuestionId}/answers/default`;

  const url = `${QANDA_API_BASE}/${answerResource}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    // 404 is acceptable if answer doesn't exist
    const errorText = await response.text().catch(() => '');
    let errorData: any = {};
    
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { message: errorText || 'Unknown error' };
    }
    
    console.error('[Q&A API] Failed to delete answer from Google:', {
      status: response.status,
      statusText: response.statusText,
      error: errorData,
      url: url,
    });

    throw new Error(errorData.error?.message || errorData.message || 'Failed to delete answer from Google');
  }
}

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
    const validation = await validateBody(request, questionAnswerSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { answerText, isDraft = false } = validation.data;
    const safeAnswerText = sanitizeHtml(answerText).trim();

    if (!safeAnswerText) {
      return errorResponse('MISSING_FIELDS', 'Answer text is required', 400);
    }

    // Verify question ownership and get full details
    const { data: question, error: questionError } = await supabase
      .from('gmb_questions')
      .select(`
        *,
        location:gmb_locations(id, gmb_account_id, location_id)
      `)
      .eq('id', questionId)
      .eq('user_id', user.id)
      .single();

    if (questionError || !question) {
      return errorResponse('NOT_FOUND', 'Question not found', 404);
    }

    // Check if the question belongs to an active account
    const location = question.location as any;
    if (!location?.gmb_account_id || !location?.location_id) {
      return errorResponse('INVALID_LOCATION', 'Question location is missing required information', 400);
    }

    const { data: account, error: accountError } = await supabase
      .from('gmb_accounts')
      .select('id, is_active, access_token, refresh_token, token_expires_at')
      .eq('id', location.gmb_account_id)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      return errorResponse('ACCOUNT_NOT_FOUND', 'Account not found', 404);
    }

    if (!account.is_active) {
      return errorResponse('FORBIDDEN', 'Cannot answer questions for inactive accounts', 403);
    }

    // Check if question has external_question_id (from Google)
    if (!question.external_question_id) {
      // Question doesn't have Google ID yet, save locally only
      console.warn('[Q&A API] Question missing external_question_id, saving locally only');
    }

    // If not a draft and question has external_question_id, publish to Google
    let googleAnswerData: any = null;
    if (!isDraft && question.external_question_id && location.location_id) {
      try {
        const accessToken = await getValidAccessToken(supabase, account.id);
        googleAnswerData = await publishAnswerToGoogle(
          accessToken,
          location.location_id,
          question.external_question_id,
          safeAnswerText
        );
      } catch (googleError: any) {
        console.error('[Q&A API] Failed to publish answer to Google:', googleError);
        // Continue to save locally even if Google publish fails
        // But mark it in the status
      }
    }

    // Update question with answer
    const updateData: any = {
      answer_text: safeAnswerText,
      answer_status: isDraft ? 'draft' : 'answered',
      answered_by: user.email || user.id,
      answered_at: isDraft ? null : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Store Google answer metadata if available
    if (googleAnswerData) {
      updateData.metadata = {
        ...((question.metadata as any) || {}),
        google_answer: {
          name: googleAnswerData.name,
          createTime: googleAnswerData.createTime,
          updateTime: googleAnswerData.updateTime,
        }
      };
    }

    const { data: updatedQuestion, error: updateError } = await supabase
      .from('gmb_questions')
      .update(updateData)
      .eq('id', questionId)
      .select()
      .single();

    if (updateError) {
      console.error('[Questions API] Error updating answer:', updateError);
      return errorResponse('DATABASE_ERROR', 'Failed to update answer', 500);
    }

    // Log activity (non-blocking)
    try {
      await logServerActivity({
        userId: user.id,
        type: isDraft ? 'question_draft' : 'question_answered',
        message: isDraft ? 'Saved draft answer for question' : 'Answered customer question',
        metadata: { question_id: questionId },
      });
    } catch (logError) {
      // Don't fail the request if logging fails
      console.error('[Questions API] Error logging activity:', logError);
    }

    const message = isDraft 
      ? 'Draft saved successfully' 
      : (googleAnswerData 
          ? 'Question answered and published to Google successfully' 
          : 'Question answered successfully (saved locally)');

    const sanitizedQuestion = updatedQuestion
      ? {
          ...updatedQuestion,
          answer_text: updatedQuestion.answer_text ? sanitizeHtml(updatedQuestion.answer_text) : null,
          question_text: updatedQuestion.question_text ? sanitizeHtml(updatedQuestion.question_text) : null,
        }
      : null;

    return successResponse({
      question: sanitizedQuestion,
      message,
      publishedToGoogle: !!googleAnswerData
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

    // Verify question ownership and get full details
    const { data: question, error: questionError } = await supabase
      .from('gmb_questions')
      .select(`
        *,
        location:gmb_locations(id, gmb_account_id, location_id)
      `)
      .eq('id', questionId)
      .eq('user_id', user.id)
      .single();

    if (questionError || !question) {
      return errorResponse('NOT_FOUND', 'Question not found', 404);
    }

    // Check if the question belongs to an active account
    const location = question.location as any;
    if (!location?.gmb_account_id || !location?.location_id) {
      return errorResponse('INVALID_LOCATION', 'Question location is missing required information', 400);
    }

    const { data: account, error: accountError } = await supabase
      .from('gmb_accounts')
      .select('id, is_active, access_token, refresh_token, token_expires_at')
      .eq('id', location.gmb_account_id)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      return errorResponse('ACCOUNT_NOT_FOUND', 'Account not found', 404);
    }

    if (!account.is_active) {
      return errorResponse('FORBIDDEN', 'Cannot modify questions for inactive accounts', 403);
    }

    // Delete answer from Google if question has external_question_id
    if (question.external_question_id && location.location_id && question.answer_text) {
      try {
        const accessToken = await getValidAccessToken(supabase, account.id);
        const metadata = (question.metadata as any) || {};
        const googleAnswer = metadata.google_answer;
        const answerId = googleAnswer?.name?.split('/answers/')?.[1] || undefined;
        
        await deleteAnswerFromGoogle(
          accessToken,
          location.location_id,
          question.external_question_id,
          answerId
        );
      } catch (googleError: any) {
        console.error('[Q&A API] Failed to delete answer from Google:', googleError);
        // Continue to delete locally even if Google delete fails
      }
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

    // Unified activity log: Answer removed
    try {
      await logServerActivity({
        userId: user.id,
        type: 'question_answer_removed',
        message: 'Removed answer and reverted question to pending',
        metadata: { question_id: questionId },
      });
    } catch {}

    const sanitizedQuestion = updatedQuestion
      ? {
          ...updatedQuestion,
          question_text: updatedQuestion.question_text ? sanitizeHtml(updatedQuestion.question_text) : updatedQuestion.question_text,
        }
      : null;

    return successResponse({
      question: sanitizedQuestion,
      message: 'Answer removed successfully'
    });

  } catch (error: any) {
    console.error('[Questions API] Unexpected error:', error);
    return errorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
