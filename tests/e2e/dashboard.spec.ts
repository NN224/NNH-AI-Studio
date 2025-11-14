import { test, expect } from '@playwright/test';

test.describe('Dashboard Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/auth/v1/user', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'mock-user-id',
          email: 'test@example.com',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        }),
      });
    });

    // Set auth cookie
    await page.context().addCookies([
      {
        name: 'supabase-auth-token',
        value: 'mock-auth-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    // Mock dashboard data
    await page.route('**/api/dashboard/stats', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalLocations: 5,
          totalReviews: 150,
          averageRating: 4.5,
          responseRate: 0.85,
          healthScore: 92,
        }),
      });
    });

    // Navigate to dashboard
    await page.goto('/dashboard');
  });

  test('should display dashboard stats', async ({ page }) => {
    // Wait for stats to load
    await page.waitForSelector('text=Locations', { timeout: 10000 });

    // Check for key stats
    await expect(page.locator('text=5').first()).toBeVisible(); // Total locations
    await expect(page.locator('text=150')).toBeVisible(); // Total reviews
    await expect(page.locator('text=4.5')).toBeVisible(); // Average rating
    await expect(page.locator('text=85%')).toBeVisible(); // Response rate
    await expect(page.locator('text=92')).toBeVisible(); // Health score
  });

  test('should show GMB connection banner if not connected', async ({ page }) => {
    // Mock no GMB connection
    await page.route('**/api/gmb/status', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          connected: false,
        }),
      });
    });

    await page.reload();

    // Should show connection banner
    await expect(page.locator('text=/connect.*google.*business/i')).toBeVisible();
  });

  test('should refresh data on sync button click', async ({ page }) => {
    let requestCount = 0;
    
    // Track API calls
    await page.route('**/api/dashboard/stats', route => {
      requestCount++;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalLocations: requestCount === 1 ? 5 : 6,
          totalReviews: 150,
          averageRating: 4.5,
          responseRate: 0.85,
          healthScore: 92,
        }),
      });
    });

    // Wait for initial load
    await page.waitForSelector('text=Locations');

    // Click sync button
    const syncButton = page.locator('button:has-text("Sync")').first();
    if (await syncButton.isVisible()) {
      await syncButton.click();

      // Should update data
      await expect(page.locator('text=6')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should navigate between dashboard tabs', async ({ page }) => {
    // Check for navigation menu
    const sidebar = page.locator('nav, aside').first();
    
    // Navigate to Locations
    await sidebar.locator('text=Locations').click();
    await expect(page).toHaveURL(/locations/);

    // Navigate to Reviews
    await sidebar.locator('text=Reviews').click();
    await expect(page).toHaveURL(/reviews/);

    // Navigate to Questions
    await sidebar.locator('text=Questions').click();
    await expect(page).toHaveURL(/questions/);

    // Navigate back to Dashboard
    await sidebar.locator('text=Dashboard').click();
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should display recent activity', async ({ page }) => {
    // Mock recent activity
    await page.route('**/api/dashboard/activity', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          activities: [
            {
              id: '1',
              type: 'review',
              title: 'New 5-star review',
              timestamp: new Date().toISOString(),
            },
            {
              id: '2',
              type: 'question',
              title: 'Customer asked about hours',
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });
    });

    // Look for activity feed
    const activitySection = page.locator('text=/recent|activity/i').first();
    if (await activitySection.isVisible()) {
      await expect(page.locator('text=New 5-star review')).toBeVisible();
      await expect(page.locator('text=Customer asked about hours')).toBeVisible();
    }
  });

  test('should handle loading states', async ({ page }) => {
    // Delay API response
    await page.route('**/api/dashboard/stats', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalLocations: 5,
          totalReviews: 150,
          averageRating: 4.5,
          responseRate: 0.85,
          healthScore: 92,
        }),
      });
    });

    await page.reload();

    // Should show loading state
    await expect(page.locator('text=/loading|spinner|skeleton/i').first()).toBeVisible();

    // Should eventually show data
    await expect(page.locator('text=Locations')).toBeVisible({ timeout: 10000 });
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/dashboard/stats', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal Server Error',
        }),
      });
    });

    await page.reload();

    // Should show error state
    await expect(page.locator('text=/error|failed|problem/i').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Dashboard Responsiveness', () => {
  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Should show mobile menu button
    const menuButton = page.locator('button[aria-label*="menu"], button:has-text("☰")').first();
    await expect(menuButton).toBeVisible();

    // Click menu button
    await menuButton.click();

    // Should show navigation drawer
    await expect(page.locator('nav, aside').first()).toBeVisible();
  });

  test('should be responsive on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Check layout adjustments
    const sidebar = page.locator('nav, aside').first();
    await expect(sidebar).toBeVisible();
  });
});

test.describe('Dashboard Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/dashboard');
    await page.waitForSelector('text=Locations', { timeout: 10000 });

    const loadTime = Date.now() - startTime;

    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should cache data appropriately', async ({ page }) => {
    let apiCallCount = 0;

    // Track API calls
    await page.route('**/api/dashboard/stats', route => {
      apiCallCount++;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalLocations: 5,
          totalReviews: 150,
          averageRating: 4.5,
          responseRate: 0.85,
          healthScore: 92,
        }),
      });
    });

    // Initial load
    await page.goto('/dashboard');
    await page.waitForSelector('text=Locations');

    const initialCallCount = apiCallCount;

    // Navigate away and back
    await page.goto('/locations');
    await page.goto('/dashboard');

    // Should use cached data (no additional API call immediately)
    expect(apiCallCount).toBe(initialCallCount);
  });
});
