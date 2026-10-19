import { expect, test } from '@playwright/test';
import { loginCredentials, signIn } from './auth.helpers';

// Mengelompokkan seluruh skenario Login Admin agar mudah dicari di laporan Playwright.
test.describe('Login Admin', () => {
  // Memastikan kredensial Admin yang valid membuka Dashboard.
  test('TC ID 002 - Login berhasil dengan kredensial valid', async ({ page }) => {
    // Kredensial dibaca dari JSON lokal, bukan ditulis langsung di test.
    const { email, password } = loginCredentials('admin');

    // Helper mengisi form dan mengirim login; assertion memastikan tujuan setelah berhasil.
    await signIn(page, email, password);
    await expect(page).toHaveURL(/\/dashboard(?:\/|$)/);
  });

  // Memastikan password yang salah tidak membuat sesi login.
  test('TC ID 003 - Login ditolak jika password salah', async ({ page }) => {
    // Email terdaftar dipakai agar skenario hanya menguji password yang salah.
    const { email } = loginCredentials('admin');

    await signIn(page, email, 'invalid-password-for-qa');
    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
    // Memastikan halaman menampilkan pesan penolakan, termasuk validasii teks Indonesia/Inggris.
    await expect(page.locator('body')).toContainText(/salah|invalid|incorrect|credentials|kredensial|cocok|tidak ditemukan|tidak sesuai/i);
  });

  // Memastikan email yang tidak terdaftar ditolak oleh aplikasi.
  test('TC ID 004 - Login ditolak jika email belum terdaftar', async ({ page }) => {
    // Timestamp membuat email selalu unik agar tidak cocok dengan akun di database test.
    await signIn(page, `qa-nonexistent-${Date.now()}@example.invalid`, 'invalid-password-for-qa');
    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
    await expect(page.locator('body')).toContainText(/salah|invalid|incorrect|credentials|kredensial|cocok|tidak ditemukan|tidak sesuai/i);
  });

  // Memastikan kedua field wajib dan validasi browser aktif saat kosong.
  test('TC ID 005 - Login ditolak jika Email dan Password kosong', async ({ page }) => {
    await page.goto('/login');
    // Locator berbasis role lebih tahan terhadap perubahan struktur HTML dibanding selector visual.
    await page.getByRole('button', { name: 'Login' }).click();

    // evaluate membaca properti HTMLInputElement langsung di browser, termasuk pesan validasi native.
    const emailState = await page.locator('input[name="email"]').evaluate(input => {
      if (!(input instanceof HTMLInputElement)) return null;
      return { missing: input.validity.valueMissing, message: input.validationMessage };
    });
    const passwordState = await page.locator('input[name="password"]').evaluate(input => {
      if (!(input instanceof HTMLInputElement)) return null;
      return { missing: input.validity.valueMissing, message: input.validationMessage };
    });

    // valueMissing harus aktif dan browser harus menyediakan pesan validasi untuk tiap field.
    expect(emailState?.missing).toBe(true);
    expect(emailState?.message).not.toBe('');
    expect(passwordState?.missing).toBe(true);
    expect(passwordState?.message).not.toBe('');
    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  });

  // Memastikan Email wajib diisi meskipun Password sudah diisi.
  test('TC ID 006 - Login ditolak jika Email kosong', async ({ page }) => {
    await page.goto('/login');
    // Password diisi supaya test ini mengisolasi validasi Email.
    await page.locator('input[name="password"]').fill('dummy-password');
    await page.getByRole('button', { name: 'Login' }).click();

    const emailMissing = await page.locator('input[name="email"]').evaluate(input =>
      input instanceof HTMLInputElement && input.validity.valueMissing,
    );

    expect(emailMissing).toBe(true);
    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  });

  // Memastikan Password wajib diisi meskipun Email sudah diisi.
  test('TC ID 007 - Login ditolak jika Password kosong', async ({ page }) => {
    const { email } = loginCredentials('admin');
    await page.goto('/login');
    // Email diisi supaya test ini mengisolasi validasi Password.
    await page.locator('input[name="email"]').fill(email);
    await page.getByRole('button', { name: 'Login' }).click();

    const passwordMissing = await page.locator('input[name="password"]').evaluate(input =>
      input instanceof HTMLInputElement && input.validity.valueMissing,
    );

    expect(passwordMissing).toBe(true);
    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  });

  // Memastikan format Email yang tidak valid diblokir oleh validasi browser.
  test('TC ID 008 - Login ditolak jika format Email tidak valid', async ({ page }) => {
    await page.goto('/login');
    // Input bertipe email seharusnya menolak format tanpa pola alamat email.
    await page.locator('input[name="email"]').fill('email-tidak-valid');
    await page.locator('input[name="password"]').fill('dummy-password');
    await page.getByRole('button', { name: 'Login' }).click();

    const emailTypeMismatch = await page.locator('input[name="email"]').evaluate(input =>
      input instanceof HTMLInputElement && input.validity.typeMismatch,
    );

    expect(emailTypeMismatch).toBe(true);
    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  });
});