/**
 * 🤖 AI ASSISTANT SERVICE - "The 10-Year Employee"
 *
 * This is the main AI brain that:
 * - Knows everything about the business (via Business DNA)
 * - Remembers all conversations
 * - Provides personalized, contextual responses
 * - Can take actions on behalf of the user
 */

import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  buildBusinessDNA,
  getBusinessDNA,
  generateBusinessSummary,
  type BusinessDNA,
} from "./business-dna-service";

// AI Provider Types
type AIProvider = "openai" | "claude" | "gemini" | "groq" | "openrouter";

interface AIConfig {
  provider: AIProvider;
  model: string;
  apiKey: string;
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ConversationContext {
  conversationId: string;
  messages: Message[];
  businessDNA: BusinessDNA | null;
  recentMemories: any[];
}

interface AssistantResponse {
  success: boolean;
  message: string;
  conversationId: string;
  suggestedActions?: Array<{
    type: string;
    label: string;
    data?: any;
  }>;
  confidence?: number;
  error?: string;
}

/**
 * Get AI configuration based on user settings or defaults
 */
async function getAIConfig(userId: string): Promise<AIConfig> {
  const supabase = await createClient();

  // Try to get user's AI settings
  const { data: settings } = await supabase
    .from("user_settings")
    .select("ai_provider, ai_model")
    .eq("user_id", userId)
    .single();

  // Default to Claude (best for conversation)
  const provider = (settings?.ai_provider as AIProvider) || "claude";

  const modelMap: Record<AIProvider, string> = {
    openai: "gpt-4-turbo-preview",
    claude: "claude-3-5-sonnet-20241022",
    gemini: "gemini-1.5-pro",
    groq: "llama-3.1-70b-versatile",
    openrouter: "anthropic/claude-3.5-sonnet",
  };

  const apiKeyMap: Record<AIProvider, string> = {
    openai: process.env.OPENAI_API_KEY || "",
    claude: process.env.ANTHROPIC_API_KEY || "",
    gemini: process.env.GOOGLE_AI_API_KEY || "",
    groq: process.env.GROQ_API_KEY || "",
    openrouter: process.env.OPENROUTER_API_KEY || "",
  };

  return {
    provider,
    model: settings?.ai_model || modelMap[provider],
    apiKey: apiKeyMap[provider],
  };
}

/**
 * Build the system prompt with full business context
 */
function buildSystemPrompt(dna: BusinessDNA | null, memories: any[]): string {
  let prompt = `أنت مساعد ذكي متخصص في إدارة الأعمال، تعمل كموظف خبير لديه 10 سنوات خبرة مع هذا العمل.

You are an intelligent business assistant who knows EVERYTHING about this business. You've been working here for 10 years and understand every detail.

## Your Personality:
- Friendly, professional, and proactive
- You speak Arabic and English fluently
- You give specific, actionable advice based on real data
- You remember everything the user has told you
- You anticipate needs before being asked

## Your Capabilities:
- Answer questions about the business performance
- Draft responses to customer reviews
- Suggest content for posts
- Analyze trends and provide insights
- Remember user preferences and past conversations
- Take actions like scheduling posts or drafting replies

`;

  if (dna) {
    prompt += `
## BUSINESS CONTEXT (This is the business you know inside out):

**Business Name:** ${dna.businessName}
**Type:** ${dna.businessType} | ${dna.businessCategory}
**Brand Voice:** ${dna.brandVoice}

**Performance:**
- Average Rating: ${dna.averageRating}/5 from ${dna.totalReviews} reviews
- Response Rate: ${dna.responseRate}%
- Growth Trend: ${dna.growthTrend}
- Sentiment Score: ${dna.sentimentScore}/100

**Strengths (what customers love):**
${dna.strengths.map((s) => `- ${s}`).join("\n") || "- Still learning..."}

**Areas to Improve:**
${dna.weaknesses.map((w) => `- ${w}`).join("\n") || "- Looking good so far!"}

**Common Customer Topics:**
${
  dna.commonTopics
    ?.slice(0, 5)
    .map((t) => `- ${t.topic}: ${t.mentions} mentions (${t.sentiment})`)
    .join("\n") || "- Analyzing..."
}

**Best Times to Post:**
${
  dna.bestPostTimes
    ?.slice(0, 3)
    .map((t) => `- ${t.day} at ${t.hour}:00`)
    .join("\n") || "- Need more data"
}

**Communication Style (how the owner usually responds):**
- Tone: ${dna.replyStyle?.tone || "professional"}
- Length: ${dna.replyStyle?.length || "medium"}
- Uses Emojis: ${dna.replyStyle?.emojiUsage ? "Yes" : "No"}

**Signature Phrases (owner often uses):**
${dna.signaturePhrases?.map((p) => `- "${p}"`).join("\n") || "- Learning patterns..."}

`;
  }

  if (memories && memories.length > 0) {
    prompt += `
## MEMORIES (Things you remember about this user):

${memories
  .slice(0, 10)
  .map((m) => `- ${m.content}`)
  .join("\n")}

`;
  }

  prompt += `
## IMPORTANT RULES:
1. Always use the business context to give specific answers
2. When suggesting reply drafts, match the owner's communication style
3. Be proactive - suggest actions without being asked
4. If you don't know something, say so honestly
5. Speak in the same language the user uses
6. Reference specific data when possible (ratings, review counts, etc.)
7. When the user asks about performance, use real numbers from the context

## ACTION TYPES you can suggest:
- reply_review: Draft a reply to a review
- create_post: Create a new post
- schedule_post: Schedule a post for optimal time
- view_analytics: Show detailed analytics
- contact_customer: Reach out to a customer
- update_business_info: Update business information

Remember: You're not a generic AI. You KNOW this business. Act like it!
`;

  return prompt;
}

/**
 * Call the AI provider
 */
async function callAI(
  config: AIConfig,
  messages: Message[],
  systemPrompt: string,
): Promise<{ content: string; tokensUsed?: number }> {
  const fullMessages = [
    { role: "system" as const, content: systemPrompt },
    ...messages,
  ];

  switch (config.provider) {
    case "openai": {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: config.model,
            messages: fullMessages,
            temperature: 0.7,
            max_tokens: 2000,
          }),
        },
      );
      const data = await response.json();
      return {
        content: data.choices?.[0]?.message?.content || "",
        tokensUsed: data.usage?.total_tokens,
      };
    }

    case "claude": {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": config.apiKey,
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: 2000,
          system: systemPrompt,
          messages: messages.map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          })),
        }),
      });
      const data = await response.json();
      return {
        content: data.content?.[0]?.text || "",
        tokensUsed: data.usage?.input_tokens + data.usage?.output_tokens,
      };
    }

    case "gemini": {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { role: "user", parts: [{ text: systemPrompt }] },
              ...messages.map((m) => ({
                role: m.role === "assistant" ? "model" : "user",
                parts: [{ text: m.content }],
              })),
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2000,
            },
          }),
        },
      );
      const data = await response.json();
      return {
        content: data.candidates?.[0]?.content?.parts?.[0]?.text || "",
      };
    }

    case "groq": {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: config.model,
            messages: fullMessages,
            temperature: 0.7,
            max_tokens: 2000,
          }),
        },
      );
      const data = await response.json();
      return {
        content: data.choices?.[0]?.message?.content || "",
        tokensUsed: data.usage?.total_tokens,
      };
    }

    case "openrouter": {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://nnh.ae",
          },
          body: JSON.stringify({
            model: config.model,
            messages: fullMessages,
            temperature: 0.7,
            max_tokens: 2000,
          }),
        },
      );
      const data = await response.json();
      return {
        content: data.choices?.[0]?.message?.content || "",
        tokensUsed: data.usage?.total_tokens,
      };
    }

    default:
      throw new Error(`Unknown AI provider: ${config.provider}`);
  }
}

/**
 * Get or create a conversation
 */
async function getOrCreateConversation(
  userId: string,
  conversationId?: string,
): Promise<{ id: string; messages: Message[] }> {
  const supabase = createAdminClient();

  if (conversationId) {
    // Get existing conversation
    const { data: conversation } = await supabase
      .from("ai_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .single();

    if (conversation) {
      // Get messages
      const { data: messages } = await supabase
        .from("ai_messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(50); // Last 50 messages for context

      return {
        id: conversation.id,
        messages: (messages || []).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      };
    }
  }

  // Create new conversation
  const { data: newConversation, error } = await supabase
    .from("ai_conversations")
    .insert({
      user_id: userId,
      status: "active",
    })
    .select("id")
    .single();

  if (error || !newConversation) {
    throw new Error("Failed to create conversation");
  }

  return { id: newConversation.id, messages: [] };
}

/**
 * Save a message to the conversation
 */
async function saveMessage(
  conversationId: string,
  userId: string,
  role: "user" | "assistant",
  content: string,
  metadata?: {
    modelUsed?: string;
    tokensUsed?: number;
    confidence?: number;
    actionsSuggested?: any[];
  },
): Promise<void> {
  const supabase = createAdminClient();

  await supabase.from("ai_messages").insert({
    conversation_id: conversationId,
    user_id: userId,
    role,
    content,
    model_used: metadata?.modelUsed,
    tokens_used: metadata?.tokensUsed,
    confidence_score: metadata?.confidence,
    actions_suggested: metadata?.actionsSuggested || [],
  });
}

/**
 * Get relevant memories for context
 */
async function getRelevantMemories(userId: string, limit = 10): Promise<any[]> {
  const supabase = await createAdminClient();

  const { data: memories } = await supabase
    .from("ai_memory")
    .select("*")
    .eq("user_id", userId)
    .order("importance_score", { ascending: false })
    .limit(limit);

  return memories || [];
}

/**
 * Save important information as memory
 */
async function saveMemory(
  userId: string,
  memoryType: string,
  content: string,
  importance: number = 50,
  context?: any,
): Promise<void> {
  const supabase = await createAdminClient();

  await supabase.from("ai_memory").insert({
    user_id: userId,
    memory_type: memoryType,
    content,
    importance_score: importance,
    context: context || {},
  });
}

/**
 * Extract actions from AI response
 */
function extractSuggestedActions(response: string): Array<{
  type: string;
  label: string;
  data?: any;
}> {
  const actions: Array<{ type: string; label: string; data?: any }> = [];

  // Look for action patterns in the response
  if (response.includes("draft") && response.includes("reply")) {
    actions.push({
      type: "reply_review",
      label: "Draft Reply",
    });
  }

  if (
    response.includes("post") &&
    (response.includes("suggest") || response.includes("create"))
  ) {
    actions.push({
      type: "create_post",
      label: "Create Post",
    });
  }

  if (response.includes("analytics") || response.includes("details")) {
    actions.push({
      type: "view_analytics",
      label: "View Analytics",
    });
  }

  return actions;
}

// ============================================
// MAIN EXPORTED FUNCTIONS
// ============================================

/**
 * Chat with the AI Assistant
 */
export async function chatWithAssistant(
  userId: string,
  userMessage: string,
  conversationId?: string,
  locationId?: string,
): Promise<AssistantResponse> {
  try {
    // 1. Get or build Business DNA
    let dna = await getBusinessDNA(userId, locationId);
    if (!dna) {
      const result = await buildBusinessDNA(userId, locationId);
      dna = result.dna || null;
    }

    // 2. Get AI config
    const config = await getAIConfig(userId);

    // 3. Get or create conversation
    const conversation = await getOrCreateConversation(userId, conversationId);

    // 4. Get relevant memories
    const memories = await getRelevantMemories(userId);

    // 5. Build system prompt
    const systemPrompt = buildSystemPrompt(dna, memories);

    // 6. Add user message to conversation
    const messages: Message[] = [
      ...conversation.messages,
      { role: "user", content: userMessage },
    ];

    // 7. Call AI
    const aiResponse = await callAI(config, messages, systemPrompt);

    // 8. Save user message
    await saveMessage(conversation.id, userId, "user", userMessage);

    // 9. Extract suggested actions
    const suggestedActions = extractSuggestedActions(aiResponse.content);

    // 10. Save AI response
    await saveMessage(
      conversation.id,
      userId,
      "assistant",
      aiResponse.content,
      {
        modelUsed: `${config.provider}/${config.model}`,
        tokensUsed: aiResponse.tokensUsed,
        actionsSuggested: suggestedActions,
      },
    );

    // 11. Check if we should save any memories from this conversation
    // (e.g., if user mentions preferences)
    if (
      userMessage.toLowerCase().includes("prefer") ||
      userMessage.toLowerCase().includes("always") ||
      userMessage.toLowerCase().includes("أفضل")
    ) {
      await saveMemory(userId, "preference", userMessage, 70, {
        conversationId: conversation.id,
      });
    }

    return {
      success: true,
      message: aiResponse.content,
      conversationId: conversation.id,
      suggestedActions,
      confidence: 85, // Can be calculated based on DNA completeness
    };
  } catch (error) {
    console.error("AI Assistant Error:", error);
    return {
      success: false,
      message: "",
      conversationId: conversationId || "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generate a daily briefing for the user
 */
export async function generateDailyBriefing(userId: string): Promise<{
  success: boolean;
  briefing?: any;
  error?: string;
}> {
  try {
    const supabase = await createAdminClient();
    const today = new Date().toISOString().split("T")[0];

    // Check if briefing already exists for today
    const { data: existing } = await supabase
      .from("ai_daily_briefings")
      .select("*")
      .eq("user_id", userId)
      .eq("briefing_date", today)
      .single();

    if (existing) {
      return { success: true, briefing: existing };
    }

    // Get business DNA
    let dna = await getBusinessDNA(userId);
    if (!dna) {
      const result = await buildBusinessDNA(userId);
      dna = result.dna || null;
    }

    // Get recent activity
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: newReviews } = await supabase
      .from("gmb_reviews")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", yesterday);

    const { data: newQuestions } = await supabase
      .from("gmb_questions")
      .select("*")
      .eq("user_id", userId)
      .eq("answer_status", "pending");

    // Build briefing
    const hour = new Date().getHours();
    const greeting =
      hour < 12
        ? "Good morning"
        : hour < 18
          ? "Good afternoon"
          : "Good evening";

    const highlights = [];
    const alerts = [];
    const suggestions = [];
    const tasks = [];

    // New reviews
    if (newReviews && newReviews.length > 0) {
      const positiveCount = newReviews.filter((r) => r.rating >= 4).length;
      const negativeCount = newReviews.filter((r) => r.rating <= 2).length;

      highlights.push({
        type: "new_reviews",
        count: newReviews.length,
        sentiment: positiveCount > negativeCount ? "positive" : "mixed",
        message: `${newReviews.length} new review${newReviews.length > 1 ? "s" : ""} (${positiveCount} positive)`,
      });

      if (negativeCount > 0) {
        alerts.push({
          priority: "high",
          message: `${negativeCount} negative review${negativeCount > 1 ? "s" : ""} need${negativeCount === 1 ? "s" : ""} attention`,
          action: "reply_review",
        });
      }
    }

    // Pending questions
    if (newQuestions && newQuestions.length > 0) {
      tasks.push({
        task: `Answer ${newQuestions.length} pending question${newQuestions.length > 1 ? "s" : ""}`,
        priority: 1,
        status: "pending",
      });
    }

    // Suggestions based on DNA
    if (dna) {
      if (dna.responseRate < 80) {
        suggestions.push({
          action: "improve_response_rate",
          reason: `Your response rate is ${dna.responseRate}%. Aim for 90%+ for better engagement.`,
        });
      }

      if (dna.bestPostTimes && dna.bestPostTimes.length > 0) {
        const bestTime = dna.bestPostTimes[0];
        suggestions.push({
          action: "schedule_post",
          reason: `Best time to post: ${bestTime.day} at ${bestTime.hour}:00`,
        });
      }
    }

    // Generate summary
    let summary = "";
    if (newReviews && newReviews.length > 0) {
      summary = `You received ${newReviews.length} new reviews. `;
    } else {
      summary = "No new reviews today. ";
    }

    if (dna) {
      summary += `Your overall rating is ${dna.averageRating}/5. `;
      if (dna.growthTrend === "growing") {
        summary += "Business is showing positive growth! 📈";
      }
    }

    // Save briefing
    const { data: briefing, error } = await supabase
      .from("ai_daily_briefings")
      .insert({
        user_id: userId,
        briefing_date: today,
        greeting: `${greeting}, ${dna?.businessName || "there"}!`,
        summary,
        highlights,
        alerts,
        suggestions,
        tasks,
        stats: {
          new_reviews: newReviews?.length || 0,
          average_rating: dna?.averageRating || 0,
          response_rate: dna?.responseRate || 0,
          pending_questions: newQuestions?.length || 0,
        },
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { success: true, briefing };
  } catch (error) {
    console.error("Error generating briefing:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get conversation history
 */
export async function getConversationHistory(
  userId: string,
  limit = 20,
): Promise<any[]> {
  const supabase = await createClient();

  const { data: conversations } = await supabase
    .from("ai_conversations")
    .select(
      `
      id,
      title,
      summary,
      status,
      last_message_at,
      created_at
    `,
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .order("last_message_at", { ascending: false })
    .limit(limit);

  return conversations || [];
}
