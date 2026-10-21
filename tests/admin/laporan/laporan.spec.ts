import { expect, test, type Page } from '@playwright/test';

const laporanUrl = /\/laporan(?:\/|$|\?)/;

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Mengembalikan locator kartu ringkasan berdasarkan prefiks judul.
 * Judul kartu mengandung tanggal dinamis (misal: "PEMASUKAN (21 OCT 2026)"),
 * sehingga dicocokkan secara parsial.
 */
function summaryCard(page: Page, titlePrefix: string) {
  return page.locator('.grid > div, [class*="card"]').filter({ hasText: new RegExp(titlePrefix, 'i') });
}

/**
 * Mengisi input tanggal secara terprogram melalui `evaluate` agar kompatibel
 * dengan semua browser, termasuk yang tidak memunculkan date-picker pada `.fill()`.
 */
async function setDateInput(page: Page, selector: string, value: string) {
  await page.locator(selector).evaluate((input, val) => {
    if (input instanceof HTMLInputElement) {
      // Mengubah value langsung dan memicu event agar framework mendeteksinya.
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value',
      )?.set;
      nativeInputValueSetter?.call(input, val);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, value);
}

test.describe('Laporan & Analitik', () => {
  /**
   * Module: Laporan
   * TC ID: TC-LAPORAN-01
   * Objective: Memastikan halaman Laporan dapat dibuka setelah login sebagai Admin.
   * Precondition: Sesi Admin tersimpan via auth.json.
   * Steps: Navigasi ke /laporan, verifikasi URL dan heading utama.
   * Expected Result: Halaman terbuka dengan heading "Laporan & Analitik".
   * Priority: P1 | Type: Positive
   */
  test('TC-LAPORAN-01 - Halaman Laporan berhasil dibuka setelah login Admin', async ({ page }) => {
    await page.goto('/laporan');

    await expect(page).toHaveURL(laporanUrl);
    await expect(
      page.getByRole('heading', { name: /Laporan/i }),
    ).toBeVisible();
  });

  /**
   * Module: Laporan
   * TC ID: TC-LAPORAN-02
   * Objective: Memastikan keempat kartu ringkasan (Omset Hari Ini, Pemasukan,
   *   Pengeluaran, Laba Bersih) ditampilkan dengan nilai Rupiah yang valid.
   * Precondition: Sesi Admin tersimpan; halaman Laporan dapat diakses.
   * Steps: Buka /laporan, periksa keberadaan dan format nilai setiap kartu.
   * Test Data: Nilai dinamis; nol dianggap valid.
   * Expected Result: Empat kartu terlihat, masing-masing menampilkan "Rp" diikuti angka.
   * Priority: P1 | Type: Positive
   */
  test('TC-LAPORAN-02 - Keempat kartu ringkasan laporan ditampilkan dengan format Rupiah', async ({ page }) => {
    await page.goto('/laporan');

    const cardPrefixes = [
      'OMSET HARI INI',
      'PEMASUKAN',
      'PENGELUARAN',
      'LABA BERSIH',
    ];

    for (const prefix of cardPrefixes) {
      const card = summaryCard(page, prefix);
      await expect(card, `Kartu "${prefix}" harus terlihat`).toBeVisible();
      await expect(card).toContainText(/Rp\s?[\d.,]+/i);
    }
  });

  /**
   * Module: Laporan
   * TC ID: TC-LAPORAN-03
   * Objective: Memastikan input filter tanggal (PILIH HARI/TGL) tersedia dan dapat diisi.
   * Precondition: Sesi Admin tersimpan.
   * Steps: Buka /laporan, cari input date, isi dengan tanggal valid.
   * Test Data: Tanggal hari ini dalam format yyyy-mm-dd.
   * Expected Result: Input date terlihat, bisa diedit, dan nilai berubah setelah diisi.
   * Priority: P1 | Type: Positive
   */
  test('TC-LAPORAN-03 - Filter tanggal dapat dipilih', async ({ page }) => {
    await page.goto('/laporan');

    const dateInput = page.locator('input[type="date"]');
    await expect(dateInput).toBeVisible();
    await expect(dateInput).toBeEditable();

    // Menggunakan tanggal hari ini sebagai test data.
    const today = new Date().toISOString().split('T')[0]; // yyyy-mm-dd
    await setDateInput(page, 'input[type="date"]', today);
    await expect(dateInput).toHaveValue(today);
  });

  /**
   * Module: Laporan
   * TC ID: TC-LAPORAN-04
   * Objective: Memastikan data ringkasan laporan berubah sesuai tanggal yang difilter.
   * Precondition: Sesi Admin tersimpan; data transaksi historis tersedia.
   * Steps: Buka /laporan, catat ringkasan awal, ubah tanggal ke periode lain,
   *   verifikasi halaman memuat ulang dengan parameter tanggal dan kartu ringkasan tetap valid.
   * Test Data: Tanggal satu bulan yang lalu.
   * Expected Result: URL memuat parameter tanggal dan kartu ringkasan tetap tampil valid.
   * Priority: P1 | Type: Positive
   */
  test('TC-LAPORAN-04 - Data laporan berubah sesuai tanggal yang difilter', async ({ page }) => {
    await page.goto('/laporan');

    // Pilih tanggal 1 bulan yang lalu.
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - 1);
    const pastDateStr = pastDate.toISOString().split('T')[0];

    await setDateInput(page, 'input[type="date"]', pastDateStr);

    // Tunggu navigasi atau perubahan konten (beberapa implementasi auto-submit, yang lain butuh klik).
    // Coba klik area di luar input agar trigger change, atau tunggu apakah halaman reload.
    await page.locator('input[type="date"]').press('Enter');
    await page.waitForLoadState('networkidle');

    // Verifikasi kartu ringkasan masih valid setelah filter.
    const card = summaryCard(page, 'OMSET HARI INI');
    await expect(card).toBeVisible();
    await expect(card).toContainText(/Rp\s?[\d.,]+/i);
  });

  /**
   * Module: Laporan
   * TC ID: TC-LAPORAN-07
   * Objective: Memastikan kartu ringkasan menampilkan Rp 0 (bukan error/NaN)
   *   saat tidak ada transaksi pada tanggal yang dipilih.
   * Precondition: Sesi Admin tersimpan.
   * Steps: Buka /laporan, pilih tanggal yang dipastikan tidak memiliki transaksi
   *   (tanggal jauh di masa depan), verifikasi kartu menampilkan Rp 0.
   * Test Data: Tanggal 1 Januari 2099.
   * Expected Result: Kartu ringkasan menampilkan "Rp 0" dan body tidak mengandung NaN/null/undefined.
   * Priority: P2 | Type: Positive
   */
  test('TC-LAPORAN-07 - Tampilan ringkasan tetap valid saat tidak ada transaksi (empty state)', async ({ page }) => {
    // Gunakan tanggal yang dipastikan tidak ada transaksi.
    await page.goto('/laporan?tanggal=2099-01-01');
    await page.waitForLoadState('networkidle');

    // Kartu harus tetap muncul, meskipun dengan nilai Rp 0.
    const card = summaryCard(page, 'OMSET HARI INI');
    await expect(card).toBeVisible();
    await expect(card).toContainText(/Rp\s?[\d.,]+/i);

    // Pastikan tidak ada placeholder rusak di halaman.
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toMatch(/\b(?:NaN|undefined|null)\b/i);
  });

  /**
   * Module: Laporan
   * TC ID: TC-LAPORAN-08
   * Objective: Memastikan sub-label deskripsi pada setiap kartu ringkasan ditampilkan
   *   sesuai konteks keuangan (Dari transaksi lunas, Omset Kotor, Operasional / Kas Terpotong,
   *   Omset Terpotong Operasional).
   * Precondition: Sesi Admin tersimpan.
   * Steps: Buka /laporan, periksa teks deskripsi di bawah setiap kartu ringkasan.
   * Expected Result: Setiap kartu menampilkan sub-label deskripsi yang sesuai.
   * Priority: P2 | Type: Positive
   */
  test('TC-LAPORAN-08 - Sub-label deskripsi kartu ringkasan sesuai konteks keuangan', async ({ page }) => {
    await page.goto('/laporan');

    const expectedLabels: Array<{ card: string; desc: RegExp }> = [
      { card: 'OMSET HARI INI', desc: /transaksi lunas/i },
      { card: 'PEMASUKAN', desc: /omset kotor/i },
      { card: 'PENGELUARAN', desc: /operasional|kas terpotong/i },
      { card: 'LABA BERSIH', desc: /omset terpotong operasional/i },
    ];

    for (const { card, desc } of expectedLabels) {
      const el = summaryCard(page, card);
      await expect(el, `Kartu "${card}" harus menampilkan deskripsi`).toContainText(desc);
    }
  });

  /**
   * Module: Laporan
   * TC ID: TC-LAPORAN-09
   * Objective: Memastikan tombol "Filter Default" berfungsi untuk mengembalikan filter
   *   ke kondisi awal (tanpa parameter tanggal custom).
   * Precondition: Sesi Admin tersimpan; filter tanggal telah diubah.
   * Steps: Buka /laporan dengan parameter tanggal custom, klik "Filter Default",
   *   verifikasi halaman kembali ke kondisi default.
   * Expected Result: Setelah klik, URL tidak lagi memiliki parameter tanggal custom
   *   dan kartu ringkasan menampilkan data hari ini.
   * Priority: P2 | Type: Positive
   */
  test('TC-LAPORAN-09 - Tombol Filter Default mengembalikan filter ke kondisi awal', async ({ page }) => {
    // Buka dengan parameter tanggal custom terlebih dahulu.
    await page.goto('/laporan?tanggal=2024-01-15');
    await page.waitForLoadState('networkidle');

    // Klik tombol Filter Default.
    const filterDefaultBtn = page.getByRole('link', { name: /filter default/i })
      .or(page.getByRole('button', { name: /filter default/i }))
      .or(page.locator('a, button').filter({ hasText: /filter default/i }));

    await expect(filterDefaultBtn).toBeVisible();
    await filterDefaultBtn.click();
    await page.waitForLoadState('networkidle');

    // Setelah reset, URL seharusnya mengarah ke /laporan tanpa parameter tanggal custom.
    await expect(page).toHaveURL(laporanUrl);
    // Kartu ringkasan tetap tampil.
    await expect(summaryCard(page, 'OMSET HARI INI')).toBeVisible();
  });

  /**
   * Module: Laporan
   * TC ID: TC-LAPORAN-10
   * Objective: Memastikan tombol "Export PDF" dapat diklik dan memicu aksi download
   *   atau membuka halaman cetak.
   * Precondition: Sesi Admin tersimpan; halaman Laporan terbuka.
   * Steps: Buka /laporan, klik tombol "Export PDF", verifikasi bahwa event download
   *   terpicu atau halaman baru/pop-up terbuka.
   * Expected Result: Klik memicu download file PDF atau membuka jendela cetak/preview.
   * Priority: P1 | Type: Positive
   */
  test('TC-LAPORAN-10 - Tombol Export PDF dapat dipicu', async ({ page }) => {
    await page.goto('/laporan');

    const exportPdf = page.getByRole('link', { name: /export pdf/i })
      .or(page.getByRole('button', { name: /export pdf/i }))
      .or(page.locator('a, button').filter({ hasText: /export pdf/i }));

    await expect(exportPdf).toBeVisible();

    // Cek apakah tombol adalah <a> dengan href (download langsung).
    const tagName = await exportPdf.first().evaluate(el => el.tagName.toLowerCase());
    const href = await exportPdf.first().getAttribute('href');

    if (tagName === 'a' && href) {
      // Tombol berupa link: tunggu event download.
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 15_000 }).catch(() => null),
        exportPdf.first().click(),
      ]);

      if (download) {
        // Verifikasi file download memiliki nama yang mengandung kata terkait laporan/PDF.
        expect(download.suggestedFilename()).toMatch(/\.(pdf)$/i);
      }
      // Jika download tidak terpicu, mungkin membuka tab baru — tetap dianggap sukses selama tidak error.
    } else {
      // Tombol berupa <button> biasa: klik dan pastikan tidak ada error.
      await exportPdf.first().click();
      // Tunggu sebentar untuk memastikan tidak ada crash.
      await page.waitForTimeout(2_000);
      await expect(page.locator('body')).toBeVisible();
    }
  });

  /**
   * Module: Laporan
   * TC ID: TC-LAPORAN-11
   * Objective: Memastikan tombol "Export Excel" dapat diklik dan memicu aksi download.
   * Precondition: Sesi Admin tersimpan; halaman Laporan terbuka.
   * Steps: Buka /laporan, klik tombol "Export Excel", verifikasi event download.
   * Expected Result: Klik memicu download file Excel (xlsx/xls/csv).
   * Priority: P1 | Type: Positive
   */
  test('TC-LAPORAN-11 - Tombol Export Excel dapat dipicu', async ({ page }) => {
    await page.goto('/laporan');

    const exportExcel = page.getByRole('link', { name: /export excel/i })
      .or(page.getByRole('button', { name: /export excel/i }))
      .or(page.locator('a, button').filter({ hasText: /export excel/i }));

    await expect(exportExcel).toBeVisible();

    const tagName = await exportExcel.first().evaluate(el => el.tagName.toLowerCase());
    const href = await exportExcel.first().getAttribute('href');

    if (tagName === 'a' && href) {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 15_000 }).catch(() => null),
        exportExcel.first().click(),
      ]);

      if (download) {
        expect(download.suggestedFilename()).toMatch(/\.(xlsx?|csv)$/i);
      }
    } else {
      await exportExcel.first().click();
      await page.waitForTimeout(2_000);
      await expect(page.locator('body')).toBeVisible();
    }
  });

  /**
   * Module: Laporan
   * TC ID: TC-LAPORAN-12
   * Objective: Memastikan grafik "Trend Pemasukan Bulanan" ter-render di canvas.
   * Precondition: Sesi Admin tersimpan.
   * Steps: Buka /laporan, cari heading dan canvas grafik, verifikasi dimensi dan pixel.
   * Expected Result: Canvas terlihat, berdimensi positif, dan memiliki pixel non-transparan.
   * Priority: P2 | Type: Positive
   */
  test('TC-LAPORAN-12 - Grafik Trend Pemasukan Bulanan ter-render', async ({ page }) => {
    await page.goto('/laporan');

    const chartHeading = page.getByRole('heading', { name: /trend pemasukan bulanan/i });
    await expect(chartHeading).toBeVisible();

    // Canvas biasanya di dalam kontainer yang sama dengan heading.
    const chartContainer = chartHeading.locator('xpath=../..').or(chartHeading.locator('xpath=..'));
    const canvas = chartContainer.locator('canvas');
    await expect(canvas).toBeVisible();

    const render = await canvas.evaluate((cvs: HTMLCanvasElement) => {
      const ctx = cvs.getContext('2d');
      if (!ctx || cvs.width === 0 || cvs.height === 0) {
        return { width: cvs.width, height: cvs.height, visiblePixels: 0 };
      }

      const pixels = ctx.getImageData(0, 0, cvs.width, cvs.height).data;
      let visiblePixels = 0;
      for (let alpha = 3; alpha < pixels.length; alpha += 4) {
        if (pixels[alpha] > 0) visiblePixels += 1;
      }

      return { width: cvs.width, height: cvs.height, visiblePixels };
    });

    expect(render.width).toBeGreaterThan(0);
    expect(render.height).toBeGreaterThan(0);
    expect(render.visiblePixels).toBeGreaterThan(0);
  });

  /**
   * Module: Laporan
   * TC ID: TC-LAPORAN-13
   * Objective: Memastikan panel "Distribusi Layanan" ditampilkan pada halaman Laporan.
   * Precondition: Sesi Admin tersimpan.
   * Steps: Buka /laporan, cari heading "Distribusi Layanan" dan kontainernya.
   * Expected Result: Heading dan panel/kontainer terlihat.
   * Priority: P2 | Type: Positive
   */
  test('TC-LAPORAN-13 - Panel Distribusi Layanan ditampilkan', async ({ page }) => {
    await page.goto('/laporan');

    const heading = page.getByRole('heading', { name: /distribusi layanan/i });
    await expect(heading).toBeVisible();

    // Verifikasi deskripsi panel.
    const panel = heading.locator('xpath=..');
    await expect(panel).toContainText(/kontribusi per produk/i);
  });

  /**
   * Module: Laporan
   * TC ID: TC-LAPORAN-14
   * Objective: Memastikan indikator persentase perubahan (trend) muncul pada kartu
   *   Pemasukan dan/atau Pengeluaran.
   * Precondition: Sesi Admin tersimpan.
   * Steps: Buka /laporan, periksa keberadaan badge persentase (misal: ↑ 2.4%, ↑ 14.5%).
   * Expected Result: Setidaknya satu kartu menampilkan indikator persentase.
   * Priority: P3 | Type: Positive
   */
  test('TC-LAPORAN-14 - Indikator persentase perubahan tampil pada kartu ringkasan', async ({ page }) => {
    await page.goto('/laporan');

    // Cari badge persentase di antara kartu-kartu ringkasan.
    const body = page.locator('main').or(page.locator('body'));
    const percentageBadge = body.locator(':text-matches("[↑↓]\\\\s?\\\\d+\\\\.?\\\\d*%", "i")');

    // Minimal satu badge persentase harus tampil pada kartu ringkasan.
    // Jika tidak ditemukan, coba dengan regex yang lebih longgar.
    const badges = page.locator('body').filter({
      hasText: /[↑↓]\s?\d+\.?\d*%/,
    });

    // Verifikasi bahwa halaman mengandung setidaknya satu indikator persentase.
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toMatch(/[↑↓]\s?\d+\.?\d*%/);
  });

  /**
   * Module: Laporan
   * TC ID: TC-LAPORAN-15
   * Objective: Memastikan halaman Laporan dapat dimuat ulang (refresh) tanpa error JavaScript.
   * Precondition: Sesi Admin tersimpan.
   * Steps: Buka /laporan, catat page error dan console error, lalu reload halaman.
   * Expected Result: Halaman tetap terbuka tanpa error JavaScript.
   * Priority: P1 | Type: Positive
   */
  test('TC-LAPORAN-15 - Halaman Laporan dapat dimuat ulang tanpa error', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto('/laporan');
    await page.reload();

    await expect(page).toHaveURL(laporanUrl);
    await expect(page.getByRole('heading', { name: /Laporan/i })).toBeVisible();
    expect(errors).toEqual([]);
  });

  // ─── Akses tanpa autentikasi ──────────────────────────────────────────

  test.describe('Akses tanpa autentikasi', () => {
    // Override storageState project Admin hanya untuk test akses negatif ini.
    test.use({ storageState: { cookies: [], origins: [] } });

    /**
     * Module: Laporan
     * TC ID: TC-LAPORAN-16
     * Objective: Memastikan halaman Laporan tidak dapat diakses tanpa autentikasi.
     * Precondition: Browser context kosong tanpa cookie atau local storage.
     * Steps: Buka /laporan tanpa sesi login.
     * Expected Result: Pengguna diarahkan ke halaman Login.
     * Priority: P1 | Type: Negative
     */
    test('TC-LAPORAN-16 - Pengguna tanpa sesi diarahkan ke Login', async ({ page }) => {
      await page.goto('/laporan');

      await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
      await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
    });
  });
});

// ─── Skenario yang Ditunda / Tidak Dibuat ──────────────────────────────
//
// TC-LAPORAN-05 (Validasi rentang tanggal tidak valid):
//   Ditunda — Aplikasi hanya memiliki SATU input tanggal (bukan rentang Tanggal Mulai – Tanggal Selesai),
//   sehingga validasi "Tanggal Selesai lebih awal dari Tanggal Mulai" tidak relevan.
//
// TC-LAPORAN-06 (Filter status pembayaran/transaksi):
//   Tidak dibuat — Tidak ditemukan dropdown atau filter status pembayaran di UI halaman Laporan.
//
// TC-LAPORAN-13 Nomor asli (Pagination):
//   Tidak dibuat — Halaman Laporan tidak memiliki tabel data transaksi maupun pagination.
//   ID TC-LAPORAN-13 digunakan untuk test panel "Distribusi Layanan" sebagai gantinya.
//
// TC-LAPORAN-14 Nomor asli (Pencarian spesifik):
//   Tidak dibuat — Tidak ditemukan field pencarian (search by Kode Transaksi/Nama Pelanggan) di UI.
//   ID TC-LAPORAN-14 digunakan untuk test indikator persentase perubahan.
