/**
 * 🤖 AI ASSISTANT CHAT API
 *
 * POST /api/ai/assistant/chat
 *
 * The main endpoint for chatting with the AI Assistant
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chatWithAssistant } from "@/lib/services/ai-assistant-service";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60 seconds for AI response

const chatSchema = z.object({
  message: z.string().min(1).max(5000),
  conversationId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse body
    const body = await request.json();
    const validation = chatSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const { message, conversationId, locationId } = validation.data;

    // Chat with assistant
    const response = await chatWithAssistant(
      user.id,
      message,
      conversationId,
      locationId,
    );

    if (!response.success) {
      return NextResponse.json(
        { error: response.error || "Failed to get response" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: response.message,
      conversationId: response.conversationId,
      suggestedActions: response.suggestedActions,
      confidence: response.confidence,
    });
  } catch (error) {
    console.error("[AI Assistant Chat] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
