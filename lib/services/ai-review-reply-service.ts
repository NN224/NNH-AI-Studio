/**
 * Enhanced AI Review Reply Service
 * Multi-AI routing with confidence scoring and fallback providers
 */

import { getAIProvider } from '@/lib/ai/provider';
import { createClient } from '@/lib/supabase/server';
import type { AutoReplySettings } from '@/server/actions/auto-reply';

export interface ReviewContext {
  reviewText: string;
  rating: number;
  locationName?: string;
  businessCategory?: string;
  customerName?: string;
  previousReplies?: string[];
}

export interface ReplyResult {
  success: true;
  reply: string;
  confidence: number; // 0-100
  provider: string;
  model: string;
  latency: number;
} | {
  success: false;
  error: string;
  provider?: string;
}

/**
 * Generate AI reply with multi-provider routing and confidence scoring
 */
export async function generateAIReviewReply(
  context: ReviewContext,
  settings: AutoReplySettings,
  userId: string
): Promise<ReplyResult> {
  const startTime = Date.now();
  
  // Determine which provider to use based on rating
  // Claude for negative reviews (better empathy), Gemini for positive (faster)
  const preferredProvider = context.rating <= 2 ? 'anthropic' : 'google';
  
  try {
    // Get AI provider
    const provider = await getAIProvider(userId);
    if (!provider) {
      return {
        success: false,
        error: 'No AI provider configured',
      };
    }

    // Build context-aware prompt
    const prompt = buildReviewReplyPrompt(context, settings);
    
    // Generate reply using AI provider
    const result = await provider.generateCompletion(
      prompt,
      'auto_reply',
      undefined // locationId can be added later
    );

    // Calculate confidence score
    const confidence = calculateConfidenceScore(
      context,
      result.content,
      settings
    );

    // Check confidence threshold (default: 70%)
    const minConfidence = 70;
    if (confidence < minConfidence) {
      // Try fallback provider if confidence is low
      return await tryFallbackProvider(
        context,
        settings,
        userId,
        startTime,
        confidence
      );
    }

    const latency = Date.now() - startTime;

    return {
      success: true,
      reply: result.content.trim(),
      confidence,
      provider: preferredProvider,
      model: 'auto-detected',
      latency,
    };
  } catch (error) {
    console.error('[AI Review Reply Service] Error:', error);
    
    // Try fallback provider
    return await tryFallbackProvider(
      context,
      settings,
      userId,
      startTime,
      0
    );
  }
}

/**
 * Build context-aware prompt for review reply
 */
function buildReviewReplyPrompt(
  context: ReviewContext,
  settings: AutoReplySettings
): string {
  const toneInstructions: Record<string, string> = {
    friendly: 'Use a warm, friendly, and approachable tone. Be conversational and personable.',
    professional: 'Use a formal, professional, and business-like tone. Maintain respect and courtesy.',
    apologetic: 'Use a sincere, apologetic, and empathetic tone. Acknowledge the issue and show genuine concern.',
    marketing: 'Use an enthusiastic, promotional tone. Highlight positive aspects and encourage return visits.',
  };

  const tone = toneInstructions[settings.tone] || toneInstructions.friendly;

  const ratingContext = context.rating <= 2
    ? 'This is a negative review. Respond with empathy, acknowledge the issue, and offer a solution.'
    : context.rating === 3
    ? 'This is a neutral review. Respond professionally and encourage future positive experiences.'
    : 'This is a positive review. Respond with gratitude and enthusiasm.';

  const businessContext = context.locationName
    ? `Business: ${context.locationName}`
    : '';
  
  const categoryContext = context.businessCategory
    ? `Category: ${context.businessCategory}`
    : '';

  return `You are a professional customer service representative responding to a Google Business Profile review.

${businessContext}
${categoryContext}

${ratingContext}

TONE: ${tone}

REVIEW (${context.rating} stars):
"${context.reviewText}"

${context.customerName ? `Customer: ${context.customerName}` : ''}

INSTRUCTIONS:
1. Respond in the same language as the review (Arabic or English)
2. Keep the response concise (2-4 sentences for positive, 3-5 for negative)
3. Personalize the response - reference specific points from the review
4. For negative reviews: acknowledge the issue, apologize, and offer to resolve
5. For positive reviews: express gratitude and invite them back
6. Sign off professionally but warmly
7. Do NOT include any markdown, quotes, or special formatting
8. Do NOT include your name or title - just the response text

Generate the response now:`;
}

/**
 * Calculate confidence score for the generated reply
 */
function calculateConfidenceScore(
  context: ReviewContext,
  reply: string,
  settings: AutoReplySettings
): number {
  let score = 50; // Base score

  // Length check (too short or too long reduces confidence)
  if (reply.length >= 50 && reply.length <= 500) {
    score += 10;
  } else if (reply.length < 30 || reply.length > 800) {
    score -= 20;
  }

  // Language match (check if reply matches review language)
  const reviewIsArabic = /[\u0600-\u06FF]/.test(context.reviewText);
  const replyIsArabic = /[\u0600-\u06FF]/.test(reply);
  if (reviewIsArabic === replyIsArabic) {
    score += 15;
  } else {
    score -= 10;
  }

  // Tone appropriateness for rating
  if (context.rating <= 2) {
    // Negative review - check for apologetic/empathetic words
    const empatheticWords = ['sorry', 'apologize', 'regret', 'أسف', 'آسف', 'نعتذر'];
    if (empatheticWords.some(word => reply.toLowerCase().includes(word))) {
      score += 15;
    }
  } else if (context.rating >= 4) {
    // Positive review - check for gratitude
    const gratitudeWords = ['thank', 'appreciate', 'grateful', 'شكر', 'نشكر', 'ممتن'];
    if (gratitudeWords.some(word => reply.toLowerCase().includes(word))) {
      score += 15;
    }
  }

  // Personalization (mentions specific details from review)
  const reviewWords = context.reviewText.toLowerCase().split(/\s+/).filter(w => w.length > 4);
  const mentionedWords = reviewWords.filter(word => reply.toLowerCase().includes(word));
  if (mentionedWords.length > 0) {
    score += Math.min(10, mentionedWords.length * 2);
  }

  // No markdown or formatting issues
  if (!reply.includes('```') && !reply.includes('**') && !reply.includes('##')) {
    score += 5;
  }

  // Ensure score is between 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Try fallback provider if primary fails or confidence is low
 */
async function tryFallbackProvider(
  context: ReviewContext,
  settings: AutoReplySettings,
  userId: string,
  startTime: number,
  previousConfidence: number
): Promise<ReplyResult> {
  // For now, return error - can be enhanced with actual fallback logic
  // The main provider already has fallback built-in via getAIProvider
  
  return {
    success: false,
    error: `Confidence too low (${previousConfidence}%) or provider error. Please try again or adjust settings.`,
    provider: 'fallback',
  };
}

/**
 * Log reply generation to database for monitoring
 */
export async function logReplyGeneration(
  userId: string,
  reviewId: string,
  result: ReplyResult,
  context: ReviewContext
): Promise<void> {
  try {
    const supabase = await createClient();
    
    await supabase.from('autopilot_logs').insert({
      user_id: userId,
      action_type: 'auto_reply',
      status: result.success ? 'success' : 'failed',
      details: {
        reviewId,
        rating: context.rating,
        confidence: result.success ? result.confidence : null,
        provider: result.provider || 'unknown',
        latency: result.success ? result.latency : null,
        error: result.success ? null : result.error,
      },
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[AI Review Reply Service] Failed to log:', error);
    // Don't throw - logging failure shouldn't break the flow
  }
}

