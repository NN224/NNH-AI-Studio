import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkRequiredEnvVars } from "../_shared/env-check.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AIProvider {
  name: string;
  endpoint: string;
  apiKey: string;
  model: string;
}

const providers: AIProvider[] = [
  {
    name: "groq",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    apiKey: Deno.env.get("GROQ_API_KEY") || Deno.env.get("VITE_GROQ_API_KEY") || "",
    model: "mixtral-8x7b-32768",
  },
  {
    name: "deepseek",
    endpoint: "https://api.deepseek.com/v1/chat/completions",
    apiKey: Deno.env.get("DEEPSEEK_API_KEY") || Deno.env.get("VITE_DEEPSEEK_API_KEY") || "",
    model: "deepseek-chat",
  },
  {
    name: "together",
    endpoint: "https://api.together.xyz/v1/chat/completions",
    apiKey: Deno.env.get("TOGETHER_API_KEY") || Deno.env.get("VITE_TOGETHER_API_KEY") || "",
    model: "meta-llama/Llama-3-70b-chat-hf",
  },
];

async function callAIProvider(provider: AIProvider, prompt: string, systemPrompt?: string): Promise<{content: string, usage: any}> {
  const messages = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  messages.push({ role: "user", content: prompt });

  const response = await fetch(provider.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    throw new Error(`${provider.name} API error: ${response.status} - ${await response.text()}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    usage: data.usage || { prompt_tokens: 0, completion_tokens: 0 }
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const envCheck = checkRequiredEnvVars([
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
    ]);
    if (!envCheck.valid) {
      console.error("Missing environment variables:", envCheck.missing);
      return new Response(
        JSON.stringify({
          error: "Server configuration error",
          details: `Missing: ${envCheck.missing.join(", ")}`,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Missing authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const authenticatedUserId = userData.user.id;

    const { prompt, systemPrompt, userId, taskType = "general" } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Missing prompt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (userId && userId !== authenticatedUserId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized access: userId mismatch" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result = "";
    let usedProvider = "";
    let error = null;
    let tokensUsed = { prompt_tokens: 0, completion_tokens: 0 };

    for (const provider of providers) {
      if (!provider.apiKey) continue;

      try {
        const aiResponse = await callAIProvider(provider, prompt, systemPrompt);
        result = aiResponse.content;
        usedProvider = provider.name;
        tokensUsed = aiResponse.usage;
        break;
      } catch (err) {
        console.error(`Provider ${provider.name} failed:`, err);
        error = err.message;
        continue;
      }
    }

    if (!result) {
      return new Response(
        JSON.stringify({ error: "All AI providers failed", lastError: error }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (userId) {
      await supabase.from("ai_requests").insert({
        user_id: authenticatedUserId,
        provider: usedProvider,
        task_type: taskType,
        prompt_tokens: tokensUsed.prompt_tokens,
        completion_tokens: tokensUsed.completion_tokens,
        total_cost: 0,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        content: result,
        provider: usedProvider,
        usage: tokensUsed,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI generation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});