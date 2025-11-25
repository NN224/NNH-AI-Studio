import {
  describe,
  it,
  expect,
  beforeEach,
  jest,
  afterEach,
} from "@jest/globals";
import type { SupabaseClient } from "@supabase/supabase-js";

// Mock next/headers
jest.mock("next/headers", () => ({
  cookies: jest.fn().mockReturnValue({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  }),
}));

// Mock createClient - must return a Promise since it's async
const mockCreateClient = jest.fn();
jest.mock("@/lib/supabase/server", () => ({
  createClient: async () => mockCreateClient(),
}));

// Import after mocks
import {
  getAIProviderWithFallback,
  getUserAIUsage,
  userHasOwnAPIKey,
} from "@/lib/ai/fallback-provider";

function createMockSupabase(options: {
  userSettings?: any;
  profile?: any;
  aiRequests?: any[];
  error?: any;
}): SupabaseClient {
  const { userSettings, profile, aiRequests = [], error } = options;

  return {
    from: jest.fn((table: string) => {
      if (table === "ai_settings") {
        const limitMock = jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: userSettings,
            error: userSettings ? null : error,
          }),
        });
        const orderMock = jest.fn().mockReturnValue({
          limit: limitMock,
        });
        const secondEqMock = jest.fn().mockReturnValue({
          order: orderMock,
          limit: limitMock, // For userHasOwnAPIKey which skips order()
        });
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: secondEqMock,
            }),
          }),
        };
      }

      if (table === "profiles") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: profile,
                error: profile ? null : error,
              }),
            }),
          }),
        };
      }

      if (table === "ai_requests") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({
                data: aiRequests,
                error: null,
              }),
            }),
          }),
        };
      }

      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error }),
        }),
      };
    }),
  } as unknown as SupabaseClient;
}

describe("Fallback AI Provider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockReset();
  });

  afterEach(() => {
    delete process.env.SYSTEM_OPENAI_API_KEY;
    delete process.env.SYSTEM_ANTHROPIC_API_KEY;
    delete process.env.SYSTEM_GOOGLE_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GOOGLE_GEMINI_API_KEY;
  });

  describe("getAIProviderWithFallback", () => {
    it("should return user API key when available", async () => {
      const userSettings = {
        provider: "openai",
        api_key: "user-openai-key",
        is_active: true,
        priority: 1,
      };

      const mockClient = createMockSupabase({ userSettings });
      const provider = await getAIProviderWithFallback("user-123", mockClient);

      expect(provider).not.toBeNull();
      expect(provider?.provider).toBe("openai");
      expect(provider?.apiKey).toBe("user-openai-key");
    });

    it("should fallback to system Anthropic key when user has no settings", async () => {
      process.env.SYSTEM_ANTHROPIC_API_KEY = "system-anthropic-key";

      const mockClient = createMockSupabase({
        userSettings: null,
        profile: { subscription_plan: "free" },
        aiRequests: [],
        error: { message: "Not found" },
      });

      const provider = await getAIProviderWithFallback("user-123", mockClient);

      expect(provider).not.toBeNull();
      expect(provider?.provider).toBe("anthropic");
      expect(provider?.apiKey).toBe("system-anthropic-key");
    });

    it("should fallback to system OpenAI key when Anthropic not available", async () => {
      process.env.SYSTEM_OPENAI_API_KEY = "system-openai-key";

      const mockClient = createMockSupabase({
        userSettings: null,
        profile: { subscription_plan: "free" },
        aiRequests: [],
        error: { message: "Not found" },
      });

      const provider = await getAIProviderWithFallback("user-123", mockClient);

      expect(provider).not.toBeNull();
      expect(provider?.provider).toBe("openai");
    });

    it("should return null when no providers available", async () => {
      const mockClient = createMockSupabase({
        userSettings: null,
        error: { message: "Not found" },
      });

      const provider = await getAIProviderWithFallback("user-123", mockClient);

      expect(provider).toBeNull();
    });
  });

  describe("getUserAIUsage", () => {
    it("should return usage data for user", async () => {
      const aiRequests = [
        { tokens_used: 100, cost: 0.01 },
        { tokens_used: 200, cost: 0.02 },
      ];

      const mockClient = createMockSupabase({
        aiRequests,
        profile: { subscription_plan: "free" },
      });

      const usage = await getUserAIUsage("user-123", mockClient);

      expect(usage.used).toBe(2);
      expect(usage.plan).toBe("free");
      expect(usage.limit).toBe(10);
    });

    it("should return zero usage when no requests", async () => {
      const mockClient = createMockSupabase({
        aiRequests: [],
        profile: { subscription_plan: "free" },
      });

      const usage = await getUserAIUsage("user-123", mockClient);

      expect(usage.used).toBe(0);
      expect(usage.remaining).toBe(10);
      expect(usage.isLimitReached).toBe(false);
    });
  });

  describe("userHasOwnAPIKey", () => {
    it("should return true when user has active API key", async () => {
      const userSettings = {
        id: "1",
        provider: "openai",
        api_key: "user-key",
        is_active: true,
      };

      const mockClient = createMockSupabase({ userSettings });

      const hasKey = await userHasOwnAPIKey("user-123", mockClient);

      expect(hasKey).toBe(true);
    });

    it("should return false when user has no API key", async () => {
      const mockClient = createMockSupabase({
        userSettings: null,
        error: { message: "Not found" },
      });

      const hasKey = await userHasOwnAPIKey("user-123", mockClient);

      expect(hasKey).toBe(false);
    });
  });
});
