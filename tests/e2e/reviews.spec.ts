import { test, expect } from '@playwright/test';

test.describe('Reviews Management', () => {
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

    // Mock reviews data
    await page.route('**/api/reviews*', route => {
      const url = new URL(route.request().url());
      const status = url.searchParams.get('status');
      
      const allReviews = [
        {
          id: '1',
          reviewer_name: 'John Doe',
          rating: 5,
          review_text: 'Excellent service and friendly staff!',
          created_at: new Date().toISOString(),
          responded: false,
          location_name: 'Main Branch',
        },
        {
          id: '2',
          reviewer_name: 'Jane Smith',
          rating: 3,
          review_text: 'Average experience, could be better.',
          created_at: new Date().toISOString(),
          responded: true,
          response_text: 'Thank you for your feedback.',
          location_name: 'Downtown Location',
        },
        {
          id: '3',
          reviewer_name: 'Mike Johnson',
          rating: 1,
          review_text: 'Very disappointed with the service.',
          created_at: new Date().toISOString(),
          responded: false,
          location_name: 'Airport Branch',
        },
      ];

      let filteredReviews = allReviews;
      if (status === 'pending') {
        filteredReviews = allReviews.filter(r => !r.responded);
      } else if (status === 'responded') {
        filteredReviews = allReviews.filter(r => r.responded);
      }

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reviews: filteredReviews,
          total: filteredReviews.length,
        }),
      });
    });

    // Navigate to reviews
    await page.goto('/reviews');
  });

  test('should display list of reviews', async ({ page }) => {
    // Wait for reviews to load
    await page.waitForSelector('text=John Doe', { timeout: 10000 });

    // Check for review elements
    await expect(page.locator('text=John Doe')).toBeVisible();
    await expect(page.locator('text=Excellent service and friendly staff!')).toBeVisible();
    await expect(page.locator('text=Jane Smith')).toBeVisible();
    await expect(page.locator('text=Mike Johnson')).toBeVisible();
  });

  test('should filter reviews by status', async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('text=John Doe');

    // Click on pending filter
    await page.click('text=Pending');

    // Should only show pending reviews
    await expect(page.locator('text=John Doe')).toBeVisible();
    await expect(page.locator('text=Mike Johnson')).toBeVisible();
    await expect(page.locator('text=Jane Smith')).not.toBeVisible();

    // Click on responded filter
    await page.click('text=Responded');

    // Should only show responded reviews
    await expect(page.locator('text=Jane Smith')).toBeVisible();
    await expect(page.locator('text=John Doe')).not.toBeVisible();
  });

  test('should open review reply modal', async ({ page }) => {
    // Wait for reviews to load
    await page.waitForSelector('text=John Doe');

    // Click reply button on first review
    const replyButton = page.locator('button:has-text("Reply")').first();
    await replyButton.click();

    // Should show reply modal
    await expect(page.locator('dialog, [role="dialog"]')).toBeVisible();
    await expect(page.locator('textarea')).toBeVisible();
    await expect(page.locator('text=/generate.*ai/i')).toBeVisible();
  });

  test('should generate AI response', async ({ page }) => {
    // Mock AI response generation
    await page.route('**/api/reviews/generate-response', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: 'Thank you for your wonderful feedback! We\'re delighted to hear you had an excellent experience with our team. We look forward to serving you again soon!',
        }),
      });
    });

    // Wait for reviews and click reply
    await page.waitForSelector('text=John Doe');
    await page.locator('button:has-text("Reply")').first().click();

    // Click generate with AI
    await page.click('text=/generate.*ai/i');

    // Should populate textarea with AI response
    const textarea = page.locator('textarea');
    await expect(textarea).toHaveValue(/Thank you for your wonderful feedback/);
  });

  test('should submit review response', async ({ page }) => {
    // Mock response submission
    await page.route('**/api/reviews/*/respond', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
        }),
      });
    });

    // Open reply modal
    await page.waitForSelector('text=John Doe');
    await page.locator('button:has-text("Reply")').first().click();

    // Type response
    await page.fill('textarea', 'Thank you for your feedback!');

    // Submit response
    await page.click('button:has-text("Send")');

    // Should show success message
    await expect(page.locator('text=/success|sent/i')).toBeVisible({ timeout: 10000 });

    // Modal should close
    await expect(page.locator('dialog, [role="dialog"]')).not.toBeVisible();
  });

  test('should display sentiment analysis', async ({ page }) => {
    // Mock sentiment data
    await page.route('**/api/reviews/sentiment*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sentiment: {
            positive: 50,
            neutral: 30,
            negative: 20,
            total: 100,
          },
          hotTopics: [
            { topic: 'service', count: 25 },
            { topic: 'staff', count: 20 },
            { topic: 'price', count: 15 },
          ],
        }),
      });
    });

    // Look for sentiment section
    const sentimentSection = page.locator('text=/sentiment|analysis/i');
    if (await sentimentSection.isVisible()) {
      // Should show sentiment breakdown
      await expect(page.locator('text=50%')).toBeVisible();
      await expect(page.locator('text=/positive/i')).toBeVisible();
      
      // Should show hot topics
      await expect(page.locator('text=service')).toBeVisible();
    }
  });

  test('should handle pagination', async ({ page }) => {
    // Mock paginated response
    let currentPage = 1;
    await page.route('**/api/reviews*', route => {
      const url = new URL(route.request().url());
      const pageParam = url.searchParams.get('page');
      if (pageParam) currentPage = parseInt(pageParam);

      const reviews = currentPage === 1 
        ? [
            { id: '1', reviewer_name: 'Page 1 Review', rating: 5, review_text: 'First page', created_at: new Date().toISOString() },
          ]
        : [
            { id: '2', reviewer_name: 'Page 2 Review', rating: 4, review_text: 'Second page', created_at: new Date().toISOString() },
          ];

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reviews,
          total: 50,
          page: currentPage,
          pageSize: 25,
        }),
      });
    });

    // Wait for initial page
    await page.waitForSelector('text=Page 1 Review');

    // Click next page if pagination exists
    const nextButton = page.locator('button:has-text("Next"), button[aria-label="Next page"]');
    if (await nextButton.isVisible()) {
      await nextButton.click();

      // Should show second page
      await expect(page.locator('text=Page 2 Review')).toBeVisible();
      await expect(page.locator('text=Page 1 Review')).not.toBeVisible();
    }
  });

  test('should search reviews', async ({ page }) => {
    // Type in search box
    const searchInput = page.locator('input[placeholder*="search" i]');
    await searchInput.fill('excellent');

    // Should filter results
    await expect(page.locator('text=Excellent service and friendly staff!')).toBeVisible();
    await expect(page.locator('text=Average experience')).not.toBeVisible();
  });

  test('should handle bulk actions', async ({ page }) => {
    // Wait for reviews
    await page.waitForSelector('text=John Doe');

    // Select multiple reviews if checkboxes exist
    const checkboxes = page.locator('input[type="checkbox"]');
    if (await checkboxes.first().isVisible()) {
      // Select first two reviews
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();

      // Should show bulk actions
      await expect(page.locator('text=/selected|bulk/i')).toBeVisible();

      // Click bulk reply if available
      const bulkReplyButton = page.locator('button:has-text(/bulk.*reply/i)');
      if (await bulkReplyButton.isVisible()) {
        await bulkReplyButton.click();

        // Should show bulk reply modal
        await expect(page.locator('dialog, [role="dialog"]')).toBeVisible();
      }
    }
  });
});

test.describe('Review Response Templates', () => {
  test('should display response templates', async ({ page }) => {
    // Navigate to reviews
    await page.goto('/reviews');

    // Open reply modal
    await page.waitForSelector('button:has-text("Reply")');
    await page.locator('button:has-text("Reply")').first().click();

    // Look for templates button
    const templatesButton = page.locator('button:has-text(/template/i)');
    if (await templatesButton.isVisible()) {
      await templatesButton.click();

      // Should show template options
      await expect(page.locator('text=/thank.*feedback/i')).toBeVisible();
    }
  });
});

test.describe('Review Analytics', () => {
  test('should navigate to review analytics', async ({ page }) => {
    // Navigate to reviews
    await page.goto('/reviews');

    // Look for analytics link
    const analyticsButton = page.locator('a:has-text(/analytics/i), button:has-text(/analytics/i)');
    if (await analyticsButton.isVisible()) {
      await analyticsButton.click();

      // Should navigate to analytics page
      await expect(page).toHaveURL(/analytics/);
    }
  });
});
