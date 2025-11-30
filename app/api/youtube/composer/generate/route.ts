import { createClient } from "@/lib/supabase/server";
import { logServerActivity } from "@/server/services/activity";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function callProvider(
  model: string,
  apiKey: string,
  url: string,
  prompt: string,
) {
  const body = {
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  };
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  const j = await r.json();
  const text =
    j.choices?.[0]?.message?.content || j.output_text || j.text || "";
  return text;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { prompt, tone = "neutral" } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const system = `Generate YouTube content in ${tone} tone. Return JSON with fields: title, description, hashtags (comma separated, without #).`;
    const userPrompt = `${system}\n\nINPUT:\n${prompt}\n\nOUTPUT JSON ONLY:`;

    const providers: Array<{ key?: string; url: string; model: string }> = [
      {
        key: process.env.GROQ_API_KEY,
        url: "https://api.groq.com/openai/v1/chat/completions",
        model: "llama3-70b-8192",
      },
      {
        key: process.env.TOGETHER_API_KEY,
        url: "https://api.together.xyz/v1/chat/completions",
        model: "meta-llama/Meta-Llama-3-70B-Instruct-Turbo",
      },
      {
        key: process.env.DEEPSEEK_API_KEY,
        url: "https://api.deepseek.com/chat/completions",
        model: "deepseek-chat",
      },
    ];

    let raw = "";
    for (const p of providers) {
      if (!p.key) continue;
      try {
        raw = await callProvider(p.model, p.key, p.url, userPrompt);
        break;
      } catch {
        /* Try next provider */
      }
    }
    if (!raw)
      return NextResponse.json(
        { error: "No AI provider configured" },
        { status: 400 },
      );

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {}; /* Invalid JSON, use defaults */
    }
    const title = parsed.title || "Untitled video";
    const description = parsed.description || "Description goes here.";
    const hashtags = parsed.hashtags || "";
    // Unified activity log: AI generation for YouTube content
    try {
      await logServerActivity({
        userId: user.id,
        type: "youtube_ai_generated",
        message: "Generated YouTube content via AI",
        metadata: {
          tone,
          hasHashtags: Boolean(hashtags),
          titleLength: title.length,
        },
      });
    } catch {
      // Logging failure should not break the main flow
    }
    return NextResponse.json({ title, description, hashtags });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Generate failed" },
      { status: 500 },
    );
  }
}
