import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';
import { checkRateLimit, getRateLimitStatus, RATE_LIMITS } from '@/lib/security/rate-limiter';

// Mock Supabase client
function createMockSupabase(responses: {
  count?: number | null;
  error?: any;
  insertError?: any;
}): SupabaseClient {
  return {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({
              count: responses.count,
              error: responses.error,
            }),
          }),
        }),
      }),
      insert: jest.fn().mockResolvedValue({
        error: responses.insertError,
      }),
      delete: jest.fn().mockReturnValue({
        lt: jest.fn().mockResolvedValue({
          error: null,
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

// Mock the server module
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('Rate Limiter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkRateLimit - Success Cases', () => {
    it('should allow request when under limit', async () => {
      const mockSupabase = createMockSupabase({ count: 5, error: null });
      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const config = { maxRequests: 10, windowMs: 60000 };
      const result = await checkRateLimit('user-123', '/api/test', config);

      expect(result.success).toBe(true);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(4); // 10 - 5 - 1 (current request)
      expect(result.reset).toBeInstanceOf(Date);
    });

    it('should allow first request (count = 0)', async () => {
      const mockSupabase = createMockSupabase({ count: 0, error: null });
      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const config = { maxRequests: 10, windowMs: 60000 };
      const result = await checkRateLimit('user-123', '/api/test', config);

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('should allow request at exact limit minus one', async () => {
      const mockSupabase = createMockSupabase({ count: 9, error: null });
      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const config = { maxRequests: 10, windowMs: 60000 };
      const result = await checkRateLimit('user-123', '/api/test', config);

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(0);
    });
  });

  describe('checkRateLimit - Rate Limit Exceeded', () => {
    it('should block request when at limit', async () => {
      const mockSupabase = createMockSupabase({ count: 10, error: null });
      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const config = { maxRequests: 10, windowMs: 60000 };
      const result = await checkRateLimit('user-123', '/api/test', config);

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.message).toContain('Rate limit exceeded');
      expect(result.message).toContain('10 requests');
    });

    it('should block request when over limit', async () => {
      const mockSupabase = createMockSupabase({ count: 15, error: null });
      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const config = { maxRequests: 10, windowMs: 60000 };
      const result = await checkRateLimit('user-123', '/api/test', config);

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should use custom error message when provided', async () => {
      const mockSupabase = createMockSupabase({ count: 10, error: null });
      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const config = {
        maxRequests: 10,
        windowMs: 60000,
        message: 'Custom rate limit message',
      };
      const result = await checkRateLimit('user-123', '/api/test', config);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Custom rate limit message');
    });
  });

  describe('checkRateLimit - Error Handling (Fail Open)', () => {
    it('should fail open when database query fails', async () => {
      const mockSupabase = createMockSupabase({
        count: null,
        error: { message: 'Database error' },
      });
      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const config = { maxRequests: 10, windowMs: 60000 };
      const result = await checkRateLimit('user-123', '/api/test', config);

      // Should allow request despite error (fail open for availability)
      expect(result.success).toBe(true);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(10);
    });

    it('should fail open when insert fails', async () => {
      const mockSupabase = createMockSupabase({
        count: 0,
        error: null,
        insertError: { message: 'Insert failed' },
      });
      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const config = { maxRequests: 10, windowMs: 60000 };

      // Should not throw, but log current request
      await expect(checkRateLimit('user-123', '/api/test', config)).resolves.toBeDefined();
    });

    it('should handle unexpected exceptions gracefully', async () => {
      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const config = { maxRequests: 10, windowMs: 60000 };
      const result = await checkRateLimit('user-123', '/api/test', config);

      // Should fail open
      expect(result.success).toBe(true);
    });
  });

  describe('checkRateLimit - Different Configurations', () => {
    it('should use default configuration when not provided', async () => {
      const mockSupabase = createMockSupabase({ count: 50, error: null });
      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const result = await checkRateLimit('user-123', '/api/test');

      expect(result.limit).toBe(100); // Default maxRequests
      expect(result.success).toBe(true);
    });

    it('should handle different window sizes', async () => {
      const mockSupabase = createMockSupabase({ count: 2, error: null });
      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const config = { maxRequests: 5, windowMs: 5000 }; // 5 seconds
      const result = await checkRateLimit('user-123', '/api/test', config);

      expect(result.success).toBe(true);
      expect(result.limit).toBe(5);
    });

    it('should handle very strict limits', async () => {
      const mockSupabase = createMockSupabase({ count: 1, error: null });
      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const config = { maxRequests: 1, windowMs: 60000 };
      const result = await checkRateLimit('user-123', '/api/test', config);

      expect(result.success).toBe(false); // Already at limit
    });
  });

  describe('checkRateLimit - Isolation Between Users/Endpoints', () => {
    it('should track different users independently', async () => {
      const mockSupabase = createMockSupabase({ count: 5, error: null });
      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const config = { maxRequests: 10, windowMs: 60000 };

      // User 1
      const result1 = await checkRateLimit('user-1', '/api/test', config);
      expect(result1.success).toBe(true);

      // User 2 (should have independent count)
      const result2 = await checkRateLimit('user-2', '/api/test', config);
      expect(result2.success).toBe(true);
    });

    it('should track different endpoints independently', async () => {
      const mockSupabase = createMockSupabase({ count: 5, error: null });
      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const config = { maxRequests: 10, windowMs: 60000 };

      // Endpoint 1
      const result1 = await checkRateLimit('user-1', '/api/endpoint1', config);
      expect(result1.success).toBe(true);

      // Endpoint 2 (should have independent count)
      const result2 = await checkRateLimit('user-1', '/api/endpoint2', config);
      expect(result2.success).toBe(true);
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return current request count', async () => {
      const mockSupabase = createMockSupabase({ count: 7, error: null });
      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const status = await getRateLimitStatus('user-123', '/api/test', 60000);

      expect(status.count).toBe(7);
      expect(status.resetAt).toBeInstanceOf(Date);
    });

    it('should handle database errors gracefully', async () => {
      const mockSupabase = createMockSupabase({
        count: null,
        error: { message: 'Error' },
      });
      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const status = await getRateLimitStatus('user-123', '/api/test', 60000);

      expect(status.count).toBe(0);
      expect(status.resetAt).toBeInstanceOf(Date);
    });
  });

  describe('RATE_LIMITS Configuration', () => {
    it('should have reasonable limits for dashboard operations', () => {
      expect(RATE_LIMITS.DASHBOARD_LOAD.maxRequests).toBe(30);
      expect(RATE_LIMITS.DASHBOARD_LOAD.windowMs).toBe(60000);
      expect(RATE_LIMITS.DASHBOARD_REFRESH.maxRequests).toBe(10);
    });

    it('should have appropriate limits for API operations', () => {
      expect(RATE_LIMITS.API_READ.maxRequests).toBe(100);
      expect(RATE_LIMITS.API_WRITE.maxRequests).toBe(30);
      expect(RATE_LIMITS.API_WRITE.maxRequests).toBeLessThan(RATE_LIMITS.API_READ.maxRequests);
    });

    it('should have strict limits for expensive operations', () => {
      expect(RATE_LIMITS.GMB_SYNC.maxRequests).toBe(5);
      expect(RATE_LIMITS.GMB_SYNC.windowMs).toBe(300000); // 5 minutes
      expect(RATE_LIMITS.EXPORT.maxRequests).toBe(5);
    });

    it('should have moderate limits for AI operations', () => {
      expect(RATE_LIMITS.AI_GENERATE.maxRequests).toBe(20);
      expect(RATE_LIMITS.AI_GENERATE.windowMs).toBe(60000);
    });
  });

  describe('Rate Limiting - DoS Protection', () => {
    it('should prevent rapid successive requests', async () => {
      const mockSupabase = createMockSupabase({ count: 0, error: null });
      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const config = { maxRequests: 3, windowMs: 60000 };

      // Simulate rapid requests
      const results = [];
      for (let i = 0; i < 5; i++) {
        mockSupabase.from = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockResolvedValue({
                  count: i,
                  error: null,
                }),
              }),
            }),
          }),
          insert: jest.fn().mockResolvedValue({ error: null }),
        });

        const result = await checkRateLimit('user-123', '/api/test', config);
        results.push(result);
      }

      // First 3 should succeed, last 2 should fail
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(true);
      expect(results[3].success).toBe(false);
      expect(results[4].success).toBe(false);
    });

    it('should provide retry-after information', async () => {
      const mockSupabase = createMockSupabase({ count: 10, error: null });
      const { createClient } = await import('@/lib/supabase/server');
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const config = { maxRequests: 10, windowMs: 60000 };
      const result = await checkRateLimit('user-123', '/api/test', config);

      expect(result.reset).toBeInstanceOf(Date);
      expect(result.reset.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
