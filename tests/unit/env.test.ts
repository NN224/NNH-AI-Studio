/**
 * Environment Variable Validation Tests
 *
 * Tests that the application correctly validates environment variables
 * and fails appropriately when critical variables are missing.
 *
 * Critical tests:
 * 1. ENCRYPTION_KEY must be required (not optional)
 * 2. Supabase variables must use correct names (NEXT_PUBLIC_ prefix)
 * 3. Invalid formats should be rejected
 */

import { z } from "zod";

// We need to test the schema directly since env.ts executes on import
// This mirrors the schema from lib/config/env.ts

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
  // ENCRYPTION_KEY is REQUIRED
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

  // Redis (optional)
  UPSTASH_REDIS_REST_URL: z.string().url("Invalid Redis URL").optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Next.js
  NEXT_PUBLIC_APP_URL: z.string().url("Invalid app URL").optional(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

// Valid test environment for baseline
const validEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key-12345",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key-12345",
  GOOGLE_CLIENT_ID: "test-google-client-id",
  GOOGLE_CLIENT_SECRET: "test-google-client-secret",
  GOOGLE_REDIRECT_URI: "https://app.example.com/api/gmb/oauth-callback",
  ENCRYPTION_KEY: "a".repeat(64), // Valid 64-char hex string
  NODE_ENV: "test" as const,
};

describe("Environment Variable Validation", () => {
  describe("ENCRYPTION_KEY Validation", () => {
    it("✅ should accept valid 64-character hex ENCRYPTION_KEY", () => {
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
    });

    it("❌ should REJECT when ENCRYPTION_KEY is missing", () => {
      const envWithoutEncryptionKey = { ...validEnv };
      delete (envWithoutEncryptionKey as Record<string, unknown>)
        .ENCRYPTION_KEY;

      const result = envSchema.safeParse(envWithoutEncryptionKey);

      expect(result.success).toBe(false);
      if (!result.success) {
        const encryptionKeyError = result.error.errors.find((e) =>
          e.path.includes("ENCRYPTION_KEY"),
        );
        expect(encryptionKeyError).toBeDefined();
        expect(encryptionKeyError?.message).toContain("required");
      }
    });

    it("❌ should REJECT ENCRYPTION_KEY shorter than 64 characters", () => {
      const result = envSchema.safeParse({
        ...validEnv,
        ENCRYPTION_KEY: "abc123", // Too short
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find((e) =>
          e.path.includes("ENCRYPTION_KEY"),
        );
        expect(error?.message).toContain("64 characters");
      }
    });

    it("❌ should REJECT ENCRYPTION_KEY longer than 64 characters", () => {
      const result = envSchema.safeParse({
        ...validEnv,
        ENCRYPTION_KEY: "a".repeat(128), // Too long
      });

      expect(result.success).toBe(false);
    });

    it("❌ should REJECT ENCRYPTION_KEY with non-hex characters", () => {
      const result = envSchema.safeParse({
        ...validEnv,
        ENCRYPTION_KEY: "g".repeat(64), // 'g' is not a valid hex character
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find((e) =>
          e.path.includes("ENCRYPTION_KEY"),
        );
        expect(error?.message).toContain("hex encoded");
      }
    });

    it("✅ should accept ENCRYPTION_KEY with mixed case hex", () => {
      const result = envSchema.safeParse({
        ...validEnv,
        ENCRYPTION_KEY: "aAbBcCdDeEfF0123456789".padEnd(64, "0"),
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Supabase Variable Names", () => {
    it("✅ should accept NEXT_PUBLIC_SUPABASE_URL (correct name)", () => {
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
    });

    it("❌ should REJECT when NEXT_PUBLIC_SUPABASE_URL is missing", () => {
      const envWithoutUrl = { ...validEnv };
      delete (envWithoutUrl as Record<string, unknown>)
        .NEXT_PUBLIC_SUPABASE_URL;

      const result = envSchema.safeParse(envWithoutUrl);

      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find((e) =>
          e.path.includes("NEXT_PUBLIC_SUPABASE_URL"),
        );
        expect(error).toBeDefined();
      }
    });

    it("❌ should REJECT invalid Supabase URL format", () => {
      const result = envSchema.safeParse({
        ...validEnv,
        NEXT_PUBLIC_SUPABASE_URL: "not-a-valid-url",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find((e) =>
          e.path.includes("NEXT_PUBLIC_SUPABASE_URL"),
        );
        expect(error?.message).toContain("Invalid");
      }
    });

    it("❌ should REJECT when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing", () => {
      const envWithoutAnonKey = { ...validEnv };
      delete (envWithoutAnonKey as Record<string, unknown>)
        .NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const result = envSchema.safeParse(envWithoutAnonKey);

      expect(result.success).toBe(false);
    });

    it("❌ should REJECT empty SUPABASE_SERVICE_ROLE_KEY", () => {
      const result = envSchema.safeParse({
        ...validEnv,
        SUPABASE_SERVICE_ROLE_KEY: "",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("Google API Variables", () => {
    it("❌ should REJECT when GOOGLE_CLIENT_ID is missing", () => {
      const envWithoutClientId = { ...validEnv };
      delete (envWithoutClientId as Record<string, unknown>).GOOGLE_CLIENT_ID;

      const result = envSchema.safeParse(envWithoutClientId);

      expect(result.success).toBe(false);
    });

    it("❌ should REJECT invalid GOOGLE_REDIRECT_URI format", () => {
      const result = envSchema.safeParse({
        ...validEnv,
        GOOGLE_REDIRECT_URI: "not-a-url",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("Optional Variables", () => {
    it("✅ should accept missing optional AI provider keys", () => {
      // validEnv doesn't include AI keys, should still pass
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
    });

    it("✅ should accept missing CSRF_SECRET", () => {
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
    });

    it("❌ should REJECT CSRF_SECRET shorter than 32 characters", () => {
      const result = envSchema.safeParse({
        ...validEnv,
        CSRF_SECRET: "short",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("NODE_ENV Validation", () => {
    it("✅ should accept 'development' NODE_ENV", () => {
      const result = envSchema.safeParse({
        ...validEnv,
        NODE_ENV: "development",
      });
      expect(result.success).toBe(true);
    });

    it("✅ should accept 'production' NODE_ENV", () => {
      const result = envSchema.safeParse({
        ...validEnv,
        NODE_ENV: "production",
      });
      expect(result.success).toBe(true);
    });

    it("✅ should accept 'test' NODE_ENV", () => {
      const result = envSchema.safeParse({
        ...validEnv,
        NODE_ENV: "test",
      });
      expect(result.success).toBe(true);
    });

    it("❌ should REJECT invalid NODE_ENV", () => {
      const result = envSchema.safeParse({
        ...validEnv,
        NODE_ENV: "staging",
      });
      expect(result.success).toBe(false);
    });

    it("✅ should default to 'development' when NODE_ENV is missing", () => {
      const envWithoutNodeEnv = { ...validEnv };
      delete (envWithoutNodeEnv as Record<string, unknown>).NODE_ENV;

      const result = envSchema.safeParse(envWithoutNodeEnv);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe("development");
      }
    });
  });

  describe("Complete Validation Scenarios", () => {
    it("✅ should pass with all required variables present", () => {
      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
    });

    it("❌ should fail with multiple missing required variables", () => {
      const result = envSchema.safeParse({
        NODE_ENV: "test",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        // Should have errors for multiple missing fields
        expect(result.error.errors.length).toBeGreaterThan(1);
      }
    });

    it("✅ should pass with all optional variables included", () => {
      const fullEnv = {
        ...validEnv,
        GROQ_API_KEY: "groq-key",
        DEEPSEEK_API_KEY: "deepseek-key",
        TOGETHER_API_KEY: "together-key",
        OPENAI_API_KEY: "openai-key",
        ANTHROPIC_API_KEY: "anthropic-key",
        GOOGLE_AI_API_KEY: "google-ai-key",
        CSRF_SECRET: "a".repeat(32) + "==", // Valid base64
        UPSTASH_REDIS_REST_URL: "https://redis.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "redis-token",
        NEXT_PUBLIC_APP_URL: "https://app.example.com",
      };

      const result = envSchema.safeParse(fullEnv);
      expect(result.success).toBe(true);
    });
  });
});
