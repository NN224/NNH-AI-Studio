import {
  getAutoAnswerSettings,
  getBusinessInfo,
  getQuestion,
} from "@/lib/data/gmb";
import {
  logAutoAnswer,
  logLowConfidenceAnswer,
  postAnswer,
} from "@/lib/data/logging";
import { AIQuestionAnswerService } from "@/lib/services/ai-question-answer-service";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication check
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { questionId } = body;

    if (!questionId) {
      return NextResponse.json(
        { error: "Question ID is required" },
        { status: 400 },
      );
    }

    // 3. Fetch question details
    const question = await getQuestion(questionId);
    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 },
      );
    }

    // 4. Verify ownership
    if (question.user_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden - not your question" },
        { status: 403 },
      );
    }

    // 5. Fetch user settings
    const settings = await getAutoAnswerSettings(user.id, question.location_id);
    if (!settings || !settings.enabled) {
      return NextResponse.json(
        { error: "Auto-answer is disabled" },
        { status: 400 },
      );
    }

    // 6. Fetch business information
    const businessInfo = await getBusinessInfo(question.location_id);

    // 7. Generate answer using AI service
    const service = new AIQuestionAnswerService();
    const result = await service.generateAnswer({
      question: question.question_text,
      businessInfo: {
        name: businessInfo.name || "",
        category: businessInfo.category || "",
        description: businessInfo.description,
        hours: businessInfo.hours,
        services: businessInfo.services,
        attributes: businessInfo.attributes,
        location: {
          address: businessInfo.address || "",
          phone: businessInfo.phone,
          website: businessInfo.website,
        },
      },
      language: settings.language_preference || "auto",
      tone: settings.tone || "professional",
      userId: user.id,
      locationId: question.location_id,
    });

    // 8. Check confidence score
    const confidenceThreshold = settings.confidence_threshold || 80;

    if (result.confidence < confidenceThreshold) {
      // Log as low confidence (pending review)
      await logLowConfidenceAnswer(
        questionId,
        {
          ...result,
          contextUsed: JSON.stringify(result.contextUsed),
        },
        user.id,
      );

      return NextResponse.json({
        success: false,
        queued: true,
        reason: "Low confidence - requires review",
        confidence: result.confidence,
        answer: result.answer,
        threshold: confidenceThreshold,
      });
    }

    // 9. Post the answer to GMB
    try {
      await postAnswer(questionId, result.answer);

      // 10. Log successful auto-answer
      await logAutoAnswer(
        questionId,
        {
          ...result,
          contextUsed: JSON.stringify(result.contextUsed),
        },
        user.id,
      );

      return NextResponse.json({
        success: true,
        answer: result.answer,
        confidence: result.confidence,
        category: result.category,
        provider: result.provider,
        processingTime: result.processingTime,
      });
    } catch (postError) {
      // If posting fails, log with error
      await logLowConfidenceAnswer(
        questionId,
        {
          ...result,
          contextUsed: JSON.stringify(result.contextUsed),
        },
        user.id,
      );

      return NextResponse.json(
        {
          success: false,
          error: "Failed to post answer to GMB",
          answer: result.answer, // Still return the answer for manual posting
          confidence: result.confidence,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Auto-answer error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Dynamic route - requires authentication
export const dynamic = "force-dynamic";
