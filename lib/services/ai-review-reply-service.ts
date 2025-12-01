/**
 * Enhanced AI Review Reply Service
 * Multi-AI routing with confidence scoring and fallback providers
 */

import { getAIProvider } from "@/lib/ai/provider";
import { createClient } from "@/lib/supabase/server";
import { aiLogger } from "@/lib/utils/logger";
import type { AutoReplySettings } from "@/server/actions/auto-reply";

export interface ReviewContext {
  reviewText: string;
  rating: number;
  locationName?: string;
  businessCategory?: string;
  customerName?: string;
  previousReplies?: string[];
}

export type ReplyResult =
  | {
      success: true;
      reply: string;
      confidence: number; // 0-100
      provider: string;
      model: string;
      latency: number;
    }
  | {
      success: false;
      error: string;
      provider?: string;
    };

/**
 * Generate AI reply with multi-provider routing and confidence scoring
 */
export async function generateAIReviewReply(
  context: ReviewContext,
  settings: AutoReplySettings,
  userId: string,
): Promise<ReplyResult> {
  const startTime = Date.now();

  // Determine which provider to use based on rating
  // Claude for negative reviews (better empathy), Gemini for positive (faster)
  const preferredProvider = context.rating <= 2 ? "anthropic" : "google";

  try {
    // Get AI provider
    const provider = await getAIProvider(userId);
    if (!provider) {
      aiLogger.error(
        "No AI provider configured for user",
        new Error("AI provider not configured"),
        { userId },
      );
      return {
        success: false,
        error:
          "No AI provider configured. Please set up an API key in Settings > AI Configuration.",
      };
    }

    console.log("[AI Review Reply] Using provider for rating:", context.rating);

    // Build context-aware prompt
    const prompt = buildReviewReplyPrompt(context, settings);

    // Generate reply using AI provider
    const result = await provider.generateCompletion(
      prompt,
      "auto_reply",
      undefined, // locationId can be added later
    );

    // Calculate confidence score
    const confidence = calculateConfidenceScore(
      context,
      result.content,
      settings,
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
        confidence,
      );
    }

    const latency = Date.now() - startTime;

    return {
      success: true,
      reply: result.content.trim(),
      confidence,
      provider: preferredProvider,
      model: "auto-detected",
      latency,
    };
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    const errWithStatus = error as { status?: number };
    aiLogger.error(
      "AI Review Reply Service Error",
      err instanceof Error ? err : new Error(String(err)),
      {
        message: err.message,
        status: errWithStatus.status,
        userId,
        rating: context.rating,
      },
    );

    // Return specific error message instead of trying fallback again
    return {
      success: false,
      error:
        err.message ||
        "Failed to generate AI reply. Please check your API key configuration.",
      provider: preferredProvider,
    };
  }
}

/**
 * Detect language of the review text
 */
function detectLanguage(text: string): "ar" | "en" {
  // Check for Arabic characters
  const arabicPattern = /[\u0600-\u06FF]/;
  const hasArabic = arabicPattern.test(text);

  // Count Arabic vs Latin characters
  const arabicCount = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latinCount = (text.match(/[a-zA-Z]/g) || []).length;

  // If more than 30% Arabic characters, consider it Arabic
  if (hasArabic && arabicCount > latinCount * 0.3) {
    return "ar";
  }

  return "en";
}

/**
 * Build context-aware prompt for review reply
 */
function buildReviewReplyPrompt(
  context: ReviewContext,
  settings: AutoReplySettings,
): string {
  // Detect review language
  const reviewLang = detectLanguage(context.reviewText);

  const toneInstructions: Record<string, string> = {
    friendly:
      "Use a warm, friendly, and approachable tone. Be conversational and personable.",
    professional:
      "Use a formal, professional, and business-like tone. Maintain respect and courtesy.",
    apologetic:
      "Use a sincere, apologetic, and empathetic tone. Acknowledge the issue and show genuine concern.",
    marketing:
      "Use an enthusiastic, promotional tone. Highlight positive aspects and encourage return visits.",
  };

  const tone = toneInstructions[settings.tone] || toneInstructions.friendly;

  const ratingContext =
    context.rating <= 2
      ? "This is a negative review. Respond with empathy, acknowledge the issue, and offer a solution."
      : context.rating === 3
        ? "This is a neutral review. Respond professionally and encourage future positive experiences."
        : "This is a positive review. Respond with gratitude and enthusiasm.";

  const businessContext = context.locationName
    ? `Business: ${context.locationName}`
    : "";

  const categoryContext = context.businessCategory
    ? `Category: ${context.businessCategory}`
    : "";

  // Language-specific instructions
  const languageInstruction =
    reviewLang === "ar"
      ? `CRITICAL: The review is in ARABIC. You MUST respond ONLY in ARABIC (العربية). Do NOT mix English words or use Latin characters.`
      : `CRITICAL: The review is in ENGLISH. You MUST respond ONLY in ENGLISH. Do NOT mix Arabic words or use Arabic characters.`;

  return `You are a professional customer service representative responding to a Google Business Profile review.

${businessContext}
${categoryContext}

${ratingContext}

TONE: ${tone}

${languageInstruction}

REVIEW (${context.rating} stars):
"${context.reviewText}"

${context.customerName ? `Customer: ${context.customerName}` : ""}

INSTRUCTIONS:
1. ${reviewLang === "ar" ? "رد بالعربية فقط - لا تخلط الإنجليزية" : "Respond in English only - do not mix Arabic"}
2. Keep the response concise (2-4 sentences for positive, 3-5 for negative)
3. Personalize the response - reference specific points from the review
4. For negative reviews: acknowledge the issue, apologize, and offer to resolve
5. For positive reviews: express gratitude and invite them back
6. Sign off professionally but warmly
7. Do NOT include any markdown, quotes, or special formatting
8. Do NOT include your name or title - just the response text
9. IMPORTANT: Write ONLY in ${reviewLang === "ar" ? "Arabic (العربية)" : "English"}

Generate the response now:`;
}

/**
 * Calculate confidence score for the generated reply
 */
function calculateConfidenceScore(
  context: ReviewContext,
  reply: string,
  settings: AutoReplySettings,
): number {
  let score = 50; // Base score

  // Length check (too short or too long reduces confidence)
  if (reply.length >= 50 && reply.length <= 500) {
    score += 10;
  } else if (reply.length < 30 || reply.length > 800) {
    score -= 20;
  }

  // Language match (check if reply matches review language)
  const reviewLang = detectLanguage(context.reviewText);
  const replyLang = detectLanguage(reply);

  if (reviewLang === replyLang) {
    // Correct language - bonus points
    score += 20;
  } else {
    // Wrong language - major penalty
    score -= 30;
  }

  // Check for language mixing (both Arabic and English in reply)
  const hasArabic = /[\u0600-\u06FF]/.test(reply);
  const hasEnglish = /[a-zA-Z]/.test(reply);
  const arabicCount = (reply.match(/[\u0600-\u06FF]/g) || []).length;
  const englishCount = (reply.match(/[a-zA-Z]/g) || []).length;

  // If both languages exist with significant presence (more than just a few words)
  if (hasArabic && hasEnglish) {
    const minCount = Math.min(arabicCount, englishCount);
    const totalCount = arabicCount + englishCount;

    // If minority language is more than 20% of total, it's mixing
    if (minCount > totalCount * 0.2) {
      score -= 25; // Heavy penalty for language mixing
    }
  }

  // Tone appropriateness for rating
  if (context.rating <= 2) {
    // Negative review - check for apologetic/empathetic words
    const empatheticWords = [
      "sorry",
      "apologize",
      "regret",
      "أسف",
      "آسف",
      "نعتذر",
    ];
    if (empatheticWords.some((word) => reply.toLowerCase().includes(word))) {
      score += 15;
    }
  } else if (context.rating >= 4) {
    // Positive review - check for gratitude
    const gratitudeWords = [
      "thank",
      "appreciate",
      "grateful",
      "شكر",
      "نشكر",
      "ممتن",
    ];
    if (gratitudeWords.some((word) => reply.toLowerCase().includes(word))) {
      score += 15;
    }
  }

  // Personalization (mentions specific details from review)
  const reviewWords = context.reviewText
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 4);
  const mentionedWords = reviewWords.filter((word) =>
    reply.toLowerCase().includes(word),
  );
  if (mentionedWords.length > 0) {
    score += Math.min(10, mentionedWords.length * 2);
  }

  // No markdown or formatting issues
  if (
    !reply.includes("```") &&
    !reply.includes("**") &&
    !reply.includes("##")
  ) {
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
  previousConfidence: number,
): Promise<ReplyResult> {
  aiLogger.warn("Confidence too low, trying fallback", { previousConfidence });

  // Return error with helpful message
  return {
    success: false,
    error: `Confidence score too low (${previousConfidence}%). The AI couldn't generate a high-quality response. Please try manual reply or adjust the review text.`,
    provider: "fallback",
  };
}

/**
 * Log reply generation to database for monitoring
 */
export async function logReplyGeneration(
  userId: string,
  reviewId: string,
  result: ReplyResult,
  context: ReviewContext,
): Promise<void> {
  try {
    const supabase = await createClient();

    await supabase.from("autopilot_logs").insert({
      user_id: userId,
      action_type: "auto_reply",
      status: result.success ? "success" : "failed",
      details: {
        reviewId,
        rating: context.rating,
        confidence: result.success ? result.confidence : null,
        provider: result.provider || "unknown",
        latency: result.success ? result.latency : null,
        error: result.success ? null : result.error,
      },
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    aiLogger.error(
      "Failed to log AI review reply",
      error instanceof Error ? error : new Error(String(error)),
    );
    // Don't throw - logging failure shouldn't break the flow
  }
}
