import { expect, test, type Page } from '@playwright/test';

const layananUrl = /\/layanan(?:\/|$)/;

/**
 * Mencari elemen kartu layanan (.service-card) berdasarkan nama layanan spesifik.
 */
function getServiceCard(page: Page, serviceName: string) {
  return page.locator('.service-card').filter({
    has: page.getByRole('heading', { level: 3, name: serviceName, exact: true }),
  });
}

/**
 * Mencari modal dialog Tambah / Edit Layanan.
 * Menggunakan div.fixed untuk menghindari strict mode violation dengan div inner.
 */
function getModal(page: Page) {
  return page.locator('div.fixed[x-show="modalOpen"]');
}

test.describe('Halaman Layanan Admin', () => {
  /**
   * Module: Layanan Admin
   * Objective: Memastikan Admin berhasil membuka halaman Layanan dan memverifikasi URL serta judul halaman.
   * Precondition: Project admin memasang tests/admin/auth.json yang dibuat oleh setup-admin.
   * Steps: Buka /layanan, periksa URL, browser title, dan heading utama.
   * Test Data: Sesi Admin tersimpan.
   * Expected Result: Halaman Layanan terbuka dengan title 'LaundryPro - Manajemen Layanan' dan heading 'Layanan Laundry'.
   * Priority: P1 | Type: Positive
   */
  test('TC-LAYANAN-ADMIN-01 - Admin berhasil membuka halaman Layanan dan mengenali judul halaman', async ({ page }) => {
    await page.goto('/layanan');

    await expect(page).toHaveURL(layananUrl);
    await expect(page).toHaveTitle('LaundryPro - Manajemen Layanan');
    await expect(page.getByRole('heading', { name: 'Layanan Laundry', exact: true })).toBeVisible();
  });

  /**
   * Module: Layanan Admin
   * Objective: Memastikan elemen antarmuka utama pada header halaman Layanan tampil dengan benar.
   * Precondition: Pengguna memiliki sesi Admin yang valid.
   * Steps: Buka /layanan, periksa heading section 'Daftar Layanan', deskripsi, dan tombol 'Tambah Layanan'.
   * Test Data: Sesi Admin tersimpan.
   * Expected Result: Heading 'Daftar Layanan', deskripsi bantuan, dan tombol 'Tambah Layanan' berstatus aktif.
   * Priority: P1 | Type: Positive
   */
  test('TC-LAYANAN-ADMIN-02 - Elemen antarmuka utama halaman Layanan ditampilkan dengan benar', async ({ page }) => {
    await page.goto('/layanan');

    await expect(page.getByRole('heading', { name: 'Daftar Layanan', exact: true })).toBeVisible();
    await expect(page.getByText('Kelola jenis layanan beserta harga untuk pelanggan.')).toBeVisible();

    const addBtn = page.getByRole('button', { name: /Tambah Layanan/i });
    await expect(addBtn).toBeVisible();
    await expect(addBtn).toBeEnabled();
  });

  /**
   * Module: Layanan Admin
   * Objective: Memverifikasi kartu layanan menampilkan komponen data yang lengkap (nama, harga, tombol Edit dan Hapus) atau empty state jika belum ada data.
   * Precondition: Pengguna memiliki sesi Admin yang valid.
   * Steps: Buka /layanan, cek keberadaan kartu layanan atau pesan data kosong.
   * Test Data: Data layanan saat ini di sistem.
   * Expected Result: Jika terdapat kartu, format harga menampilkan 'Rp' dan tombol aksi tersedia; jika kosong, pesan empty state tampil.
   * Priority: P2 | Type: Positive
   */
  test('TC-LAYANAN-ADMIN-03 - Struktur kartu layanan atau empty state ditampilkan dengan benar', async ({ page }) => {
    await page.goto('/layanan');

    const serviceCards = page.locator('.service-card');
    const cardCount = await serviceCards.count();

    if (cardCount > 0) {
      const firstCard = serviceCards.first();
      await expect(firstCard).toBeVisible();
      await expect(firstCard.getByRole('heading', { level: 3 })).toBeVisible();
      await expect(firstCard).toContainText(/Rp\s?[\d.,]+\s*\/\s*(?:Kg|Pcs|Pasang|[A-Za-z]+)/i);
      await expect(firstCard.getByRole('button', { name: /Edit/i })).toBeVisible();
      await expect(firstCard.getByRole('button', { name: /Hapus/i })).toBeVisible();
    } else {
      await expect(page.getByText(/Belum ada data layanan/i)).toBeVisible();
    }
  });

  /**
   * Module: Layanan Admin
   * Objective: Memastikan klik tombol 'Tambah Layanan' membuka modal dialog dengan form dan nilai default yang tepat.
   * Precondition: Pengguna berada di halaman /layanan.
   * Steps: Klik tombol 'Tambah Layanan', periksa judul modal dan nilai awal form.
   * Test Data: Nilai default form (Satuan: 'Kg', field lain kosong).
   * Expected Result: Modal muncul dengan judul 'Tambah Layanan Baru', input nama dan harga kosong, dan satuan bernilai 'Kg'.
   * Priority: P1 | Type: Positive
   */
  test('TC-LAYANAN-ADMIN-04 - Modal Tambah Layanan Baru dapat dibuka dengan nilai default yang benar', async ({ page }) => {
    await page.goto('/layanan');

    const modal = getModal(page);
    await expect(modal).toBeHidden();

    await page.getByRole('button', { name: /Tambah Layanan/i }).click();

    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: 'Tambah Layanan Baru', exact: true })).toBeVisible();

    const nameInput = modal.locator('input[name="service_name"]');
    const priceInput = modal.locator('input[name="price"]');
    const unitSelect = modal.locator('select[name="unit"]');

    await expect(nameInput).toHaveValue('');
    await expect(priceInput).toHaveValue('');
    await expect(unitSelect).toHaveValue('Kg');
  });

  /**
   * Module: Layanan Admin
   * Objective: Memastikan tombol 'Batal' menutup modal Tambah Layanan tanpa menyimpan perubahan.
   * Precondition: Modal Tambah Layanan dalam kondisi terbuka.
   * Steps: Buka modal, ketikkan data sementara, klik tombol 'Batal', verifikasi modal tertutup.
   * Test Data: Data sementara pada form.
   * Expected Result: Modal tertutup (hidden) dan form tidak di-submit.
   * Priority: P2 | Type: Positive
   */
  test('TC-LAYANAN-ADMIN-05 - Tombol Batal menutup modal Tambah Layanan', async ({ page }) => {
    await page.goto('/layanan');

    const modal = getModal(page);
    await page.getByRole('button', { name: /Tambah Layanan/i }).click();
    await expect(modal).toBeVisible();

    await modal.locator('input[name="service_name"]').fill('Layanan Batal');
    await modal.getByRole('button', { name: 'Batal' }).click();

    await expect(modal).toBeHidden();
  });

  /**
   * Module: Layanan Admin
   * Objective: Memastikan validasi HTML5 mencegah pengiriman form Tambah Layanan saat field wajib (Nama Layanan dan Harga) kosong.
   * Precondition: Modal Tambah Layanan terbuka.
   * Steps: Buka modal, biarkan field nama layanan kosong, klik 'Simpan Data', periksa status validitas input.
   * Test Data: Form kosong.
   * Expected Result: Field service_name berstatus invalid (:invalid) dan form tidak terkirim.
   * Priority: P1 | Type: Negative
   */
  test('TC-LAYANAN-ADMIN-06 - Validasi client-side mencegah pengiriman form dengan field wajib kosong', async ({ page }) => {
    await page.goto('/layanan');

    const modal = getModal(page);
    await page.getByRole('button', { name: /Tambah Layanan/i }).click();
    await expect(modal).toBeVisible();

    const nameInput = modal.locator('input[name="service_name"]');
    await expect(nameInput).toHaveAttribute('required', '');

    await modal.getByRole('button', { name: 'Simpan Data' }).click();

    // Verifikasi validasi browser (valueMissing pada field required)
    const isNameInvalid = await nameInput.evaluate((el: HTMLInputElement) => !el.validity.valid && el.validity.valueMissing);
    expect(isNameInvalid).toBe(true);

    // Modal tetap terbuka karena form belum lolos validasi
    await expect(modal).toBeVisible();
  });

  /**
   * Module: Layanan Admin
   * Objective: Memastikan atribut min="0" pada input harga mencegah nilai negatif.
   * Precondition: Modal Tambah Layanan terbuka.
   * Steps: Isi nama layanan valid, isi harga dengan angka negatif (-5000), submit form, cek validitas harga.
   * Test Data: service_name = 'Layanan Negatif', price = '-5000'.
   * Expected Result: Input harga berstatus rangeUnderflow (invalid) dan form tidak di-submit.
   * Priority: P2 | Type: Negative
   */
  test('TC-LAYANAN-ADMIN-07 - Validasi client-side menolak input harga negatif', async ({ page }) => {
    await page.goto('/layanan');

    const modal = getModal(page);
    await page.getByRole('button', { name: /Tambah Layanan/i }).click();

    const priceInput = modal.locator('input[name="price"]');
    await expect(priceInput).toHaveAttribute('min', '0');

    await modal.locator('input[name="service_name"]').fill('Layanan Cek Negatif');
    await priceInput.fill('-5000');
    await modal.getByRole('button', { name: 'Simpan Data' }).click();

    const isPriceUnderflow = await priceInput.evaluate(
      (el: HTMLInputElement) => !el.validity.valid && el.validity.rangeUnderflow
    );
    expect(isPriceUnderflow).toBe(true);
    await expect(modal).toBeVisible();
  });

  /**
   * Module: Layanan Admin
   * Objective: Memastikan pesan error server-side (Laravel validation) ditampilkan dengan benar saat form dikirim tanpa data wajib (melewati client validation).
   * Precondition: Pengguna membuka modal Tambah Layanan.
   * Steps: Matikan atribut noValidate pada form melalui DOM, submit form kosong, periksa alert pesan kesalahan Laravel.
   * Test Data: Data form kosong via noValidate.
   * Expected Result: Tampil alert error merah berisikan 'Nama layanan wajib diisi.' dan 'Harga layanan wajib diisi.'.
   * Priority: P1 | Type: Negative
   */
  test('TC-LAYANAN-ADMIN-08 - Server-side validation menampilkan pesan error saat data wajib tidak dikirim', async ({ page }) => {
    await page.goto('/layanan');

    await page.getByRole('button', { name: /Tambah Layanan/i }).click();

    const modal = getModal(page);
    await expect(modal).toBeVisible();

    // Bypass validasi HTML5 client-side agar form mengirim request langsung ke Laravel StoreServiceRequest
    await modal.locator('form').evaluate((form: HTMLFormElement) => {
      form.noValidate = true;
    });

    await modal.getByRole('button', { name: 'Simpan Data' }).click();

    // Verifikasi pesan validasi dari StoreServiceRequest
    const errorBox = page.locator('div.bg-red-50');
    await expect(errorBox).toBeVisible();
    await expect(errorBox).toContainText('Nama layanan wajib diisi.');
    await expect(errorBox).toContainText('Harga layanan wajib diisi.');
  });
});

test.describe.serial('Operasi CRUD Layanan Admin', () => {
  const timestamp = Date.now();
  const testServiceName = `QA Layanan ${timestamp}`;
  const updatedServiceName = `QA Layanan Edit ${timestamp}`;
  const initialPrice = '12000';
  const updatedPrice = '15000';
  const initialDescription = 'Deskripsi pengujian otomatis Playwright';
  const updatedDescription = 'Deskripsi berhasil diperbarui oleh Playwright';

  /**
   * Module: Layanan Admin
   * Objective: Memastikan Admin dapat menambahkan layanan baru dengan data valid (Create & Read).
   * Precondition: Pengguna memiliki sesi Admin yang valid.
   * Steps: Buka modal Tambah Layanan, isi nama, harga, satuan, deskripsi, klik 'Simpan Data', verifikasi flash message dan kartu layanan baru.
   * Test Data: service_name = testServiceName, price = 12000, unit = 'Kg', description.
   * Expected Result: Redirect ke /layanan dengan pesan sukses 'Layanan berhasil ditambahkan!' dan kartu layanan baru terlihat.
   * Priority: P1 | Type: Positive
   */
  test('TC-LAYANAN-ADMIN-09 - Admin berhasil menambahkan data layanan baru', async ({ page }) => {
    await page.goto('/layanan');

    await page.getByRole('button', { name: /Tambah Layanan/i }).click();

    const modal = getModal(page);
    await expect(modal).toBeVisible();

    await modal.locator('input[name="service_name"]').fill(testServiceName);
    await modal.locator('input[name="price"]').fill(initialPrice);
    await modal.locator('select[name="unit"]').selectOption('Kg');
    await modal.locator('textarea[name="description"]').fill(initialDescription);

    await modal.getByRole('button', { name: 'Simpan Data' }).click();

    // Verifikasi notifikasi sukses dari Laravel session('success')
    const successAlert = page.locator('div.bg-green-50');
    await expect(successAlert).toBeVisible();
    await expect(successAlert).toContainText('Layanan berhasil ditambahkan!');

    // Verifikasi kartu layanan yang baru dibuat muncul di grid
    const newCard = getServiceCard(page, testServiceName);
    await expect(newCard).toBeVisible();
    await expect(newCard).toContainText('Rp 12.000');
    await expect(newCard).toContainText('/ Kg');
    await expect(newCard).toContainText(initialDescription);
  });

  /**
   * Module: Layanan Admin
   * Objective: Memastikan Admin dapat memperbarui data layanan yang sudah ada melalui modal Edit (Update).
   * Precondition: Layanan yang dibuat pada TC-LAYANAN-ADMIN-09 sudah ada di daftar.
   * Steps: Klik tombol 'Edit' pada kartu layanan target, verifikasi form terisi data lama, ubah data, simpan, dan verifikasi tampilan baru.
   * Test Data: updatedServiceName, updatedPrice = 15000, unit = 'Pcs', updatedDescription.
   * Expected Result: Modal berheader 'Update Layanan', form tersimpan dengan pesan 'Layanan berhasil diperbarui!', dan data pada kartu ter-update.
   * Priority: P1 | Type: Positive
   */
  test('TC-LAYANAN-ADMIN-10 - Admin berhasil memperbarui data layanan melalui modal Edit', async ({ page }) => {
    await page.goto('/layanan');

    const card = getServiceCard(page, testServiceName);
    await expect(card).toBeVisible();

    await card.getByRole('button', { name: /Edit/i }).click();

    const modal = getModal(page);
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: 'Update Layanan', exact: true })).toBeVisible();

    // Verifikasi data sebelumnya terisi pada form
    await expect(modal.locator('input[name="service_name"]')).toHaveValue(testServiceName);
    await expect(modal.locator('input[name="price"]')).toHaveValue(initialPrice);

    // Update data form
    await modal.locator('input[name="service_name"]').fill(updatedServiceName);
    await modal.locator('input[name="price"]').fill(updatedPrice);
    await modal.locator('select[name="unit"]').selectOption('Pcs');
    await modal.locator('textarea[name="description"]').fill(updatedDescription);

    await modal.getByRole('button', { name: 'Simpan Data' }).click();

    // Verifikasi notifikasi sukses update
    const successAlert = page.locator('div.bg-green-50');
    await expect(successAlert).toBeVisible();
    await expect(successAlert).toContainText('Layanan berhasil diperbarui!');

    // Verifikasi perubahan terlihat pada kartu layanan
    const updatedCard = getServiceCard(page, updatedServiceName);
    await expect(updatedCard).toBeVisible();
    await expect(updatedCard).toContainText('Rp 15.000');
    await expect(updatedCard).toContainText('/ Pcs');
    await expect(updatedCard).toContainText(updatedDescription);
  });

  /**
   * Module: Layanan Admin
   * Objective: Memastikan membatalkan konfirmasi dialog browser tidak menghapus data layanan.
   * Precondition: Layanan target tersedia pada halaman.
   * Steps: Klik tombol 'Hapus' pada kartu layanan, tolak dialog konfirmasi browser (dialog.dismiss()), verifikasi layanan tetap ada.
   * Test Data: updatedServiceName.
   * Expected Result: Dialog konfirmasi muncul dengan pesan 'Hapus layanan ini secara permanen?', dibatalkan, dan data tetap ada di halaman.
   * Priority: P2 | Type: Negative
   */
  test('TC-LAYANAN-ADMIN-11 - Membatalkan konfirmasi dialog hapus tidak menghapus layanan', async ({ page }) => {
    await page.goto('/layanan');

    const card = getServiceCard(page, updatedServiceName);
    await expect(card).toBeVisible();

    // Tangani dialog browser: dismiss (batal)
    page.once('dialog', async dialog => {
      expect(dialog.message()).toBe('Hapus layanan ini secara permanen?');
      await dialog.dismiss();
    });

    await card.getByRole('button', { name: /Hapus/i }).click();

    // Kartu layanan harus tetap terlihat karena konfirmasi dibatalkan
    await expect(card).toBeVisible();
  });

  /**
   * Module: Layanan Admin
   * Objective: Memastikan Admin dapat menghapus layanan secara permanen dengan mengonfirmasi dialog browser (Delete & Cleanup).
   * Precondition: Layanan target tersedia pada halaman.
   * Steps: Klik tombol 'Hapus' pada kartu layanan target, terima dialog konfirmasi (dialog.accept()), verifikasi pesan sukses dan kartu terhapus.
   * Test Data: updatedServiceName.
   * Expected Result: Notifikasi sukses 'Layanan berhasil dihapus!' muncul dan kartu layanan tidak lagi tampil di halaman.
   * Priority: P1 | Type: Positive
   */
  test('TC-LAYANAN-ADMIN-12 - Admin berhasil menghapus layanan dengan konfirmasi', async ({ page }) => {
    await page.goto('/layanan');

    const card = getServiceCard(page, updatedServiceName);
    await expect(card).toBeVisible();

    // Tangani dialog browser: accept (konfirmasi hapus)
    page.once('dialog', async dialog => {
      expect(dialog.message()).toBe('Hapus layanan ini secara permanen?');
      await dialog.accept();
    });

    await card.getByRole('button', { name: /Hapus/i }).click();

    // Verifikasi notifikasi sukses hapus
    const successAlert = page.locator('div.bg-green-50');
    await expect(successAlert).toBeVisible();
    await expect(successAlert).toContainText('Layanan berhasil dihapus!');

    // Verifikasi kartu layanan sudah tidak ada
    await expect(card).toHaveCount(0);
  });
});

test.describe('Akses tanpa autentikasi ke Halaman Layanan', () => {
  // Override storageState agar context bersih tanpa sesi login
  test.use({ storageState: { cookies: [], origins: [] } });

  /**
   * Module: Layanan Admin
   * Objective: Memastikan pengguna tanpa sesi login tidak dapat mengakses halaman /layanan dan diarahkan ke halaman Login.
   * Precondition: Browser context kosong tanpa cookie autentikasi.
   * Steps: Buka URL /layanan secara langsung tanpa autentikasi.
   * Test Data: Sesi kosong.
   * Expected Result: Pengguna dialihkan ke halaman /login dan tombol login terlihat.
   * Priority: P1 | Type: Negative
   */
  test('TC-LAYANAN-ADMIN-13 - Pengguna tanpa sesi diarahkan ke halaman Login saat mengakses Layanan', async ({ page }) => {
    await page.goto('/layanan');

    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  });
});
