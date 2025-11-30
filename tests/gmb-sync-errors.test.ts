import type { SyncTransactionPayload } from "@/lib/supabase/transactions";

// Common mocks for this file
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

const helpers = {
  getValidAccessToken: jest.fn().mockResolvedValue("access-token"),
};
jest.mock("@/lib/gmb/helpers", () => ({
  getValidAccessToken: (...args: any[]) =>
    (helpers.getValidAccessToken as any)(...args),
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

describe("performTransactionalSync - error and exception handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
    helpers.getValidAccessToken.mockResolvedValue("access-token");
  });

  it("fails cleanly when locations endpoint 500 - emits error stage, no transaction, no cache refresh", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: "boom" } }),
    });

    await expect(performTransactionalSync("acc-1", true)).rejects.toThrow();

    // Progress events: error at locations_fetch and complete
    const stages = publishSyncProgress.mock.calls.map((c) => ({
      stage: c[0]?.stage,
      status: c[0]?.status,
    }));
    expect(stages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ stage: "locations_fetch", status: "error" }),
        expect.objectContaining({ stage: "complete", status: "error" }),
      ]),
    );

    expect(runSyncTransactionWithRetry).not.toHaveBeenCalled();
    expect(refreshCache).not.toHaveBeenCalled();
    expect(logAction).toHaveBeenCalledWith(
      "sync",
      "gmb_account",
      "acc-1",
      expect.objectContaining({ status: "failed", stage: "locations_fetch" }),
    );
    expect(trackSyncResult).toHaveBeenCalledWith(
      "user-1",
      false,
      expect.any(Number),
    );
  });

  it("continues when reviews endpoint 500 - skips reviews for that location and succeeds", async () => {
    const locationsResponse = {
      locations: [
        {
          name: "accounts/999/locations/l1",
          title: "L1",
          openInfo: { status: "OPEN" },
        },
      ],
    };
    (global.fetch as jest.Mock).mockImplementation(
      (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/reviews")) {
          return Promise.resolve({
            ok: false,
            json: async () => ({ error: { message: "nope" } }),
          });
        }
        if (url.includes("/questions")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ questions: [] }),
          });
        }
        if (url.includes("/locations")) {
          return Promise.resolve({
            ok: true,
            json: async () => locationsResponse,
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      },
    );

    runSyncTransactionWithRetry.mockResolvedValue({
      success: true,
      sync_id: "sync-ok",
      locations_synced: 1,
      reviews_synced: 0,
      questions_synced: 0,
    });

    const result = await performTransactionalSync("acc-1", true);
    expect(result.success).toBe(true);
    const payload: SyncTransactionPayload =
      runSyncTransactionWithRetry.mock.calls[0][1];
    expect(payload.reviews).toHaveLength(0);
    const stages = publishSyncProgress.mock.calls.map((c) => ({
      stage: c[0]?.stage,
      status: c[0]?.status,
    }));
    expect(stages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stage: "reviews_fetch",
          status: "completed",
        }),
      ]),
    );
  });

  it("continues when questions endpoint 500 - skips questions for that location and succeeds", async () => {
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
    (global.fetch as jest.Mock).mockImplementation(
      (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/questions")) {
          return Promise.resolve({
            ok: false,
            json: async () => ({ error: { message: "qfail" } }),
          });
        }
        if (url.includes("/reviews")) {
          return Promise.resolve({
            ok: true,
            json: async () => reviewsResponse,
          });
        }
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
        return Promise.resolve({ ok: true, json: async () => ({}) });
      },
    );

    runSyncTransactionWithRetry.mockResolvedValue({
      success: true,
      sync_id: "sync-ok",
      locations_synced: 1,
      reviews_synced: 0,
      questions_synced: 0,
    });
    const result = await performTransactionalSync("acc-1", true);
    expect(result.success).toBe(true);
    const payload: SyncTransactionPayload =
      runSyncTransactionWithRetry.mock.calls[0][1];
    expect(payload.questions).toHaveLength(0);
    const stages = publishSyncProgress.mock.calls.map((c) => ({
      stage: c[0]?.stage,
      status: c[0]?.status,
    }));
    expect(stages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stage: "questions_fetch",
          status: "completed",
        }),
      ]),
    );
  });

  it("handles malformed API responses (null/undefined arrays, missing fields) without throwing", async () => {
    const locationsResponse = { locations: null };
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
        if (url.includes("/reviews")) {
          return Promise.resolve({ ok: true, json: async () => ({}) }); // reviews undefined
        }
        if (url.includes("/questions")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ questions: [{ name: null, text: "bad" }] }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      },
    );

    runSyncTransactionWithRetry.mockResolvedValue({
      success: true,
      sync_id: "sync-malformed",
      locations_synced: 0,
      reviews_synced: 0,
      questions_synced: 0,
    });

    const result = await performTransactionalSync("acc-1", true);
    expect(result.success).toBe(true);
    const payload: SyncTransactionPayload =
      runSyncTransactionWithRetry.mock.calls[0][1];
    expect(payload.locations).toHaveLength(0);
    expect(payload.reviews).toHaveLength(0);
    expect(payload.questions).toHaveLength(0); // invalid question skipped due to missing id
  });

  it("fails when token retrieval fails - emits init error and no transaction", async () => {
    helpers.getValidAccessToken.mockRejectedValueOnce(
      new Error("token failed"),
    );
    // minimal fetch should not be called in this case, but even if it is, we ensure transaction not called
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    await expect(performTransactionalSync("acc-1", true)).rejects.toThrow(
      "token failed",
    );

    const stages = publishSyncProgress.mock.calls.map((c) => ({
      stage: c[0]?.stage,
      status: c[0]?.status,
    }));
    expect(stages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ stage: "init", status: "error" }),
        expect.objectContaining({ stage: "complete", status: "error" }),
      ]),
    );

    expect(runSyncTransactionWithRetry).not.toHaveBeenCalled();
    expect(refreshCache).not.toHaveBeenCalled();
    expect(logAction).toHaveBeenCalledWith(
      "sync",
      "gmb_account",
      "acc-1",
      expect.objectContaining({ status: "failed", stage: "init" }),
    );
    expect(trackSyncResult).toHaveBeenCalledWith(
      "user-1",
      false,
      expect.any(Number),
    );
  });
});
