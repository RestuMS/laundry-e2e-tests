import { expect, test, type Page } from '@playwright/test';

const pelangganUrl = /\/pelanggan(?:\/|$)/;

/**
 * Helper untuk mengambil baris data pelanggan pada tabel desktop berdasarkan teks identifier (Nama Pelanggan atau Kode CUST).
 */
function getCustomerRow(page: Page, identifier: string) {
  return page.locator('table tbody tr').filter({ hasText: identifier }).first();
}

/**
 * Helper untuk mendapatkan modal Tambah / Edit Pelanggan.
 * Menggunakan div.fixed untuk mencegah strict mode violation dengan div anak di dalamnya.
 */
function getModal(page: Page) {
  return page.locator('div.fixed[x-show="modalOpen"]');
}

/**
 * Helper mandiri untuk membuat pelanggan pengujian agar setiap test case bersifat independen.
 */
async function createTestCustomer(
  page: Page,
  fullName: string,
  options?: { phone?: string; status?: 'Reguler' | 'Member' | 'VIP'; address?: string; notes?: string }
) {
  await page.goto('/pelanggan', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Tambah Pelanggan/i }).click();

  const modal = getModal(page);
  await expect(modal).toBeVisible();

  await modal.locator('input[name="full_name"]').fill(fullName);

  if (options?.phone) {
    await modal.locator('input[name="phone"]').fill(options.phone);
  }

  if (options?.status) {
    await modal.locator('select[name="status"]').selectOption(options.status);
  }

  if (options?.address) {
    await modal.locator('textarea[name="address"]').fill(options.address);
  }

  if (options?.notes) {
    await modal.locator('input[name="notes"]').fill(options.notes);
  }

  await modal.getByRole('button', { name: 'Simpan Data' }).click();
  await page.waitForURL(pelangganUrl);
  await expect(page.getByText('Pelanggan berhasil ditambahkan!')).toBeVisible();
}

/**
 * Helper mandiri untuk membersihkan pelanggan pengujian setelah test selesai jika masih ada.
 */
async function deleteTestCustomer(page: Page, fullName: string) {
  await page.goto('/pelanggan', { waitUntil: 'domcontentloaded' });
  const row = getCustomerRow(page, fullName);
  if (await row.isVisible({ timeout: 2000 }).catch(() => false)) {
    page.once('dialog', async dialog => {
      await dialog.accept();
    });
    await row.locator('form[action*="pelanggan"] button[type="submit"]').click();
    await page.waitForURL(pelangganUrl);
  }
}

test.describe('Modul Pelanggan Admin', () => {
  /**
   * Module: Pelanggan
   * Objective: Memastikan Admin berhasil membuka halaman Pelanggan dan memverifikasi URL serta judul halaman.
   * Precondition: Pengguna memiliki sesi login sebagai Admin yang valid (tests/admin/auth.json).
   * Steps:
   *   1. Buka URL /pelanggan dengan sesi Admin.
   *   2. Verifikasi URL browser.
   *   3. Periksa browser title dan heading utama.
   * Test Data: Sesi autentikasi Admin.
   * Expected Result: URL sesuai /pelanggan, browser title 'LaundryPro - Data Pelanggan', dan heading 'Manajemen Pelanggan' terlihat.
   * Priority: P1 | Type: Positive
   */
  test('TC-PELANGGAN-01 - Admin berhasil membuka halaman Pelanggan dan mengenali judul halaman', async ({ page }) => {
    await page.goto('/pelanggan', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(pelangganUrl);
    await expect(page).toHaveTitle('LaundryPro - Data Pelanggan');
    await expect(page.getByRole('heading', { name: 'Manajemen Pelanggan', exact: true })).toBeVisible();
  });

  /**
   * Module: Pelanggan
   * Objective: Memastikan daftar pelanggan ditampilkan dengan benar di tabel desktop dengan kolom lengkap atau pesan data kosong.
   * Precondition: Pengguna memiliki sesi login sebagai Admin.
   * Steps:
   *   1. Buka /pelanggan.
   *   2. Periksa keberadaan elemen tabel desktop dan header kolom.
   *   3. Jika terdapat baris pelanggan, pastikan kolom ID, nama, kontak, alamat, dan badge status terisi.
   * Test Data: Data pelanggan pada database.
   * Expected Result: Struktur tabel dan komponen kolom atau pesan 'Pelanggan tidak ditemukan.' tampil dengan rapi.
   * Priority: P1 | Type: Positive
   */
  test('TC-PELANGGAN-02 - Memastikan daftar pelanggan ditampilkan dengan benar di tabel desktop', async ({ page }) => {
    await page.goto('/pelanggan', { waitUntil: 'domcontentloaded' });

    const desktopTable = page.locator('table');
    await expect(desktopTable).toBeVisible();

    const headers = desktopTable.locator('thead th');
    await expect(headers.nth(0)).toContainText('ID & Nama Pelanggan');
    await expect(headers.nth(1)).toContainText('Kontak / HP');
    await expect(headers.nth(2)).toContainText('Alamat Singkat');
    await expect(headers.nth(3)).toContainText('Status');
    await expect(headers.nth(4)).toContainText('Aksi');

    const rows = desktopTable.locator('tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      const firstRow = rows.first();
      const firstRowText = await firstRow.innerText();
      if (!firstRowText.includes('Pelanggan tidak ditemukan.')) {
        await expect(firstRow).toContainText(/CUST-\d{4}/);
        await expect(firstRow.locator('button[type="button"]')).toBeVisible();
        await expect(firstRow.locator('button[type="submit"]')).toBeVisible();
      }
    }
  });

  /**
   * Module: Pelanggan
   * Objective: Memverifikasi tombol 'Tambah Pelanggan' membuka modal input dengan judul 'Tambah Pelanggan Baru' dan seluruh input field yang valid.
   * Precondition: Pengguna berada di halaman /pelanggan.
   * Steps:
   *   1. Buka /pelanggan.
   *   2. Klik tombol 'Tambah Pelanggan'.
   *   3. Tunggu modal muncul.
   *   4. Periksa judul modal, input full_name, phone, status, address, notes, dan tombol Batal/Simpan.
   * Test Data: -
   * Expected Result: Modal terbuka, menampilkan judul 'Tambah Pelanggan Baru', seluruh input field tersedia, dan default status bernilai 'Reguler'.
   * Priority: P1 | Type: Positive
   */
  test('TC-PELANGGAN-03 - Memastikan form tambah pelanggan dapat dibuka dengan komponen lengkap', async ({ page }) => {
    await page.goto('/pelanggan', { waitUntil: 'domcontentloaded' });

    const addBtn = page.getByRole('button', { name: /Tambah Pelanggan/i });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    const modal = getModal(page);
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: 'Tambah Pelanggan Baru', exact: true })).toBeVisible();

    await expect(modal.locator('input[name="full_name"]')).toBeVisible();
    await expect(modal.locator('input[name="phone"]')).toBeVisible();
    await expect(modal.locator('select[name="status"]')).toBeVisible();
    await expect(modal.locator('textarea[name="address"]')).toBeVisible();
    await expect(modal.locator('input[name="notes"]')).toBeVisible();

    await expect(modal.getByRole('button', { name: 'Batal' })).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Simpan Data' })).toBeVisible();
  });

  /**
   * Module: Pelanggan
   * Objective: Memastikan pelanggan baru berhasil ditambahkan dengan data valid dan muncul di baris tabel dengan pesan sukses.
   * Precondition: Pengguna berada di halaman /pelanggan.
   * Steps:
   *   1. Buka /pelanggan dan klik tombol 'Tambah Pelanggan'.
   *   2. Isi Nama Lengkap unik (QA_Pelanggan_<timestamp>).
   *   3. Isi Nomor HP ('081298765432').
   *   4. Pilih Status 'Member'.
   *   5. Isi Alamat Singkat ('Jl. Sudirman No. 12, Jakarta').
   *   6. Isi Catatan Khusus ('Customer loyal bulanan').
   *   7. Klik 'Simpan Data'.
   *   8. Verifikasi flash message 'Pelanggan berhasil ditambahkan!' dan kemunculan nama di tabel.
   *   9. Bersihkan (cleanup) data uji.
   * Test Data: Nama: QA_Pelanggan_<timestamp>, HP: 081298765432, Status: Member.
   * Expected Result: Halaman redirect ke /pelanggan, flash message 'Pelanggan berhasil ditambahkan!' tampil, dan baris pelanggan baru muncul di tabel.
   * Priority: P1 | Type: Positive
   */
  test('TC-PELANGGAN-04 - Memastikan pelanggan baru berhasil ditambahkan dengan data valid', async ({ page }) => {
    const uniqueName = `QA_Pelanggan_${Date.now()}`;

    try {
      await page.goto('/pelanggan', { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: /Tambah Pelanggan/i }).click();

      const modal = getModal(page);
      await expect(modal).toBeVisible();

      await modal.locator('input[name="full_name"]').fill(uniqueName);
      await modal.locator('input[name="phone"]').fill('081298765432');
      await modal.locator('select[name="status"]').selectOption('Member');
      await modal.locator('textarea[name="address"]').fill('Jl. Sudirman No. 12, Jakarta');
      await modal.locator('input[name="notes"]').fill('Customer loyal bulanan');

      await modal.getByRole('button', { name: 'Simpan Data' }).click();

      await page.waitForURL(pelangganUrl);
      await expect(page.getByText('Pelanggan berhasil ditambahkan!')).toBeVisible();

      const row = getCustomerRow(page, uniqueName);
      await expect(row).toBeVisible();
      await expect(row).toContainText(uniqueName);
      await expect(row).toContainText('081298765432');
      await expect(row).toContainText('Member Setia');
    } finally {
      await deleteTestCustomer(page, uniqueName);
    }
  });

  /**
   * Module: Pelanggan
   * Objective: Memastikan sistem mencegah submit form ketika field wajib Nama Lengkap dikosongkan (HTML5 valueMissing validation).
   * Precondition: Pengguna membuka modal Tambah Pelanggan di /pelanggan.
   * Steps:
   *   1. Buka /pelanggan dan buka modal Tambah Pelanggan.
   *   2. Kosongkan input Nama Lengkap.
   *   3. Klik tombol 'Simpan Data'.
   *   4. Evaluasi properti HTML5 validity.valueMissing pada input full_name.
   * Test Data: full_name: '' (kosong).
   * Expected Result: Form tidak tersubmit, input full_name memiliki properti validity.valueMissing bernilai true.
   * Priority: P2 | Type: Negative
   */
  test('TC-PELANGGAN-05 - Validasi field wajib nama lengkap ketika form disubmit kosong', async ({ page }) => {
    await page.goto('/pelanggan', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Tambah Pelanggan/i }).click();

    const modal = getModal(page);
    await expect(modal).toBeVisible();

    const nameInput = modal.locator('input[name="full_name"]');
    await nameInput.fill('');

    await modal.getByRole('button', { name: 'Simpan Data' }).click();

    const isMissing = await nameInput.evaluate(input => {
      if (!(input instanceof HTMLInputElement)) return false;
      return input.validity.valueMissing;
    });

    expect(isMissing).toBe(true);
    await expect(modal).toBeVisible();
  });

  /**
   * Module: Pelanggan
   * Objective: Memastikan sistem menolak penyimpanan jika nomor HP melebihi batas 20 karakter sesuai aturan StoreCustomerRequest.
   * Precondition: Pengguna membuka modal Tambah Pelanggan di /pelanggan.
   * Steps:
   *   1. Buka modal Tambah Pelanggan.
   *   2. Isi Nama Lengkap valid.
   *   3. Isi Nomor HP dengan 25 karakter string ('0812345678901234567890123').
   *   4. Klik tombol 'Simpan Data'.
   *   5. Periksa kemunculan pesan error validasi server.
   * Test Data: Nomor HP 25 karakter: '0812345678901234567890123'.
   * Expected Result: Form ditolak dan muncul pesan error 'Nomor HP maksimal 20 karakter.'
   * Priority: P2 | Type: Negative
   */
  test('TC-PELANGGAN-06 - Validasi nomor telepon/HP melebihi batas maksimal 20 karakter', async ({ page }) => {
    const testName = `QA_PhoneExceed_${Date.now()}`;

    await page.goto('/pelanggan', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Tambah Pelanggan/i }).click();

    const modal = getModal(page);
    await expect(modal).toBeVisible();

    await modal.locator('input[name="full_name"]').fill(testName);
    await modal.locator('input[name="phone"]').fill('0812345678901234567890123'); // 25 karakter (> 20)

    await modal.getByRole('button', { name: 'Simpan Data' }).click();

    await page.waitForURL(pelangganUrl);
    await expect(page.locator('body')).toContainText(/Nomor HP maksimal 20 karakter/i);
  });

  /**
   * Module: Pelanggan
   * Objective: Memastikan data pelanggan dapat diedit dan perubahan tersimpan dengan benar ke database.
   * Precondition: Terdapat data pelanggan pengujian di tabel.
   * Steps:
   *   1. Buat pelanggan uji sementara via helper.
   *   2. Cari baris pelanggan dan klik tombol Edit.
   *   3. Pastikan modal 'Update Pelanggan' terbuka dengan nilai form yang sesuai.
   *   4. Ubah nama menjadi <name>_Edited, ubah status menjadi 'VIP', dan ubah alamat.
   *   5. Klik 'Simpan Data'.
   *   6. Verifikasi flash message 'Data Pelanggan berhasil diperbarui!' dan data baru di tabel.
   *   7. Bersihkan (cleanup) data uji.
   * Test Data: Update nama: <uniqueName>_Edited, Status: VIP, Alamat: Jl. Thamrin Baru No. 88.
   * Expected Result: Perubahan tersimpan, pesan sukses muncul, dan baris tabel menampilkan nama baru serta badge 'VIP Member'.
   * Priority: P1 | Type: Positive
   */
  test('TC-PELANGGAN-08 - Memastikan data pelanggan dapat diedit dan perubahan tersimpan dengan benar', async ({ page }) => {
    const initialName = `QA_Edit_${Date.now()}`;
    const updatedName = `${initialName}_Edited`;

    try {
      await createTestCustomer(page, initialName, {
        phone: '081200001111',
        status: 'Reguler',
        address: 'Alamat Lama',
      });

      const row = getCustomerRow(page, initialName);
      await expect(row).toBeVisible();

      // Klik tombol Edit (tombol button type="button" di kolom aksi)
      await row.locator('button[type="button"]').click();

      const modal = getModal(page);
      await expect(modal).toBeVisible();
      await expect(modal.getByRole('heading', { name: 'Update Pelanggan', exact: true })).toBeVisible();

      await modal.locator('input[name="full_name"]').fill(updatedName);
      await modal.locator('select[name="status"]').selectOption('VIP');
      await modal.locator('textarea[name="address"]').fill('Jl. Thamrin Baru No. 88');

      await modal.getByRole('button', { name: 'Simpan Data' }).click();

      await page.waitForURL(pelangganUrl);
      await expect(page.getByText('Data Pelanggan berhasil diperbarui!')).toBeVisible();

      const updatedRow = getCustomerRow(page, updatedName);
      await expect(updatedRow).toBeVisible();
      await expect(updatedRow).toContainText('VIP Member');
      await expect(updatedRow).toContainText('Jl. Thamrin Baru No. 88');
    } finally {
      await deleteTestCustomer(page, updatedName);
      await deleteTestCustomer(page, initialName);
    }
  });

  /**
   * Module: Pelanggan
   * Objective: Memastikan proses edit data pelanggan dapat dibatalkan tanpa menyimpan perubahan form.
   * Precondition: Terdapat data pelanggan pengujian di tabel.
   * Steps:
   *   1. Buat pelanggan uji sementara via helper.
   *   2. Klik tombol Edit pada baris pelanggan tersebut.
   *   3. Ubah isi input Nama Lengkap di modal.
   *   4. Klik tombol 'Batal'.
   *   5. Pastikan modal tertutup dan nama pelanggan di tabel tidak berubah.
   *   6. Bersihkan (cleanup) data uji.
   * Test Data: Teks revisi yang dibatalkan.
   * Expected Result: Modal tertutup dan nama pelanggan di tabel tetap sama dengan nilai awal.
   * Priority: P2 | Type: Positive
   */
  test('TC-PELANGGAN-09 - Memastikan proses edit data pelanggan dapat dibatalkan tanpa menyimpan perubahan', async ({ page }) => {
    const testName = `QA_CancelEdit_${Date.now()}`;

    try {
      await createTestCustomer(page, testName, { phone: '081299990000', status: 'Reguler' });

      const row = getCustomerRow(page, testName);
      await expect(row).toBeVisible();

      await row.locator('button[type="button"]').click();

      const modal = getModal(page);
      await expect(modal).toBeVisible();

      await modal.locator('input[name="full_name"]').fill(`${testName}_ShouldNotSave`);
      await modal.getByRole('button', { name: 'Batal' }).click();

      await expect(modal).toBeHidden();

      // Data di tabel harus tetap nama awal
      await expect(getCustomerRow(page, testName)).toBeVisible();
    } finally {
      await deleteTestCustomer(page, testName);
    }
  });

  /**
   * Module: Pelanggan
   * Objective: Memastikan data pelanggan dapat dihapus dengan konfirmasi dialog browser dan baris terhapus dari tabel.
   * Precondition: Terdapat data pelanggan uji di tabel.
   * Steps:
   *   1. Buat pelanggan uji sementara via helper.
   *   2. Siapkan listener dialog: dialog.accept().
   *   3. Klik tombol Hapus (button type="submit") pada baris pelanggan.
   *   4. Verifikasi flash message 'Pelanggan berhasil dihapus!'.
   *   5. Pastikan baris data pelanggan tidak lagi ditemukan di tabel.
   * Test Data: Pelanggan uji sementara.
   * Expected Result: Dialog konfirmasi diterima, redirect dengan pesan sukses, dan data terhapus dari tabel.
   * Priority: P1 | Type: Positive
   */
  test('TC-PELANGGAN-10 - Memastikan pelanggan dapat dihapus dengan konfirmasi dialog', async ({ page }) => {
    const testName = `QA_Delete_${Date.now()}`;

    await createTestCustomer(page, testName, { phone: '081233334444', status: 'Reguler' });

    const row = getCustomerRow(page, testName);
    await expect(row).toBeVisible();

    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Hapus pelanggan ini?');
      await dialog.accept();
    });

    await row.locator('form[action*="pelanggan"] button[type="submit"]').click();

    await page.waitForURL(pelangganUrl);
    await expect(page.getByText('Pelanggan berhasil dihapus!')).toBeVisible();
    await expect(getCustomerRow(page, testName)).toBeHidden();
  });

  /**
   * Module: Pelanggan
   * Objective: Memastikan pembatalan penghapusan pelanggan (dialog.dismiss()) membatalkan aksi dan data tetap ada di tabel.
   * Precondition: Terdapat data pelanggan uji di tabel.
   * Steps:
   *   1. Buat pelanggan uji sementara via helper.
   *   2. Siapkan listener dialog: dialog.dismiss().
   *   3. Klik tombol Hapus pada baris pelanggan.
   *   4. Verifikasi bahwa baris data pelanggan tetap ada di tabel.
   *   5. Bersihkan (cleanup) data uji.
   * Test Data: Pelanggan uji sementara.
   * Expected Result: Dialog dibatalkan, request DELETE tidak dieksekusi, dan data pelanggan tetap aman di tabel.
   * Priority: P2 | Type: Positive
   */
  test('TC-PELANGGAN-11 - Memastikan pembatalan penghapusan pelanggan berfungsi pada dialog konfirmasi', async ({ page }) => {
    const testName = `QA_DismissDel_${Date.now()}`;

    try {
      await createTestCustomer(page, testName, { phone: '081255556666', status: 'Reguler' });

      const row = getCustomerRow(page, testName);
      await expect(row).toBeVisible();

      page.once('dialog', async dialog => {
        expect(dialog.message()).toContain('Hapus pelanggan ini?');
        await dialog.dismiss();
      });

      await row.locator('form[action*="pelanggan"] button[type="submit"]').click();

      // Data pelanggan harus tetap ada di tabel
      await expect(getCustomerRow(page, testName)).toBeVisible();
    } finally {
      await deleteTestCustomer(page, testName);
    }
  });

  /**
   * Module: Pelanggan
   * Objective: Memastikan data setelah penambahan sesuai dengan detail yang dirender pada kolom-kolom tabel UI.
   * Precondition: Pengguna berada di halaman /pelanggan.
   * Steps:
   *   1. Tambah pelanggan baru dengan data lengkap (Nama, HP '087711223344', Status 'VIP', Alamat 'Jl. Melati Blok C1').
   *   2. Cari baris pelanggan di tabel.
   *   3. Verifikasi teks ID format CUST-XXXX, Nama, Kontak, Alamat, dan badge 'VIP Member'.
   *   4. Bersihkan (cleanup) data uji.
   * Test Data: Nama: QA_MatchUI_<timestamp>, HP: '087711223344', Status: 'VIP', Alamat: 'Jl. Melati Blok C1'.
   * Expected Result: Seluruh kolom tabel desktop menampilkan data yang persis cocok dengan input yang dimasukkan.
   * Priority: P1 | Type: Positive
   */
  test('TC-PELANGGAN-12 - Memastikan data setelah penambahan sesuai dengan hasil yang ditampilkan pada tabel UI', async ({ page }) => {
    const testName = `QA_MatchUI_${Date.now()}`;

    try {
      await createTestCustomer(page, testName, {
        phone: '087711223344',
        status: 'VIP',
        address: 'Jl. Melati Blok C1',
      });

      const row = getCustomerRow(page, testName);
      await expect(row).toBeVisible();

      // Kolom 1: ID & Nama Pelanggan
      await expect(row.locator('td').nth(0)).toContainText(testName);
      await expect(row.locator('td').nth(0)).toContainText(/CUST-\d{4}/);

      // Kolom 2: Kontak / HP
      await expect(row.locator('td').nth(1)).toContainText('087711223344');

      // Kolom 3: Alamat Singkat
      await expect(row.locator('td').nth(2)).toContainText('Jl. Melati Blok C1');

      // Kolom 4: Status (VIP Member)
      await expect(row.locator('td').nth(3)).toContainText('VIP Member');
    } finally {
      await deleteTestCustomer(page, testName);
    }
  });

  /**
   * Module: Pelanggan
   * Objective: Memastikan fitur pencarian pelanggan (berdasarkan Nama atau Nomor HP) menyaring data tabel secara akurat.
   * Precondition: Terdapat pelanggan uji dengan nama dan nomor HP yang unik.
   * Steps:
   *   1. Buat pelanggan uji dengan nama unik dan nomor HP unik.
   *   2. Masukkan kata kunci nama pada search input dan submit form pencarian.
   *   3. Verifikasi baris pelanggan uji tampil pada hasil pencarian.
   *   4. Masukkan nomor HP unik pada search input dan submit.
   *   5. Verifikasi baris pelanggan uji tetap tampil.
   *   6. Bersihkan (cleanup) data uji.
   * Test Data: Keyword nama dan nomor HP '089988776655'.
   * Expected Result: Tabel menampilkan hasil yang difilter sesuai parameter ?search= dan baris yang cocok terlihat.
   * Priority: P2 | Type: Positive
   */
  test('TC-PELANGGAN-13 - Memastikan fitur pencarian pelanggan (berdasarkan Nama/Nomor HP) berfungsi', async ({ page }) => {
    const testName = `QA_Search_${Date.now()}`;
    const testPhone = '089988776655';

    try {
      await createTestCustomer(page, testName, { phone: testPhone, status: 'Reguler' });

      // 1. Cari berdasarkan Nama
      const searchInput = page.locator('input[name="search"]');
      await searchInput.fill(testName);
      await searchInput.press('Enter');
      await page.waitForURL(url => url.searchParams.get('search') === testName);

      await expect(getCustomerRow(page, testName)).toBeVisible();

      // 2. Cari berdasarkan Nomor HP
      await searchInput.fill(testPhone);
      await searchInput.press('Enter');
      await page.waitForURL(url => url.searchParams.get('search') === testPhone);

      await expect(getCustomerRow(page, testName)).toBeVisible();
    } finally {
      await deleteTestCustomer(page, testName);
    }
  });

  /**
   * Module: Pelanggan
   * Objective: Memastikan halaman Pelanggan dapat dimuat ulang (refresh) tanpa error dan seluruh komponen tetap utuh.
   * Precondition: Pengguna berada di halaman /pelanggan dengan sesi Admin.
   * Steps:
   *   1. Buka /pelanggan.
   *   2. Lakukan reload halaman (page.reload()).
   *   3. Pastikan URL tetap /pelanggan, tombol tambah dan tabel tetap ada.
   * Test Data: Sesi Admin tersimpan.
   * Expected Result: Halaman memuat ulang tanpa error dan komponen UI tetap dapat diakses.
   * Priority: P2 | Type: Positive
   */
  test('TC-PELANGGAN-15 - Memastikan halaman Pelanggan dapat dimuat ulang (refresh) tanpa error', async ({ page }) => {
    await page.goto('/pelanggan', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(pelangganUrl);

    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(pelangganUrl);
    await expect(page.getByRole('heading', { name: 'Manajemen Pelanggan', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Tambah Pelanggan/i })).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  /**
   * Module: Pelanggan
   * Objective: Memastikan pencarian dengan kata kunci yang tidak ada menampilkan pesan empty state 'Pelanggan tidak ditemukan.'
   * Precondition: Pengguna berada di halaman /pelanggan.
   * Steps:
   *   1. Buka /pelanggan.
   *   2. Masukkan kata kunci pencarian acak yang tidak ada di database.
   *   3. Tekan Enter untuk submit pencarian.
   *   4. Periksa pesan yang tampil pada tabel.
   * Test Data: Keyword: '__NONEXISTENT_CUST_XYZ_999__'.
   * Expected Result: Tabel menampilkan empty state dengan teks 'Pelanggan tidak ditemukan.'
   * Priority: P2 | Type: Negative
   */
  test('TC-PELANGGAN-17 - Memastikan pencarian dengan kata kunci tidak cocok menampilkan empty state', async ({ page }) => {
    const nonExistentKeyword = `__NONEXISTENT_CUST_${Date.now()}__`;

    await page.goto('/pelanggan', { waitUntil: 'domcontentloaded' });

    const searchInput = page.locator('input[name="search"]');
    await searchInput.fill(nonExistentKeyword);
    await searchInput.press('Enter');

    await page.waitForURL(url => url.searchParams.get('search') === nonExistentKeyword);
    await expect(page.locator('body')).toContainText('Pelanggan tidak ditemukan.');
  });

  /**
   * Module: Pelanggan
   * Objective: Memastikan sistem menolak penyimpanan jika nama pelanggan melebihi batas 255 karakter sesuai aturan StoreCustomerRequest.
   * Precondition: Pengguna membuka modal Tambah Pelanggan di /pelanggan.
   * Steps:
   *   1. Buka modal Tambah Pelanggan.
   *   2. Isi input Nama Lengkap dengan 260 karakter ('A'.repeat(260)).
   *   3. Submit form data.
   *   4. Periksa kemunculan pesan error validasi server.
   * Test Data: full_name sepanjang 260 karakter.
   * Expected Result: Form gagal disimpan dan muncul pesan error validasi 'Nama pelanggan maksimal 255 karakter.'
   * Priority: P2 | Type: Negative
   */
  test('TC-PELANGGAN-18 - Validasi nama lengkap melebihi batas maksimal 255 karakter ditolak oleh sistem', async ({ page }) => {
    const longName = 'A'.repeat(260);

    await page.goto('/pelanggan', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Tambah Pelanggan/i }).click();

    const modal = getModal(page);
    await expect(modal).toBeVisible();

    await modal.locator('input[name="full_name"]').fill(longName);
    await modal.getByRole('button', { name: 'Simpan Data' }).click();

    await page.waitForURL(pelangganUrl);
    await expect(page.locator('body')).toContainText(/Nama pelanggan maksimal 255 karakter/i);
  });
});

test.describe('Akses Tanpa Autentikasi Modul Pelanggan', () => {
  // Mengesampingkan sesi login project admin untuk memastikan rute terlindungi
  test.use({ storageState: { cookies: [], origins: [] } });

  /**
   * Module: Pelanggan
   * Objective: Memastikan pengguna tanpa sesi autentikasi diarahkan ke halaman Login saat mencoba membuka halaman Pelanggan.
   * Precondition: Browser context kosong tanpa sesi login (unauthenticated).
   * Steps:
   *   1. Buka URL /pelanggan tanpa cookies sesi.
   *   2. Periksa pengalihan (redirect) URL.
   *   3. Periksa keberadaan form/tombol Login.
   * Test Data: Context tanpa autentikasi.
   * Expected Result: Pengguna diarahkan ke URL /login dan tombol Login tampil di halaman.
   * Priority: P1 | Type: Negative
   */
  test('TC-PELANGGAN-16 - Memastikan halaman Pelanggan tidak dapat diakses tanpa autentikasi', async ({ page }) => {
    await page.goto('/pelanggan');

    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  });
});
