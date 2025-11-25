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
  cookies: jest.fn(),
}));

// Mock createClient
const mockCreateClient = jest.fn();
jest.mock("@/lib/supabase/server", () => ({
  createClient: () => mockCreateClient(),
}));

// Import after mocks
import { AIProvider } from "@/lib/ai/provider";

// Mock fetch globally
global.fetch = jest.fn() as jest.Mock;

function createMockSupabase(): SupabaseClient {
  return {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
      insert: jest.fn().mockResolvedValue({ error: null }),
    }),
  } as unknown as SupabaseClient;
}

describe("AI Provider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    mockCreateClient.mockReset();
    mockCreateClient.mockReturnValue(createMockSupabase());
  });

  afterEach(() => {
    delete process.env.SYSTEM_OPENAI_API_KEY;
    delete process.env.SYSTEM_ANTHROPIC_API_KEY;
    delete process.env.SYSTEM_GOOGLE_API_KEY;
  });

  describe("OpenAI Provider", () => {
    it("should successfully call OpenAI API", async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: "Test response" } }],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 20,
              total_tokens: 30,
            },
          }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const config = {
        provider: "openai" as const,
        model: "gpt-4o-mini",
        maxTokens: 1000,
        temperature: 0.7,
        apiKey: "test-key",
      };

      const provider = new AIProvider(config, "user-123");
      const result = await provider.generateCompletion(
        "Test prompt",
        "test-feature",
      );

      expect(result.content).toBe("Test response");
      expect(global.fetch).toHaveBeenCalled();
    });

    it("should handle OpenAI API errors gracefully", async () => {
      const mockResponse = {
        ok: false,
        json: () => Promise.resolve({ error: { message: "API Error" } }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const config = {
        provider: "openai" as const,
        model: "gpt-4o-mini",
        maxTokens: 1000,
        temperature: 0.7,
        apiKey: "test-key",
      };

      const provider = new AIProvider(config, "user-123");
      await expect(
        provider.generateCompletion("Test prompt", "test-feature"),
      ).rejects.toThrow();
    });
  });

  describe("Anthropic Provider", () => {
    it("should successfully call Anthropic API", async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            content: [{ text: "Test response" }],
            usage: { input_tokens: 10, output_tokens: 20 },
          }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const config = {
        provider: "anthropic" as const,
        model: "claude-3-haiku-20240307",
        maxTokens: 1000,
        temperature: 0.7,
        apiKey: "test-key",
      };

      const provider = new AIProvider(config, "user-123");
      const result = await provider.generateCompletion(
        "Test prompt",
        "test-feature",
      );

      expect(result.content).toBe("Test response");
    });
  });

  describe("Gemini Provider", () => {
    it("should successfully call Google Gemini API", async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [{ content: { parts: [{ text: "Test response" }] } }],
          }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const config = {
        provider: "gemini" as const,
        model: "gemini-1.5-flash",
        maxTokens: 1000,
        temperature: 0.7,
        apiKey: "test-key",
      };

      const provider = new AIProvider(config, "user-123");
      const result = await provider.generateCompletion(
        "Test prompt",
        "test-feature",
      );

      expect(result.content).toBe("Test response");
    });
  });

  describe("Groq Provider", () => {
    it("should successfully call Groq API", async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: "Test response" } }],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 20,
              total_tokens: 30,
            },
          }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const config = {
        provider: "groq" as const,
        model: "llama-3.3-70b-versatile",
        maxTokens: 1000,
        temperature: 0.7,
        apiKey: "test-key",
      };

      const provider = new AIProvider(config, "user-123");
      const result = await provider.generateCompletion(
        "Test prompt",
        "test-feature",
      );

      expect(result.content).toBe("Test response");
    });
  });

  describe("DeepSeek Provider", () => {
    it("should successfully call DeepSeek API", async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: "Test response" } }],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 20,
              total_tokens: 30,
            },
          }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const config = {
        provider: "deepseek" as const,
        model: "deepseek-chat",
        maxTokens: 1000,
        temperature: 0.7,
        apiKey: "test-key",
      };

      const provider = new AIProvider(config, "user-123");
      const result = await provider.generateCompletion(
        "Test prompt",
        "test-feature",
      );

      expect(result.content).toBe("Test response");
    });
  });

  describe("Unsupported Provider", () => {
    it("should throw error for unsupported provider", async () => {
      const config = {
        provider: "unsupported" as any,
        model: "test-model",
        maxTokens: 1000,
        temperature: 0.7,
        apiKey: "test-key",
      };

      const provider = new AIProvider(config, "user-123");

      await expect(
        provider.generateCompletion("Test prompt", "test-feature"),
      ).rejects.toThrow("Unsupported provider");
    });
  });
});
