/**
 * Fallback AI Provider
 * Uses system-wide API key if user doesn't have one
 */

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

interface AIProviderConfig {
  provider: "openai" | "anthropic" | "google" | "groq" | "deepseek";
  apiKey: string;
  model: string;
}

/**
 * Get AI Provider with fallback to system key
 * @param userId - User ID to check for API key
 * @param client - Optional Supabase client for testing
 */
export async function getAIProviderWithFallback(
  userId: string,
  client?: SupabaseClient,
): Promise<AIProviderConfig | null> {
  const supabase = client || createClient();

  // 1. Try to get user's own API key
  const { data: userSettings } = await supabase
    .from("ai_settings")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("priority", { ascending: true })
    .limit(1)
    .single();

  if (userSettings) {
    return {
      provider: userSettings.provider,
      apiKey: userSettings.api_key,
      model: getDefaultModel(userSettings.provider),
    };
  }

  // 2. Fallback to system-wide API key
  const systemApiKey = await getSystemAPIKey(supabase);

  if (systemApiKey) {
    // Check usage limits for free tier
    const canUseSystemKey = await checkUsageLimits(userId, supabase);

    if (canUseSystemKey) {
      return systemApiKey;
    } else {
      throw new Error("USAGE_LIMIT_EXCEEDED");
    }
  }

  return null;
}

/**
 * Get system-wide API key from environment or database
 */
async function getSystemAPIKey(
  client?: SupabaseClient,
): Promise<AIProviderConfig | null> {
  // Option 1: From environment variables (recommended)
  // Priority: Anthropic > OpenAI > Google

  if (process.env.SYSTEM_ANTHROPIC_API_KEY) {
    return {
      provider: "anthropic",
      apiKey: process.env.SYSTEM_ANTHROPIC_API_KEY,
      model: "claude-3-haiku-20240307", // Fastest and cheapest
    };
  }

  if (process.env.SYSTEM_OPENAI_API_KEY) {
    return {
      provider: "openai",
      apiKey: process.env.SYSTEM_OPENAI_API_KEY,
      model: "gpt-3.5-turbo",
    };
  }

  if (process.env.SYSTEM_GOOGLE_API_KEY || process.env.GOOGLE_GEMINI_API_KEY) {
    return {
      provider: "google",
      apiKey:
        process.env.SYSTEM_GOOGLE_API_KEY ||
        process.env.GOOGLE_GEMINI_API_KEY ||
        "",
      model: "gemini-1.5-pro",
    };
  }

  if (process.env.SYSTEM_GROQ_API_KEY || process.env.GROQ_API_KEY) {
    return {
      provider: "groq",
      apiKey: process.env.SYSTEM_GROQ_API_KEY || process.env.GROQ_API_KEY || "",
      model: "llama-3.3-70b-versatile",
    };
  }

  if (process.env.SYSTEM_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY) {
    return {
      provider: "deepseek",
      apiKey:
        process.env.SYSTEM_DEEPSEEK_API_KEY ||
        process.env.DEEPSEEK_API_KEY ||
        "",
      model: "deepseek-chat",
    };
  }

  // Option 2: From database (for admin-managed keys)
  const supabase = client || createClient();
  const { data: systemSettings } = await supabase
    .from("ai_settings")
    .select("*")
    .eq("user_id", "00000000-0000-0000-0000-000000000000") // System user ID
    .eq("is_active", true)
    .order("priority", { ascending: true })
    .limit(1)
    .single();

  if (systemSettings) {
    return {
      provider: systemSettings.provider,
      apiKey: systemSettings.api_key,
      model: getDefaultModel(systemSettings.provider),
    };
  }

  return null;
}

/**
 * Check if user can use system API key (usage limits)
 */
async function checkUsageLimits(
  userId: string,
  client?: SupabaseClient,
): Promise<boolean> {
  const supabase = client || createClient();

  // Get user's subscription plan
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_plan")
    .eq("id", userId)
    .single();

  const plan = profile?.subscription_plan || "free";

  // Get usage this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: usage, error } = await supabase
    .from("ai_requests")
    .select("id", { count: "exact" })
    .eq("user_id", userId)
    .gte("created_at", startOfMonth.toISOString());

  const usageCount = usage?.length || 0;

  // Define limits per plan
  const limits: Record<string, number> = {
    free: 10, // 10 AI requests per month
    basic: 50, // 50 AI requests per month
    pro: 200, // 200 AI requests per month
    enterprise: 1000, // 1000 AI requests per month
  };

  const limit = limits[plan] || limits.free;

  return usageCount < limit;
}

/**
 * Get default model for provider
 */
function getDefaultModel(provider: string): string {
  const models: Record<string, string> = {
    openai: "gpt-4o-mini",
    anthropic: "claude-3-5-sonnet-latest",
    google: "gemini-1.5-pro",
    groq: "llama-3.3-70b-versatile",
    deepseek: "deepseek-chat",
  };
  return models[provider] || "gpt-4o-mini";
}

/**
 * Get usage statistics for user
 */
export async function getUserAIUsage(userId: string, client?: SupabaseClient) {
  const supabase = client || createClient();

  // Get user's subscription plan
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_plan")
    .eq("id", userId)
    .single();

  const plan = profile?.subscription_plan || "free";

  // Get usage this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: usage } = await supabase
    .from("ai_requests")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", startOfMonth.toISOString());

  const usageCount = usage?.length || 0;

  // Define limits
  const limits: Record<string, number> = {
    free: 10,
    basic: 50,
    pro: 200,
    enterprise: 1000,
  };

  const limit = limits[plan] || limits.free;
  const remaining = Math.max(0, limit - usageCount);
  const percentage = (usageCount / limit) * 100;

  return {
    plan,
    used: usageCount,
    limit,
    remaining,
    percentage: Math.min(100, percentage),
    isLimitReached: usageCount >= limit,
  };
}

/**
 * Check if user has own API key
 */
export async function userHasOwnAPIKey(
  userId: string,
  client?: SupabaseClient,
): Promise<boolean> {
  const supabase = client || createClient();

  const { data } = await supabase
    .from("ai_settings")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1)
    .single();

  return !!data;
}
