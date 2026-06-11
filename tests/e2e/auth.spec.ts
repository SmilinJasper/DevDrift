import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should successfully log in as the demo user', async ({ page }) => {
    // 1. Navigate to the login page
    await page.goto('/login');

    // 2. Fill in the credentials
    await page.getByLabel('Email').fill('e2e-tester@devdrift.com');
    await page.getByLabel('Password').fill('password123');

    // 3. Submit the form
    await page.getByRole('button', { name: 'Sign In' }).click();

    // 4. Verify successful login
    // The user should be redirected away from the login page, usually to '/' or '/discover'
    await expect(page).not.toHaveURL('/login');
    
    // As an additional check, we can verify that the user's Profile link is visible
    await expect(page.getByRole('link', { name: 'Profile' }).first()).toBeVisible({ timeout: 10000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('wrong@devdrift.com');
    await page.getByLabel('Password').fill('badpassword');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // The user should stay on the login page and see an error message
    // Usually Supabase returns something like "Invalid login credentials"
    await expect(page.locator('.text-red-500')).toBeVisible();
    await expect(page).toHaveURL(/.*login.*/);
  });
});
