import { expect, test } from '@playwright/test';
import { loginCredentials, signIn } from './auth.helpers';

test('TC ID 002 - Login Admin berhasil dengan kredensial valid', async ({ page }) => {
  const { email, password } = loginCredentials('admin');

  await signIn(page, email, password);
  await expect(page).toHaveURL(/\/dashboard(?:\/|$)/);
});

test('TC ID 003 - Login ditolak jika password salah', async ({ page }) => {
  const { email } = loginCredentials('admin');

  await signIn(page, email, 'invalid-password-for-qa');
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  await expect(page.locator('body')).toContainText(/salah|invalid|incorrect|credentials|kredensial|cocok|tidak ditemukan|tidak sesuai/i);
});

test('TC ID 004 - Login ditolak jika email belum terdaftar', async ({ page }) => {
  await signIn(page, `qa-nonexistent-${Date.now()}@example.invalid`, 'invalid-password-for-qa');
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  await expect(page.locator('body')).toContainText(/salah|invalid|incorrect|credentials|kredensial|cocok|tidak ditemukan|tidak sesuai/i);
});

test('TC ID 005 - Login ditolak jika field wajib kosong', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Login' }).click();

  const emailMissing = await page.locator('input[name="email"]').evaluate(input =>
    input instanceof HTMLInputElement && input.validity.valueMissing,
  );
  const passwordMissing = await page.locator('input[name="password"]').evaluate(input =>
    input instanceof HTMLInputElement && input.validity.valueMissing,
  );

  expect(emailMissing).toBe(true);
  expect(passwordMissing).toBe(true);
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
});