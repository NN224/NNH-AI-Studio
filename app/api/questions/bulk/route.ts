import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateBody } from "@/middleware/validate-request";
import { sanitizeHtml } from "@/lib/security/sanitize-html";
import { createClient } from "@/lib/supabase/server";
import { mlQuestionsService } from "@/lib/services/ml-questions-service";
import { questionsLogger } from "@/lib/utils/logger";

const BulkActionSchema = z.object({
  action: z.enum(["analyze", "answer", "approve", "reject", "delete"]),
  questionIds: z.array(z.string()).min(1).max(100),
  options: z
    .object({
      autoAnswer: z.boolean().optional(),
      useML: z.boolean().optional(),
      answer: z.string().optional(),
      reason: z.string().optional(),
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

    const validation = await validateBody(request, BulkActionSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { action, questionIds, options } = validation.data;

    // Verify user has access to these questions
    const { data: questions, error: questionsError } = await supabase
      .from("gmb_questions")
      .select(
        `
        id,
        question_text,
        location_id,
        answer_status,
        gmb_locations!inner (
          id,
          location_name,
          user_id
        )
      `,
      )
      .in("id", questionIds)
      .eq("gmb_locations.user_id", user.id);

    if (
      questionsError ||
      !questions ||
      questions.length !== questionIds.length
    ) {
      return NextResponse.json(
        { error: "Some questions not found or access denied" },
        { status: 403 },
      );
    }

    const results = {
      success: [] as string[],
      failed: [] as { id: string; error: string }[],
      totalProcessed: 0,
    };

    switch (action) {
      case "analyze": {
        // Batch ML analysis
        const questionsToAnalyze = questions.map((q) => ({
          id: q.id,
          text: q.question_text || "",
        }));

        const businessContext = {
          businessName:
            questions[0].gmb_locations?.[0]?.location_name ||
            "Unknown Business",
        };

        const analyses = await mlQuestionsService.batchAnalyze(
          questionsToAnalyze,
          businessContext,
        );

        // Update questions with ML results
        for (const [questionId, analysis] of analyses) {
          const confidence = mlQuestionsService.calculateConfidence(
            analysis,
            businessContext,
          );

          const { error } = await supabase
            .from("gmb_questions")
            .update({
              ai_suggested_answer: analysis.suggestedAnswer,
              ai_confidence_score: confidence,
              metadata: {
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
            .eq("id", questionId);

          if (error) {
            results.failed.push({ id: questionId, error: error.message });
          } else {
            results.success.push(questionId);
          }
          results.totalProcessed++;
        }
        break;
      }

      case "answer": {
        // Bulk answer with optional auto-generation
        for (const question of questions) {
          let answerText = options?.answer ? sanitizeHtml(options.answer) : "";

          // Generate answer if auto-answer enabled and no answer provided
          if (options?.autoAnswer && !answerText) {
            const analysis = await mlQuestionsService.analyzeQuestion(
              question.question_text || "",
              {
                businessName:
                  question.gmb_locations?.[0]?.location_name ||
                  "Unknown Business",
              },
            );
            answerText = analysis.suggestedAnswer;
          }

          if (!answerText) {
            results.failed.push({
              id: question.id,
              error: "No answer provided",
            });
            continue;
          }

          const safeAnswer = sanitizeHtml(answerText);

          const { error } = await supabase
            .from("gmb_questions")
            .update({
              answer_text: safeAnswer,
              answer_status: "answered",
              answered_at: new Date().toISOString(),
              answered_by: user.id,
            })
            .eq("id", question.id);

          if (error) {
            results.failed.push({ id: question.id, error: error.message });
          } else {
            results.success.push(question.id);
          }
          results.totalProcessed++;
        }
        break;
      }

      case "approve": {
        // Bulk approve draft answers
        const { error } = await supabase
          .from("gmb_questions")
          .update({
            answer_status: "answered",
            answered_at: new Date().toISOString(),
            metadata: {
              approvedBy: user.id,
              approvedAt: new Date().toISOString(),
            },
          })
          .in("id", questionIds)
          .eq("answer_status", "draft");

        if (error) {
          results.failed = questionIds.map((id) => ({
            id,
            error: error.message,
          }));
        } else {
          results.success = questionIds;
        }
        results.totalProcessed = questionIds.length;
        break;
      }

      case "reject": {
        // Bulk reject with reason
        const { error } = await supabase
          .from("gmb_questions")
          .update({
            answer_status: "pending",
            answer_text: null,
            ai_suggested_answer: null,
            metadata: {
              rejectedBy: user.id,
              rejectedAt: new Date().toISOString(),
              rejectionReason: options?.reason || "Not suitable",
            },
          })
          .in("id", questionIds);

        if (error) {
          results.failed = questionIds.map((id) => ({
            id,
            error: error.message,
          }));
        } else {
          results.success = questionIds;
        }
        results.totalProcessed = questionIds.length;
        break;
      }

      case "delete": {
        // Soft delete by archiving
        const { error } = await supabase
          .from("gmb_questions")
          .update({
            is_archived: true,
            archived_at: new Date().toISOString(),
            archived_by: user.id,
          })
          .in("id", questionIds);

        if (error) {
          results.failed = questionIds.map((id) => ({
            id,
            error: error.message,
          }));
        } else {
          results.success = questionIds;
        }
        results.totalProcessed = questionIds.length;
        break;
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Bulk ${action} completed: ${results.success.length} succeeded, ${results.failed.length} failed`,
    });
  } catch (error) {
    questionsLogger.error(
      "Bulk questions error",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Failed to process bulk action" },
      { status: 500 },
    );
  }
}
