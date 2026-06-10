import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('renders the hero section and feed', async ({ page }) => {
    // Navigate to the home page
    await page.goto('/');

    // Check for the main heading
    await expect(page.locator('text=Discover Your Next')).toBeVisible();
    await expect(page.locator('text=Opportunity')).toBeVisible();

    // Check for the feed section heading
    await expect(page.locator('text=Recommended for you')).toBeVisible();

    // Since we rely on a live Supabase DB, we just ensure the page mounts 
    // and the core UI shells out without crashing.
  });
});
