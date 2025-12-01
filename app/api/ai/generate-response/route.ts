/**
 * AI Generate Response API Route
 *
 * @security Protected by withAIProtection HOF with rate limiting
 */

import {
  withAIProtection,
  type AIProtectionContext,
} from "@/lib/api/with-ai-protection";
import { apiLogger } from "@/lib/utils/logger";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const dynamic = "force-dynamic";

/**
 * Main handler - protected by withAIProtection
 */
async function handleGenerateResponse(
  request: Request,
  _context: AIProtectionContext,
): Promise<Response> {
  try {
    const body = await request.json();

    // Extract with fallbacks
    const review_text = body.review_text || body.comment || "";
    const rating = body.rating || 3;
    const reviewer_name = body.reviewer_name || "Valued Customer";
    const location_name = body.location_name || "our location";

    // Debug logging (using warn as per eslint config)
    // console.warn('Received data:', { review_text, rating, reviewer_name, location_name })

    // Check if review has actual text or is rating-only
    const hasReviewText =
      review_text &&
      review_text !== "No review text provided" &&
      review_text !== "No review text" &&
      !review_text.includes("star rating with no comment");

    // Build context-aware prompt based on rating
    let tone = "";
    let instructions = "";

    if (rating >= 4) {
      tone = "warm, grateful, and enthusiastic";
      instructions =
        "Thank them warmly for their positive feedback and invite them to visit again.";
    } else if (rating === 3) {
      tone = "understanding and improvement-focused";
      instructions =
        "Thank them for feedback, acknowledge their experience, and express desire to improve.";
    } else {
      tone = "empathetic, apologetic, and solution-oriented";
      instructions =
        "Sincerely apologize, acknowledge their concerns, and offer to resolve the issue directly.";
    }

    // Generate different prompts for reviews with text vs rating-only
    const prompt = hasReviewText
      ? `You are a professional business manager responding to a Google My Business review for ${location_name}.

Review Details:
- Customer: ${reviewer_name}
- Rating: ${rating}/5 stars
- Review: "${review_text}"

Generate a professional response that:
1. Is ${tone}
2. ${instructions}
3. Is 2-4 sentences long (50-100 words)
4. Sounds natural and human (not robotic)
5. Addresses specific points from their review when possible
6. Uses proper English
7. Signs off appropriately (e.g., "Best regards, The ${location_name} Team")

Important: Write ONLY the response text, no additional commentary or explanations.`
      : `You are a professional business manager responding to a Google My Business review for ${location_name}.

Review Details:
- Customer: ${reviewer_name}
- Rating: ${rating}/5 stars only (no written comment)

Generate a professional response that:
1. Is ${tone}
2. ${instructions}
3. Is 2-3 sentences long (40-60 words)
4. Thanks them for the ${rating}-star rating
5. Sounds warm and appreciative
6. Invites them back
7. Signs off appropriately (e.g., "Best regards, The ${location_name} Team")

Important: Write ONLY the response text, no additional commentary or explanations.`;

    // Call Anthropic Claude API - Using Claude 3 Haiku
    const message = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 250,
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
    });

    // Extract response text
    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    if (!responseText) {
      throw new Error("No response generated");
    }

    return NextResponse.json({
      success: true,
      response: responseText.trim(),
      generated_at: new Date().toISOString(),
      model: "claude-3-haiku-20240307",
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
      },
    });
  } catch (error: unknown) {
    apiLogger.error(
      "AI Generation Error",
      error instanceof Error ? error : new Error(String(error)),
    );

    const err = error as { status?: number; message?: string };

    if (err.status === 401) {
      return NextResponse.json(
        { success: false, error: "Invalid API key" },
        { status: 401 },
      );
    }

    if (err.status === 429) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Please try again." },
        { status: 429 },
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to generate response." },
      { status: 500 },
    );
  }
}

// Export with AI protection (rate limiting + auth)
export const POST = withAIProtection(handleGenerateResponse, {
  endpointType: "generateResponse",
});
