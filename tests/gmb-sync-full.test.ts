import type { SyncTransactionPayload } from "@/lib/supabase/transactions";

// Mocks
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(() => {
    return {
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: "acc-uuid-1",
            user_id: "user-1",
            account_id: "accounts/123456789",
          },
          error: null,
        }),
      })),
    };
  }),
}));

// Mock helpers: only override getValidAccessToken while supplying needed constants/exports
jest.mock("@/lib/gmb/helpers", () => ({
  getValidAccessToken: jest.fn().mockResolvedValue("test-access-token"),
  buildLocationResourceName: (accountId: string, locationId: string) =>
    `accounts/${accountId.replace(/^accounts\//, "")}/locations/${locationId.replace(/^(accounts\/[^/]+\/)?locations\//, "")}`,
  GMB_CONSTANTS: {
    BUSINESS_INFORMATION_BASE:
      "https://mybusinessbusinessinformation.googleapis.com/v1",
    GBP_LOC_BASE: "https://mybusinessbusinessinformation.googleapis.com/v1",
    QANDA_BASE: "https://mybusinessqanda.googleapis.com/v1",
    GMB_V4_BASE: "https://mybusiness.googleapis.com/v4",
    GOOGLE_TOKEN_URL: "https://oauth2.googleapis.com/token",
  },
}));

// Mock cache manager
const publishSyncProgress = jest.fn();
const refreshCache = jest.fn().mockResolvedValue(undefined);
jest.mock("@/lib/cache/cache-manager", () => ({
  CacheBucket: { DASHBOARD_OVERVIEW: "dashboard:overview" },
  publishSyncProgress: (...args: unknown[]) => publishSyncProgress(...args),
  refreshCache: (...args: unknown[]) => refreshCache(...args),
}));

// Mock monitoring
const logAction = jest.fn().mockResolvedValue(undefined);
const trackSyncResult = jest.fn().mockResolvedValue(undefined);
jest.mock("@/lib/monitoring/audit", () => ({
  logAction: (...args: unknown[]) => logAction(...args),
}));
jest.mock("@/lib/monitoring/metrics", () => ({
  trackSyncResult: (...args: unknown[]) => trackSyncResult(...args),
}));

// Capture/Mock transactional RPC wrapper
const runSyncTransactionWithRetry = jest.fn();
jest.mock("@/lib/supabase/transactions", () => ({
  runSyncTransactionWithRetry: (...args: unknown[]) =>
    runSyncTransactionWithRetry(...args),
}));

// Subject under test
import { performTransactionalSync } from "@/server/actions/gmb-sync";

describe("GMB full sync flow (performTransactionalSync)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up fetch mock to return locations, reviews, questions
    const locationsResponse = {
      locations: [
        {
          name: "accounts/123456789/locations/loc1",
          title: "My Test Location",
          websiteUri: "https://example.com",
          storefrontAddress: {
            addressLines: ["123 Main St"],
            locality: "Springfield",
            administrativeArea: "IL",
            postalCode: "62701",
            country: "US",
          },
          phoneNumbers: { primaryPhone: "+1-555-000-1111" },
          categories: { primaryCategory: { displayName: "Restaurant" } },
          profile: { overallStarRating: 4.6, reviewCount: 17 },
          metadata: {
            starRating: 4.6,
            totalReviewCount: 17,
            profileCompleteness: 0.8,
            status: "verified",
          },
          latlng: { latitude: 39.7817, longitude: -89.6501 },
          openInfo: { status: "OPEN" },
        },
      ],
    };

    const reviewsResponse = {
      reviews: [
        {
          reviewId: "r1",
          name: "accounts/123456789/locations/loc1/reviews/r1",
          reviewer: {
            displayName: "Alice",
            profilePhotoUrl: "https://img/alice",
          },
          starRating: "STAR_FIVE",
          comment: "Great service!",
          createTime: "2025-01-01T00:00:00Z",
          reviewReply: {
            comment: "Thank you!",
            updateTime: "2025-01-02T00:00:00Z",
          },
          commentSummary: { positiveRatio: 0.95 },
        },
      ],
    };

    const questionsResponse = {
      questions: [
        {
          name: "accounts/123456789/locations/loc1/questions/q1",
          author: {
            displayName: "Bob",
            profilePhotoUrl: "https://img/bob",
            type: "CUSTOMER",
          },
          text: "Are you open on weekends?",
          createTime: "2025-01-03T00:00:00Z",
          topAnswers: [
            {
              name: "accounts/123456789/locations/loc1/questions/q1/answers/a1",
              text: "Yes, 9am-5pm",
              updateTime: "2025-01-04T00:00:00Z",
              author: { displayName: "Owner" },
            },
          ],
          upvoteCount: 2,
          totalAnswerCount: 1,
        },
      ],
    };

    (global.fetch as jest.Mock).mockImplementation(
      (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        if (
          url.startsWith(
            "https://mybusinessbusinessinformation.googleapis.com/v1/accounts/123456789/locations",
          )
        ) {
          return Promise.resolve({
            ok: true,
            json: async () => locationsResponse,
          });
        }
        if (
          url.startsWith(
            "https://mybusiness.googleapis.com/v4/accounts/123456789/locations/loc1/reviews",
          )
        ) {
          return Promise.resolve({
            ok: true,
            json: async () => reviewsResponse,
          });
        }
        if (
          url.startsWith(
            "https://mybusinessqanda.googleapis.com/v1/accounts/123456789/locations/loc1/questions",
          )
        ) {
          return Promise.resolve({
            ok: true,
            json: async () => questionsResponse,
          });
        }
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: { message: "not found" } }),
        });
      },
    );
  });

  it("builds payload from Google endpoints and commits transactional sync", async () => {
    // Arrange: the transactional RPC mock will also validate the payload shape
    runSyncTransactionWithRetry.mockImplementation(
      async (_supabase: any, payload: SyncTransactionPayload) => {
        // Basic payload assertions
        expect(payload.accountId).toBe("acc-uuid-1");
        expect(Array.isArray(payload.locations)).toBe(true);
        expect(Array.isArray(payload.reviews)).toBe(true);
        expect(Array.isArray(payload.questions)).toBe(true);

        // Locations mapping
        expect(payload.locations).toHaveLength(1);
        const loc = payload.locations[0];
        expect(loc.location_id).toBe("accounts/123456789/locations/loc1");
        expect(loc.location_name).toBe("My Test Location");
        expect(loc.category).toBe("Restaurant");
        expect(loc.website).toBe("https://example.com");
        expect(loc.phone).toBe("+1-555-000-1111");
        expect(loc.latitude).toBeCloseTo(39.7817);
        expect(loc.longitude).toBeCloseTo(-89.6501);
        expect(loc.gmb_account_id).toBe("acc-uuid-1");
        expect(loc.user_id).toBe("user-1");
        // ensure full shape
        expect(loc).toHaveProperty("normalized_location_id");
        expect(loc).toHaveProperty("address");
        expect(loc).toHaveProperty("rating");
        expect(loc).toHaveProperty("review_count");
        expect(loc).toHaveProperty("profile_completeness");
        expect(loc).toHaveProperty("is_active", true);
        expect(loc).toHaveProperty("status");
        expect(loc).toHaveProperty("metadata");
        expect(typeof loc.last_synced_at).toBe("string");

        // Reviews mapping
        expect(payload.reviews).toHaveLength(1);
        const rev = payload.reviews[0];
        expect(rev.review_id).toBe("r1");
        expect(rev.rating).toBe(5);
        expect(rev.has_reply).toBe(true);
        expect(rev.status).toBe("responded");
        expect(rev.gmb_account_id).toBe("acc-uuid-1");
        expect(rev.user_id).toBe("user-1");
        expect(rev.google_location_id).toBe(
          "accounts/123456789/locations/loc1",
        );
        // review shape keys
        expect(rev).toHaveProperty("reviewer_name");
        expect(rev).toHaveProperty("reviewer_display_name");
        expect(rev).toHaveProperty("reviewer_photo");
        expect(rev).toHaveProperty("review_text");
        expect(rev).toHaveProperty("review_date");
        expect(rev).toHaveProperty("reply_text");
        expect(rev).toHaveProperty("reply_date");
        expect(rev).toHaveProperty("sentiment");
        expect(rev).toHaveProperty("google_name");
        expect(rev).toHaveProperty("review_url");

        // Questions mapping
        expect(payload.questions).toHaveLength(1);
        const q = payload.questions[0];
        expect(q.question_id).toBe("q1");
        expect(q.status).toBe("answered");
        expect(q.answer_text).toContain("Yes");
        expect(q.gmb_account_id).toBe("acc-uuid-1");
        expect(q.user_id).toBe("user-1");
        expect(q.google_location_id).toBe("accounts/123456789/locations/loc1");
        // question shape keys
        expect(q).toHaveProperty("author_name");
        expect(q).toHaveProperty("author_display_name");
        expect(q).toHaveProperty("author_profile_photo_url");
        expect(q).toHaveProperty("author_type");
        expect(q).toHaveProperty("question_text");
        expect(q).toHaveProperty("question_date");
        expect(q).toHaveProperty("answer_date");
        expect(q).toHaveProperty("answer_author");
        expect(q).toHaveProperty("answer_id");
        expect(q).toHaveProperty("upvote_count");
        expect(q).toHaveProperty("total_answer_count");
        expect(q).toHaveProperty("google_resource_name");

        // Posts/Media excluded by default
        expect((payload as any).posts).toBeUndefined();
        expect((payload as any).media).toBeUndefined();

        // Return a deterministic transaction result
        return {
          success: true,
          sync_id: "sync-xyz",
          locations_synced: payload.locations.length,
          reviews_synced: payload.reviews.length,
          questions_synced: payload.questions.length,
        };
      },
    );

    // Act
    const result = await performTransactionalSync(
      "acc-uuid-1",
      true /* includeQuestions */,
    );

    // Assert: transaction result propagated
    expect(result).toEqual({
      success: true,
      sync_id: "sync-xyz",
      locations_synced: 1,
      reviews_synced: 1,
      questions_synced: 1,
    });

    // Progress emissions should include all stages
    const stages = publishSyncProgress.mock.calls.map((c) => c[0]?.stage);
    expect(stages).toEqual(
      expect.arrayContaining([
        "init",
        "locations_fetch",
        "reviews_fetch",
        "questions_fetch",
        "transaction",
        "cache_refresh",
        "complete",
      ]),
    );

    // Cache refresh called for dashboard overview with the user id
    expect(refreshCache).toHaveBeenCalledWith(expect.any(String), "user-1");

    // Monitoring recorded success and tracking called
    expect(logAction).toHaveBeenCalledWith(
      "sync",
      "gmb_account",
      "acc-uuid-1",
      expect.objectContaining({ status: "success" }),
    );
    expect(trackSyncResult).toHaveBeenCalledWith(
      "user-1",
      true,
      expect.any(Number),
    );

    // Verify fetch endpoints were hit
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        "https://mybusinessbusinessinformation.googleapis.com/v1/accounts/123456789/locations",
      ),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringContaining("Bearer "),
        }),
      }),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        "https://mybusiness.googleapis.com/v4/accounts/123456789/locations/loc1/reviews",
      ),
      expect.any(Object),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        "https://mybusinessqanda.googleapis.com/v1/accounts/123456789/locations/loc1/questions",
      ),
      expect.any(Object),
    );
  });
});
