// Page adalah tipe tab/browser Playwright yang dipakai untuk mengendalikan halaman.
import type { Page } from '@playwright/test';
// File JSON terpisah menjaga data akun per role dan mencegah kredensial di-hardcode di test.
import adminLoginData from './login-data.json';
import ownerLoginData from '../../owner/login-data.json';

// Mengambil data akun berdasarkan role dan menghentikan test dengan pesan jelas jika belum diisi.
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

// Helper bersama agar semua test Login memakai langkah navigasi, isi form, dan submit yang konsisten.
export async function signIn(page: Page, email: string, password: string) {
  // baseURL berasal dari playwright.config.ts; di sini cukup gunakan path relatif.
  await page.goto('/login');
  // getByLabel mencari field memakai label aksesibilitas yang dilihat pengguna.
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  // Klik tombol submit dengan nama aksesibilitasnya.
  await page.getByRole('button', { name: 'Login' }).click();
}