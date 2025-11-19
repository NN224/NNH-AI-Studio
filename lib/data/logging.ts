import { createClient } from '../../lib/supabase/server';

export async function logAutoAnswer(questionId: string, result: any, userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('question_auto_answers_log')
    .insert([{
      question_id: questionId,
      user_id: userId,
      answer_text: result.answer,
      confidence_score: result.confidence,
      ai_provider: result.provider,
      ai_model: result.model,
      context_used: result.contextUsed,
      question_category: result.category,
      language_detected: result.language || 'auto',
      processing_time_ms: result.processingTime,
      tokens_used: result.tokensUsed,
      cost_usd: result.cost || 0,
      status: 'posted',
      posted_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function logLowConfidenceAnswer(questionId: string, result: any, userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('question_auto_answers_log')
    .insert([{
      question_id: questionId,
      user_id: userId,
      answer_text: result.answer,
      confidence_score: result.confidence,
      ai_provider: result.provider,
      ai_model: result.model,
      context_used: result.contextUsed,
      question_category: result.category,
      language_detected: result.language || 'auto',
      processing_time_ms: result.processingTime,
      tokens_used: result.tokensUsed,
      cost_usd: result.cost || 0,
      status: 'pending',
      error_message: 'Low confidence - requires review',
      posted_at: null
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function postAnswer(questionId: string, answer: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('gmb_questions')
    .update({ answer_text: answer, updated_at: new Date().toISOString() })
    .eq('id', questionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
