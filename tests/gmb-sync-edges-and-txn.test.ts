import type { SyncTransactionPayload } from "@/lib/supabase/transactions";

// Base mocks
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

describe("performTransactionalSync - transaction failure and mapping edges", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  it("propagates transaction failure and does not refresh cache", async () => {
    // basic minimal data flow
    const locationsResponse = {
      locations: [
        {
          name: "accounts/999/locations/l1",
          title: "L1",
          openInfo: { status: "OPEN" },
        },
      ],
    };
    const reviewsResponse = { reviews: [] };
    const questionsResponse = { questions: [] };
    (global.fetch as jest.Mock).mockImplementation(
      (input: RequestInfo | URL) => {
        const url = String(input);
        if (
          url.includes("/locations") &&
          !url.includes("/reviews") &&
          !url.includes("/questions")
        ) {
          return Promise.resolve({
            ok: true,
            json: async () => locationsResponse,
          });
        }
        if (url.includes("/reviews"))
          return Promise.resolve({
            ok: true,
            json: async () => reviewsResponse,
          });
        if (url.includes("/questions"))
          return Promise.resolve({
            ok: true,
            json: async () => questionsResponse,
          });
        return Promise.resolve({ ok: true, json: async () => ({}) });
      },
    );

    runSyncTransactionWithRetry.mockRejectedValueOnce(new Error("txn failed"));

    await expect(performTransactionalSync("acc-1", true)).rejects.toThrow(
      "txn failed",
    );

    // Ensure progress stopped with transaction error then complete error
    const pairs = publishSyncProgress.mock.calls.map(
      (c) => `${c[0]?.stage}:${c[0]?.status}`,
    );
    expect(pairs).toEqual(
      expect.arrayContaining([
        "transaction:running",
        "transaction:error",
        "complete:error",
      ]),
    );
    // verify ordering: transaction:running occurs before transaction:error
    const idxRun = pairs.indexOf("transaction:running");
    const idxErr = pairs.indexOf("transaction:error");
    expect(idxRun).toBeGreaterThan(-1);
    expect(idxErr).toBeGreaterThan(idxRun);

    expect(refreshCache).not.toHaveBeenCalled();
    expect(logAction).toHaveBeenCalledWith(
      "sync",
      "gmb_account",
      "acc-1",
      expect.objectContaining({ status: "failed", stage: "transaction" }),
    );
    expect(trackSyncResult).toHaveBeenCalledWith(
      "user-1",
      false,
      expect.any(Number),
    );
  });

  describe("review mapping edge cases", () => {
    const table: Array<{
      name: string;
      star: string | number | null | undefined;
      expected: number;
    }> = [
      { name: "string invalid", star: "NOT_A_RATING", expected: 0 },
      { name: "digit in string", star: "3-star", expected: 3 },
      { name: "STAR_ZERO", star: "STAR_ZERO", expected: 0 },
      { name: "numeric 0", star: 0, expected: 0 },
      { name: "numeric 5", star: 5, expected: 5 },
      { name: "null", star: null, expected: 0 },
      { name: "undefined", star: undefined, expected: 0 },
    ];

    it.each(table)("maps rating: %s", async (_row) => {
      const row = _row as {
        name: string;
        star: string | number | null | undefined;
        expected: number;
      };
      const locationsResponse = {
        locations: [
          {
            name: "accounts/999/locations/l1",
            title: "L1",
            openInfo: { status: "OPEN" },
          },
        ],
      };
      const reviewsResponse = {
        reviews: [
          {
            reviewId: "rx",
            starRating: row.star,
            reviewer: {},
            comment: "txt",
          },
        ],
      };
      const questionsResponse = { questions: [] };

      (global.fetch as jest.Mock).mockImplementation(
        (input: RequestInfo | URL) => {
          const url = String(input);
          if (
            url.includes("/locations") &&
            !url.includes("/reviews") &&
            !url.includes("/questions")
          ) {
            return Promise.resolve({
              ok: true,
              json: async () => locationsResponse,
            });
          }
          if (url.includes("/reviews"))
            return Promise.resolve({
              ok: true,
              json: async () => reviewsResponse,
            });
          if (url.includes("/questions"))
            return Promise.resolve({
              ok: true,
              json: async () => questionsResponse,
            });
          return Promise.resolve({ ok: true, json: async () => ({}) });
        },
      );

      runSyncTransactionWithRetry.mockImplementation(
        async (_: any, payload: SyncTransactionPayload) => ({
          success: true,
          sync_id: "sync-edge",
          locations_synced: payload.locations.length,
          reviews_synced: payload.reviews.length,
          questions_synced: payload.questions.length,
        }),
      );

      const result = await performTransactionalSync("acc-1", true);
      expect(result.success).toBe(true);
      const payload: SyncTransactionPayload =
        runSyncTransactionWithRetry.mock.calls[0][1];
      expect(payload.reviews[0].rating).toBe(row.expected);
      // No reply -> has_reply false, status pending
      expect(payload.reviews[0].has_reply).toBe(false);
      expect(payload.reviews[0].status).toBe("pending");
      // Missing reviewer info -> defaults
      expect(payload.reviews[0].reviewer_name).toBe("Anonymous");
      expect(payload.reviews[0].reviewer_display_name).toBeNull();
    });
  });

  describe("question mapping edge cases", () => {
    it("no topAnswers results in unanswered", async () => {
      const locationsResponse = {
        locations: [
          {
            name: "accounts/999/locations/l1",
            title: "L1",
            openInfo: { status: "OPEN" },
          },
        ],
      };
      const reviewsResponse = { reviews: [] };
      const questionsResponse = {
        questions: [
          {
            name: "accounts/999/locations/l1/questions/q1",
            text: "Q",
            author: null,
            createTime: undefined,
          },
        ],
      };

      (global.fetch as jest.Mock).mockImplementation(
        (input: RequestInfo | URL) => {
          const url = String(input);
          if (
            url.includes("/locations") &&
            !url.includes("/reviews") &&
            !url.includes("/questions")
          ) {
            return Promise.resolve({
              ok: true,
              json: async () => locationsResponse,
            });
          }
          if (url.includes("/reviews"))
            return Promise.resolve({
              ok: true,
              json: async () => reviewsResponse,
            });
          if (url.includes("/questions"))
            return Promise.resolve({
              ok: true,
              json: async () => questionsResponse,
            });
          return Promise.resolve({ ok: true, json: async () => ({}) });
        },
      );

      runSyncTransactionWithRetry.mockImplementation(
        async (_: any, payload: SyncTransactionPayload) => ({
          success: true,
          sync_id: "sync-q1",
          locations_synced: payload.locations.length,
          reviews_synced: payload.reviews.length,
          questions_synced: payload.questions.length,
        }),
      );

      const result = await performTransactionalSync("acc-1", true);
      expect(result.success).toBe(true);
      const payload: SyncTransactionPayload =
        runSyncTransactionWithRetry.mock.calls[0][1];
      const q = payload.questions[0];
      expect(q.status).toBe("unanswered");
      expect(q.answer_text).toBeNull();
      expect(q.answer_author).toBeNull();
      // Null author -> defaults applied
      expect(q.author_name).toBe("Anonymous");
      expect(q.author_display_name).toBeNull();
      expect(typeof q.question_date).toBe("string");
    });

    it("multiple answers picks first; missing answer fields handled", async () => {
      const locationsResponse = {
        locations: [
          {
            name: "accounts/999/locations/l1",
            title: "L1",
            openInfo: { status: "OPEN" },
          },
        ],
      };
      const reviewsResponse = { reviews: [] };
      const questionsResponse = {
        questions: [
          {
            name: "accounts/999/locations/l1/questions/q2",
            text: "Q2",
            topAnswers: [
              {
                text: "A1",
                updateTime: undefined,
                author: { displayName: null },
              },
              {
                text: "A2",
                updateTime: "2025-01-01T00:00:00Z",
                author: { displayName: "User" },
              },
            ],
          },
        ],
      };

      (global.fetch as jest.Mock).mockImplementation(
        (input: RequestInfo | URL) => {
          const url = String(input);
          if (
            url.includes("/locations") &&
            !url.includes("/reviews") &&
            !url.includes("/questions")
          ) {
            return Promise.resolve({
              ok: true,
              json: async () => locationsResponse,
            });
          }
          if (url.includes("/reviews"))
            return Promise.resolve({
              ok: true,
              json: async () => reviewsResponse,
            });
          if (url.includes("/questions"))
            return Promise.resolve({
              ok: true,
              json: async () => questionsResponse,
            });
          return Promise.resolve({ ok: true, json: async () => ({}) });
        },
      );

      runSyncTransactionWithRetry.mockImplementation(
        async (_: any, payload: SyncTransactionPayload) => ({
          success: true,
          sync_id: "sync-q2",
          locations_synced: payload.locations.length,
          reviews_synced: payload.reviews.length,
          questions_synced: payload.questions.length,
        }),
      );

      const result = await performTransactionalSync("acc-1", true);
      expect(result.success).toBe(true);
      const payload: SyncTransactionPayload =
        runSyncTransactionWithRetry.mock.calls[0][1];
      const q = payload.questions[0];
      expect(q.status).toBe("answered");
      expect(q.answer_text).toBe("A1"); // first answer picked
      expect(q.answer_author).toBeNull(); // first has null displayName -> null
      expect(q.answer_date).toBeNull(); // missing updateTime -> null
    });
  });

  it("ensures publishSyncProgress order on success and exact cache refresh count", async () => {
    const locationsResponse = {
      locations: [
        {
          name: "accounts/999/locations/l1",
          title: "L1",
          openInfo: { status: "OPEN" },
        },
      ],
    };
    const reviewsResponse = { reviews: [] };
    const questionsResponse = { questions: [] };
    (global.fetch as jest.Mock).mockImplementation(
      (input: RequestInfo | URL) => {
        const url = String(input);
        if (
          url.includes("/locations") &&
          !url.includes("/reviews") &&
          !url.includes("/questions")
        ) {
          return Promise.resolve({
            ok: true,
            json: async () => locationsResponse,
          });
        }
        if (url.includes("/reviews"))
          return Promise.resolve({
            ok: true,
            json: async () => reviewsResponse,
          });
        if (url.includes("/questions"))
          return Promise.resolve({
            ok: true,
            json: async () => questionsResponse,
          });
        return Promise.resolve({ ok: true, json: async () => ({}) });
      },
    );

    runSyncTransactionWithRetry.mockResolvedValue({
      success: true,
      sync_id: "sync-order",
      locations_synced: 1,
      reviews_synced: 0,
      questions_synced: 0,
    });

    await performTransactionalSync("acc-1", true);

    const sequence = publishSyncProgress.mock.calls.map(
      (c) => `${c[0].stage}:${c[0].status}`,
    );
    // expected sequence subset (exact order)
    const expected = [
      "init:running",
      "locations_fetch:completed",
      "reviews_fetch:completed",
      "questions_fetch:completed",
      "transaction:running",
      "transaction:completed",
      "cache_refresh:running",
      "cache_refresh:completed",
      "complete:completed",
    ];
    // ensure expected is a subsequence of sequence
    let idx = -1;
    for (const step of expected) {
      const found = sequence.indexOf(step, idx + 1);
      expect(found).toBeGreaterThan(idx);
      idx = found;
    }

    expect(refreshCache).toHaveBeenCalledTimes(1);
    expect(refreshCache).toHaveBeenCalledWith("dashboard:overview", "user-1");
  });

  it("supports pagination (extra fetch calls) and empty dataset", async () => {
    // Two pages for locations, second page empty
    const firstPage = {
      locations: [
        {
          name: "accounts/999/locations/l1",
          title: "L1",
          openInfo: { status: "OPEN" },
        },
      ],
      nextPageToken: "p2",
    };
    const secondPage = { locations: [] };
    const reviewsEmpty = { reviews: [] };
    const questionsEmpty = { questions: [] };

    (global.fetch as jest.Mock).mockImplementation(
      (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        if (url.pathname.endsWith("/locations")) {
          if (url.searchParams.get("pageToken") === "p2") {
            return Promise.resolve({ ok: true, json: async () => secondPage });
          }
          return Promise.resolve({ ok: true, json: async () => firstPage });
        }
        if (url.pathname.includes("/reviews"))
          return Promise.resolve({ ok: true, json: async () => reviewsEmpty });
        if (url.pathname.includes("/questions"))
          return Promise.resolve({
            ok: true,
            json: async () => questionsEmpty,
          });
        return Promise.resolve({ ok: true, json: async () => ({}) });
      },
    );

    runSyncTransactionWithRetry.mockImplementation(
      async (_: any, payload: SyncTransactionPayload) => ({
        success: true,
        sync_id: "sync-page",
        locations_synced: payload.locations.length,
        reviews_synced: payload.reviews.length,
        questions_synced: payload.questions.length,
      }),
    );

    const result = await performTransactionalSync("acc-1", true);
    expect(result.success).toBe(true);

    // fetch calls for locations should be two
    const locCalls = (global.fetch as jest.Mock).mock.calls.filter(
      ([u]: any[]) =>
        String(u).includes("/locations") &&
        !String(u).includes("/reviews") &&
        !String(u).includes("/questions"),
    );
    expect(locCalls.length).toBe(2);
  });

  it("empty dataset end-to-end yields empty arrays in transaction", async () => {
    (global.fetch as jest.Mock).mockImplementation(
      (input: RequestInfo | URL) => {
        const url = String(input);
        if (
          url.includes("/locations") &&
          !url.includes("/reviews") &&
          !url.includes("/questions")
        ) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ locations: [] }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      },
    );

    runSyncTransactionWithRetry.mockImplementation(
      async (_: any, payload: SyncTransactionPayload) => ({
        success: true,
        sync_id: "sync-empty",
        locations_synced: payload.locations.length,
        reviews_synced: payload.reviews.length,
        questions_synced: payload.questions.length,
      }),
    );

    const result = await performTransactionalSync("acc-1", true);
    expect(result).toEqual({
      success: true,
      sync_id: "sync-empty",
      locations_synced: 0,
      reviews_synced: 0,
      questions_synced: 0,
    });

    const payload: SyncTransactionPayload =
      runSyncTransactionWithRetry.mock.calls[0][1];
    expect(payload.locations).toHaveLength(0);
    expect(payload.reviews).toHaveLength(0);
    expect(payload.questions).toHaveLength(0);
  });

  it("does not hit unexpected endpoint URLs (strict mock)", async () => {
    const locationsResponse = {
      locations: [
        {
          name: "accounts/999/locations/l1",
          title: "L1",
          openInfo: { status: "OPEN" },
        },
      ],
    };
    const reviewsResponse = { reviews: [] };
    const questionsResponse = { questions: [] };

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
            "https://mybusiness.googleapis.com/v4/accounts/999/locations/l1/reviews",
          )
        ) {
          return Promise.resolve({
            ok: true,
            json: async () => reviewsResponse,
          });
        }
        if (
          url.startsWith(
            "https://mybusinessqanda.googleapis.com/v1/accounts/999/locations/l1/questions",
          )
        ) {
          return Promise.resolve({
            ok: true,
            json: async () => questionsResponse,
          });
        }
        throw new Error("Unexpected URL: " + url);
      },
    );

    runSyncTransactionWithRetry.mockResolvedValue({
      success: true,
      sync_id: "sync-strict",
      locations_synced: 1,
      reviews_synced: 0,
      questions_synced: 0,
    });
    await expect(
      performTransactionalSync("acc-1", true),
    ).resolves.toBeDefined();
    // If any unexpected URL was called, the mock would throw and the test would fail
  });

  it("runs two syncs concurrently and maintains correct behavior and progress", async () => {
    const locationsResponse = {
      locations: [
        {
          name: "accounts/999/locations/l1",
          title: "L1",
          openInfo: { status: "OPEN" },
        },
      ],
    };
    const reviewsResponse = { reviews: [] };
    const questionsResponse = { questions: [] };

    (global.fetch as jest.Mock).mockImplementation(
      (input: RequestInfo | URL) => {
        const url = String(input);
        if (
          url.includes("/locations") &&
          !url.includes("/reviews") &&
          !url.includes("/questions")
        ) {
          return Promise.resolve({
            ok: true,
            json: async () => locationsResponse,
          });
        }
        if (url.includes("/reviews"))
          return Promise.resolve({
            ok: true,
            json: async () => reviewsResponse,
          });
        if (url.includes("/questions"))
          return Promise.resolve({
            ok: true,
            json: async () => questionsResponse,
          });
        return Promise.resolve({ ok: true, json: async () => ({}) });
      },
    );

    runSyncTransactionWithRetry.mockResolvedValue({
      success: true,
      sync_id: "sync-conc",
      locations_synced: 1,
      reviews_synced: 0,
      questions_synced: 0,
    });

    const [r1, r2] = await Promise.all([
      performTransactionalSync("acc-1", true),
      performTransactionalSync("acc-1", false),
    ]);

    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    expect(runSyncTransactionWithRetry).toHaveBeenCalledTimes(2);
    expect(refreshCache).toHaveBeenCalledTimes(2);

    const stages = publishSyncProgress.mock.calls.map((c) => c[0]?.stage);
    // At least some events include questions_fetch (first call) and some omit it (second call)
    expect(stages.includes("questions_fetch")).toBe(true);
  });
});
