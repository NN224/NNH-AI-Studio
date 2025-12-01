/**
 * AI Generate Review Reply API Route
 *
 * @security Protected by withAIProtection HOF with rate limiting
 */

import { getAIProvider } from "@/lib/ai/provider";
import {
  withAIProtection,
  type AIProtectionContext,
} from "@/lib/api/with-ai-protection";
import { apiLogger } from "@/lib/utils/logger";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Main handler - protected by withAIProtection
 */
async function handleGenerateReviewReply(
  request: Request,
  { userId }: AIProtectionContext,
): Promise<Response> {
  try {
    const { reviewText, rating, tone, locationName, isQuestion } =
      await request.json();

    if (!reviewText || !tone || !locationName) {
      return NextResponse.json(
        { error: "Missing required fields for AI generation." },
        { status: 400 },
      );
    }

    // Get AI provider
    const aiProvider = await getAIProvider(userId);
    if (!aiProvider) {
      apiLogger.error(
        "No AI provider configured for user",
        new Error("AI provider not configured"),
        { userId },
      );
      return NextResponse.json(
        {
          error:
            "No AI provider configured. Please set up an API key in Settings > AI Configuration.",
        },
        { status: 500 },
      );
    }

    // ⭐️ منطق تحديد الهدف والموجه بناءً على ما إذا كان السؤال أم مراجعة ⭐️
    let systemRole = "";
    let promptHeader = "";

    if (isQuestion) {
      systemRole = `You are the official business representative. Provide a clear, concise, and helpful factual answer to the customer's question.`;
      promptHeader = `CUSTOMER QUESTION: "${reviewText}"\nTONE: ${tone}\nProvide the official answer.`;
    } else {
      systemRole = `You are an expert social media manager specializing in Google Business Profile review responses.
                          Your goal is to generate a personalized response.`;
      promptHeader = `RATING: ${rating} / 5 Stars\nTONE REQUESTED: ${tone}\nCUSTOMER REVIEW: "${reviewText}"\nGenerate the response.`;
    }

    // بناء الموجه التفصيلي
    const systemInstruction = `
            ${systemRole}
            Instructions:
            1. Keep the response concise, typically under 500 characters.
            2. Match the requested tone: "${tone.toUpperCase()}".
            3. If the rating is low (3 or less), always include an apology and an invitation to contact the business offline.
            4. Do not include any introductory phrases like "Here is your response:".
        `;

    const userPrompt = `${systemInstruction}

BUSINESS NAME: ${locationName}
${promptHeader}`;

    const { content: aiReplyText } = await aiProvider.generateCompletion(
      userPrompt,
      isQuestion ? "question_auto_answer" : "review_auto_reply",
    );

    if (!aiReplyText) {
      throw new Error("AI provider returned empty response");
    }

    // إرجاع الرد
    return NextResponse.json({ success: true, reply: aiReplyText.trim() });
  } catch (error: unknown) {
    apiLogger.error(
      "[AI Generate Reply] Error",
      error instanceof Error ? error : new Error(String(error)),
      { userId },
    );
    const message =
      error instanceof Error
        ? error.message
        : "Failed to communicate with AI service.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Export with AI protection (rate limiting + auth)
export const POST = withAIProtection(handleGenerateReviewReply, {
  endpointType: "generateResponse",
});
