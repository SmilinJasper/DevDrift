import { test, expect } from '@playwright/test';

test.describe('Listing Interactions', () => {
  test.beforeEach(async ({ page }) => {
    // We must be logged in to save a listing
    await page.goto('/login');
    await page.getByLabel('Email').fill('e2e-tester@devdrift.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Wait for successful login
    await expect(page).not.toHaveURL('/login');
    await expect(page.getByRole('link', { name: 'Profile' }).first()).toBeVisible({ timeout: 10000 });
  });

  test('should allow a user to save and unsave a listing', async ({ page }) => {
    // Navigate to the discover feed where listings are shown
    await page.goto('/discover');

    // Wait for the feed to load at least one listing
    // Since we seeded the DB, there will definitely be listings
    const saveButton = page.getByRole('button', { name: 'Save' }).first();
    const unsaveButton = page.getByRole('button', { name: 'Unsave' }).first();

    // Sometimes the first listing might already be saved from a previous test run, 
    // so we check which button is currently visible
    const isAlreadySaved = await unsaveButton.isVisible();

    if (isAlreadySaved) {
      // It's already saved, so let's unsave it
      await unsaveButton.click();
      // Verify it turned into a 'Save' button
      await expect(saveButton).toBeVisible({ timeout: 10000 });
      
      // Then save it back
      await saveButton.click();
      await expect(unsaveButton).toBeVisible({ timeout: 10000 });
    } else {
      // It's not saved yet, so let's save it
      await expect(saveButton).toBeVisible({ timeout: 10000 });
      await saveButton.click();
      // Verify it turned into an 'Unsave' button
      await expect(unsaveButton).toBeVisible({ timeout: 10000 });
      
      // Then unsave it
      await unsaveButton.click();
      await expect(saveButton).toBeVisible({ timeout: 10000 });
    }
  });
});
