import { expect, test } from '@playwright/test';

test('TC ID OWN-001 - Owner dapat membuka Dashboard dengan sesi Owner', async ({ page }) => {
	await page.goto('/owner');

	await expect(page).toHaveURL(/\/owner(?:\/|$)/);
	await expect(page.getByRole('heading', { name: 'Executive Overview' })).toBeVisible();
});