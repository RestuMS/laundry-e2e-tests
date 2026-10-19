import { expect, test, type Page } from '@playwright/test';

const dashboardUrl = /\/dashboard(?:\/|$)/;

function statisticCard(page: Page, title: string) {
  return page.getByRole('heading', { name: title, exact: true }).locator('xpath=..');
}

test.describe('Dashboard Admin', () => {
  /**
   * Module: Dashboard Admin
   * Objective: Memastikan sesi Admin membuka Dashboard Admin, bukan halaman role lain.
   * Precondition: Project admin memasang tests/admin/auth.json yang dibuat oleh setup-admin.
   * Steps: Buka /dashboard dan periksa URL serta identitas role yang tampil.
   * Test Data: Sesi Admin tersimpan.
   * Expected Result: Dashboard terbuka dan identitas Admin tampil.
   * Priority: P1 | Type: Positive
   */
  test('TC-DASH-ADMIN-01 - Admin berhasil membuka Dashboard setelah login', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(dashboardUrl);
    await expect(page.locator('body')).toContainText('Admin Master');
  });

  /**
   * Module: Dashboard Admin
   * Objective: Memastikan judul halaman Dashboard dikenali dengan benar.
   * Precondition: Pengguna memiliki sesi Admin yang valid.
   * Steps: Buka Dashboard dan periksa title browser serta heading utama.
   * Test Data: Sesi Admin tersimpan.
   * Expected Result: Title browser dan heading menunjukkan Dashboard Admin.
   * Priority: P1 | Type: Positive
   */
  test('TC-DASH-ADMIN-02 - Judul halaman Admin Dashboard tampil dengan benar', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveTitle('LaundryPro - Admin Dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  });

  /**
   * Module: Dashboard Admin
   * Objective: Memastikan kartu Total Order menampilkan angka yang valid, termasuk nol.
   * Precondition: Pengguna memiliki sesi Admin yang valid.
   * Steps: Buka Dashboard dan periksa kartu Total Order.
   * Test Data: Data Dashboard saat ini; nilainya tidak dikunci ke angka tertentu.
   * Expected Result: Kartu terlihat dan nilai statistik berupa angka non-negatif.
   * Priority: P1 | Type: Positive
   */
  test('TC-DASH-ADMIN-03 - Kartu Total Order ditampilkan', async ({ page }) => {
    await page.goto('/dashboard');

    const card = statisticCard(page, 'Total Order');
    await expect(card).toBeVisible();
    await expect(card).toContainText(/\b\d[\d.,]*\b/);
  });

  /**
   * Module: Dashboard Admin
   * Objective: Memastikan kartu Order Diproses menampilkan angka yang valid, termasuk nol.
   * Precondition: Pengguna memiliki sesi Admin yang valid.
   * Steps: Buka Dashboard dan periksa kartu Order Diproses.
   * Test Data: Data Dashboard saat ini; nilainya tidak dikunci ke angka tertentu.
   * Expected Result: Kartu terlihat dan nilai statistik berupa angka non-negatif.
   * Priority: P1 | Type: Positive
   */
  test('TC-DASH-ADMIN-04 - Kartu Order Diproses ditampilkan', async ({ page }) => {
    await page.goto('/dashboard');

    const card = statisticCard(page, 'Order Diproses');
    await expect(card).toBeVisible();
    await expect(card).toContainText(/\b\d[\d.,]*\b/);
  });

  /**
   * Module: Dashboard Admin
   * Objective: Memastikan kartu Order Selesai menampilkan angka yang valid, termasuk nol.
   * Precondition: Pengguna memiliki sesi Admin yang valid.
   * Steps: Buka Dashboard dan periksa kartu Order Selesai.
   * Test Data: Data Dashboard saat ini; nilainya tidak dikunci ke angka tertentu.
   * Expected Result: Kartu terlihat dan nilai statistik berupa angka non-negatif.
   * Priority: P1 | Type: Positive
   */
  test('TC-DASH-ADMIN-05 - Kartu Order Selesai ditampilkan', async ({ page }) => {
    await page.goto('/dashboard');

    const card = statisticCard(page, 'Order Selesai');
    await expect(card).toBeVisible();
    await expect(card).toContainText(/\b\d[\d.,]*\b/);
  });

  /**
   * Module: Dashboard Admin
   * Objective: Memastikan Omset Hari Ini tampil dengan format Rupiah.
   * Precondition: Pengguna memiliki sesi Admin yang valid.
   * Steps: Buka Dashboard dan periksa nilai pada kartu Omset Hari Ini.
   * Test Data: Data Dashboard saat ini; jumlah omset dapat berubah.
   * Expected Result: Kartu terlihat dan nilainya mengikuti format Rp dengan angka opsional bersufiks.
   * Priority: P1 | Type: Positive
   */
  test('TC-DASH-ADMIN-06 - Kartu Omset Hari Ini memakai format Rupiah', async ({ page }) => {
    await page.goto('/dashboard');

    const card = statisticCard(page, 'Omset Hari Ini');
    await expect(card).toBeVisible();
    await expect(card).toContainText(/Rp\s?[\d.,]+(?:\s?(?:K|Jt|M|T))?/i);
  });

  /**
   * Module: Dashboard Admin
   * Objective: Memastikan grafik pemasukan mempunyai canvas yang benar-benar ter-render.
   * Precondition: Pengguna memiliki sesi Admin; canvas grafik tersedia pada halaman.
   * Steps: Buka Dashboard, cari canvas di panel Grafik Pemasukan Mingguan, lalu hitung pixel non-transparan.
   * Test Data: Data grafik Dashboard saat ini.
   * Expected Result: Panel dan canvas terlihat, berdimensi positif, serta berisi hasil render.
   * Priority: P2 | Type: Positive
   */
  test('TC-DASH-ADMIN-07 - Grafik pemasukan mingguan berhasil dirender', async ({ page }) => {
    await page.goto('/dashboard');

    const chartHeading = page.getByRole('heading', { name: 'Grafik Pemasukan Mingguan', exact: true });
    const chartCanvas = chartHeading.locator('xpath=../..').locator('canvas');
    await expect(chartHeading).toBeVisible();
    await expect(chartCanvas).toBeVisible();

    const render = await chartCanvas.evaluate((canvas: HTMLCanvasElement) => {
      const context = canvas.getContext('2d');
      if (!context || canvas.width === 0 || canvas.height === 0) {
        return { width: canvas.width, height: canvas.height, visiblePixels: 0 };
      }

      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let visiblePixels = 0;
      for (let alpha = 3; alpha < pixels.length; alpha += 4) {
        if (pixels[alpha] > 0) visiblePixels += 1;
      }

      return { width: canvas.width, height: canvas.height, visiblePixels };
    });

    expect(render.width).toBeGreaterThan(0);
    expect(render.height).toBeGreaterThan(0);
    expect(render.visiblePixels).toBeGreaterThan(0);
  });

  /**
   * Module: Dashboard Admin
   * Objective: Memastikan reload tidak menghasilkan error JavaScript dan Dashboard tetap tampil.
   * Precondition: Pengguna memiliki sesi Admin yang valid.
   * Steps: Catat page error dan console error, buka Dashboard, lalu reload.
   * Test Data: Sesi Admin tersimpan.
   * Expected Result: Dashboard tetap terbuka tanpa page error atau console error.
   * Priority: P1 | Type: Positive
   */
  test('TC-DASH-ADMIN-10 - Dashboard dapat dimuat ulang tanpa error JavaScript', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto('/dashboard');
    await page.reload();

    await expect(page).toHaveURL(dashboardUrl);
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });

  /**
   * Module: Dashboard Admin
   * Objective: Memastikan statistik tidak menampilkan placeholder rusak ketika nilainya nol.
   * Precondition: Pengguna memiliki sesi Admin yang valid.
   * Steps: Baca nilai tiga kartu order dan Omset Hari Ini.
   * Test Data: Data Dashboard yang sedang tersedia; nol dan nilai dinamis sama-sama diterima.
   * Expected Result: Statistik berisi angka yang dapat dibaca dan tidak menampilkan NaN/null/undefined.
   * Priority: P2 | Type: Positive
   */
  test('TC-DASH-ADMIN-11 - Statistik tetap valid saat data kosong atau bernilai nol', async ({ page }) => {
    await page.goto('/dashboard');

    const countTitles = ['Total Order', 'Order Diproses', 'Order Selesai'];
    for (const title of countTitles) {
      const text = await statisticCard(page, title).innerText();
      const value = text.split(/\r?\n/).map(line => line.trim()).find(line => /^\d[\d.,]*$/.test(line));
      expect(value, `Nilai kartu ${title} harus berupa angka`).toBeDefined();
      expect(Number(value?.replace(/,/g, ''))).toBeGreaterThanOrEqual(0);
    }

    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toMatch(/\b(?:NaN|undefined|null)\b/i);
  });

  /**
   * Module: Dashboard Admin
   * Objective: Memastikan seluruh menu navigasi utama Admin dan tombol Logout tampil di sidebar.
   * Precondition: Pengguna memiliki sesi Admin yang valid pada tampilan desktop.
   * Steps: Buka Dashboard, periksa elemen sidebar dan verifikasi seluruh link menu serta tombol Log Out.
   * Test Data: Sesi Admin tersimpan.
   * Expected Result: Sidebar menampilkan 12 menu navigasi dan tombol Log Out.
   * Priority: P1 | Type: Positive
   */
  test('TC-DASH-ADMIN-13 - Seluruh menu navigasi sidebar Admin dan tombol Logout tampil', async ({ page }) => {
    await page.goto('/dashboard');

    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    const expectedMenus = [
      'Home',
      'Order',
      'Layanan',
      'Pelanggan',
      'Antrian',
      'Komplain',
      'Laporan',
      'Keuangan',
      'Inventaris',
      'Karyawan',
      'Log Aktivitas',
      'Pengaturan',
    ];

    for (const menuName of expectedMenus) {
      const menuLink = sidebar.getByRole('link', { name: new RegExp(menuName) });
      await expect(menuLink, `Menu "${menuName}" harus tampil di sidebar`).toBeVisible();
    }

    const logoutButton = sidebar.getByRole('button', { name: /Log Out/i });
    await expect(logoutButton).toBeVisible();
  });

  /**
   * Module: Dashboard Admin
   * Objective: Memastikan panel Pesanan Terbaru menampilkan judul, tombol aksi, dan struktur tabel pesanan.
   * Precondition: Pengguna memiliki sesi Admin yang valid.
   * Steps: Buka Dashboard dan periksa panel Pesanan Terbaru.
   * Test Data: Sesi Admin tersimpan.
   * Expected Result: Heading, tombol "Lihat Semua", dan header kolom tabel tampil dengan baik.
   * Priority: P1 | Type: Positive
   */
  test('TC-DASH-ADMIN-14 - Panel Pesanan Terbaru menampilkan tabel data atau pesan kosong', async ({ page }) => {
    await page.goto('/dashboard');

    const heading = page.getByRole('heading', { name: 'Pesanan Terbaru', exact: true });
    await expect(heading).toBeVisible();

    const panel = heading.locator('xpath=../..');
    const seeAllBtn = panel.getByRole('button', { name: /Lihat Semua/i });
    await expect(seeAllBtn).toBeVisible();

    // Memeriksa keberadaan header kolom pada desktop view
    const table = panel.locator('table');
    await expect(table).toBeVisible();
    await expect(table.locator('thead')).toContainText('Pelanggan');
    await expect(table.locator('thead')).toContainText('Layanan');
    await expect(table.locator('thead')).toContainText('Status');
    await expect(table.locator('thead')).toContainText('Total');
  });

  /**
   * Module: Dashboard Admin
   * Objective: Memastikan panel Pelanggan Baru ditampilkan pada Dashboard.
   * Precondition: Pengguna memiliki sesi Admin yang valid.
   * Steps: Buka Dashboard dan periksa kontainer Pelanggan Baru.
   * Test Data: Sesi Admin tersimpan.
   * Expected Result: Heading "Pelanggan Baru" dan kontainer daftar pelanggan tampil.
   * Priority: P2 | Type: Positive
   */
  test('TC-DASH-ADMIN-15 - Panel Pelanggan Baru ditampilkan', async ({ page }) => {
    await page.goto('/dashboard');

    const heading = page.getByRole('heading', { name: 'Pelanggan Baru', exact: true });
    await expect(heading).toBeVisible();

    const panel = heading.locator('xpath=..');
    await expect(panel).toBeVisible();
  });

  /**
   * Module: Dashboard Admin
   * Objective: Memastikan search bar dan tombol aksi Tambah Order tampil dan interaktif.
   * Precondition: Pengguna memiliki sesi Admin yang valid.
   * Steps: Buka Dashboard, cari field search bar dan tombol Tambah Order di bagian atas konten.
   * Test Data: Teks pencarian pengujian.
   * Expected Result: Search bar dapat menerima input dan tombol Tambah Order terlihat aktif.
   * Priority: P1 | Type: Positive
   */
  test('TC-DASH-ADMIN-16 - Search bar dan tombol Tambah Order tampil dan interaktif', async ({ page }) => {
    await page.goto('/dashboard');

    const searchInput = page.getByPlaceholder('Cari cara borus...');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeEditable();

    await searchInput.fill('Budi');
    await expect(searchInput).toHaveValue('Budi');

    const addOrderBtn = page.getByRole('button', { name: /Tambah Order/i });
    await expect(addOrderBtn).toBeVisible();
    await expect(addOrderBtn).toBeEnabled();
  });

  /**
   * Module: Dashboard Admin
   * Objective: Memastikan tombol notifikasi membuka panel dropdown notifikasi dan dapat ditutup kembali.
   * Precondition: Pengguna memiliki sesi Admin yang valid pada desktop.
   * Steps: Buka Dashboard, klik ikon notifikasi bell, verifikasi dropdown terbuka, lalu klik di luar untuk menutup.
   * Test Data: Sesi Admin tersimpan.
   * Expected Result: Dropdown notifikasi dapat dibuka dan ditutup dengan benar.
   * Priority: P2 | Type: Positive
   */
  test('TC-DASH-ADMIN-17 - Interaksi buka dan tutup dropdown notifikasi berjalan dengan benar', async ({ page }) => {
    await page.goto('/dashboard');

    const desktopNotif = page.locator('main div[x-data*="notificationBell"]');
    const bellBtn = desktopNotif.getByRole('button');
    await expect(bellBtn).toBeVisible();

    const dropdown = desktopNotif.locator('div[x-show="open"]');
    await expect(dropdown).toBeHidden();

    // Klik untuk membuka dropdown
    await bellBtn.click();
    await expect(dropdown).toBeVisible();
    await expect(dropdown.getByRole('heading', { name: 'Notifikasi' })).toBeVisible();

    // Klik di luar dropdown untuk menutup (Alpine.js @click.away)
    await page.getByRole('heading', { name: 'Dashboard', exact: true }).click();
    await expect(dropdown).toBeHidden();
  });

  test.describe('Akses tanpa autentikasi', () => {
    // Override storageState project Admin hanya untuk test akses negatif ini.
    test.use({ storageState: { cookies: [], origins: [] } });

    /**
     * Module: Dashboard Admin
     * Objective: Memastikan Dashboard Admin tidak dapat dibuka tanpa sesi.
     * Precondition: Browser context kosong tanpa cookie atau local storage.
     * Steps: Buka /dashboard tanpa autentikasi.
     * Test Data: Tidak ada.
     * Expected Result: Pengguna diarahkan ke halaman Login.
     * Priority: P1 | Type: Negative
     */
    test('TC-DASH-ADMIN-12 - Pengguna tanpa sesi diarahkan ke Login', async ({ page }) => {
      await page.goto('/dashboard');

      await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
      await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
    });
  });
});

// TC-DASH-ADMIN-08 ditunda: canvas Layanan Terlaris saat ini transparan dan tanpa empty state.
// Perlu klarifikasi aturan yang diharapkan ketika belum ada data layanan.
// TC-DASH-ADMIN-09 ditunda: statistik berasal dari HTML server, tanpa sumber baca terpisah
// yang dapat digunakan sebagai pembanding independen secara aman.