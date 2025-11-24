import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { AIProvider, getAIProvider } from '@/lib/ai/provider';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock fetch globally
global.fetch = jest.fn() as jest.Mock;

// Mock Supabase
function createMockSupabase(aiSettings: any = null, error: any = null): SupabaseClient {
  return {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: aiSettings,
                  error,
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

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('AI Provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.SYSTEM_OPENAI_API_KEY;
    delete process.env.SYSTEM_ANTHROPIC_API_KEY;
    delete process.env.SYSTEM_GOOGLE_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GOOGLE_GEMINI_API_KEY;
  });

  describe('AIProvider Constructor', () => {
    it('should create provider with valid configuration', () => {
      const config = {
        provider: 'openai' as const,
        model: 'gpt-4o-mini',
        maxTokens: 1000,
        temperature: 0.7,
        apiKey: 'test-key',
      };

      const provider = new AIProvider(config, 'user-123');
      expect(provider).toBeInstanceOf(AIProvider);
    });
  });

  describe('OpenAI Provider', () => {
    it('should successfully call OpenAI API', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Test response from GPT',
            },
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const config = {
        provider: 'openai' as const,
        model: 'gpt-4o-mini',
        maxTokens: 1000,
        temperature: 0.7,
        apiKey: 'test-openai-key',
      };

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(createMockSupabase());

      const provider = new AIProvider(config, 'user-123');
      const result = await provider.generateCompletion('Test prompt', 'test-feature');

      expect(result.content).toBe('Test response from GPT');
      expect(result.usage).toEqual(mockResponse.usage);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-openai-key',
          }),
        })
      );
    });

    it('should handle OpenAI API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { message: 'API key invalid' },
        }),
      });

      const config = {
        provider: 'openai' as const,
        model: 'gpt-4o-mini',
        maxTokens: 1000,
        temperature: 0.7,
        apiKey: 'invalid-key',
      };

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(createMockSupabase());

      const provider = new AIProvider(config, 'user-123');

      await expect(provider.generateCompletion('Test prompt', 'test-feature')).rejects.toThrow(
        'OpenAI API error'
      );
    });
  });

  describe('Anthropic Provider', () => {
    it('should successfully call Anthropic API', async () => {
      const mockResponse = {
        content: [
          {
            text: 'Test response from Claude',
          },
        ],
        usage: {
          input_tokens: 15,
          output_tokens: 25,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const config = {
        provider: 'anthropic' as const,
        model: 'claude-3-5-sonnet-latest',
        maxTokens: 1000,
        temperature: 0.7,
        apiKey: 'test-anthropic-key',
      };

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(createMockSupabase());

      const provider = new AIProvider(config, 'user-123');
      const result = await provider.generateCompletion('Test prompt', 'test-feature');

      expect(result.content).toBe('Test response from Claude');
      expect(result.usage.prompt_tokens).toBe(15);
      expect(result.usage.completion_tokens).toBe(25);
      expect(result.usage.total_tokens).toBe(40);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'test-anthropic-key',
          }),
        })
      );
    });

    it('should fallback to OpenAI when Anthropic fails', async () => {
      process.env.SYSTEM_OPENAI_API_KEY = 'fallback-openai-key';

      // First call (Anthropic) fails
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        text: async () => JSON.stringify({ error: { message: 'Anthropic error' } }),
        json: async () => ({ error: { message: 'Anthropic error' } }),
      });

      // Second call (OpenAI fallback) succeeds
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Fallback response' } }],
          usage: { prompt_tokens: 10, completion_tokens: 15, total_tokens: 25 },
        }),
      });

      const config = {
        provider: 'anthropic' as const,
        model: 'claude-3-5-sonnet-latest',
        maxTokens: 1000,
        temperature: 0.7,
        apiKey: 'test-anthropic-key',
      };

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(createMockSupabase());

      const provider = new AIProvider(config, 'user-123');
      const result = await provider.generateCompletion('Test prompt', 'test-feature');

      expect(result.content).toBe('Fallback response');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should fallback to Google when Anthropic fails and OpenAI unavailable', async () => {
      process.env.SYSTEM_GOOGLE_API_KEY = 'fallback-google-key';

      // First call (Anthropic) fails
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        text: async () => JSON.stringify({ error: { message: 'Anthropic error' } }),
      });

      // Second call (Google fallback) succeeds
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'Gemini response' }],
              },
            },
          ],
        }),
      });

      const config = {
        provider: 'anthropic' as const,
        model: 'claude-3-5-sonnet-latest',
        maxTokens: 1000,
        temperature: 0.7,
        apiKey: 'test-anthropic-key',
      };

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(createMockSupabase());

      const provider = new AIProvider(config, 'user-123');
      const result = await provider.generateCompletion('Test prompt', 'test-feature');

      expect(result.content).toBe('Gemini response');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Google (Gemini) Provider', () => {
    it('should successfully call Google AI API', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'Test response from Gemini',
                },
              ],
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const config = {
        provider: 'gemini' as const,
        model: 'gemini-1.5-pro',
        maxTokens: 1000,
        temperature: 0.7,
        apiKey: 'test-google-key',
      };

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(createMockSupabase());

      const provider = new AIProvider(config, 'user-123');
      const result = await provider.generateCompletion('Test prompt', 'test-feature');

      expect(result.content).toBe('Test response from Gemini');
      expect(result.usage.total_tokens).toBeGreaterThan(0);
    });
  });

  describe('Groq Provider', () => {
    it('should successfully call Groq API', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Test response from Groq' } }],
        usage: { prompt_tokens: 12, completion_tokens: 18, total_tokens: 30 },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const config = {
        provider: 'groq' as const,
        model: 'llama-3.3-70b-versatile',
        maxTokens: 1000,
        temperature: 0.7,
        apiKey: 'test-groq-key',
      };

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(createMockSupabase());

      const provider = new AIProvider(config, 'user-123');
      const result = await provider.generateCompletion('Test prompt', 'test-feature');

      expect(result.content).toBe('Test response from Groq');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.groq.com/openai/v1/chat/completions',
        expect.any(Object)
      );
    });
  });

  describe('DeepSeek Provider', () => {
    it('should successfully call DeepSeek API', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Test response from DeepSeek' } }],
        usage: { prompt_tokens: 11, completion_tokens: 19, total_tokens: 30 },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const config = {
        provider: 'deepseek' as const,
        model: 'deepseek-chat',
        maxTokens: 1000,
        temperature: 0.7,
        apiKey: 'test-deepseek-key',
      };

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(createMockSupabase());

      const provider = new AIProvider(config, 'user-123');
      const result = await provider.generateCompletion('Test prompt', 'test-feature');

      expect(result.content).toBe('Test response from DeepSeek');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.deepseek.com/chat/completions',
        expect.any(Object)
      );
    });
  });

  describe('Request Logging', () => {
    it('should log successful AI requests to database', async () => {
      const mockSupabase = createMockSupabase();
      const insertMock = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from = jest.fn().mockReturnValue({
        insert: insertMock,
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
      });

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        }),
      });

      const config = {
        provider: 'openai' as const,
        model: 'gpt-4o-mini',
        maxTokens: 1000,
        temperature: 0.7,
        apiKey: 'test-key',
      };

      const provider = new AIProvider(config, 'user-123');
      await provider.generateCompletion('Test prompt', 'test-feature', 'location-456');

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          provider: 'openai',
          model: 'gpt-4o-mini',
          feature: 'test-feature',
          success: true,
          location_id: 'location-456',
        })
      );
    });

    it('should log failed AI requests to database', async () => {
      const mockSupabase = createMockSupabase();
      const insertMock = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from = jest.fn().mockReturnValue({
        insert: insertMock,
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
      });

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: 'API Error' } }),
      });

      const config = {
        provider: 'openai' as const,
        model: 'gpt-4o-mini',
        maxTokens: 1000,
        temperature: 0.7,
        apiKey: 'test-key',
      };

      const provider = new AIProvider(config, 'user-123');

      await expect(provider.generateCompletion('Test prompt', 'test-feature')).rejects.toThrow();

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });
  });

  describe('getAIProvider', () => {
    it('should return provider from user settings', async () => {
      const userSettings = {
        user_id: 'user-123',
        provider: 'openai',
        api_key: 'user-api-key',
        is_active: true,
        priority: 1,
      };

      const mockSupabase = createMockSupabase(userSettings);
      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const provider = await getAIProvider('user-123');

      expect(provider).toBeInstanceOf(AIProvider);
    });

    it('should fallback to Anthropic system key when no user settings', async () => {
      process.env.SYSTEM_ANTHROPIC_API_KEY = 'system-anthropic-key';

      const mockSupabase = createMockSupabase(null, { message: 'Not found' });
      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const provider = await getAIProvider('user-123');

      expect(provider).toBeInstanceOf(AIProvider);
    });

    it('should fallback to OpenAI when Anthropic not available', async () => {
      process.env.SYSTEM_OPENAI_API_KEY = 'system-openai-key';

      const mockSupabase = createMockSupabase(null, { message: 'Not found' });
      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const provider = await getAIProvider('user-123');

      expect(provider).toBeInstanceOf(AIProvider);
    });

    it('should fallback to Google when Anthropic and OpenAI not available', async () => {
      process.env.SYSTEM_GOOGLE_API_KEY = 'system-google-key';

      const mockSupabase = createMockSupabase(null, { message: 'Not found' });
      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const provider = await getAIProvider('user-123');

      expect(provider).toBeInstanceOf(AIProvider);
    });

    it('should return null when no providers available', async () => {
      const mockSupabase = createMockSupabase(null, { message: 'Not found' });
      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const provider = await getAIProvider('user-123');

      expect(provider).toBeNull();
    });
  });

  describe('Unsupported Provider', () => {
    it('should throw error for unsupported provider', async () => {
      const config = {
        provider: 'unsupported' as any,
        model: 'test-model',
        maxTokens: 1000,
        temperature: 0.7,
        apiKey: 'test-key',
      };

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(createMockSupabase());

      const provider = new AIProvider(config, 'user-123');

      await expect(provider.generateCompletion('Test prompt', 'test-feature')).rejects.toThrow(
        'Unsupported provider'
      );
    });
  });
});
