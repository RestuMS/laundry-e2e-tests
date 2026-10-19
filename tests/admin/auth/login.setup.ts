import { expect, test } from '@playwright/test';
import path from 'node:path';
import { loginCredentials, signIn } from './auth.helpers';

const authFile = path.resolve(__dirname, '../auth.json');

// Project setup menjalankan test ini sebagai prasyarat sebelum test project Admin.
test('TC ID 001 - Login valid dan menyimpan sesi autentikasi Admin', async ({ page, context }) => {
  const { email, password } = loginCredentials('admin');

  await signIn(page, email, password);
  // Jangan simpan sesi sebelum redirect membuktikan login berhasil.
  await expect(page).toHaveURL(/\/dashboard(?:\/|$)/);

  // Menyimpan cookie dan local storage agar test Admin tidak login ulang tiap kasus.
  await context.storageState({ path: authFile });
});