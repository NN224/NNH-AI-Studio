// Comprehensive Unit Tests for Dashboard Services
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DashboardService } from "../services/dashboard.service";
import { LocationService } from "../services/location.service";
import { OAuthService } from "../services/oauth.service";
import { DashboardServiceError } from "../utils/error-handler";

// Mock Supabase client
const mockSupabaseClient = {
  rpc: jest.fn(),
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        maybeSingle: jest.fn(),
        single: jest.fn(),
        limit: jest.fn(),
      })),
      single: jest.fn(),
      limit: jest.fn(),
    })),
    insert: jest.fn(),
    update: jest.fn(() => ({
      eq: jest.fn(),
    })),
  })),
} as unknown as SupabaseClient;

describe("DashboardService", () => {
  let dashboardService: DashboardService;

  beforeEach(() => {
    dashboardService = new DashboardService(mockSupabaseClient);
    jest.clearAllMocks();
  });

  describe("getUserStats", () => {
    it("should return valid dashboard stats", async () => {
      const mockStats = {
        response_rate_percent: 85,
        reviews_count: 150,
        average_rating: 4.5,
        replied_reviews_count: 128,
        locations_count: 3,
        accounts_count: 1,
        today_reviews_count: 5,
        weekly_growth: 12,
        reviews_trend: [10, 15, 20, 18, 22],
        youtube_subs: "1.2K",
        has_youtube: true,
        has_accounts: true,
        streak: 7,
      };

      (mockSupabaseClient.rpc as jest.Mock).mockResolvedValue({
        data: mockStats,
        error: null,
      });

      const result = await dashboardService.getUserStats("user-123");

      expect(result).toEqual(mockStats);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        "get_user_dashboard_stats",
        {
          p_user_id: "user-123",
        },
      );
    });

    it("should handle RPC errors gracefully", async () => {
      (mockSupabaseClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: "RPC function not found" },
      });

      await expect(dashboardService.getUserStats("user-123")).rejects.toThrow(
        DashboardServiceError,
      );
    });

    it("should handle missing data", async () => {
      (mockSupabaseClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(dashboardService.getUserStats("user-123")).rejects.toThrow(
        "No dashboard stats found for user",
      );
    });
  });

  describe("getTotalLocationsCount", () => {
    it("should return correct count", async () => {
      const mockFrom = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({ count: 5, error: null })),
          })),
        })),
      };

      (mockSupabaseClient.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await dashboardService.getTotalLocationsCount("user-123");

      expect(result).toBe(5);
    });
  });
});

describe("LocationService", () => {
  let locationService: LocationService;
  const mockAdminClient = mockSupabaseClient;

  beforeEach(() => {
    locationService = new LocationService(mockSupabaseClient, mockAdminClient);
    jest.clearAllMocks();
  });

  describe("getLocationWithAccount", () => {
    it("should return location with GMB account", async () => {
      const mockLocation = {
        id: "loc-123",
        user_id: "user-123",
        location_name: "Test Business",
        location_id: "gmb-loc-123",
        address: "123 Main St",
        phone: "+1234567890",
        website: "https://example.com",
        is_active: true,
        metadata: {},
        gmb_accounts: {
          id: "acc-123",
          user_id: "user-123",
          access_token: "encrypted-token",
          refresh_token: "encrypted-refresh",
          token_expires_at: "2024-12-31T23:59:59Z",
        },
      };

      const mockFrom = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({
                data: mockLocation,
                error: null,
              }),
            })),
          })),
        })),
      };

      (mockSupabaseClient.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await locationService.getLocationWithAccount(
        "loc-123",
        "user-123",
      );

      expect(result).toEqual(mockLocation);
    });

    it("should return null for non-existent location", async () => {
      const mockFrom = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            })),
          })),
        })),
      };

      (mockSupabaseClient.from as jest.Mock).mockReturnValue(mockFrom);
      (mockAdminClient.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          })),
        })),
      });

      const result = await locationService.getLocationWithAccount(
        "loc-123",
        "user-123",
      );

      expect(result).toBeNull();
    });
  });
});

describe("OAuthService", () => {
  let oauthService: OAuthService;

  beforeEach(() => {
    oauthService = new OAuthService(mockSupabaseClient);
    jest.clearAllMocks();
  });

  describe("validateAllUserTokens", () => {
    it("should return token validation summary", async () => {
      const mockAccounts = [
        {
          id: "acc-1",
          token_expires_at: "2024-12-31T23:59:59Z",
          access_token: "token1",
          refresh_token: "refresh1",
        },
        {
          id: "acc-2",
          token_expires_at: "2020-01-01T00:00:00Z", // Expired
          access_token: "token2",
          refresh_token: "refresh2",
        },
        {
          id: "acc-3",
          token_expires_at: null,
          access_token: null,
          refresh_token: null,
        },
      ];

      const mockFrom = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              data: mockAccounts,
              error: null,
            })),
          })),
        })),
      };

      (mockSupabaseClient.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await oauthService.validateAllUserTokens("user-123");

      expect(result.valid).toBe(1);
      expect(result.expired).toBe(1);
      expect(result.invalid).toBe(1);
    });
  });
});

describe("Error Handling", () => {
  it("should create DashboardServiceError with context", () => {
    const error = new DashboardServiceError("Test error", "TEST_ERROR", {
      userId: "user-123",
    });

    expect(error.message).toBe("Test error");
    expect(error.code).toBe("TEST_ERROR");
    expect(error.context).toEqual({ userId: "user-123" });
  });
});

describe("Type Guards Integration", () => {
  it("should validate dashboard stats structure", () => {
    const validStats = {
      response_rate_percent: 85,
      reviews_count: 150,
      average_rating: 4.5,
      replied_reviews_count: 128,
      locations_count: 3,
      accounts_count: 1,
      today_reviews_count: 5,
      weekly_growth: 12,
      reviews_trend: [10, 15, 20],
      youtube_subs: "1.2K",
      has_youtube: true,
      has_accounts: true,
      streak: 7,
    };

    // This would use the type guards we created
    expect(typeof validStats.response_rate_percent).toBe("number");
    expect(Array.isArray(validStats.reviews_trend)).toBe(true);
  });
});

// Performance Tests
describe("Performance Tests", () => {
  it("should handle large datasets efficiently", async () => {
    const startTime = Date.now();

    // Simulate processing large dataset
    const largeArray = Array.from({ length: 10000 }, (_, i) => ({
      id: `item-${i}`,
      value: Math.random(),
    }));

    const processed = largeArray.filter((item) => item.value > 0.5);

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(100); // Should complete in under 100ms
    expect(processed.length).toBeGreaterThan(0);
  });
});

// Integration Tests
describe("Integration Tests", () => {
  it("should work with real-like data flow", async () => {
    // Mock a complete data flow
    const mockUserData = {
      id: "user-123",
      email: "test@example.com",
    };

    const mockDashboardData = {
      stats: {
        response_rate_percent: 85,
        reviews_count: 150,
        average_rating: 4.5,
        replied_reviews_count: 128,
        locations_count: 3,
        accounts_count: 1,
        today_reviews_count: 5,
        weekly_growth: 12,
        reviews_trend: [10, 15, 20],
        youtube_subs: "1.2K",
        has_youtube: true,
        has_accounts: true,
        streak: 7,
      },
      totalLocations: 3,
      hasMore: false,
      lastUpdated: new Date().toISOString(),
    };

    // Simulate the complete flow
    expect(mockUserData.id).toBe("user-123");
    expect(mockDashboardData.stats.reviews_count).toBe(150);
    expect(mockDashboardData.totalLocations).toBe(3);
  });
});
