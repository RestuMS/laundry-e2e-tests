import { expect, test } from '@playwright/test';
import path from 'node:path';
import { loginCredentials, signIn } from './auth.helpers';

const authFile = path.resolve(__dirname, '../auth.json');

test('TC ID 001 - Login valid dan menyimpan sesi autentikasi Admin', async ({ page, context }) => {
  const { email, password } = loginCredentials('admin');

  await signIn(page, email, password);
  await expect(page).toHaveURL(/\/dashboard(?:\/|$)/);

  await context.storageState({ path: authFile });
});