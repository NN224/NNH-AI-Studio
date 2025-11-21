import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import Groq from "groq-sdk";
import {
  buildSystemPrompt,
  generateScenarioPrompt,
} from "@/lib/ai/system-prompt-builder";

type AIProvider = "openai" | "anthropic" | "groq" | "deepseek";

const getAIClient = (provider: AIProvider) => {
  switch (provider) {
    case "openai":
      return new OpenAI({
        apiKey: process.env.SYSTEM_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
      });
    case "anthropic":
      return new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    case "groq":
      return new Groq({
        apiKey: process.env.GROQ_API_KEY,
      });
    case "deepseek":
      return new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: "https://api.deepseek.com/v1",
      });
    default:
      return null;
  }
};

export async function POST(request: NextRequest) {
  try {
    // Use Supabase Auth
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      message,
      conversationHistory = [],
      provider = "openai",
      businessInfo,
      context,
      action = "chat",
      language = "en",
      tone = "professional",
      scenario,
    } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    let systemPrompt: string;

    if (businessInfo) {
      systemPrompt = buildSystemPrompt({
        businessInfo,
        language,
        tone,
        context,
        action,
      });

      if (scenario) {
        const scenarioPrompt = generateScenarioPrompt(
          scenario as any,
          businessInfo,
        );
        systemPrompt += `\n\nScenario Context:\n${scenarioPrompt}`;
      }
    } else {
      systemPrompt = `You are an AI assistant specialized in Google My Business (GMB) management.`;
    }

    let responseContent = "";

    try {
      if (provider === "openai" || provider === "deepseek") {
        const client = getAIClient(provider) as OpenAI;
        if (!client) throw new Error(`${provider} client not configured`);

        const model =
          provider === "deepseek" ? "deepseek-chat" : "gpt-4-turbo-preview";

        const completion = await client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            ...conversationHistory,
            { role: "user", content: message },
          ],
          temperature: action === "analysis" ? 0.3 : 0.7,
          max_tokens: 500,
        });

        responseContent =
          completion.choices[0].message.content ||
          "I couldn't generate a response.";
      } else if (provider === "anthropic") {
        const client = getAIClient(provider) as Anthropic;
        if (!client) throw new Error("Anthropic client not configured");

        const response = await client.messages.create({
          model: "claude-3-opus-20240229",
          system: systemPrompt,
          messages: [
            ...conversationHistory,
            { role: "user", content: message },
          ],
          max_tokens: 500,
          temperature: action === "analysis" ? 0.3 : 0.7,
        });

        responseContent =
          response.content[0].type === "text"
            ? response.content[0].text
            : "I couldn't generate a response.";
      } else if (provider === "groq") {
        const client = getAIClient(provider) as Groq;
        if (!client) throw new Error("Groq client not configured");

        const completion = await client.chat.completions.create({
          model: "mixtral-8x7b-32768",
          messages: [
            { role: "system", content: systemPrompt },
            ...conversationHistory,
            { role: "user", content: message },
          ],
          temperature: action === "analysis" ? 0.3 : 0.7,
          max_tokens: 500,
        });

        responseContent =
          completion.choices[0]?.message?.content ||
          "I couldn't generate a response.";
      }
    } catch (aiError) {
      console.error(`AI Provider (${provider}) Error:`, aiError);
      responseContent = `I apologize, but I'm having trouble processing your request. Please try again or switch to a different AI provider.`;
    }

    return NextResponse.json({
      message: {
        content: responseContent,
        timestamp: new Date().toISOString(),
        model: provider,
        promptType: businessInfo ? "dynamic" : "default",
      },
      success: true,
    });
  } catch (error) {
    console.error("Enhanced AI Chat API Error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 },
    );
  }
}

export async function GET() {
  const providers = {
    openai: !!process.env.SYSTEM_OPENAI_API_KEY || !!process.env.OPENAI_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    groq: !!process.env.GROQ_API_KEY,
    deepseek: !!process.env.DEEPSEEK_API_KEY,
  };

  const availableProviders = Object.entries(providers)
    .filter(([_, isConfigured]) => isConfigured)
    .map(([provider]) => provider);

  return NextResponse.json({
    status: "Enhanced AI Chat API is running",
    availableProviders,
    features: [
      "Dynamic system prompts",
      "Multi-language support",
      "Industry templates",
      "Scenario handling",
    ],
  });
}
