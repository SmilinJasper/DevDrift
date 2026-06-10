import { test, expect } from '@playwright/test';

test.describe('Discover Page', () => {
  test('renders filter bar and allows interaction', async ({ page }) => {
    await page.goto('/discover');

    // Check if the filter bar tabs are present
    await expect(page.getByRole('button', { name: 'All Types' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Jobs' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Internships' })).toBeVisible();
    
    // Check location filters
    await expect(page.getByRole('button', { name: 'Anywhere' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'India' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Global / Remote' })).toBeVisible();

    // Click on Jobs and ensure no crash occurs
    await page.getByRole('button', { name: 'Jobs' }).click();
    
    // Check that we don't have an error state
    await expect(page.locator('text=Failed to load opportunities')).not.toBeVisible();
  });
});
