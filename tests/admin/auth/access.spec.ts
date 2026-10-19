import { expect, test } from '@playwright/test';

// Memastikan route Dashboard terlindungi saat browser tidak memiliki sesi login.
test('Pengguna tanpa sesi login diarahkan ke halaman Login saat membuka Dashboard', async ({ page }) => {
  // Setiap test mendapat context baru tanpa storageState dari project Login.
  await page.goto('/dashboard');

  // Verifikasi redirect dan pastikan form Login benar-benar tersedia.
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
});