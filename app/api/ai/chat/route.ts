/**
 * AI Chat API Route
 * Handles natural language queries about dashboard data
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAIProvider } from '@/lib/ai/provider';
import type { ChatMessage, ChatResponse } from '@/lib/types/ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message, conversationHistory } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get AI provider
    const aiProvider = await getAIProvider(user.id);
    if (!aiProvider) {
      return NextResponse.json(
        { error: 'AI provider not configured' },
        { status: 400 }
      );
    }

    // Fetch user's dashboard context
    const context = await fetchDashboardContext(user.id, supabase);

    // Build chat prompt
    const prompt = buildChatPrompt(message, context, conversationHistory || []);

    // Generate response with rich error context
    let content: string;
    try {
      ({ content } = await aiProvider.generateCompletion(prompt, 'chat_assistant'));
    } catch (err: any) {
      const message =
        (err && (err.message || err.toString())) || 'AI provider call failed';
      return NextResponse.json(
        {
          error: message,
          hint:
            'Verify API key, model name, and provider availability. Ensure SYSTEM_* API keys are set on Vercel.',
        },
        { status: 500 }
      );
    }

    // Parse response
    const response = parseChatResponse(content);

    return NextResponse.json(response);
  } catch (error) {
    console.error('AI Chat API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Fetch dashboard context for user
 */
async function fetchDashboardContext(userId: string, supabase: any) {
  // Get dashboard stats
  const { data: stats } = await supabase
    .from('v_dashboard_stats')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Get locations
  const { data: locations } = await supabase
    .from('gmb_locations')
    .select('location_name, rating, review_count, response_rate')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(10);

  // Get recent reviews
  const { data: recentReviews } = await supabase
    .from('gmb_reviews')
    .select('rating, review_text, reviewer_name, review_date, has_reply')
    .eq('user_id', userId)
    .order('review_date', { ascending: false })
    .limit(20);

  // Get pending reviews
  const { data: pendingReviews } = await supabase
    .from('gmb_reviews')
    .select('rating, review_text, reviewer_name, review_date, location_id')
    .eq('user_id', userId)
    .eq('has_reply', false)
    .order('review_date', { ascending: false })
    .limit(10);

  return {
    stats,
    locations,
    recentReviews,
    pendingReviews,
  };
}

/**
 * Build chat prompt
 */
function buildChatPrompt(
  userMessage: string,
  context: any,
  history: ChatMessage[]
): string {
  const { stats, locations, recentReviews, pendingReviews } = context;

  // Build conversation history
  const conversationContext = history
    .slice(-5) // Last 5 messages
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join('\n');

  return `You are an AI assistant specialized in Google My Business analytics. Your primary goal is to directly and specifically answer the user's question. Do not give generic summaries unless the user asks for a summary. Always tailor your answer to the user's exact intent and context. If information is missing, ask a brief, specific follow-up question.

**User's Current Dashboard Data:**
- Total Locations: ${stats?.total_locations || 0}
- Total Reviews: ${stats?.total_reviews || 0}
- Average Rating: ${stats?.avg_rating?.toFixed(2) || 'N/A'}/5
- Response Rate: ${Number.isFinite(stats?.response_rate) ? (Number(stats?.response_rate) >= 1 ? `${Number(stats?.response_rate).toFixed(1)}%` : `${(Number(stats?.response_rate) * 100).toFixed(1)}%`) : '0.0%'}
- Pending Reviews: ${stats?.pending_reviews || 0}
- Pending Questions: ${stats?.pending_questions || 0}

**Top Locations:**
${(locations || [])
  .slice(0, 5)
  .map(
    (loc: any) =>
      `- ${loc.location_name}: ${loc.rating?.toFixed(1) || 'N/A'} stars, ${loc.review_count || 0} reviews`
  )
  .join('\n')}

**Recent Reviews Summary:**
- Total recent reviews: ${recentReviews?.length || 0}
- Pending replies: ${pendingReviews?.length || 0}
- Average recent rating: ${
    recentReviews?.length
      ? (
          recentReviews.reduce((sum: number, r: any) => sum + r.rating, 0) /
          recentReviews.length
        ).toFixed(2)
      : 'N/A'
  }

${conversationContext ? `**Conversation History (last 5):**\n${conversationContext}\n` : ''}

**User Query:** ${userMessage}

Provide a helpful, concise response that directly addresses the User Query above. If the user asks for specific data or actions:
1. Reference the actual data from their dashboard (numbers, trends, pending items)
2. Suggest specific, actionable steps they can take (e.g., reply to X reviews at /reviews)
3. Provide navigation links when relevant (e.g., "/reviews", "/analytics", "/locations")
4. If the question is about improvement, include 2-3 targeted recommendations (not generic)
5. If the question cannot be answered from available data, ask one clarifying question in the same JSON

Return your response in JSON format:
{
  "message": "Your response text",
  "suggestions": ["Suggestion 1", "Suggestion 2"],
  "actions": [
    {
      "label": "Action label",
      "description": "What this does",
      "actionType": "navigate",
      "actionUrl": "/path"
    }
  ],
  "data": {
    // Any relevant data to display
  }
}

Be conversational, helpful, and actionable. IMPORTANT: Return ONLY valid JSON, no markdown, no triple backticks, no extra text.`;
}

/**
 * Parse chat response
 */
function parseChatResponse(content: string): ChatResponse {
  try {
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanContent);

    return {
      message: parsed.message || content,
      suggestions: parsed.suggestions || [],
      actions: parsed.actions || [],
      data: parsed.data || {},
    };
  } catch (error) {
    // If parsing fails, return the raw content
    return {
      message: content,
      suggestions: [],
      actions: [],
    };
  }
}

