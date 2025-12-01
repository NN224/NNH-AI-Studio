import { NextRequest, NextResponse } from "next/server";
import { aiQuestionService } from "@/lib/services/ai-question-answer-service";
import { createClient } from "@/lib/supabase/server";
import { questionsLogger } from "@/lib/utils/logger";

/**
 * Test auto-answer API
 * Allows testing the auto-answer functionality without posting to GMB
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { question, locationId } = await request.json();

    if (!question) {
      return NextResponse.json(
        { error: "Question text is required" },
        { status: 400 },
      );
    }

    // Get location details
    const { data: location, error: locationError } = await supabase
      .from("gmb_locations")
      .select("*")
      .eq("id", locationId)
      .eq("user_id", user.id)
      .single();

    if (locationError || !location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 },
      );
    }

    // Get user settings
    const { data: settings } = await supabase
      .from("question_auto_answer_settings")
      .select("*")
      .eq("user_id", user.id)
      .eq("location_id", locationId)
      .single();

    const language = settings?.language_preference || "auto";
    const tone = settings?.tone || "professional";

    // Build business info
    const businessInfo = {
      name: location.name,
      category: location.category || "Business",
      description: location.description,
      hours: location.hours,
      services: location.services || [],
      attributes: location.attributes || {},
      location: {
        address: location.address,
        phone: location.phone,
        website: location.website,
      },
    };

    // Generate answer using AI service
    const startTime = Date.now();
    const result = await aiQuestionService.generateAnswer({
      question,
      businessInfo,
      language,
      tone,
      userId: user.id,
      locationId,
    });

    // Determine if it would be auto-posted
    const confidenceThreshold = settings?.confidence_threshold || 80;
    const wouldAutoPost = result.confidence >= confidenceThreshold;

    // Get category label
    const categoryLabels: Record<string, string> = {
      hours: "ساعات العمل / Hours",
      location: "الموقع / Location",
      services: "الخدمات / Services",
      pricing: "الأسعار / Pricing",
      general: "عام / General",
    };

    return NextResponse.json({
      answer: result.answer,
      confidence: result.confidence,
      category: result.category,
      categoryLabel: categoryLabels[result.category] || result.category,
      provider: result.provider,
      model: result.model,
      processingTime: result.processingTime,
      tokensUsed: result.tokensUsed,
      contextUsed: result.contextUsed,
      wouldAutoPost,
      confidenceThreshold,
      message: wouldAutoPost
        ? "ستتم الإجابة تلقائياً / Would be auto-posted"
        : "تحتاج مراجعة يدوية / Requires manual review",
    });
  } catch (error) {
    questionsLogger.error(
      "Test auto-answer error",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      {
        error: "Failed to generate answer",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
