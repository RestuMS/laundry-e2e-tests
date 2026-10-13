import { expect, test } from '@playwright/test';

test('TC ID ADM-001 - Admin dapat membuka Dashboard dengan sesi Admin', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/dashboard(?:\/|$)/);
});