"use server";

import { CacheBucket, refreshCache } from "@/lib/cache/cache-manager";
import { GMB_CONSTANTS, getValidAccessToken } from "@/lib/gmb/helpers";
import type { QuestionData } from "@/lib/gmb/sync-types";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const GMB_API_BASE = GMB_CONSTANTS.QANDA_BASE;

interface QuestionFetchContext {
  userId: string;
  accountId: string;
  googleLocationId: string;
  accessToken: string;
  internalLocationId?: string;
}

async function collectQuestionsFromGoogle(
  context: QuestionFetchContext,
): Promise<QuestionData[]> {
  const endpoint = `${GMB_API_BASE}/${context.googleLocationId}/questions`;
  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${context.accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        "Authentication expired. Please reconnect your Google account.",
      );
    }
    if (response.status === 404) {
      throw new Error("Location not found on Google.");
    }

    const errorData = await response.json().catch(() => ({}));
    console.error("[Questions] Google API error:", {
      status: response.status,
      error: errorData,
    });
    throw new Error(
      errorData?.error?.message || "Failed to fetch questions from Google",
    );
  }

  const data = await response.json();
  const questions = data.questions || [];
  const syncTime = new Date().toISOString();
  const payload: QuestionData[] = [];

  for (const googleQuestion of questions) {
    const questionId = googleQuestion.name?.split("/").pop();
    if (!questionId) continue;
    const topAnswer = googleQuestion.topAnswers?.[0] || null;
    const answerId = topAnswer?.name?.split("/").pop() || null;
    const hasAnswer = !!topAnswer?.text;
    const status = hasAnswer ? "answered" : "unanswered";

    payload.push({
      user_id: context.userId,
      location_id: context.internalLocationId,
      google_location_id: context.googleLocationId,
      gmb_account_id: context.accountId,
      question_id: questionId,
      author_name: googleQuestion.author?.displayName || "Anonymous",
      author_display_name: googleQuestion.author?.displayName || null,
      author_profile_photo_url: googleQuestion.author?.profilePhotoUrl || null,
      author_type: googleQuestion.author?.type || "CUSTOMER",
      question_text: googleQuestion.text || "",
      question_date: googleQuestion.createTime || syncTime,
      answer_text: topAnswer?.text || null,
      answer_date: topAnswer?.updateTime || null,
      answer_author: topAnswer?.author?.displayName || null,
      answer_id: answerId,
      upvote_count: googleQuestion.upvoteCount || 0,
      total_answer_count: googleQuestion.totalAnswerCount || 0,
      status,
      google_resource_name: googleQuestion.name || null,
    });
  }

  return payload;
}

export async function fetchQuestionsFromGoogle(
  locationId: string,
  accessToken: string,
): Promise<QuestionData[]> {
  const supabase = await createClient();
  const { data: location, error } = await supabase
    .from("gmb_locations")
    .select("id, location_id, gmb_account_id, user_id")
    .eq("id", locationId)
    .single();

  if (error || !location) {
    throw new Error("Location not found");
  }

  return collectQuestionsFromGoogle({
    userId: location.user_id,
    accountId: location.gmb_account_id,
    googleLocationId: location.location_id,
    accessToken,
    internalLocationId: location.id,
  });
}

// Validation schemas
const _AnswerQuestionSchema = z.object({
  questionId: z.string().uuid(),
  answerText: z.string().min(1).max(2000),
}); // Reserved for future validation use

// ============================================
// 1. GET QUESTIONS WITH FILTERS
// ============================================
export async function getQuestions(params: {
  locationId?: string;
  status?: "unanswered" | "answered" | "all";
  priority?: string;
  searchQuery?: string;
  sortBy?: "newest" | "oldest" | "most_upvoted" | "urgent";
  limit?: number;
  offset?: number;
}) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Not authenticated",
        data: [],
        count: 0,
      };
    }

    let query = supabase
      .from("gmb_questions")
      .select(
        `
        *,
        gmb_locations (
          id,
          location_name,
          address
        )
      `,
        { count: "exact" },
      )
      .eq("user_id", user.id);

    // Filter by location
    if (params.locationId && params.locationId !== "all") {
      query = query.eq("location_id", params.locationId);
    }

    // Filter by status
    if (params.status && params.status !== "all") {
      if (params.status === "unanswered") {
        query = query.or(
          "answer_status.eq.unanswered,answer_status.eq.pending",
        );
      } else if (params.status === "answered") {
        query = query.eq("answer_status", "answered");
      }
    }

    // Note: Priority filtering removed - column doesn't exist in gmb_questions table
    // TODO: Add priority column to gmb_questions table if needed
    // if (params.priority) {
    //   query = query.eq("priority", params.priority);
    // }

    // Search
    if (params.searchQuery) {
      query = query.or(
        `question_text.ilike.%${params.searchQuery}%,answer_text.ilike.%${params.searchQuery}%`,
      );
    }

    // Sort
    switch (params.sortBy) {
      case "newest":
        query = query.order("asked_at", {
          ascending: false,
          nullsFirst: false,
        });
        break;
      case "oldest":
        query = query.order("asked_at", { ascending: true, nullsFirst: false });
        break;
      case "most_upvoted":
        query = query.order("upvote_count", { ascending: false });
        break;
      case "urgent":
        // Note: Sorting by priority removed - column doesn't exist
        // Fallback to upvote_count for urgency indication
        query = query.order("upvote_count", { ascending: false });
        break;
      default:
        query = query.order("created_at", { ascending: false });
    }

    // Pagination
    const limit = params.limit || 50;
    const offset = params.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("[Questions] Get questions error:", error);
      return {
        success: false,
        error: error.message,
        data: [],
        count: 0,
      };
    }

    return {
      success: true,
      data: data || [],
      count: count || 0,
    };
  } catch (error: unknown) {
    console.error("[Questions] Get questions error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch questions",
      data: [],
      count: 0,
    };
  }
}

// ============================================
// 2. ANSWER QUESTION
// ============================================
export async function answerQuestion(questionId: string, answerText: string) {
  try {
    const supabase = await createClient();

    // Validate
    if (!answerText || answerText.trim().length === 0) {
      return {
        success: false,
        error: "Answer text cannot be empty",
      };
    }

    if (answerText.length > 2000) {
      return {
        success: false,
        error: "Answer is too long (max 2000 characters)",
      };
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Not authenticated",
      };
    }

    // Get question with location and account
    const { data: question, error: fetchError } = await supabase
      .from("gmb_questions")
      .select(
        `
        *,
        gmb_locations!inner(
          id,
          location_id,
          gmb_account_id,
          user_id,
          gmb_accounts!inner(id, account_id)
        )
      `,
      )
      .eq("id", questionId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !question) {
      return {
        success: false,
        error: "Question not found or you don't have permission to answer it.",
      };
    }

    // Check if already answered
    if (question.answer_status === "answered" && question.answer_text) {
      return {
        success: false,
        error:
          "This question has already been answered. Use updateAnswer to modify it.",
      };
    }

    const location = Array.isArray(question.gmb_locations)
      ? question.gmb_locations[0]
      : question.gmb_locations;
    const account =
      (Array.isArray(location?.gmb_accounts)
        ? location.gmb_accounts[0]
        : location?.gmb_accounts) || null;

    if (!location?.gmb_account_id || !account?.account_id) {
      return {
        success: false,
        error:
          "Linked Google account not found. Please reconnect your Google account.",
      };
    }

    const accessToken = await getValidAccessToken(
      supabase,
      location.gmb_account_id,
    );

    // Get question_id (use question_id or external_question_id)
    const googleQuestionId =
      question.question_id || question.external_question_id;
    if (!googleQuestionId) {
      return {
        success: false,
        error:
          "Question ID not found. Please sync questions from Google first.",
      };
    }

    // Call Google My Business API
    const gmbApiUrl = `${GMB_API_BASE}/${location.location_id}/questions/${googleQuestionId}/answers`;

    const response = await fetch(gmbApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: answerText.trim(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 401) {
        return {
          success: false,
          error:
            "Authentication expired. Please reconnect your Google account.",
        };
      } else if (response.status === 403) {
        return {
          success: false,
          error:
            "Permission denied. You don't have permission to answer this question.",
        };
      } else if (response.status === 404) {
        return {
          success: false,
          error: "Question not found on Google.",
        };
      } else if (response.status === 429) {
        return {
          success: false,
          error: "Too many requests. Please wait a moment and try again.",
        };
      } else {
        return {
          success: false,
          error:
            errorData.error?.message ||
            `Failed to post answer (${response.status})`,
        };
      }
    }

    const result = await response.json();

    // Extract answer ID from response
    const answerId = result.name?.split("/").pop() || null;

    // Update database
    const { error: updateError } = await supabase
      .from("gmb_questions")
      .update({
        answer_text: answerText.trim(),
        answered_at: new Date().toISOString(),
        answered_by: user.email || "Business Owner",
        answer_status: "answered",
        answer_id: answerId,
        status: "answered",
        updated_at: new Date().toISOString(),
      })
      .eq("id", questionId);

    if (updateError) {
      console.error("[Questions] Database update error:", updateError);
      // Don't fail if database update fails - answer was posted to Google
    }

    revalidatePath("/dashboard");
    revalidatePath("/questions");

    await refreshCache(CacheBucket.DASHBOARD_OVERVIEW, user.id);

    return {
      success: true,
      data: result,
      message: "Answer posted successfully!",
    };
  } catch (error: unknown) {
    console.error("[Questions] Answer question error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to post answer",
    };
  }
}

// ============================================
// 3. UPDATE ANSWER
// ============================================
export async function updateAnswer(questionId: string, newAnswerText: string) {
  try {
    const supabase = await createClient();

    if (!newAnswerText || newAnswerText.trim().length === 0) {
      return {
        success: false,
        error: "Answer text cannot be empty",
      };
    }

    if (newAnswerText.length > 2000) {
      return {
        success: false,
        error: "Answer is too long (max 2000 characters)",
      };
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Not authenticated",
      };
    }

    // Get question
    const { data: question, error: fetchError } = await supabase
      .from("gmb_questions")
      .select(
        `
        *,
        gmb_locations!inner(
          id,
          location_id,
          gmb_account_id,
          user_id,
          gmb_accounts!inner(id, account_id)
        )
      `,
      )
      .eq("id", questionId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !question) {
      return {
        success: false,
        error: "Question not found",
      };
    }

    if (question.answer_status !== "answered" || !question.answer_id) {
      return {
        success: false,
        error:
          "No answer to update. Use answerQuestion to create a new answer.",
      };
    }

    const location = Array.isArray(question.gmb_locations)
      ? question.gmb_locations[0]
      : question.gmb_locations;
    const account =
      (Array.isArray(location?.gmb_accounts)
        ? location.gmb_accounts[0]
        : location?.gmb_accounts) || null;

    if (!location?.gmb_account_id || !account?.account_id) {
      return {
        success: false,
        error:
          "Linked Google account not found. Please reconnect your Google account.",
      };
    }

    const accessToken = await getValidAccessToken(
      supabase,
      location.gmb_account_id,
    );

    const googleQuestionId =
      question.question_id || question.external_question_id;
    if (!googleQuestionId) {
      return {
        success: false,
        error: "Question ID not found",
      };
    }

    // Call Google API
    const gmbApiUrl = `${GMB_API_BASE}/${location.location_id}/questions/${googleQuestionId}/answers/${question.answer_id}`;

    const response = await fetch(gmbApiUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: newAnswerText.trim(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 401) {
        return {
          success: false,
          error:
            "Authentication expired. Please reconnect your Google account.",
        };
      } else if (response.status === 404) {
        return {
          success: false,
          error: "Answer not found on Google.",
        };
      } else {
        return {
          success: false,
          error: errorData.error?.message || "Failed to update answer",
        };
      }
    }

    const result = await response.json();

    // Update database
    const { error: updateError } = await supabase
      .from("gmb_questions")
      .update({
        answer_text: newAnswerText.trim(),
        answered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", questionId);

    if (updateError) {
      console.error("[Questions] Database update error:", updateError);
    }

    revalidatePath("/dashboard");
    revalidatePath("/questions");

    await refreshCache(CacheBucket.DASHBOARD_OVERVIEW, user.id);

    return {
      success: true,
      data: result,
      message: "Answer updated!",
    };
  } catch (error: unknown) {
    console.error("[Questions] Update answer error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update answer",
    };
  }
}

// ============================================
// 4. DELETE ANSWER
// ============================================
export async function deleteAnswer(questionId: string) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Not authenticated",
      };
    }

    // Get question
    const { data: question, error: fetchError } = await supabase
      .from("gmb_questions")
      .select(
        `
        *,
        gmb_locations!inner(
          id,
          location_id,
          gmb_account_id,
          user_id,
          gmb_accounts!inner(id, account_id)
        )
      `,
      )
      .eq("id", questionId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !question) {
      return {
        success: false,
        error: "Question not found",
      };
    }

    if (question.answer_status !== "answered" || !question.answer_id) {
      return {
        success: false,
        error: "No answer to delete",
      };
    }

    const location = Array.isArray(question.gmb_locations)
      ? question.gmb_locations[0]
      : question.gmb_locations;
    const account =
      (Array.isArray(location?.gmb_accounts)
        ? location.gmb_accounts[0]
        : location?.gmb_accounts) || null;

    if (!location?.gmb_account_id || !account?.account_id) {
      return {
        success: false,
        error: "Linked Google account not found.",
      };
    }

    const accessToken = await getValidAccessToken(
      supabase,
      location.gmb_account_id,
    );

    const googleQuestionId =
      question.question_id || question.external_question_id;
    if (!googleQuestionId) {
      return {
        success: false,
        error: "Question ID not found",
      };
    }

    // Call Google API
    const gmbApiUrl = `${GMB_API_BASE}/${location.location_id}/questions/${googleQuestionId}/answers/${question.answer_id}`;

    const response = await fetch(gmbApiUrl, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error?.message || "Failed to delete answer",
      };
    }

    // Update database
    const { error: updateError } = await supabase
      .from("gmb_questions")
      .update({
        answer_text: null,
        answered_at: null,
        answer_status: "unanswered",
        answer_id: null,
        status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", questionId);

    if (updateError) {
      console.error("[Questions] Database update error:", updateError);
    }

    revalidatePath("/dashboard");
    revalidatePath("/questions");

    await refreshCache(CacheBucket.DASHBOARD_OVERVIEW, user.id);

    return {
      success: true,
      message: "Answer deleted!",
    };
  } catch (error: unknown) {
    console.error("[Questions] Delete answer error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete answer",
    };
  }
}

// ============================================
// 5. BULK ANSWER QUESTIONS
// ============================================
export async function bulkAnswerQuestions(
  questionIds: string[],
  answerTemplate: string,
) {
  try {
    if (!questionIds || questionIds.length === 0) {
      return {
        success: false,
        error: "No questions selected",
      };
    }

    if (questionIds.length > 20) {
      return {
        success: false,
        error: "Cannot answer more than 20 questions at once",
      };
    }

    const results = {
      success: [] as string[],
      failed: [] as { id: string; error: string }[],
    };

    for (const questionId of questionIds) {
      const result = await answerQuestion(questionId, answerTemplate);

      if (result.success) {
        results.success.push(questionId);
      } else {
        results.failed.push({
          id: questionId,
          error: result.error || "Unknown error",
        });
      }

      // Rate limit protection - wait 1 second between requests
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return {
      success: true,
      data: results,
      message: `Answered ${results.success.length} of ${questionIds.length} questions`,
    };
  } catch (error: unknown) {
    console.error("[Questions] Bulk answer error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to bulk answer questions",
    };
  }
}

// ============================================
// 6. SYNC QUESTIONS FROM GOOGLE
// ============================================
export async function syncQuestionsFromGoogle(locationId: string) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Not authenticated",
      };
    }

    // Get location with account
    const { data: location, error: locError } = await supabase
      .from("gmb_locations")
      .select(
        `
        id,
        location_id,
        gmb_account_id,
        user_id,
        metadata,
        gmb_accounts!inner(id, account_id)
      `,
      )
      .eq("id", locationId)
      .eq("user_id", user.id)
      .single();

    if (locError || !location) {
      return {
        success: false,
        error: "Location not found",
      };
    }

    const account =
      (Array.isArray(location.gmb_accounts)
        ? location.gmb_accounts[0]
        : location.gmb_accounts) || null;

    if (!location.gmb_account_id || !account?.account_id) {
      return {
        success: false,
        error:
          "Linked Google account not found. Please reconnect your Google account.",
      };
    }

    const accessToken = await getValidAccessToken(
      supabase,
      location.gmb_account_id,
    );
    const questionDataset = await collectQuestionsFromGoogle({
      userId: user.id,
      accountId: location.gmb_account_id,
      googleLocationId: location.location_id,
      accessToken,
      internalLocationId: location.id,
    });

    if (questionDataset.length === 0) {
      // Update location sync time even if no questions found
      await supabase
        .from("gmb_locations")
        .update({
          metadata: {
            ...location.metadata,
            last_questions_sync: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", locationId);

      return {
        success: true,
        message: "No questions found",
        data: { synced: 0 },
      };
    }

    // Prepare all questions for batch upsert
    const syncTime = new Date().toISOString();
    const questionsToUpsert = questionDataset.map((question) => ({
      user_id: question.user_id,
      location_id: question.location_id ?? locationId,
      gmb_account_id: question.gmb_account_id || location.gmb_account_id,
      question_id: question.question_id,
      external_question_id: question.question_id,
      question_text: question.question_text,
      asked_at: question.question_date || syncTime,
      author_name: question.author_name || "Anonymous",
      author_display_name: question.author_display_name || null,
      author_profile_photo_url: question.author_profile_photo_url || null,
      author_type: question.author_type || "CUSTOMER",
      answer_text: question.answer_text || null,
      answered_at: question.answer_date || null,
      answered_by: question.answer_author || null,
      answer_status: question.status === "answered" ? "answered" : "unanswered",
      answer_id: question.answer_id || null,
      upvote_count: question.upvote_count || 0,
      total_answer_count: question.total_answer_count || 0,
      google_resource_name: question.google_resource_name || null,
      status: question.status === "answered" ? "answered" : "pending",
      synced_at: syncTime,
      updated_at: syncTime,
    }));

    // Batch upsert all questions at once
    const { data: upsertedData, error: upsertError } = await supabase
      .from("gmb_questions")
      .upsert(questionsToUpsert, {
        onConflict: "question_id",
        ignoreDuplicates: false,
      })
      .select("id");

    if (upsertError) {
      console.error("[Questions] Batch upsert error:", upsertError);
      return {
        success: false,
        error: `Failed to sync questions: ${upsertError.message}`,
      };
    }

    const synced = upsertedData?.length || questionsToUpsert.length;

    // Update location metadata with sync time
    await supabase
      .from("gmb_locations")
      .update({
        metadata: {
          ...location.metadata,
          last_questions_sync: syncTime,
          total_questions: synced,
        },
        updated_at: syncTime,
      })
      .eq("id", locationId);

    revalidatePath("/dashboard");
    revalidatePath("/questions");

    await refreshCache(CacheBucket.DASHBOARD_OVERVIEW, user.id);

    return {
      success: true,
      message: `Synced ${synced} questions successfully`,
      data: { synced },
    };
  } catch (error: unknown) {
    console.error("[Questions] Sync questions error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to sync questions",
    };
  }
}

// ============================================
// 7. GET QUESTION STATISTICS
// ============================================
type QuestionStatsContext = {
  supabase?: Awaited<ReturnType<typeof createClient>>;
  userId?: string;
};

export async function getQuestionStats(
  locationId?: string,
  context?: QuestionStatsContext,
) {
  try {
    const supabase = context?.supabase ?? (await createClient());
    let resolvedUserId = context?.userId;

    if (!resolvedUserId) {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return {
          success: false,
          error: "Not authenticated",
          data: null,
        };
      }
      resolvedUserId = user.id;
    }

    let query = supabase
      .from("gmb_questions")
      .select("answer_status, upvote_count")
      .eq("user_id", resolvedUserId);

    if (locationId && locationId !== "all") {
      query = query.eq("location_id", locationId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Questions] Stats error:", error);
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }

    const stats = {
      total: data.length,
      unanswered: data.filter(
        (q) =>
          q.answer_status === "unanswered" || q.answer_status === "pending",
      ).length,
      answered: data.filter((q) => q.answer_status === "answered").length,
      totalUpvotes: data.reduce((sum, q) => sum + (q.upvote_count || 0), 0),
      avgUpvotes:
        data.length > 0
          ? data.reduce((sum, q) => sum + (q.upvote_count || 0), 0) /
            data.length
          : 0,
      answerRate:
        (data.filter((q) => q.answer_status === "answered").length /
          (data.length || 1)) *
        100,
    };

    return {
      success: true,
      data: stats,
    };
  } catch (error: unknown) {
    console.error("[Questions] Get stats error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to get statistics",
      data: null,
    };
  }
}

// ============================================
// 8. FAQ TEMPLATE MANAGEMENT
// ============================================
export async function saveAnswerTemplate(
  category: string,
  questionPattern: string,
  templateAnswer: string,
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Not authenticated",
      };
    }

    const { error } = await supabase.from("question_templates").insert({
      user_id: user.id,
      category,
      question_pattern: questionPattern.toLowerCase(),
      template_answer: templateAnswer,
    });

    if (error) {
      console.error("[Questions] Save template error:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      message: "Template saved!",
    };
  } catch (error: unknown) {
    console.error("[Questions] Save template error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save template",
    };
  }
}

export async function getAnswerTemplates(category?: string) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Not authenticated",
        data: [],
      };
    }

    let query = supabase
      .from("question_templates")
      .select("*")
      .eq("user_id", user.id)
      .order("usage_count", { ascending: false });

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Questions] Get templates error:", error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (error: unknown) {
    console.error("[Questions] Get templates error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get templates",
      data: [],
    };
  }
}
