/**
 * GMB Sync Transaction Integration Tests
 */

import type { SyncTransactionPayload } from "@/lib/supabase/transactions";

let transactionState: "idle" | "started" | "committed" | "rolled_back" = "idle";
let shouldFailTransaction = false;
let capturedPayload: SyncTransactionPayload | null = null;

const runSyncTransactionWithRetry = jest
  .fn()
  .mockImplementation(
    async (_supabase: unknown, payload: SyncTransactionPayload) => {
      capturedPayload = payload;
      transactionState = "started";
      if (shouldFailTransaction) {
        transactionState = "rolled_back";
        throw new Error("Transaction failed - simulated error");
      }
      transactionState = "committed";
      // Return SyncTransactionResult structure
      return {
        success: true,
        sync_id: "test-sync-id",
        locations_synced: payload.locations?.length ?? 0,
        reviews_synced: payload.reviews?.length ?? 0,
        questions_synced: payload.questions?.length ?? 0,
        posts_synced: 0,
        media_synced: 0,
      };
    },
  );

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
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
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: "acc-1", user_id: "user-1", account_id: "accounts/999" },
          error: null,
        }),
      })),
    }),
  ),
  createAdminClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: "acc-1", user_id: "user-1", account_id: "accounts/999" },
        error: null,
      }),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: "acc-1", user_id: "user-1", account_id: "accounts/999" },
        error: null,
      }),
    })),
  })),
}));

jest.mock("@/lib/supabase/transactions", () => ({
  runSyncTransactionWithRetry: (...args: unknown[]) =>
    runSyncTransactionWithRetry(...args),
}));

jest.mock("@/lib/gmb/helpers", () => ({
  getValidAccessToken: jest.fn().mockResolvedValue("mock-access-token"),
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

const mockPublishSyncProgress = jest.fn();
const mockRefreshCache = jest.fn().mockResolvedValue(undefined);
jest.mock("@/lib/cache/cache-manager", () => ({
  CacheBucket: { DASHBOARD_OVERVIEW: "dashboard:overview" },
  publishSyncProgress: (...args: unknown[]) => mockPublishSyncProgress(...args),
  refreshCache: (...args: unknown[]) => mockRefreshCache(...args),
}));

jest.mock("@/lib/cache/gmb-cache", () => ({
  invalidateGMBCache: jest.fn().mockResolvedValue(undefined),
}));

const mockLogAction = jest.fn().mockResolvedValue(undefined);
const mockTrackSyncResult = jest.fn().mockResolvedValue(undefined);
jest.mock("@/lib/monitoring/audit", () => ({
  logAction: (...args: unknown[]) => mockLogAction(...args),
}));
jest.mock("@/lib/monitoring/metrics", () => ({
  trackSyncResult: (...args: unknown[]) => mockTrackSyncResult(...args),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

import { performTransactionalSync } from "@/server/actions/gmb-sync";

function generateMockGoogleLocations(count: number) {
  return {
    locations: Array.from({ length: count }, (_, i) => ({
      name: `accounts/999/locations/loc-${i}`,
      title: `Test Location ${i + 1}`,
      openInfo: { status: "OPEN" },
    })),
  };
}

function setupFetchMock(options: {
  locations?: ReturnType<typeof generateMockGoogleLocations>;
  failOnLocations?: boolean;
}) {
  mockFetch.mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    if (
      url.includes("/locations") &&
      !url.includes("/reviews") &&
      !url.includes("/questions")
    ) {
      if (options.failOnLocations) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: { message: "Server error" } }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(options.locations || { locations: [] }),
      });
    }
    if (url.includes("/reviews"))
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ reviews: [] }),
      });
    if (url.includes("/questions"))
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ questions: [] }),
      });
    if (url.includes("fetchMultiDailyMetricsTimeSeries"))
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ multiDailyMetricTimeSeries: [] }),
      });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

describe("GMB Sync Transaction Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    transactionState = "idle";
    shouldFailTransaction = false;
    capturedPayload = null;
    mockFetch.mockReset();
  });

  describe("Successful Sync Operations", () => {
    it("should process locations and pass them to transaction", async () => {
      const mockLocations = generateMockGoogleLocations(5);
      setupFetchMock({ locations: mockLocations });
      const result = await performTransactionalSync(
        "acc-1",
        false,
        false,
        false,
        false,
        false,
      );
      expect(result.success).toBe(true);
      expect(runSyncTransactionWithRetry).toHaveBeenCalled();
      // Verify the result contains synced locations count
      expect(result.locations_synced).toBe(5);
    });
  });

  describe("Error Handling", () => {
    it("should fail gracefully when Google API returns error", async () => {
      setupFetchMock({ failOnLocations: true });
      // The function throws when locations fetch fails
      await expect(
        performTransactionalSync("acc-1", false, false, false, false, false),
      ).rejects.toThrow();
      expect(mockTrackSyncResult).toHaveBeenCalledWith(
        "user-1",
        false,
        expect.any(Number),
      );
    });

    it("should rollback transaction on failure", async () => {
      const mockLocations = generateMockGoogleLocations(3);
      setupFetchMock({ locations: mockLocations });
      shouldFailTransaction = true;
      await expect(
        performTransactionalSync("acc-1", false, false, false, false, false),
      ).rejects.toThrow("Transaction failed");
      expect(transactionState).toBe("rolled_back");
    });
  });

  describe("Progress Tracking", () => {
    it("should emit progress events during sync", async () => {
      const mockLocations = generateMockGoogleLocations(2);
      setupFetchMock({ locations: mockLocations });
      await performTransactionalSync(
        "acc-1",
        false,
        false,
        false,
        false,
        false,
      );
      expect(mockPublishSyncProgress).toHaveBeenCalled();
      const stages = mockPublishSyncProgress.mock.calls.map(
        (call) => (call[0] as { stage: string })?.stage,
      );
      expect(stages).toContain("locations_fetch");
      expect(stages).toContain("complete");
    });
  });
});
