import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="password"]', 'password');
    await page.click('button:has-text("Sign in with Password")');
    await expect(page).toHaveURL('/');
  });

  test('should display welcome message', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Welcome to NextJS Starter');
  });

  test('should display user information', async ({ page }) => {
    await expect(page.locator('text=User Information')).toBeVisible();
    await expect(page.locator('text=Name:')).toBeVisible();
    await expect(page.locator('text=Email:')).toBeVisible();
    await expect(page.locator('text=Role:')).toBeVisible();
  });

  test('should display getting started section', async ({ page }) => {
    await expect(page.locator('text=Getting Started')).toBeVisible();
    await expect(page.locator('text=Features Included:')).toBeVisible();
    await expect(page.locator('text=NextJS 15 with App Router')).toBeVisible();
    await expect(page.locator('text=NextAuth.js authentication')).toBeVisible();
    await expect(page.locator('text=Drizzle ORM with PostgreSQL')).toBeVisible();
  });

  test('should have working sign out functionality', async ({ page }) => {
    await page.click('button:has-text("Sign Out")');
    await expect(page).toHaveURL(/\/login/);
  });
});