import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import {
  getAIProviderWithFallback,
  getUserAIUsage,
  userHasOwnAPIKey,
} from '@/lib/ai/fallback-provider';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase
function createMockSupabase(options: {
  userSettings?: any;
  profile?: any;
  aiRequests?: any[];
  error?: any;
}): SupabaseClient {
  const { userSettings, profile, aiRequests = [], error } = options;

  return {
    from: jest.fn((table: string) => {
      if (table === 'ai_settings') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: userSettings,
                      error: userSettings ? null : error,
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }

      if (table === 'profiles') {
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

      if (table === 'ai_requests') {
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

      return {};
    }),
  } as unknown as SupabaseClient;
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('Fallback AI Provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.SYSTEM_OPENAI_API_KEY;
    delete process.env.SYSTEM_ANTHROPIC_API_KEY;
    delete process.env.SYSTEM_GOOGLE_API_KEY;
    delete process.env.SYSTEM_GROQ_API_KEY;
    delete process.env.SYSTEM_DEEPSEEK_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GOOGLE_GEMINI_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
  });

  describe('getAIProviderWithFallback', () => {
    it('should return user API key when available', async () => {
      const userSettings = {
        provider: 'openai',
        api_key: 'user-openai-key',
        is_active: true,
        priority: 1,
      };

      const mockSupabase = createMockSupabase({ userSettings });
      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const provider = await getAIProviderWithFallback('user-123');

      expect(provider).not.toBeNull();
      expect(provider?.provider).toBe('openai');
      expect(provider?.apiKey).toBe('user-openai-key');
      expect(provider?.model).toBe('gpt-4o-mini');
    });

    it('should fallback to system Anthropic key when user has no settings', async () => {
      process.env.SYSTEM_ANTHROPIC_API_KEY = 'system-anthropic-key';

      const mockSupabase = createMockSupabase({
        userSettings: null,
        profile: { subscription_plan: 'free' },
        aiRequests: [], // No usage yet
        error: { message: 'Not found' },
      });

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const provider = await getAIProviderWithFallback('user-123');

      expect(provider).not.toBeNull();
      expect(provider?.provider).toBe('anthropic');
      expect(provider?.apiKey).toBe('system-anthropic-key');
    });

    it('should fallback to system OpenAI key when Anthropic not available', async () => {
      process.env.SYSTEM_OPENAI_API_KEY = 'system-openai-key';

      const mockSupabase = createMockSupabase({
        userSettings: null,
        profile: { subscription_plan: 'free' },
        aiRequests: [],
        error: { message: 'Not found' },
      });

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const provider = await getAIProviderWithFallback('user-123');

      expect(provider).not.toBeNull();
      expect(provider?.provider).toBe('openai');
    });

    it('should fallback to system Google key when Anthropic and OpenAI not available', async () => {
      process.env.SYSTEM_GOOGLE_API_KEY = 'system-google-key';

      const mockSupabase = createMockSupabase({
        userSettings: null,
        profile: { subscription_plan: 'free' },
        aiRequests: [],
        error: { message: 'Not found' },
      });

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const provider = await getAIProviderWithFallback('user-123');

      expect(provider).not.toBeNull();
      expect(provider?.provider).toBe('google');
    });

    it('should fallback to Groq when other providers not available', async () => {
      process.env.SYSTEM_GROQ_API_KEY = 'system-groq-key';

      const mockSupabase = createMockSupabase({
        userSettings: null,
        profile: { subscription_plan: 'free' },
        aiRequests: [],
        error: { message: 'Not found' },
      });

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const provider = await getAIProviderWithFallback('user-123');

      expect(provider).not.toBeNull();
      expect(provider?.provider).toBe('groq');
    });

    it('should fallback to DeepSeek as last resort', async () => {
      process.env.SYSTEM_DEEPSEEK_API_KEY = 'system-deepseek-key';

      const mockSupabase = createMockSupabase({
        userSettings: null,
        profile: { subscription_plan: 'free' },
        aiRequests: [],
        error: { message: 'Not found' },
      });

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const provider = await getAIProviderWithFallback('user-123');

      expect(provider).not.toBeNull();
      expect(provider?.provider).toBe('deepseek');
    });

    it('should throw error when free tier usage limit exceeded', async () => {
      process.env.SYSTEM_ANTHROPIC_API_KEY = 'system-anthropic-key';

      // Create 10 mock requests (free tier limit)
      const aiRequests = Array(10)
        .fill(null)
        .map((_, i) => ({ id: i }));

      const mockSupabase = createMockSupabase({
        userSettings: null,
        profile: { subscription_plan: 'free' },
        aiRequests,
        error: { message: 'Not found' },
      });

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      await expect(getAIProviderWithFallback('user-123')).rejects.toThrow('USAGE_LIMIT_EXCEEDED');
    });

    it('should allow more requests for pro tier', async () => {
      process.env.SYSTEM_ANTHROPIC_API_KEY = 'system-anthropic-key';

      // Create 50 mock requests (under pro tier limit of 200)
      const aiRequests = Array(50)
        .fill(null)
        .map((_, i) => ({ id: i }));

      const mockSupabase = createMockSupabase({
        userSettings: null,
        profile: { subscription_plan: 'pro' },
        aiRequests,
        error: { message: 'Not found' },
      });

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const provider = await getAIProviderWithFallback('user-123');

      expect(provider).not.toBeNull();
    });

    it('should return null when no providers available', async () => {
      const mockSupabase = createMockSupabase({
        userSettings: null,
        profile: { subscription_plan: 'free' },
        aiRequests: [],
        error: { message: 'Not found' },
      });

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const provider = await getAIProviderWithFallback('user-123');

      expect(provider).toBeNull();
    });
  });

  describe('getUserAIUsage', () => {
    it('should return usage statistics for free tier user', async () => {
      const aiRequests = Array(5)
        .fill(null)
        .map((_, i) => ({ id: i }));

      const mockSupabase = createMockSupabase({
        profile: { subscription_plan: 'free' },
        aiRequests,
      });

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const usage = await getUserAIUsage('user-123');

      expect(usage.plan).toBe('free');
      expect(usage.used).toBe(5);
      expect(usage.limit).toBe(10);
      expect(usage.remaining).toBe(5);
      expect(usage.percentage).toBe(50);
      expect(usage.isLimitReached).toBe(false);
    });

    it('should indicate limit reached when at or over limit', async () => {
      const aiRequests = Array(10)
        .fill(null)
        .map((_, i) => ({ id: i }));

      const mockSupabase = createMockSupabase({
        profile: { subscription_plan: 'free' },
        aiRequests,
      });

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const usage = await getUserAIUsage('user-123');

      expect(usage.isLimitReached).toBe(true);
      expect(usage.remaining).toBe(0);
      expect(usage.percentage).toBe(100);
    });

    it('should handle different subscription plans correctly', async () => {
      const plans = [
        { plan: 'free', limit: 10 },
        { plan: 'basic', limit: 50 },
        { plan: 'pro', limit: 200 },
        { plan: 'enterprise', limit: 1000 },
      ];

      for (const { plan, limit } of plans) {
        const mockSupabase = createMockSupabase({
          profile: { subscription_plan: plan },
          aiRequests: [],
        });

        const { createClient } = await import('@/lib/supabase/server');
        (createClient as jest.Mock).mockResolvedValue(mockSupabase);

        const usage = await getUserAIUsage('user-123');

        expect(usage.limit).toBe(limit);
        expect(usage.plan).toBe(plan);
      }
    });

    it('should default to free tier when no profile found', async () => {
      const mockSupabase = createMockSupabase({
        profile: null,
        aiRequests: [],
      });

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const usage = await getUserAIUsage('user-123');

      expect(usage.plan).toBe('free');
      expect(usage.limit).toBe(10);
    });

    it('should handle zero usage', async () => {
      const mockSupabase = createMockSupabase({
        profile: { subscription_plan: 'pro' },
        aiRequests: [],
      });

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const usage = await getUserAIUsage('user-123');

      expect(usage.used).toBe(0);
      expect(usage.remaining).toBe(200);
      expect(usage.percentage).toBe(0);
      expect(usage.isLimitReached).toBe(false);
    });

    it('should cap percentage at 100', async () => {
      // Over limit
      const aiRequests = Array(20)
        .fill(null)
        .map((_, i) => ({ id: i }));

      const mockSupabase = createMockSupabase({
        profile: { subscription_plan: 'free' }, // Limit is 10
        aiRequests,
      });

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const usage = await getUserAIUsage('user-123');

      expect(usage.percentage).toBe(100); // Capped at 100, not 200
    });
  });

  describe('userHasOwnAPIKey', () => {
    it('should return true when user has active API key', async () => {
      const userSettings = {
        id: 'setting-123',
        user_id: 'user-123',
        provider: 'openai',
        api_key: 'user-key',
        is_active: true,
      };

      const mockSupabase = createMockSupabase({ userSettings });
      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const hasKey = await userHasOwnAPIKey('user-123');

      expect(hasKey).toBe(true);
    });

    it('should return false when user has no API key', async () => {
      const mockSupabase = createMockSupabase({
        userSettings: null,
        error: { message: 'Not found' },
      });

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const hasKey = await userHasOwnAPIKey('user-123');

      expect(hasKey).toBe(false);
    });
  });

  describe('Usage Limit Enforcement', () => {
    it('should enforce free tier limit (10 requests)', async () => {
      process.env.SYSTEM_ANTHROPIC_API_KEY = 'system-key';

      const tests = [
        { requests: 0, shouldAllow: true },
        { requests: 5, shouldAllow: true },
        { requests: 9, shouldAllow: true },
        { requests: 10, shouldAllow: false },
        { requests: 15, shouldAllow: false },
      ];

      for (const test of tests) {
        const aiRequests = Array(test.requests)
          .fill(null)
          .map((_, i) => ({ id: i }));

        const mockSupabase = createMockSupabase({
          userSettings: null,
          profile: { subscription_plan: 'free' },
          aiRequests,
          error: { message: 'Not found' },
        });

        const { createClient } = await import('@/lib/supabase/server');
        (createClient as jest.Mock).mockResolvedValue(mockSupabase);

        if (test.shouldAllow) {
          const provider = await getAIProviderWithFallback('user-123');
          expect(provider).not.toBeNull();
        } else {
          await expect(getAIProviderWithFallback('user-123')).rejects.toThrow(
            'USAGE_LIMIT_EXCEEDED'
          );
        }
      }
    });

    it('should enforce basic tier limit (50 requests)', async () => {
      process.env.SYSTEM_ANTHROPIC_API_KEY = 'system-key';

      const aiRequests = Array(49)
        .fill(null)
        .map((_, i) => ({ id: i }));

      const mockSupabase = createMockSupabase({
        userSettings: null,
        profile: { subscription_plan: 'basic' },
        aiRequests,
        error: { message: 'Not found' },
      });

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const provider = await getAIProviderWithFallback('user-123');
      expect(provider).not.toBeNull();

      // At limit
      aiRequests.push({ id: 50 });
      await expect(getAIProviderWithFallback('user-123')).rejects.toThrow();
    });
  });

  describe('Provider Priority', () => {
    it('should prioritize Anthropic over other providers', async () => {
      process.env.SYSTEM_ANTHROPIC_API_KEY = 'anthropic-key';
      process.env.SYSTEM_OPENAI_API_KEY = 'openai-key';
      process.env.SYSTEM_GOOGLE_API_KEY = 'google-key';

      const mockSupabase = createMockSupabase({
        userSettings: null,
        profile: { subscription_plan: 'free' },
        aiRequests: [],
        error: { message: 'Not found' },
      });

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const provider = await getAIProviderWithFallback('user-123');

      expect(provider?.provider).toBe('anthropic');
    });

    it('should use alternative env var names', async () => {
      process.env.ANTHROPIC_API_KEY = 'anthropic-key';

      const mockSupabase = createMockSupabase({
        userSettings: null,
        profile: { subscription_plan: 'free' },
        aiRequests: [],
        error: { message: 'Not found' },
      });

      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const provider = await getAIProviderWithFallback('user-123');

      expect(provider?.provider).toBe('anthropic');
      expect(provider?.apiKey).toBe('anthropic-key');
    });
  });
});
