import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { mlQuestionsService } from "@/lib/services/ml-questions-service";
import { questionsLogger } from "@/lib/utils/logger";

const AnalyzeRequestSchema = z.object({
  questionId: z.string().optional(),
  questionText: z.string(),
  locationId: z.string(),
  businessContext: z
    .object({
      businessName: z.string(),
      businessType: z.string().optional(),
      businessDescription: z.string().optional(),
      services: z.array(z.string()).optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request
    const body = await request.json();
    const validation = AnalyzeRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 },
      );
    }

    const { questionText, locationId, businessContext, questionId } =
      validation.data;

    // Verify user has access to this location
    const { data: location, error: locationError } = await supabase
      .from("gmb_locations")
      .select("id, location_name, business_type, description")
      .eq("id", locationId)
      .eq("user_id", user.id)
      .single();

    if (locationError || !location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 },
      );
    }

    // Build context from location data if not provided
    const context = businessContext || {
      businessName: location.location_name,
      businessType: location.business_type,
      businessDescription: location.description,
    };

    // Get brand profile for tone
    const { data: brandProfile } = await supabase
      .from("brand_profiles")
      .select("brand_voice, tone_of_voice")
      .eq("user_id", user.id)
      .single();

    // Analyze question with ML
    const analysis = await mlQuestionsService.analyzeQuestion(
      questionText,
      context,
      {
        tone: brandProfile?.tone_of_voice || "professional",
        brandVoice: brandProfile?.brand_voice,
        includeCallToAction: true,
      },
    );

    // Calculate final confidence with business rules
    const finalConfidence = mlQuestionsService.calculateConfidence(
      analysis,
      context,
    );

    // Update question if ID provided
    if (questionId) {
      const { error: updateError } = await supabase
        .from("gmb_questions")
        .update({
          ai_suggested_answer: analysis.suggestedAnswer,
          ai_confidence_score: finalConfidence,
          metadata: {
            ...((
              await supabase
                .from("gmb_questions")
                .select("metadata")
                .eq("id", questionId)
                .single()
            ).data?.metadata || {}),
            ml_analysis: {
              category: analysis.category,
              intent: analysis.intent,
              urgency: analysis.urgency,
              sentiment: analysis.sentiment,
              topics: analysis.topics,
              analyzedAt: new Date().toISOString(),
            },
          },
        })
        .eq("id", questionId)
        .eq("location_id", locationId);

      if (updateError) {
        questionsLogger.error(
          "Failed to update question",
          updateError instanceof Error
            ? updateError
            : new Error(String(updateError)),
          { questionId, locationId },
        );
      }
    }

    return NextResponse.json({
      success: true,
      analysis: {
        ...analysis,
        confidence: finalConfidence,
      },
    });
  } catch (error) {
    questionsLogger.error(
      "Question analysis error",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Failed to analyze question" },
      { status: 500 },
    );
  }
}
