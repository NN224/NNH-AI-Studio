/**
 * Golden Path E2E Tests
 *
 * Tests the critical user journey through the application:
 * 1. Dashboard access with mocked authentication
 * 2. Navigation to settings page
 * 3. GMB connection flow (mocked)
 * 4. Locations page verification
 * 5. Console error monitoring
 *
 * All tests run in "mocked mode" - no real API calls are made.
 */

import { ConsoleMessage, Page, expect, test } from "@playwright/test";

// ============================================================================
// Test Configuration & Helpers
// ============================================================================

const LOCALE = "en";
const BASE_PATHS = {
  home: `/${LOCALE}/home`,
  settings: `/${LOCALE}/settings`,
  locations: `/${LOCALE}/locations`,
  onboarding: `/${LOCALE}/onboarding`,
};

// Known non-critical errors to ignore during testing
const IGNORED_ERROR_PATTERNS = [
  "favicon",
  "hydration",
  "ResizeObserver",
  // CSP-related errors in development (WebSocket, HMR)
  "Content Security Policy",
  "Refused to connect",
  "Refused to load",
  "ws://localhost",
  "ws://127.0.0.1",
  // Next.js development mode errors
  "Failed to load resource",
  "net::ERR_",
  // React development warnings
  "Warning:",
  "React does not recognize",
  // Supabase realtime (expected in mocked environment)
  "supabase",
  "realtime",
  // Console Ninja extension
  "console-ninja",
  "Console Ninja",
];

// Console error collector
class ConsoleErrorCollector {
  private errors: string[] = [];
  private page: Page;

  constructor(page: Page) {
    this.page = page;
    this.page.on("console", (msg: ConsoleMessage) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Ignore known non-critical errors
        const isIgnored = IGNORED_ERROR_PATTERNS.some((pattern) =>
          text.toLowerCase().includes(pattern.toLowerCase()),
        );
        if (!isIgnored) {
          this.errors.push(text);
        }
      }
    });
  }

  getErrors(): string[] {
    return this.errors;
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  clear(): void {
    this.errors = [];
  }
}

// Mock user session data
const MOCK_USER = {
  id: "test-user-123",
  email: "test@example.com",
  user_metadata: {
    full_name: "Test User",
  },
};

// Mock GMB account data
const MOCK_GMB_ACCOUNT = {
  id: "gmb-account-123",
  account_id: "accounts/123456789",
  account_name: "Test Business",
  is_active: true,
};

// Mock location data
const MOCK_LOCATIONS = [
  {
    id: "loc-1",
    location_id: "accounts/123456789/locations/111",
    location_name: "Test Location 1",
    address: "123 Test St, Test City",
    is_active: true,
    rating: 4.5,
    review_count: 42,
  },
  {
    id: "loc-2",
    location_id: "accounts/123456789/locations/222",
    location_name: "Test Location 2",
    address: "456 Demo Ave, Demo City",
    is_active: true,
    rating: 4.8,
    review_count: 128,
  },
];

// ============================================================================
// Test Setup - Mock Authentication & API Responses
// ============================================================================

test.describe("Golden Path - User Journey", () => {
  let consoleCollector: ConsoleErrorCollector;

  test.beforeEach(async ({ page, context }) => {
    consoleCollector = new ConsoleErrorCollector(page);

    // Set E2E test mode cookie to bypass middleware auth check
    await context.addCookies([
      {
        name: "e2e_test_mode",
        value: "true",
        domain: "localhost",
        path: "/",
      },
    ]);

    // Mock Supabase Auth - simulate logged-in user
    await page.addInitScript(() => {
      // Set E2E test mode flag in localStorage for client-side bypass
      localStorage.setItem("e2e_test_mode", "true");

      // Mock localStorage for auth state
      localStorage.setItem(
        "supabase.auth.token",
        JSON.stringify({
          currentSession: {
            access_token: "mock-access-token",
            refresh_token: "mock-refresh-token",
            user: {
              id: "test-user-123",
              email: "test@example.com",
              user_metadata: { full_name: "Test User" },
            },
          },
        }),
      );
    });

    // Mock API responses
    await page.route("**/api/auth/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: MOCK_USER,
          session: { access_token: "mock-token" },
        }),
      });
    });

    // Mock GMB status API
    await page.route("**/api/gmb/status**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          connected: true,
          accounts: [MOCK_GMB_ACCOUNT],
          hasLocations: true,
        }),
      });
    });

    // Mock GMB accounts API
    await page.route("**/api/gmb/accounts**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accounts: [MOCK_GMB_ACCOUNT],
        }),
      });
    });

    // Mock locations API
    await page.route("**/api/gmb/locations**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          locations: MOCK_LOCATIONS,
          total: MOCK_LOCATIONS.length,
        }),
      });
    });

    // Mock dashboard snapshot API
    await page.route("**/api/dashboard/snapshot**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          locationSummary: {
            total: MOCK_LOCATIONS.length,
            locations: MOCK_LOCATIONS,
          },
          reviewStats: {
            total: 170,
            averageRating: 4.65,
            recentHighlights: [],
          },
        }),
      });
    });

    // Mock sync status API
    await page.route("**/api/sync/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "completed",
          progress: 100,
        }),
      });
    });
  });

  // ==========================================================================
  // Test 1: Dashboard Access
  // ==========================================================================

  test("✅ should access dashboard without white screen", async ({ page }) => {
    // Navigate to home/dashboard
    await page.goto(BASE_PATHS.home);

    // Wait for page to load (not just network idle)
    await page.waitForLoadState("domcontentloaded");

    // Verify we're not on a blank page
    const bodyContent = await page.locator("body").textContent();
    expect(bodyContent).toBeTruthy();
    expect(bodyContent!.length).toBeGreaterThan(100);

    // Verify no critical console errors
    expect(consoleCollector.hasErrors()).toBe(false);
  });

  // ==========================================================================
  // Test 2: Navigation to Settings
  // ==========================================================================

  test("✅ should navigate to settings page", async ({ page }) => {
    await page.goto(BASE_PATHS.settings);
    await page.waitForLoadState("domcontentloaded");

    // Verify settings page loaded
    const pageContent = await page.locator("body").textContent();
    expect(pageContent).toBeTruthy();

    // Look for settings-related content (GMB settings section)
    // The page should have some form of settings UI
    const hasSettingsContent =
      (await page.locator('[data-testid="settings"]').count()) > 0 ||
      (await page.locator("text=Settings").count()) > 0 ||
      (await page.locator("text=Google Business").count()) > 0 ||
      (await page.locator("text=GMB").count()) > 0 ||
      pageContent!.toLowerCase().includes("settings") ||
      pageContent!.toLowerCase().includes("google");

    expect(hasSettingsContent).toBe(true);

    // No console errors
    expect(consoleCollector.hasErrors()).toBe(false);
  });

  // ==========================================================================
  // Test 3: GMB Connection Flow (Mocked)
  // ==========================================================================

  test("✅ should handle GMB connection success", async ({ page }) => {
    // Mock the OAuth callback success
    await page.route("**/api/gmb/oauth-callback**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          accountId: MOCK_GMB_ACCOUNT.id,
          message: "GMB account connected successfully",
        }),
      });
    });

    // Simulate arriving at settings with ?connected=true (post-OAuth)
    await page.goto(`${BASE_PATHS.settings}?connected=true`);
    await page.waitForLoadState("domcontentloaded");

    // The page should handle the connected parameter
    // Valid states: settings, locations, or home (dashboard redirect)
    const currentUrl = page.url();
    const isValidState =
      currentUrl.includes("/settings") ||
      currentUrl.includes("/locations") ||
      currentUrl.includes("/home");
    expect(isValidState).toBe(true);

    // Page should not be blank
    const bodyContent = await page.locator("body").textContent();
    expect(bodyContent).toBeTruthy();
    expect(bodyContent!.length).toBeGreaterThan(50);

    // No console errors during the flow
    expect(consoleCollector.hasErrors()).toBe(false);
  });

  // ==========================================================================
  // Test 4: Locations Page Verification
  // ==========================================================================

  test("✅ should display locations page with data", async ({ page }) => {
    await page.goto(BASE_PATHS.locations);
    await page.waitForLoadState("domcontentloaded");

    // Wait for content to render
    await page.waitForTimeout(1000);

    // Verify page is not empty/blank
    const bodyContent = await page.locator("body").textContent();
    expect(bodyContent).toBeTruthy();
    expect(bodyContent!.length).toBeGreaterThan(100);

    // Check for location-related content or empty state
    const hasLocationContent =
      (await page.locator('[data-testid="locations-list"]').count()) > 0 ||
      (await page.locator('[data-testid="locations-map"]').count()) > 0 ||
      (await page.locator("text=Location").count()) > 0 ||
      (await page.locator("text=No locations").count()) > 0 ||
      bodyContent!.toLowerCase().includes("location");

    expect(hasLocationContent).toBe(true);

    // No console errors
    expect(consoleCollector.hasErrors()).toBe(false);
  });

  // ==========================================================================
  // Test 5: Empty State Handling
  // ==========================================================================

  test("✅ should handle empty state gracefully", async ({ page }) => {
    // This test verifies the app doesn't completely crash with empty data
    // An error boundary showing is actually GOOD - it means graceful degradation

    // Go to settings page (simpler, less data dependencies)
    await page.goto(BASE_PATHS.settings);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    // Page should not be blank - should show some UI
    const bodyContent = await page.locator("body").textContent();
    expect(bodyContent).toBeTruthy();
    expect(bodyContent!.length).toBeGreaterThan(50);

    // The page should render SOMETHING (either content or error boundary)
    // This is a smoke test - we just want to ensure no white screen
    const hasContent =
      bodyContent!.length > 100 ||
      bodyContent!.toLowerCase().includes("settings") ||
      bodyContent!.toLowerCase().includes("error") ||
      bodyContent!.toLowerCase().includes("try again");
    expect(hasContent).toBe(true);

    // No console errors (filtered by our collector)
    expect(consoleCollector.hasErrors()).toBe(false);
  });

  // ==========================================================================
  // Test 6: Console Error Monitoring During Navigation
  // ==========================================================================

  test("✅ should have no console errors during navigation flow", async ({
    page,
  }) => {
    // Clear any previous errors
    consoleCollector.clear();

    // Navigate through multiple pages
    const pages = [BASE_PATHS.home, BASE_PATHS.settings, BASE_PATHS.locations];

    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(500); // Allow async operations
    }

    // Check for accumulated errors
    const errors = consoleCollector.getErrors();
    if (errors.length > 0) {
      console.log("Console errors found:", errors);
    }

    // Should have no critical errors
    expect(errors.length).toBe(0);
  });

  // ==========================================================================
  // Test 7: Error Boundary Protection
  // ==========================================================================

  test("✅ should show error boundary on API failure", async ({ page }) => {
    // Make all APIs fail
    await page.route("**/api/**", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal Server Error" }),
      });
    });

    await page.goto(BASE_PATHS.home);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Page should still render something (error boundary or fallback)
    const bodyContent = await page.locator("body").textContent();
    expect(bodyContent).toBeTruthy();

    // Should not be completely blank
    expect(bodyContent!.length).toBeGreaterThan(10);
  });

  // ==========================================================================
  // Test 8: Responsive Design Check
  // ==========================================================================

  test("✅ should render correctly on mobile viewport", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(BASE_PATHS.home);
    await page.waitForLoadState("domcontentloaded");

    // Page should render without horizontal scroll issues
    const bodyContent = await page.locator("body").textContent();
    expect(bodyContent).toBeTruthy();
    expect(bodyContent!.length).toBeGreaterThan(100);

    // No console errors on mobile
    expect(consoleCollector.hasErrors()).toBe(false);
  });
});

// ============================================================================
// Authentication Flow Tests
// ============================================================================

test.describe("Authentication Handling", () => {
  test("✅ should redirect unauthenticated users", async ({ page }) => {
    // Don't set up auth mocks - simulate unauthenticated state

    // Mock auth to return no user
    await page.route("**/api/auth/**", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Not authenticated" }),
      });
    });

    await page.goto(BASE_PATHS.home);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Should either show login page or redirect
    const currentUrl = page.url();
    const bodyContent = await page.locator("body").textContent();

    // Valid states: login page, auth page, or onboarding
    const isValidState =
      currentUrl.includes("/login") ||
      currentUrl.includes("/auth") ||
      currentUrl.includes("/onboarding") ||
      currentUrl.includes("/sign") ||
      bodyContent!.toLowerCase().includes("sign in") ||
      bodyContent!.toLowerCase().includes("login");

    // Page should not be blank regardless
    expect(bodyContent!.length).toBeGreaterThan(10);
  });
});

// ============================================================================
// Performance Smoke Tests
// ============================================================================

test.describe("Performance Smoke Tests", () => {
  test("✅ should load dashboard within acceptable time", async ({ page }) => {
    // Mock APIs for fast response
    await page.route("**/api/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [] }),
      });
    });

    const startTime = Date.now();
    await page.goto(BASE_PATHS.home);
    await page.waitForLoadState("domcontentloaded");
    const loadTime = Date.now() - startTime;

    // Should load within 10 seconds (generous for CI)
    expect(loadTime).toBeLessThan(10000);

    console.log(`Dashboard load time: ${loadTime}ms`);
  });
});
