/**
 * Environment variable validation using Zod
 *
 * This ensures all required environment variables are present and valid
 * before the application starts.
 */

import { z } from "zod";
import { logger } from "../utils/logger";

/**
 * Environment variables schema
 */
const envSchema = z.object({
  // Database - using NEXT_PUBLIC_ prefix to match actual env vars
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("Invalid Supabase URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "Missing Supabase anon key"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "Missing Supabase service role key"),

  // Google APIs
  GOOGLE_CLIENT_ID: z.string().min(1, "Missing Google client ID"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "Missing Google client secret"),
  GOOGLE_REDIRECT_URI: z.string().url("Invalid Google redirect URI"),

  // AI Providers (optional)
  GROQ_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  TOGETHER_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),

  // Security
  CSRF_SECRET: z
    .string()
    .min(32, "CSRF secret must be at least 32 characters")
    .regex(/^[a-zA-Z0-9+/=]+$/, "CSRF secret must be base64 encoded")
    .optional(),
  // ENCRYPTION_KEY is REQUIRED - app must fail if not present to prevent silent failures
  // This key is used to encrypt sensitive data like OAuth tokens
  ENCRYPTION_KEY: z
    .string({
      required_error:
        "ENCRYPTION_KEY is required. Generate with: openssl rand -hex 32",
    })
    .length(
      64,
      "Encryption key must be exactly 64 characters (32 bytes hex encoded)",
    )
    .regex(/^[a-fA-F0-9]+$/, "Encryption key must be hex encoded"),

  // Redis (optional for rate limiting)
  UPSTASH_REDIS_REST_URL: z.string().url("Invalid Redis URL").optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Next.js
  NEXT_PUBLIC_APP_URL: z.string().url("Invalid app URL").optional(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

/**
 * Process validation with helpful error messages
 */
function validateEnv(): z.infer<typeof envSchema> {
  try {
    // Process validation
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((e) => {
        return `${e.path.join(".")}: ${e.message}`;
      });

      logger.error(
        "❌ Environment validation failed. Please check your .env file:",
        {
          errors: missingVars,
        },
      );

      // In development, provide more detailed guidance
      if (process.env.NODE_ENV === "development") {
        console.error("\n==== ENVIRONMENT VALIDATION FAILED ====");
        console.error(
          "Fix the following issues in your .env file:\n" +
            missingVars.map((m) => `- ${m}`).join("\n"),
        );
        console.error("=======================================\n");
      }
    } else {
      logger.error("Unexpected error validating environment variables", error);
    }

    // In non-production, we fail fast to prevent issues
    if (process.env.NODE_ENV !== "production") {
      throw new Error("Environment validation failed");
    }

    // For production, create a fallback schema with all fields optional
    // This is a safer approach that avoids type errors while still providing validation
    const fallbackSchema = z.object({
      // Create identical schema but with all fields optional (except ENCRYPTION_KEY)
      NEXT_PUBLIC_SUPABASE_URL: z
        .string()
        .url("Invalid Supabase URL")
        .optional(),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
      SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
      GOOGLE_CLIENT_ID: z.string().min(1).optional(),
      GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
      GOOGLE_REDIRECT_URI: z
        .string()
        .url("Invalid Google redirect URI")
        .optional(),
      GROQ_API_KEY: z.string().optional(),
      DEEPSEEK_API_KEY: z.string().optional(),
      TOGETHER_API_KEY: z.string().optional(),
      OPENAI_API_KEY: z.string().optional(),
      ANTHROPIC_API_KEY: z.string().optional(),
      GOOGLE_AI_API_KEY: z.string().optional(),
      CSRF_SECRET: z
        .string()
        .min(32)
        .regex(/^[a-zA-Z0-9+/=]+$/)
        .optional(),
      // ENCRYPTION_KEY remains REQUIRED even in fallback - security critical
      ENCRYPTION_KEY: z
        .string({
          required_error:
            "ENCRYPTION_KEY is required. Generate with: openssl rand -hex 32",
        })
        .length(64)
        .regex(/^[a-fA-F0-9]+$/),
      UPSTASH_REDIS_REST_URL: z.string().url("Invalid Redis URL").optional(),
      UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
      NEXT_PUBLIC_APP_URL: z.string().url("Invalid app URL").optional(),
      NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("production"),
    });

    logger.warn(
      "Using fallback environment configuration due to validation errors",
    );
    return fallbackSchema.parse(process.env) as z.infer<typeof envSchema>;
  }
}

/**
 * Validated environment variables
 */
export const env = validateEnv();

/**
 * Type-safe environment access
 */
export type Env = z.infer<typeof envSchema>;
