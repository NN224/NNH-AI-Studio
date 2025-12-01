import { getCronSecret, withCronAuth } from "@/lib/security/cron-auth";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { questionsLogger } from "@/lib/utils/logger";

/**
 * Cron job to process unanswered questions
 * Runs every 5 minutes (configured in vercel.json or cron service)
 * Endpoint: GET /api/cron/process-questions
 *
 * @security Uses withCronAuth wrapper - FAILS CLOSED if CRON_SECRET not set
 */
async function handleProcessQuestions(_request: Request): Promise<Response> {
  try {
    const supabase = await createClient();
    const cronSecret = getCronSecret();

    // Get all unanswered questions from the last 24 hours
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const { data: unansweredQuestions, error } = await supabase
      .from("gmb_questions")
      .select("id, user_id, location_id")
      .is("answer_text", null)
      .gte("created_at", yesterday.toISOString())
      .order("created_at", { ascending: true })
      .limit(50); // Process max 50 questions per run

    if (error) {
      questionsLogger.error(
        "Error fetching unanswered questions",
        error instanceof Error ? error : new Error(String(error)),
        { since: yesterday.toISOString() },
      );
      return NextResponse.json(
        { error: "Failed to fetch questions" },
        { status: 500 },
      );
    }

    if (!unansweredQuestions || unansweredQuestions.length === 0) {
      return NextResponse.json({
        processed: 0,
        message: "No unanswered questions to process",
      });
    }

    // Process each question
    const results = {
      total: unansweredQuestions.length,
      processed: 0,
      failed: 0,
      skipped: 0,
    };

    for (const question of unansweredQuestions) {
      try {
        // Check if auto-answer is enabled for this user/location
        const { data: settings } = await supabase
          .from("question_auto_answer_settings")
          .select("enabled")
          .eq("user_id", question.user_id)
          .eq("location_id", question.location_id)
          .single();

        if (!settings?.enabled) {
          results.skipped++;
          continue;
        }

        // Trigger auto-answer
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/questions/auto-answer`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${cronSecret}`, // Pass along for verification
            },
            body: JSON.stringify({
              questionId: question.id,
            }),
          },
        );

        if (response.ok) {
          results.processed++;
        } else {
          results.failed++;
          questionsLogger.error(
            "Failed to process question",
            new Error(`HTTP ${response.status}`),
            { questionId: question.id },
          );
        }

        // Add small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        results.failed++;
        questionsLogger.error(
          "Error processing question",
          error instanceof Error ? error : new Error(String(error)),
          { questionId: question.id },
        );
      }
    }

    // Log cron run
    await supabase.from("cron_logs").insert({
      job_name: "process_questions",
      status: "completed",
      details: results,
      executed_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      ...results,
      message: `Processed ${results.processed} questions, ${results.failed} failed, ${results.skipped} skipped`,
    });
  } catch (error) {
    questionsLogger.error(
      "Cron job error",
      error instanceof Error ? error : new Error(String(error)),
    );

    // Try to log the error
    try {
      const supabase = await createClient();
      await supabase.from("cron_logs").insert({
        job_name: "process_questions",
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
        executed_at: new Date().toISOString(),
      });
    } catch (logError) {
      questionsLogger.error(
        "Failed to log cron error",
        logError instanceof Error ? logError : new Error(String(logError)),
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Export with cron authentication wrapper
export const GET = withCronAuth(handleProcessQuestions);
export const POST = withCronAuth(handleProcessQuestions);
