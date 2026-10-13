import type { Page } from '@playwright/test';
import adminLoginData from './login-data.json';
import ownerLoginData from '../../owner/login-data.json';

export function loginCredentials(role: 'admin' | 'owner' = 'admin') {
  const credentials = role === 'admin' ? adminLoginData : ownerLoginData;

  if (!credentials.email || !credentials.password) {
    const filePath = role === 'admin'
      ? 'tests/admin/auth/login-data.json'
      : 'tests/owner/login-data.json';
    throw new Error(`Lengkapi email dan password akun ${role} di ${filePath}.`);
  }

  return credentials;
}

export async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
}