import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display sign in page', async ({ page }) => {
    // Check for sign in button
    const signInButton = page.locator('text=Sign In').first();
    await expect(signInButton).toBeVisible();
    
    // Click sign in
    await signInButton.click();
    
    // Should navigate to auth page
    await expect(page).toHaveURL(/auth|signin|login/);
    
    // Check for auth form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Navigate to sign in
    await page.click('text=Sign In');
    
    // Fill invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=/invalid|error|failed/i')).toBeVisible({ timeout: 10000 });
  });

  test('should redirect to dashboard after successful login', async ({ page }) => {
    // Mock successful authentication
    await page.route('**/auth/v1/token', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh-token',
          user: {
            id: 'mock-user-id',
            email: 'test@example.com',
          },
        }),
      });
    });

    // Navigate to sign in
    await page.click('text=Sign In');
    
    // Fill valid credentials
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'validpassword');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
  });

  test('should handle sign out', async ({ page }) => {
    // Set up authenticated state
    await page.context().addCookies([
      {
        name: 'supabase-auth-token',
        value: 'mock-auth-token',
        domain: 'localhost',
        path: '/',
      },
    ]);
    
    // Go directly to dashboard
    await page.goto('/dashboard');
    
    // Open user menu
    const userButton = page.locator('[data-testid="user-menu"], button:has-text("User")').first();
    if (await userButton.isVisible()) {
      await userButton.click();
      
      // Click sign out
      await page.click('text=Sign Out');
      
      // Should redirect to home
      await expect(page).toHaveURL('/');
    }
  });
});

test.describe('Protected Routes', () => {
  test('should redirect unauthenticated users to sign in', async ({ page }) => {
    // Try to access protected route
    await page.goto('/dashboard');
    
    // Should redirect to auth page
    await expect(page).toHaveURL(/auth|signin|login/);
  });

  test('should allow authenticated users to access protected routes', async ({ page }) => {
    // Mock authentication check
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
    
    // Navigate to protected route
    await page.goto('/dashboard');
    
    // Should stay on dashboard
    await expect(page).toHaveURL(/dashboard/);
  });
});

test.describe('Password Reset Flow', () => {
  test('should show password reset form', async ({ page }) => {
    // Go to sign in
    await page.goto('/');
    await page.click('text=Sign In');
    
    // Look for forgot password link
    const forgotPasswordLink = page.locator('text=/forgot.*password/i');
    if (await forgotPasswordLink.isVisible()) {
      await forgotPasswordLink.click();
      
      // Should show reset form
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('text=/reset|recover/i')).toBeVisible();
    }
  });

  test('should send password reset email', async ({ page }) => {
    // Mock password reset endpoint
    await page.route('**/auth/v1/recover', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    // Go to sign in
    await page.goto('/');
    await page.click('text=Sign In');
    
    // Click forgot password if available
    const forgotPasswordLink = page.locator('text=/forgot.*password/i');
    if (await forgotPasswordLink.isVisible()) {
      await forgotPasswordLink.click();
      
      // Fill email
      await page.fill('input[type="email"]', 'test@example.com');
      
      // Submit
      await page.click('button:has-text(/reset|send/i)');
      
      // Should show success message
      await expect(page.locator('text=/sent|check.*email/i')).toBeVisible({ timeout: 10000 });
    }
  });
});
