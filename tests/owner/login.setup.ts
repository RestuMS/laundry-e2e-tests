import { expect, test } from '@playwright/test';
import path from 'node:path';
import { loginCredentials, signIn } from '../admin/auth/auth.helpers';

const authFile = path.resolve(__dirname, 'auth.json');

test('Setup menyimpan sesi autentikasi Owner', async ({ page, context }) => {
  const { email, password } = loginCredentials('owner');

  await signIn(page, email, password);
  await expect(page).toHaveURL(/\/owner(?:\/|$)/);
  await expect(page.getByRole('heading', { name: 'Executive Overview' })).toBeVisible();

  await context.storageState({ path: authFile });
});