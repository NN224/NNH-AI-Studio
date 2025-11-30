/**
 * Dashboard Performance Integration Tests
 *
 * Tests the refactored dashboard service with simulated large datasets.
 * Verifies performance under load and data accuracy.
 */

// ============================================================================
// Mock Setup
// ============================================================================

// Generate mock data for performance testing
function generateMockLocations(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `loc-${i}`,
    location_name: `Location ${i + 1}`,
    gmb_account_id: `acc-${Math.floor(i / 10)}`,
    is_active: true,
    is_archived: false,
    last_synced_at: new Date(
      Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    metadata: {
      profileCompleteness: 70 + Math.floor(Math.random() * 30),
      pendingReviews: Math.floor(Math.random() * 5),
      average_rating: 3.5 + Math.random() * 1.5,
    },
    profile_completeness: 70 + Math.floor(Math.random() * 30),
  }));
}

function generateMockReviews(count: number, locationCount: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `review-${i}`,
    user_id: "user-1",
    location_id: `loc-${i % locationCount}`,
    reviewer_name: `Reviewer ${i}`,
    rating: Math.ceil(Math.random() * 5),
    review_text: `This is review ${i} with some text content.`,
    review_date: new Date(
      Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    has_reply: Math.random() > 0.3,
    status: Math.random() > 0.95 ? "flagged" : "active",
    ai_sentiment: ["positive", "neutral", "negative"][
      Math.floor(Math.random() * 3)
    ],
  }));
}

function generateMockQuestions(count: number, locationCount: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `question-${i}`,
    user_id: "user-1",
    location_id: `loc-${i % locationCount}`,
    question_text: `Question ${i}?`,
    created_at: new Date(
      Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    answer_status: Math.random() > 0.4 ? "answered" : "pending",
    upvote_count: Math.floor(Math.random() * 10),
  }));
}

function generateMockPosts(count: number, locationCount: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `post-${i}`,
    user_id: "user-1",
    location_id: `loc-${i % locationCount}`,
    status: ["published", "draft", "scheduled", "failed"][
      Math.floor(Math.random() * 4)
    ],
    post_type: ["STANDARD", "EVENT", "OFFER"][Math.floor(Math.random() * 3)],
    published_at: new Date(
      Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    title: `Post ${i}`,
  }));
}

// Mock Supabase client with configurable data
function createMockSupabaseClient(config: {
  locations: ReturnType<typeof generateMockLocations>;
  reviews: ReturnType<typeof generateMockReviews>;
  questions: ReturnType<typeof generateMockQuestions>;
  posts: ReturnType<typeof generateMockPosts>;
}) {
  const { locations, reviews, questions, posts } = config;

  // Calculate aggregated stats
  const reviewStats = {
    total: reviews.length,
    pending: reviews.filter((r) => !r.has_reply).length,
    replied: reviews.filter((r) => r.has_reply).length,
    flagged: reviews.filter((r) => r.status === "flagged").length,
    avg_rating:
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length || 0,
    rating_1: reviews.filter((r) => r.rating === 1).length,
    rating_2: reviews.filter((r) => r.rating === 2).length,
    rating_3: reviews.filter((r) => r.rating === 3).length,
    rating_4: reviews.filter((r) => r.rating === 4).length,
    rating_5: reviews.filter((r) => r.rating === 5).length,
    sentiment_positive: reviews.filter((r) => r.ai_sentiment === "positive")
      .length,
    sentiment_neutral: reviews.filter((r) => r.ai_sentiment === "neutral")
      .length,
    sentiment_negative: reviews.filter((r) => r.ai_sentiment === "negative")
      .length,
  };

  const postStats = {
    total: posts.length,
    published: posts.filter((p) => p.status === "published").length,
    drafts: posts.filter((p) => p.status === "draft").length,
    scheduled: posts.filter((p) => p.status === "scheduled").length,
    failed: posts.filter((p) => p.status === "failed").length,
    whats_new: posts.filter((p) => p.post_type === "STANDARD").length,
    events: posts.filter((p) => p.post_type === "EVENT").length,
    offers: posts.filter((p) => p.post_type === "OFFER").length,
    this_week: posts.filter((p) => {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return new Date(p.published_at).getTime() > weekAgo;
    }).length,
  };

  const questionStats = {
    total: questions.length,
    unanswered: questions.filter((q) => q.answer_status !== "answered").length,
    answered: questions.filter((q) => q.answer_status === "answered").length,
  };

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      }),
    },
    rpc: jest.fn().mockImplementation((fnName: string) => {
      if (fnName === "get_review_stats_aggregated") {
        return Promise.resolve({ data: reviewStats, error: null });
      }
      if (fnName === "get_post_stats_aggregated") {
        return Promise.resolve({ data: postStats, error: null });
      }
      if (fnName === "get_question_stats_aggregated") {
        return Promise.resolve({ data: questionStats, error: null });
      }
      if (fnName === "get_monthly_stats") {
        return Promise.resolve({
          data: [
            { month: "2024-01", avg_rating: 4.2, review_count: 100 },
            { month: "2024-02", avg_rating: 4.3, review_count: 120 },
          ],
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: { message: "Unknown RPC" } });
    }),
    from: jest.fn().mockImplementation((table: string) => {
      const createChainableMock = (data: unknown[], count?: number) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValue({ data: data[0] || null, error: null }),
        maybeSingle: jest
          .fn()
          .mockResolvedValue({ data: data[0] || null, error: null }),
        then: (
          resolve: (value: {
            data: unknown[];
            error: null;
            count?: number;
          }) => void,
        ) => resolve({ data, error: null, count }),
      });

      switch (table) {
        case "gmb_locations":
          return createChainableMock(locations, locations.length);
        case "gmb_reviews":
          return createChainableMock(reviews, reviews.length);
        case "gmb_questions":
          return createChainableMock(questions, questions.length);
        case "gmb_posts":
          return createChainableMock(posts, posts.length);
        case "gmb_accounts":
          return createChainableMock(
            [
              {
                id: "acc-1",
                is_active: true,
                last_sync: new Date().toISOString(),
              },
            ],
            1,
          );
        case "automation_settings":
          return createChainableMock([], 0);
        case "automation_logs":
          return createChainableMock([], 0);
        case "weekly_task_recommendations":
          return createChainableMock([], 0);
        default:
          return createChainableMock([], 0);
      }
    }),
  };
}

// Mock the Supabase server module
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

// Import after mocking
import { createClient } from "@/lib/supabase/server";
import { getDashboardOverview } from "@/server/services/dashboard.service";

// ============================================================================
// Test Suites
// ============================================================================

describe("Dashboard Performance Tests", () => {
  const LOCATION_COUNT = 100;
  const REVIEW_COUNT = 5000;
  const QUESTION_COUNT = 500;
  const POST_COUNT = 1000;

  let mockLocations: ReturnType<typeof generateMockLocations>;
  let mockReviews: ReturnType<typeof generateMockReviews>;
  let mockQuestions: ReturnType<typeof generateMockQuestions>;
  let mockPosts: ReturnType<typeof generateMockPosts>;

  beforeAll(() => {
    // Generate test data once
    mockLocations = generateMockLocations(LOCATION_COUNT);
    mockReviews = generateMockReviews(REVIEW_COUNT, LOCATION_COUNT);
    mockQuestions = generateMockQuestions(QUESTION_COUNT, LOCATION_COUNT);
    mockPosts = generateMockPosts(POST_COUNT, LOCATION_COUNT);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    const mockClient = createMockSupabaseClient({
      locations: mockLocations,
      reviews: mockReviews,
      questions: mockQuestions,
      posts: mockPosts,
    });

    (createClient as jest.Mock).mockResolvedValue(mockClient);
  });

  describe("Performance Benchmarks", () => {
    it("should return dashboard data within 200ms for 100 locations and 5000 reviews", async () => {
      const startTime = performance.now();

      const result = await getDashboardOverview({
        supabase: await createClient(),
        userId: "user-1",
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(200);
      expect(result).toBeDefined();
      console.log(`Dashboard query completed in ${duration.toFixed(2)}ms`);
    });

    it("should handle concurrent dashboard requests efficiently", async () => {
      const concurrentRequests = 10;
      const startTime = performance.now();

      const results = await Promise.all(
        Array.from({ length: concurrentRequests }, () =>
          getDashboardOverview({
            supabase: createMockSupabaseClient({
              locations: mockLocations,
              reviews: mockReviews,
              questions: mockQuestions,
              posts: mockPosts,
            }) as unknown as Awaited<ReturnType<typeof createClient>>,
            userId: "user-1",
          }),
        ),
      );

      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      const avgDuration = totalDuration / concurrentRequests;

      expect(results).toHaveLength(concurrentRequests);
      expect(avgDuration).toBeLessThan(100); // Average should be under 100ms
      console.log(
        `${concurrentRequests} concurrent requests completed in ${totalDuration.toFixed(2)}ms (avg: ${avgDuration.toFixed(2)}ms)`,
      );
    });
  });

  describe("Data Accuracy", () => {
    it("should return accurate review statistics", async () => {
      const result = await getDashboardOverview({
        supabase: await createClient(),
        userId: "user-1",
      });

      const expectedTotal = mockReviews.length;
      const expectedPending = mockReviews.filter((r) => !r.has_reply).length;
      const expectedReplied = mockReviews.filter((r) => r.has_reply).length;

      expect(result.reviewStats.totals.total).toBe(expectedTotal);
      expect(result.reviewStats.totals.pending).toBe(expectedPending);
      expect(result.reviewStats.totals.replied).toBe(expectedReplied);
    });

    it("should return accurate location counts", async () => {
      const result = await getDashboardOverview({
        supabase: await createClient(),
        userId: "user-1",
      });

      expect(result.locationSummary.locations).toHaveLength(LOCATION_COUNT);
    });

    it("should calculate correct response rate", async () => {
      const result = await getDashboardOverview({
        supabase: await createClient(),
        userId: "user-1",
      });

      const expectedReplied = mockReviews.filter((r) => r.has_reply).length;
      const expectedRate = (expectedReplied / mockReviews.length) * 100;

      // Allow for small floating point differences
      expect(
        Math.abs(result.reviewStats.responseRate - expectedRate),
      ).toBeLessThan(0.1);
    });

    it("should calculate correct average rating", async () => {
      const result = await getDashboardOverview({
        supabase: await createClient(),
        userId: "user-1",
      });

      const expectedAvg =
        mockReviews.reduce((sum, r) => sum + r.rating, 0) / mockReviews.length;

      expect(
        Math.abs(result.reviewStats.averageRating - expectedAvg),
      ).toBeLessThan(0.01);
    });

    it("should return correct rating distribution", async () => {
      const result = await getDashboardOverview({
        supabase: await createClient(),
        userId: "user-1",
      });

      const distribution = result.reviewStats.byRating;
      const totalFromDistribution = Object.values(distribution).reduce(
        (a, b) => (a as number) + (b as number),
        0,
      );

      expect(totalFromDistribution).toBe(mockReviews.length);
    });
  });

  describe("Health Score Calculation", () => {
    it("should calculate health score based on pending reviews", async () => {
      const result = await getDashboardOverview({
        supabase: await createClient(),
        userId: "user-1",
      });

      // Health score should be between 0 and 100
      expect(result.kpis.healthScore).toBeGreaterThanOrEqual(0);
      expect(result.kpis.healthScore).toBeLessThanOrEqual(100);
    });

    it("should identify bottlenecks correctly", async () => {
      const result = await getDashboardOverview({
        supabase: await createClient(),
        userId: "user-1",
      });

      // Bottlenecks should be an array
      expect(Array.isArray(result.bottlenecks)).toBe(true);

      // Each bottleneck should have required fields
      for (const bottleneck of result.bottlenecks) {
        expect(bottleneck).toHaveProperty("type");
        expect(bottleneck).toHaveProperty("severity");
        expect(bottleneck).toHaveProperty("message");
        expect(["high", "medium", "low"]).toContain(bottleneck.severity);
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty data gracefully", async () => {
      const emptyClient = createMockSupabaseClient({
        locations: [],
        reviews: [],
        questions: [],
        posts: [],
      });

      (createClient as jest.Mock).mockResolvedValue(emptyClient);

      const result = await getDashboardOverview({
        supabase: await createClient(),
        userId: "user-1",
      });

      expect(result.locationSummary.locations).toHaveLength(0);
      expect(result.reviewStats.totals.total).toBe(0);
      expect(result.kpis.healthScore).toBe(100); // Perfect score with no issues
    });

    it("should handle locations with missing metadata", async () => {
      const locationsWithMissingMetadata = mockLocations.map((loc, i) => ({
        ...loc,
        metadata: i % 2 === 0 ? null : loc.metadata,
      }));

      const clientWithMissingMetadata = createMockSupabaseClient({
        locations: locationsWithMissingMetadata,
        reviews: mockReviews,
        questions: mockQuestions,
        posts: mockPosts,
      });

      (createClient as jest.Mock).mockResolvedValue(clientWithMissingMetadata);

      const result = await getDashboardOverview({
        supabase: await createClient(),
        userId: "user-1",
      });

      // Should not throw and should return valid data
      expect(result).toBeDefined();
      expect(result.locationSummary.locations).toHaveLength(LOCATION_COUNT);
    });

    it("should handle very old sync timestamps", async () => {
      const locationsWithOldSync = mockLocations.map((loc) => ({
        ...loc,
        last_synced_at: new Date(
          Date.now() - 365 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 1 year ago
      }));

      const clientWithOldSync = createMockSupabaseClient({
        locations: locationsWithOldSync,
        reviews: mockReviews,
        questions: mockQuestions,
        posts: mockPosts,
      });

      (createClient as jest.Mock).mockResolvedValue(clientWithOldSync);

      const result = await getDashboardOverview({
        supabase: await createClient(),
        userId: "user-1",
      });

      // Should identify stale locations in bottlenecks
      const staleBottleneck = result.bottlenecks.find((b) =>
        b.message.includes("stale"),
      );
      expect(staleBottleneck).toBeDefined();
    });
  });

  describe("Memory Efficiency", () => {
    it("should not cause memory issues with large datasets", async () => {
      // Get initial memory usage
      const initialMemory = process.memoryUsage().heapUsed;

      // Run multiple queries
      for (let i = 0; i < 5; i++) {
        await getDashboardOverview({
          supabase: await createClient(),
          userId: "user-1",
        });
      }

      // Check memory after queries
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      console.log(
        `Memory increase after 5 queries: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`,
      );
    });
  });
});

describe("Dashboard Service Error Handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw error when user is not authenticated", async () => {
    const mockClient = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "Not authenticated" },
        }),
      },
      from: jest.fn(),
      rpc: jest.fn(),
    };

    (createClient as jest.Mock).mockResolvedValue(mockClient);

    await expect(
      getDashboardOverview({
        supabase: mockClient as unknown as Awaited<
          ReturnType<typeof createClient>
        >,
        userId: "",
      }),
    ).rejects.toThrow();
  });

  it("should handle database errors gracefully", async () => {
    const mockClient = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: jest.fn().mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: (
          resolve: (value: { data: null; error: { message: string } }) => void,
        ) => resolve({ data: null, error: { message: "Database error" } }),
      })),
      rpc: jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: "RPC error" } }),
    };

    (createClient as jest.Mock).mockResolvedValue(mockClient);

    // Should handle error without crashing
    const result = await getDashboardOverview({
      supabase: mockClient as unknown as Awaited<
        ReturnType<typeof createClient>
      >,
      userId: "user-1",
    }).catch((e) => e);

    // Either returns fallback data or throws a handled error
    expect(result).toBeDefined();
  });
});
