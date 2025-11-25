import { SupabaseClient } from "@supabase/supabase-js";
import {
  checkRateLimit,
  getRateLimitStatus,
  RATE_LIMITS,
} from "@/lib/security/rate-limiter";

// Mock next/headers to prevent 'cookies() called outside request scope' error
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockGte: jest.Mock<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockEq: jest.Mock<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockSelect: jest.Mock<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockInsert: jest.Mock<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockLt: jest.Mock<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockDelete: jest.Mock<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockFrom: jest.Mock<any>;
let mockSupabaseClient: SupabaseClient;

beforeEach(() => {
  mockGte = jest.fn();
  mockEq = jest.fn();
  mockSelect = jest.fn();
  mockInsert = jest.fn();
  mockLt = jest.fn();
  mockDelete = jest.fn();
  mockFrom = jest.fn();

  // Setup chain: from().select().eq().eq().gte() for count query
  // eq returns object with eq (for chaining) and gte (for final call)
  mockEq.mockReturnValue({ eq: mockEq, gte: mockGte });
  mockSelect.mockReturnValue({ eq: mockEq });

  // Setup chain: from().delete().lt() for cleanup
  mockLt.mockReturnValue({ lt: mockLt });
  mockDelete.mockReturnValue({ lt: mockLt });

  mockFrom.mockImplementation(() => ({
    select: mockSelect,
    insert: mockInsert,
    delete: mockDelete,
  }));

  mockSupabaseClient = {
    from: mockFrom,
  } as unknown as SupabaseClient;

  // Default successful responses
  mockInsert.mockResolvedValue({ error: null });
  mockLt.mockResolvedValue({ error: null });
});

describe("Rate Limiting - checkRateLimit", () => {
  it("should allow requests under the limit", async () => {
    mockGte.mockResolvedValue({ count: 5, error: null });

    const result = await checkRateLimit(
      "test-user",
      "/api/test",
      { maxRequests: 100, windowMs: 60000 },
      mockSupabaseClient,
    );

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(94);
  });

  it("should block requests at the limit", async () => {
    mockGte.mockResolvedValue({ count: 100, error: null });

    const result = await checkRateLimit(
      "test-user",
      "/api/test",
      { maxRequests: 100, windowMs: 60000 },
      mockSupabaseClient,
    );

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("should block requests over the limit", async () => {
    mockGte.mockResolvedValue({ count: 150, error: null });

    const result = await checkRateLimit(
      "test-user",
      "/api/test",
      { maxRequests: 100, windowMs: 60000 },
      mockSupabaseClient,
    );

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("should fail open on database error", async () => {
    mockGte.mockResolvedValue({ count: null, error: { message: "DB Error" } });

    const result = await checkRateLimit(
      "test-user",
      "/api/test",
      { maxRequests: 100, windowMs: 60000 },
      mockSupabaseClient,
    );

    expect(result.success).toBe(true);
    expect(result.remaining).toBe(100);
  });

  it("should use correct identifier and endpoint", async () => {
    mockGte.mockResolvedValue({ count: 0, error: null });

    await checkRateLimit(
      "user-123",
      "/api/chat",
      { maxRequests: 50, windowMs: 30000 },
      mockSupabaseClient,
    );

    expect(mockFrom).toHaveBeenCalledWith("rate_limit_requests");
    expect(mockSelect).toHaveBeenCalled();
  });
});

describe("Rate Limiting - getRateLimitStatus", () => {
  it("should return current count and reset time", async () => {
    mockGte.mockResolvedValue({ count: 25, error: null });

    const status = await getRateLimitStatus(
      "test-user",
      "/api/test",
      60000,
      mockSupabaseClient,
    );

    expect(status.count).toBe(25);
    expect(status.resetAt).toBeInstanceOf(Date);
  });

  it("should return zero count when no requests exist", async () => {
    mockGte.mockResolvedValue({ count: 0, error: null });

    const status = await getRateLimitStatus(
      "test-user",
      "/api/test",
      60000,
      mockSupabaseClient,
    );

    expect(status.count).toBe(0);
  });

  it("should return zero count on database error", async () => {
    mockGte.mockResolvedValue({ count: null, error: { message: "DB Error" } });

    const status = await getRateLimitStatus(
      "test-user",
      "/api/test",
      60000,
      mockSupabaseClient,
    );

    expect(status.count).toBe(0);
  });
});

describe("Rate Limiting - RATE_LIMITS configuration", () => {
  it("should have correct API_READ rate limit", () => {
    expect(RATE_LIMITS.API_READ).toEqual({
      maxRequests: 100,
      windowMs: 60000,
    });
  });

  it("should have correct API_WRITE rate limit", () => {
    expect(RATE_LIMITS.API_WRITE).toEqual({
      maxRequests: 30,
      windowMs: 60000,
    });
  });

  it("should have correct EXPORT rate limit", () => {
    expect(RATE_LIMITS.EXPORT).toEqual({
      maxRequests: 5,
      windowMs: 60000,
    });
  });

  it("should have correct GMB_SYNC rate limit", () => {
    expect(RATE_LIMITS.GMB_SYNC).toEqual({
      maxRequests: 10,
      windowMs: 600000,
    });
  });
});

describe("Rate Limiting - Edge Cases", () => {
  it("should handle empty identifier", async () => {
    mockGte.mockResolvedValue({ count: 0, error: null });

    const result = await checkRateLimit(
      "",
      "/api/test",
      { maxRequests: 100, windowMs: 60000 },
      mockSupabaseClient,
    );

    expect(result.success).toBe(true);
  });

  it("should handle very large request counts", async () => {
    mockGte.mockResolvedValue({ count: 999999, error: null });

    const result = await checkRateLimit(
      "test-user",
      "/api/test",
      { maxRequests: 100, windowMs: 60000 },
      mockSupabaseClient,
    );

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("should handle zero maxRequests config", async () => {
    mockGte.mockResolvedValue({ count: 0, error: null });

    const result = await checkRateLimit(
      "test-user",
      "/api/test",
      { maxRequests: 0, windowMs: 60000 },
      mockSupabaseClient,
    );

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("should handle insert error gracefully", async () => {
    mockGte.mockResolvedValue({ count: 5, error: null });
    mockInsert.mockResolvedValue({ error: { message: "Insert failed" } });

    const result = await checkRateLimit(
      "test-user",
      "/api/test",
      { maxRequests: 100, windowMs: 60000 },
      mockSupabaseClient,
    );

    expect(result.success).toBe(true);
  });
});

describe("Rate Limiting - DoS Protection", () => {
  it("should prevent rapid successive requests", async () => {
    mockGte
      .mockResolvedValueOnce({ count: 0, error: null })
      .mockResolvedValueOnce({ count: 1, error: null })
      .mockResolvedValueOnce({ count: 2, error: null })
      .mockResolvedValueOnce({ count: 3, error: null })
      .mockResolvedValueOnce({ count: 4, error: null });

    const results = [];
    for (let i = 0; i < 5; i++) {
      const result = await checkRateLimit(
        "attacker",
        "/api/sensitive",
        { maxRequests: 5, windowMs: 60000 },
        mockSupabaseClient,
      );
      results.push(result);
    }

    expect(results.every((r) => r.success)).toBe(true);

    mockGte.mockResolvedValue({ count: 5, error: null });

    const blockedResult = await checkRateLimit(
      "attacker",
      "/api/sensitive",
      { maxRequests: 5, windowMs: 60000 },
      mockSupabaseClient,
    );

    expect(blockedResult.success).toBe(false);
  });
});
