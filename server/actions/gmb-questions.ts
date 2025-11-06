"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const GMB_API_BASE = "https://mybusiness.googleapis.com/v4"

// Validation schemas
const AnswerQuestionSchema = z.object({
  questionId: z.string().uuid(),
  answerText: z.string().min(1).max(1500),
})

/**
 * Get valid access token for a GMB account
 */
async function getValidAccessToken(
  supabase: any,
  accountId: string
): Promise<string> {
  const { data: account, error } = await supabase
    .from("gmb_accounts")
    .select("access_token, refresh_token, expires_at")
    .eq("id", accountId)
    .single()

  if (error || !account) {
    throw new Error("GMB account not found")
  }

  const now = Date.now()
  const expiresAt = account.expires_at ? new Date(account.expires_at).getTime() : 0

  if (expiresAt > now + 5 * 60 * 1000) {
    return account.access_token
  }

  // Refresh token
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: account.refresh_token,
      grant_type: "refresh_token",
    }),
  })

  if (!response.ok) {
    throw new Error("Failed to refresh token. Please reconnect your Google account.")
  }

  const tokens = await response.json()
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000)

  await supabase
    .from("gmb_accounts")
    .update({
      access_token: tokens.access_token,
      expires_at: newExpiresAt.toISOString(),
    })
    .eq("id", accountId)

  return tokens.access_token
}

/**
 * Answer a customer question on Google Business Profile
 */
export async function answerQuestion(questionId: string, answerText: string) {
  try {
    const validatedData = AnswerQuestionSchema.parse({ questionId, answerText })

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: "Not authenticated",
      }
    }

    // Get question details
    const { data: question, error: fetchError } = await supabase
      .from("gmb_questions")
      .select(
        `
        *,
        gmb_locations!inner(
          id,
          location_id,
          gmb_account_id,
          gmb_accounts!inner(
            id,
            account_id,
            access_token,
            refresh_token,
            expires_at
          )
        )
      `
      )
      .eq("id", validatedData.questionId)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !question) {
      return {
        success: false,
        error: "Question not found or you don't have permission to answer it.",
      }
    }

    // Check if already answered
    if (question.answer_status === "answered") {
      return {
        success: false,
        error: "This question has already been answered.",
      }
    }

    const location = question.gmb_locations
    const account = Array.isArray(location.gmb_accounts)
      ? location.gmb_accounts[0]
      : location.gmb_accounts

    if (!account) {
      return {
        success: false,
        error: "GMB account not found. Please reconnect your Google account.",
      }
    }

    const accessToken = await getValidAccessToken(supabase, account.id)

    // Call Google My Business API
    // POST accounts/{accountId}/locations/{locationId}/questions/{questionId}/answers
    const gmbApiUrl = `${GMB_API_BASE}/accounts/${account.account_id}/locations/${location.location_id}/questions/${question.external_question_id}/answers`

    const response = await fetch(gmbApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: validatedData.answerText,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))

      if (response.status === 401) {
        return {
          success: false,
          error: "Authentication expired. Please reconnect your Google account.",
        }
      }

      if (response.status === 429) {
        return {
          success: false,
          error: "Too many requests. Please try again later.",
        }
      }

      console.error("[GMB Questions] API error:", errorData)
      return {
        success: false,
        error: errorData.error?.message || "Failed to post answer to Google",
      }
    }

    const result = await response.json()

    // Update database
    const { error: updateError } = await supabase
      .from("gmb_questions")
      .update({
        answer_text: validatedData.answerText,
        answered_at: new Date().toISOString(),
        answered_by: user.email || "Business Owner",
        answer_status: "answered",
        updated_at: new Date().toISOString(),
      })
      .eq("id", validatedData.questionId)

    if (updateError) {
      console.error("[GMB Questions] Database update error:", updateError)
    }

    revalidatePath("/dashboard")
    revalidatePath("/questions")

    return {
      success: true,
      data: result,
    }
  } catch (error: any) {
    console.error("[GMB Questions] Error answering question:", error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map((e) => e.message).join(", ")}`,
      }
    }

    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    }
  }
}

/**
 * Get unanswered questions
 */
export async function getUnansweredQuestions(locationId?: string) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: "Not authenticated",
        data: [],
      }
    }

    let query = supabase
      .from("gmb_questions")
      .select(
        `
        id,
        question_text,
        author_name,
        upvote_count,
        created_at,
        gmb_locations!inner(
          id,
          location_name
        )
      `
      )
      .eq("user_id", user.id)
      .eq("answer_status", "pending")
      .order("upvote_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50)

    if (locationId && locationId !== "all") {
      query = query.eq("location_id", locationId)
    }

    const { data, error } = await query

    if (error) {
      console.error("[GMB Questions] Error fetching questions:", error)
      return {
        success: false,
        error: error.message,
        data: [],
      }
    }

    return {
      success: true,
      data: data || [],
    }
  } catch (error: any) {
    console.error("[GMB Questions] Error in getUnansweredQuestions:", error)
    return {
      success: false,
      error: error.message || "Failed to fetch questions",
      data: [],
    }
  }
}

/**
 * Sync questions from Google My Business API
 */
export async function syncQuestions(locationId: string) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: "Not authenticated",
      }
    }

    // Get location details
    const { data: location, error: locError } = await supabase
      .from("gmb_locations")
      .select(
        `
        id,
        location_id,
        gmb_account_id,
        gmb_accounts!inner(
          id,
          account_id,
          access_token,
          refresh_token,
          expires_at
        )
      `
      )
      .eq("id", locationId)
      .eq("user_id", user.id)
      .single()

    if (locError || !location) {
      return {
        success: false,
        error: "Location not found",
      }
    }

    const account = Array.isArray(location.gmb_accounts)
      ? location.gmb_accounts[0]
      : location.gmb_accounts

    if (!account) {
      return {
        success: false,
        error: "GMB account not found. Please reconnect your Google account.",
      }
    }

    const accessToken = await getValidAccessToken(supabase, account.id)

    // Fetch questions from Google
    const gmbApiUrl = `${GMB_API_BASE}/accounts/${account.account_id}/locations/${location.location_id}/questions`

    const response = await fetch(gmbApiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          error: "Authentication expired",
        }
      }

      return {
        success: false,
        error: "Failed to sync questions from Google",
      }
    }

    const { questions = [] } = await response.json()

    // Upsert questions
    if (questions.length > 0) {
      const questionsToUpsert = questions.map((q: any) => ({
        user_id: user.id,
        location_id: locationId,
        gmb_account_id: account.id,
        external_question_id: q.name?.split("/").pop() || q.questionId,
        question_text: q.text || "",
        author_name: q.author?.displayName || "Customer",
        author_type: q.author?.type || "CUSTOMER",
        upvote_count: q.upvoteCount || 0,
        answer_text: q.topAnswers?.[0]?.text || null,
        answered_at: q.topAnswers?.[0]?.updateTime || null,
        answered_by: q.topAnswers?.[0]?.author?.displayName || null,
        answer_status: q.topAnswers?.length > 0 ? "answered" : "pending",
      }))

      const { error: upsertError } = await supabase
        .from("gmb_questions")
        .upsert(questionsToUpsert, {
          onConflict: "external_question_id",
          ignoreDuplicates: false,
        })

      if (upsertError) {
        console.error("[GMB Questions] Upsert error:", upsertError)
        return {
          success: false,
          error: "Failed to save questions to database",
        }
      }
    }

    revalidatePath("/dashboard")
    revalidatePath("/questions")

    return {
      success: true,
      syncedCount: questions.length,
    }
  } catch (error: any) {
    console.error("[GMB Questions] Sync error:", error)
    return {
      success: false,
      error: error.message || "Failed to sync questions",
    }
  }
}

