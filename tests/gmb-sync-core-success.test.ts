import type { SyncTransactionPayload } from "@/lib/supabase/transactions";

// Shared mocks per file
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
          data: { id: "acc-1", user_id: "user-1", account_id: "accounts/999" },
          error: null,
        }),
      })),
    };
  }),
}));

jest.mock("@/lib/gmb/helpers", () => ({
  getValidAccessToken: jest.fn().mockResolvedValue("access-token"),
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

const publishSyncProgress = jest.fn();
const refreshCache = jest.fn().mockResolvedValue(undefined);
jest.mock("@/lib/cache/cache-manager", () => ({
  CacheBucket: { DASHBOARD_OVERVIEW: "dashboard:overview" },
  publishSyncProgress: (...args: unknown[]) => publishSyncProgress(...args),
  refreshCache: (...args: unknown[]) => refreshCache(...args),
}));

const logAction = jest.fn().mockResolvedValue(undefined);
const trackSyncResult = jest.fn().mockResolvedValue(undefined);
jest.mock("@/lib/monitoring/audit", () => ({
  logAction: (...args: unknown[]) => logAction(...args),
}));
jest.mock("@/lib/monitoring/metrics", () => ({
  trackSyncResult: (...args: unknown[]) => trackSyncResult(...args),
}));

const runSyncTransactionWithRetry = jest.fn();
jest.mock("@/lib/supabase/transactions", () => ({
  runSyncTransactionWithRetry: (...args: unknown[]) =>
    runSyncTransactionWithRetry(...args),
}));

import { performTransactionalSync } from "@/server/actions/gmb-sync";

describe("performTransactionalSync - core success paths", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  it("omits questions when includeQuestions=false and sends empty questions array", async () => {
    const locationsResponse = {
      locations: [
        {
          name: "accounts/999/locations/locA",
          title: "Loc A",
          openInfo: { status: "OPEN" },
        },
      ],
    };
    const reviewsResponse = { reviews: [] };

    (global.fetch as jest.Mock).mockImplementation(
      (input: RequestInfo | URL) => {
        const url = String(input);
        if (
          url.startsWith(
            "https://mybusinessbusinessinformation.googleapis.com/v1/accounts/999/locations",
          )
        ) {
          return Promise.resolve({
            ok: true,
            json: async () => locationsResponse,
          });
        }
        if (
          url.startsWith(
            "https://mybusiness.googleapis.com/v4/accounts/999/locations/locA/reviews",
          )
        ) {
          return Promise.resolve({
            ok: true,
            json: async () => reviewsResponse,
          });
        }
        // questions should not be called
        return Promise.resolve({ ok: false, json: async () => ({}) });
      },
    );

    runSyncTransactionWithRetry.mockResolvedValue({
      success: true,
      sync_id: "sync-noq",
      locations_synced: 1,
      reviews_synced: 0,
      questions_synced: 0,
    });

    const result = await performTransactionalSync(
      "acc-1",
      false /* includeQuestions */,
    );

    expect(result).toEqual({
      success: true,
      sync_id: "sync-noq",
      locations_synced: 1,
      reviews_synced: 0,
      questions_synced: 0,
    });

    // Ensure questions endpoint was not hit
    const questionCalls = (global.fetch as jest.Mock).mock.calls.filter(
      ([u]: any[]) => String(u).includes("/questions"),
    );
    expect(questionCalls.length).toBe(0);

    // Ensure progress omitted questions_fetch stage
    const stages = publishSyncProgress.mock.calls.map((c) => c[0]?.stage);
    expect(stages).not.toContain("questions_fetch");

    // Validate transaction payload had empty questions
    const payload: SyncTransactionPayload =
      runSyncTransactionWithRetry.mock.calls[0][1];
    expect(Array.isArray(payload.questions)).toBe(true);
    expect(payload.questions).toHaveLength(0);
  });

  it("handles multiple locations (2-3) with mixed missing fields and maps correctly", async () => {
    const locationsResponse = {
      locations: [
        {
          name: "accounts/999/locations/loc1",
          title: "L1",
          websiteUri: undefined,
          phoneNumbers: undefined,
          categories: undefined,
          profile: undefined,
          metadata: { profileCompleteness: 0.5 },
          latlng: { latitude: 1.23, longitude: 3.21 },
          openInfo: { status: "OPEN" },
        },
        {
          name: "accounts/999/locations/loc2",
          title: "L2",
          websiteUri: "https://l2.example",
          phoneNumbers: { primaryPhone: "+15550002" },
          categories: { primaryCategory: { displayName: "Cafe" } },
          profile: { overallStarRating: 3.2, reviewCount: 4 },
          metadata: {
            totalReviewCount: 4,
            starRating: 3.2,
            status: "verified",
          },
          latlng: { latitude: -2.2, longitude: 5.5 },
          openInfo: { status: "OPEN" },
        },
        // invalid: missing name -> skipped
        {
          title: "NoName",
        },
      ] as any[],
    };

    const reviewsLoc1 = {
      reviews: [
        {
          reviewId: "r1",
          starRating: "STAR_FOUR",
          comment: "ok",
          createTime: "2025-02-01T00:00:00Z",
        },
      ],
    };
    const reviewsLoc2 = {
      reviews: [
        {
          name: "accounts/999/locations/loc2/reviews/r2",
          starRating: 2,
          comment: "meh",
        },
      ],
    };

    const questionsLoc1 = {
      questions: [
        { name: "accounts/999/locations/loc1/questions/q1", text: "Q1" },
      ],
    };
    const questionsLoc2 = {
      questions: [
        {
          name: "accounts/999/locations/loc2/questions/q2",
          text: "Q2",
          topAnswers: [{ text: "A2" }],
        },
      ],
    };

    (global.fetch as jest.Mock).mockImplementation(
      (input: RequestInfo | URL) => {
        const url = String(input);
        if (
          url.startsWith(
            "https://mybusinessbusinessinformation.googleapis.com/v1/accounts/999/locations",
          )
        ) {
          return Promise.resolve({
            ok: true,
            json: async () => locationsResponse,
          });
        }
        if (url.includes("/locations/loc1/reviews")) {
          return Promise.resolve({ ok: true, json: async () => reviewsLoc1 });
        }
        if (url.includes("/locations/loc2/reviews")) {
          return Promise.resolve({ ok: true, json: async () => reviewsLoc2 });
        }
        if (url.includes("/locations/loc1/questions")) {
          return Promise.resolve({ ok: true, json: async () => questionsLoc1 });
        }
        if (url.includes("/locations/loc2/questions")) {
          return Promise.resolve({ ok: true, json: async () => questionsLoc2 });
        }
        return Promise.resolve({ ok: false, json: async () => ({}) });
      },
    );

    runSyncTransactionWithRetry.mockImplementation(
      async (_: any, payload: SyncTransactionPayload) => ({
        success: true,
        sync_id: "sync-multi",
        locations_synced: payload.locations.length,
        reviews_synced: payload.reviews.length,
        questions_synced: payload.questions.length,
      }),
    );

    const result = await performTransactionalSync("acc-1", true);

    expect(result).toEqual({
      success: true,
      sync_id: "sync-multi",
      locations_synced: 2,
      reviews_synced: 2,
      questions_synced: 2,
    });

    const payload: SyncTransactionPayload =
      runSyncTransactionWithRetry.mock.calls[0][1];
    expect(payload.locations).toHaveLength(2);
    const [l1, l2] = payload.locations;
    // L1 defaults/nulls
    expect(l1.website).toBeNull();
    expect(l1.phone).toBeNull();
    expect(l1.category).toBeNull();
    expect(l1.rating).toBeNull();
    expect(l1.review_count).toBeNull();
    expect(l1.latitude).toBeCloseTo(1.23);
    expect(l1.longitude).toBeCloseTo(3.21);
    expect(typeof l1.last_synced_at).toBe("string");
    // L2 mapped values
    expect(l2.website).toBe("https://l2.example");
    expect(l2.phone).toBe("+15550002");
    expect(l2.category).toBe("Cafe");
    expect(l2.rating).toBe(3.2);
    expect(l2.review_count).toBe(4);
    expect(l2.status).toBe("OPEN"); // openInfo.status takes precedence over metadata.status

    // Reviews mapping per location
    expect(payload.reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          review_id: "r1",
          google_location_id: "accounts/999/locations/loc1",
          rating: 4,
        }),
        expect.objectContaining({
          review_id: "r2",
          google_location_id: "accounts/999/locations/loc2",
          rating: 2,
        }),
      ]),
    );

    // Questions mapping
    expect(payload.questions.find((q) => q.question_id === "q1")?.status).toBe(
      "unanswered",
    );
    expect(payload.questions.find((q) => q.question_id === "q2")?.status).toBe(
      "answered",
    );

    // Progress stages include questions when enabled
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

    // Ensure cache refresh called once with right params
    expect(refreshCache).toHaveBeenCalledTimes(1);
    expect(refreshCache).toHaveBeenCalledWith("dashboard:overview", "user-1");
  });
});
