/**
 * AI Chat Streaming API Route
 * Handles streaming responses for real-time chat experience
 */

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const { message, conversationHistory } = body;

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get API key (prioritize Anthropic for streaming)
    const anthropicKey =
      process.env.SYSTEM_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
    const openaiKey =
      process.env.SYSTEM_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

    if (!anthropicKey && !openaiKey) {
      return new Response(
        JSON.stringify({ error: "No AI provider configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Fetch dashboard context
    const context = await fetchDashboardContext(user.id, supabase);

    // Build prompt
    const prompt = buildStreamingPrompt(
      message,
      context,
      conversationHistory || [],
    );

    // Create streaming response
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (anthropicKey) {
            await streamAnthropic(anthropicKey, prompt, controller, encoder);
          } else if (openaiKey) {
            await streamOpenAI(openaiKey, prompt, controller, encoder);
          }
        } catch (error) {
          console.error("Streaming error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Streaming failed" })}\n\n`,
            ),
          );
        } finally {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("AI Chat Stream Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

/**
 * Stream from Anthropic API
 */
async function streamAnthropic(
  apiKey: string,
  prompt: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 2000,
      temperature: 0.7,
      stream: true,
      system:
        "You are an AI assistant specialized in Google My Business analytics. Be helpful, concise, and actionable. When suggesting actions, include specific page links like /reviews, /analytics, /locations.",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No reader");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          if (parsed.type === "content_block_delta" && parsed.delta?.text) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ content: parsed.delta.text })}\n\n`,
              ),
            );
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  }
}

/**
 * Stream from OpenAI API
 */
async function streamOpenAI(
  apiKey: string,
  prompt: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 2000,
      temperature: 0.7,
      stream: true,
      messages: [
        {
          role: "system",
          content:
            "You are an AI assistant specialized in Google My Business analytics. Be helpful, concise, and actionable.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No reader");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content })}\n\n`),
            );
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  }
}

/**
 * Fetch dashboard context
 */
async function fetchDashboardContext(
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const [statsResult, locationsResult, reviewsResult, pendingResult] =
    await Promise.all([
      supabase.rpc("get_user_dashboard_stats", { p_user_id: userId }).single(),
      supabase
        .from("gmb_locations")
        .select("location_name, rating, review_count, response_rate")
        .eq("user_id", userId)
        .eq("is_active", true)
        .limit(5),
      supabase
        .from("gmb_reviews")
        .select("rating, review_text, reviewer_name, review_date, has_reply")
        .eq("user_id", userId)
        .order("review_date", { ascending: false })
        .limit(10),
      supabase
        .from("gmb_reviews")
        .select("rating, review_text, reviewer_name")
        .eq("user_id", userId)
        .eq("has_reply", false)
        .order("review_date", { ascending: false })
        .limit(5),
    ]);

  return {
    stats: statsResult.data as Record<string, unknown> | null,
    locations: locationsResult.data || [],
    recentReviews: reviewsResult.data || [],
    pendingReviews: pendingResult.data || [],
  };
}

interface DashboardContext {
  stats: Record<string, unknown> | null;
  locations: Array<{
    location_name: string;
    rating: number;
    review_count: number;
    response_rate: number;
  }>;
  recentReviews: Array<{
    rating: number;
    review_text: string;
    reviewer_name: string;
    review_date: string;
    has_reply: boolean;
  }>;
  pendingReviews: Array<{
    rating: number;
    review_text: string;
    reviewer_name: string;
  }>;
}

interface ChatMessage {
  role: string;
  content: string;
}

/**
 * Build streaming prompt
 */
function buildStreamingPrompt(
  userMessage: string,
  context: DashboardContext,
  history: ChatMessage[],
): string {
  const { stats, locations, pendingReviews } = context;

  const conversationContext = history
    .slice(-5)
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join("\n");

  // Include actual pending review details for richer context
  const pendingDetails = pendingReviews
    .slice(0, 3)
    .map(
      (r) =>
        `- ${r.reviewer_name} (${r.rating}⭐): "${r.review_text?.slice(0, 100)}..."`,
    )
    .join("\n");

  return `**Dashboard Data:**
- Total Locations: ${(stats as Record<string, number>)?.total_locations || 0}
- Total Reviews: ${(stats as Record<string, number>)?.total_reviews || 0}
- Average Rating: ${((stats as Record<string, number>)?.avg_rating || 0).toFixed(2)}/5
- Response Rate: ${((stats as Record<string, number>)?.response_rate || 0).toFixed(1)}%
- Pending Reviews: ${(stats as Record<string, number>)?.pending_reviews || 0}

**Top Locations:**
${locations
  .slice(0, 3)
  .map(
    (loc) =>
      `- ${loc.location_name}: ${loc.rating?.toFixed(1) || "N/A"}⭐, ${loc.review_count || 0} reviews`,
  )
  .join("\n")}

**Pending Reviews Needing Response:**
${pendingDetails || "None"}

${conversationContext ? `**Recent Conversation:**\n${conversationContext}\n` : ""}

**User Question:** ${userMessage}

Provide a helpful, specific response. Include actionable suggestions with links like /reviews, /analytics when relevant.`;
}
