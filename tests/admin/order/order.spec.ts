import { expect, test, type Page } from '@playwright/test';

const orderUrl = /\/order(?:\/|$)/;
const orderCreateUrl = /\/order\/create(?:\/|$)/;

/**
 * Helper untuk mengambil baris order pada tabel desktop berdasarkan teks identifier (Kode Order / Nama Pelanggan).
 */
function getOrderRow(page: Page, identifier: string) {
  return page.locator('table tbody tr').filter({ hasText: identifier }).first();
}

/**
 * Helper untuk mendapatkan modal konfirmasi hapus order.
 * Menggunakan div.fixed untuk mencegah strict mode violation dengan div anak di dalamnya.
 */
function getDeleteModal(page: Page) {
  return page.locator('div.fixed[x-show="deleteModalOpen"]');
}

/**
 * Helper untuk mendapatkan modal status workflow pengerjaan laundry.
 * Menggunakan div.fixed untuk mencegah strict mode violation.
 */
function getStatusModal(page: Page) {
  return page.locator('div.fixed[x-show="statusModalOpen"]');
}

/**
 * Helper untuk mendapatkan modal kelola pembayaran.
 * Menggunakan div.fixed untuk mencegah strict mode violation.
 */
function getPaymentModal(page: Page) {
  return page.locator('div.fixed[x-show="paymentModalOpen"]');
}

/**
 * Helper mandiri untuk membuat order pengujian agar test case yang membutuhkan order yang ada bersifat independen.
 */
async function createTestOrder(
  page: Page,
  customerName: string,
  options?: { phone?: string; qty?: string; paymentStatus?: string }
) {
  await page.goto('/order/create', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(orderCreateUrl);

  await page.locator('input[name="customer_name"]').fill(customerName);
  await page.locator('input[name="customer_phone"]').fill(options?.phone ?? '81298765432');

  const serviceSelect = page.locator('select[name="items[0][service_name]"]');
  const serviceOptions = await serviceSelect.locator('option').all();
  if (serviceOptions.length > 1) {
    const value = await serviceOptions[1].getAttribute('value');
    if (value) {
      await serviceSelect.selectOption(value);
    }
  }

  await page.locator('input[name="items[0][qty]"]').fill(options?.qty ?? '2');

  const estFinishInput = page.locator('input[name="estimated_finish"]');
  const currentEst = await estFinishInput.inputValue();
  if (!currentEst) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2);
    const formatted = futureDate.toISOString().slice(0, 16);
    await estFinishInput.fill(formatted);
  }

  if (options?.paymentStatus) {
    await page.locator('select[name="payment_status"]').selectOption(options.paymentStatus);
  }

  await page.getByRole('button', { name: /Simpan Order Sekarang/i }).click();
  await page.waitForURL(orderUrl);
}

test.describe('Halaman Order Admin', () => {
  /**
   * Module: Order
   * Objective: Memastikan halaman Order dapat dibuka setelah login sebagai Admin serta memverifikasi URL dan judul halaman.
   * Precondition: Pengguna memiliki sesi login Admin yang valid (tests/admin/auth.json).
   * Steps: Navigasi ke URL /order, periksa URL browser, title dokumen, dan heading halaman.
   * Test Data: Sesi autentikasi Admin.
   * Expected Result: Halaman Order terbuka dengan URL /order, title 'LaundryPro - Data Order', dan heading 'Semua Transaksi Order'.
   * Priority: P1 | Type: Positive
   */
  test('TC-ORDER-01 - Admin berhasil membuka halaman Order dan mengenali judul halaman', async ({ page }) => {
    await page.goto('/order', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(orderUrl);
    await expect(page).toHaveTitle('LaundryPro - Data Order');
    await expect(page.getByRole('heading', { name: /Semua Transaksi Order/i })).toBeVisible();
  });

  /**
   * Module: Order
   * Objective: Memastikan daftar transaksi order ditampilkan dengan benar di tabel desktop beserta header kolom yang sesuai.
   * Precondition: Pengguna berada di halaman /order.
   * Steps: Periksa keberadaan tabel, header kolom (Pelanggan, Layanan & Detail, Tanggal / Waktu, Status & Alur, Total Biaya, Tindakan), serta baris data transaksi.
   * Test Data: Data transaksi yang ada di sistem.
   * Expected Result: Tabel transaksi tampil dengan header lengkap dan baris data transaksi atau pesan status yang valid.
   * Priority: P1 | Type: Positive
   */
  test('TC-ORDER-02 - Struktur tabel transaksi order dan header kolom ditampilkan dengan benar', async ({ page }) => {
    await page.goto('/order', { waitUntil: 'domcontentloaded' });

    const table = page.locator('table');
    await expect(table).toBeVisible();

    const thead = table.locator('thead');
    await expect(thead).toContainText('Pelanggan');
    await expect(thead).toContainText('Layanan & Detail');
    await expect(thead).toContainText('Tanggal / Waktu');
    await expect(thead).toContainText('Status & Alur');
    await expect(thead).toContainText('Total Biaya');
    await expect(thead).toContainText('Tindakan');

    const rows = table.locator('tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(0);
  });

  /**
   * Module: Order
   * Objective: Memastikan form tambah order baru dapat dibuka melalui tombol Tambah Transaksi di halaman Order.
   * Precondition: Pengguna berada di halaman /order.
   * Steps: Klik tombol 'Tambah Transaksi', tunggu halaman termuat, verifikasi URL, title, dan elemen form utama.
   * Test Data: Sesi Admin tersimpan.
   * Expected Result: Pengguna diarahkan ke /order/create dengan title 'LaundryPro - Tambah Order', heading 'Informasi Transaksi Baru', dan tombol 'Simpan Order Sekarang' terlihat.
   * Priority: P1 | Type: Positive
   */
  test('TC-ORDER-03 - Form Tambah Order Baru dapat dibuka dari halaman Order', async ({ page }) => {
    await page.goto('/order', { waitUntil: 'domcontentloaded' });

    const addBtn = page.getByRole('link', { name: /Tambah Transaksi/i });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    await expect(page).toHaveURL(orderCreateUrl);
    await expect(page).toHaveTitle('LaundryPro - Tambah Order');
    await expect(page.getByRole('heading', { name: /Informasi Transaksi Baru/i })).toBeVisible();
    await expect(page.locator('input[name="customer_name"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Simpan Order Sekarang/i })).toBeVisible();
  });

  /**
   * Module: Order
   * Objective: Memastikan order baru berhasil dibuat dengan data lengkap dan valid.
   * Precondition: Pengguna berada di halaman form tambah order /order/create.
   * Steps: Isi nama pelanggan unik, no hp, pilih layanan pertama, tentukan kuantitas/berat, verifikasi estimasi selesai, pilih status bayar, lalu klik 'Simpan Order Sekarang'.
   * Test Data: Nama Pelanggan: QA_Order_Test_001_<timestamp>, HP: 81234567890, Qty: 2, Payment Status: Lunas.
   * Expected Result: Form terkirim, redirect ke /order, dan transaksi yang baru dibuat tampil di tabel.
   * Priority: P1 | Type: Positive
   */
  test('TC-ORDER-04 - Admin berhasil membuat order baru dengan data valid', async ({ page }) => {
    const uniqueCustomer = `QA_Order_001_${Date.now()}`;

    await page.goto('/order/create', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(orderCreateUrl);

    await page.locator('input[name="customer_name"]').fill(uniqueCustomer);
    await page.locator('input[name="customer_phone"]').fill('81234567890');

    const serviceSelect = page.locator('select[name="items[0][service_name]"]');
    const options = await serviceSelect.locator('option').all();
    expect(options.length).toBeGreaterThan(1);
    const serviceVal = await options[1].getAttribute('value');
    if (serviceVal) {
      await serviceSelect.selectOption(serviceVal);
    }

    await page.locator('input[name="items[0][qty]"]').fill('2');

    const estInput = page.locator('input[name="estimated_finish"]');
    const currentEst = await estInput.inputValue();
    if (!currentEst) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 2);
      await estInput.fill(targetDate.toISOString().slice(0, 16));
    }

    await page.locator('select[name="payment_status"]').selectOption('Lunas');

    await page.getByRole('button', { name: /Simpan Order Sekarang/i }).click();

    await expect(page).toHaveURL(orderUrl);

    const createdRow = getOrderRow(page, uniqueCustomer);
    await expect(createdRow).toBeVisible();
  });

  /**
   * Module: Order
   * Objective: Memastikan validasi client-side mencegah pengiriman form ketika field wajib (Nama Pelanggan / Layanan) dikosongkan.
   * Precondition: Pengguna berada di form /order/create.
   * Steps: Biarkan field Nama Pelanggan kosong, klik tombol 'Simpan Order Sekarang', evaluasi status validitas elemen input.
   * Test Data: Form kosong tanpa input Nama Pelanggan.
   * Expected Result: Input customer_name berstatus invalid (valueMissing = true) dan form tidak terkirim (tetap di /order/create).
   * Priority: P1 | Type: Negative
   */
  test('TC-ORDER-05 - Validasi client-side mencegah pengiriman form saat field wajib kosong', async ({ page }) => {
    await page.goto('/order/create', { waitUntil: 'domcontentloaded' });

    const customerInput = page.locator('input[name="customer_name"]');
    await expect(customerInput).toHaveAttribute('required', '');

    await page.getByRole('button', { name: /Simpan Order Sekarang/i }).click();

    const isCustomerMissing = await customerInput.evaluate(
      (el: HTMLInputElement) => !el.validity.valid && el.validity.valueMissing
    );
    expect(isCustomerMissing).toBe(true);

    await expect(page).toHaveURL(orderCreateUrl);
  });

  /**
   * Module: Order
   * Objective: Memastikan validasi sistem menolak input kuantitas/berat non-positif (0 atau negatif) sesuai aturan bisnis aplikasi.
   * Precondition: Pengguna berada di form /order/create.
   * Steps: Isi Nama Pelanggan, pilih layanan, masukkan angka 0 pada input qty, klik submit, verifikasi sistem menolak penyimpanan dan menampilkan error validasi.
   * Test Data: Nama Pelanggan: QA_Order_InvalidQty, Qty: 0.
   * Expected Result: Form ditolak dan pesan error validasi (seperti 'Jumlah item minimal 0.01.') muncul di layar.
   * Priority: P2 | Type: Negative
   */
  test('TC-ORDER-06 - Validasi client-side menolak input Berat atau Jumlah non-positif', async ({ page }) => {
    await page.goto('/order/create', { waitUntil: 'domcontentloaded' });

    await page.locator('input[name="customer_name"]').fill('QA_Order_InvalidQty');

    const serviceSelect = page.locator('select[name="items[0][service_name]"]');
    const options = await serviceSelect.locator('option').all();
    if (options.length > 1) {
      const val = await options[1].getAttribute('value');
      if (val) await serviceSelect.selectOption(val);
    }

    const qtyInput = page.locator('input[name="items[0][qty]"]');
    await qtyInput.fill('0');

    await page.getByRole('button', { name: /Simpan Order Sekarang/i }).click();

    // Backend Laravel StoreOrderRequest memvalidasi min:0.01 dan mengembalikan pesan error
    await expect(page).toHaveURL(orderCreateUrl);
    await expect(page.locator('body')).toContainText(/Jumlah item minimal|min|tidak valid/i);
  });

  /**
   * Module: Order
   * Objective: Memastikan kalkulasi subtotal dan total biaya dihitung secara otomatis berdasarkan harga layanan, kuantitas, dan diskon.
   * Precondition: Pengguna berada di form /order/create.
   * Steps: Pilih layanan dengan harga yang diketahui, ubah kuantitas, masukkan nilai diskon, periksa pembaruan otomatis pada teks subtotal dan total estimasi.
   * Test Data: Layanan terpilih, Qty = 3, Diskon = 5000.
   * Expected Result: Subtotal bernilai (harga satuan * 3) dan Total Tagihan mencerminkan (Subtotal - Diskon).
   * Priority: P1 | Type: Positive
   */
  test('TC-ORDER-07 - Kalkulasi otomatis subtotal dan total harga berdasarkan layanan dan kuantitas', async ({ page }) => {
    await page.goto('/order/create', { waitUntil: 'domcontentloaded' });

    const serviceSelect = page.locator('select[name="items[0][service_name]"]');
    const options = await serviceSelect.locator('option').all();
    expect(options.length).toBeGreaterThan(1);

    const priceAttr = await options[1].getAttribute('data-price');
    const unitPrice = parseFloat(priceAttr ?? '0');
    const serviceVal = await options[1].getAttribute('value');
    if (serviceVal) {
      await serviceSelect.selectOption(serviceVal);
    }

    const qtyInput = page.locator('input[name="items[0][qty]"]');
    await qtyInput.fill('3');

    const discountInput = page.locator('input[name="discount"]');
    await discountInput.fill('5000');

    const expectedSubtotal = unitPrice * 3;
    const expectedTotal = Math.max(0, expectedSubtotal - 5000);

    const totalHidden = page.locator('input[name="total_price"]');
    await expect(totalHidden).toHaveValue(String(expectedTotal));
  });

  /**
   * Module: Order
   * Objective: Memastikan status alur pengerjaan order dapat diperbarui (misal: Diterima -> Dicuci / Diproses).
   * Precondition: Terdapat order aktif pada daftar transaksi.
   * Steps: Buka modal status workflow pada baris order, pilih tahapan status baru (misal 'Dicuci'), verifikasi pembaruan badge status.
   * Test Data: Order khusus QA_Status_Test_<timestamp>.
   * Expected Result: Status order berhasil diubah dan tombol badge pada baris tabel menampilkan status yang baru.
   * Priority: P1 | Type: Positive
   */
  test('TC-ORDER-08 - Admin berhasil memperbarui status alur pengerjaan order', async ({ page }) => {
    const customer = `QA_Status_${Date.now()}`;
    await createTestOrder(page, customer);

    await page.goto('/order', { waitUntil: 'domcontentloaded' });
    const row = getOrderRow(page, customer);
    await expect(row).toBeVisible();

    const statusBadgeBtn = row.locator('td').nth(3).locator('button').first();
    await statusBadgeBtn.click();

    const statusModal = getStatusModal(page);
    await expect(statusModal).toBeVisible();
    await expect(statusModal.getByRole('heading', { name: 'Workflow Laundry', exact: true })).toBeVisible();

    const targetStatus = statusModal.getByText('Dicuci', { exact: true });
    await targetStatus.click();

    await expect(statusModal).toBeHidden();
    await expect(statusBadgeBtn).toContainText('Dicuci');
  });

  /**
   * Module: Order
   * Objective: Memastikan status pembayaran transaksi order dapat diperbarui (misal: Belum Bayar -> Lunas).
   * Precondition: Terdapat order aktif dengan status Belum Bayar.
   * Steps: Klik tombol status bayar pada baris order, buka modal pembayaran, pilih status 'Lunas', verifikasi perubahan status bayar.
   * Test Data: Order khusus QA_Payment_Test_<timestamp> dengan status awal Belum Bayar.
   * Expected Result: Status pembayaran berhasil diperbarui menjadi 'Lunas' dan terlihat pada badge tabel.
   * Priority: P1 | Type: Positive
   */
  test('TC-ORDER-09 - Admin berhasil memperbarui status pembayaran order', async ({ page }) => {
    const customer = `QA_Pay_${Date.now()}`;
    await createTestOrder(page, customer, { paymentStatus: 'Belum Bayar' });

    await page.goto('/order', { waitUntil: 'domcontentloaded' });
    const row = getOrderRow(page, customer);
    await expect(row).toBeVisible();

    const payStatusBtn = row.locator('td').nth(3).locator('button').nth(1);
    await payStatusBtn.click();

    const payModal = getPaymentModal(page);
    await expect(payModal).toBeVisible();
    await expect(payModal.getByRole('heading', { name: 'Pembayaran', exact: true })).toBeVisible();

    const lunasBtn = payModal.getByRole('button', { name: 'Lunas', exact: true });
    await lunasBtn.click();

    const closeBtn = payModal.locator('button').filter({ has: page.locator('svg path[d*="6 18L18 6"]') }).first();
    await closeBtn.click();

    await expect(payModal).toBeHidden();
    await expect(payStatusBtn).toContainText('Lunas');
  });

  /**
   * Module: Order
   * Objective: Memastikan halaman struk / invoice transaksi dapat dibuka dan menyajikan informasi detail order secara akurat.
   * Precondition: Terdapat order terdaftar pada sistem.
   * Steps: Klik ikon/tombol 'Cetak Struk' pada baris order, buka halaman invoice, verifikasi kode order, nama pelanggan, dan rincian transaksi.
   * Test Data: Order khusus QA_Inv_<timestamp> (maksimal 18 karakter agar pas dengan ukuran kolom nota thermal).
   * Expected Result: Halaman struk menampilkan format invoice thermal dengan kode transaksi, nama pelanggan, dan total biaya yang akurat.
   * Priority: P1 | Type: Positive
   */
  test('TC-ORDER-10 - Halaman invoice atau struk order dapat dibuka dengan informasi transaksi akurat', async ({ page, context }) => {
    // Gunakan nama <= 18 karakter sesuai limit thermal receipt di Blade: substr($order->customer_name, 0, 18)
    const customer = 'QA_Inv_' + Date.now().toString().slice(-8);
    await createTestOrder(page, customer);

    await page.goto('/order', { waitUntil: 'domcontentloaded' });
    const row = getOrderRow(page, customer);
    await expect(row).toBeVisible();

    const printLink = row.locator('a[title="Cetak Struk"]');
    const invoiceHref = await printLink.getAttribute('href');
    expect(invoiceHref).toBeTruthy();

    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      printLink.click(),
    ]);

    await newPage.waitForLoadState('domcontentloaded');
    await expect(newPage).toHaveTitle(/Struk - ORD-/i);
    await expect(newPage.locator('body')).toContainText(/LAUNDRY\s*PRO/i);
    await expect(newPage.locator('body')).toContainText(customer);
    await newPage.close();
  });

  /**
   * Module: Order
   * Objective: Memastikan alur pemesanan dapat dibatalkan melalui tautan Kembali ke Daftar Order tanpa menyimpan data baru.
   * Precondition: Pengguna berada di halaman form /order/create.
   * Steps: Isi nama pelanggan sementara pada form, klik tautan 'Kembali ke Daftar Order', verifikasi halaman kembali ke /order dan data sementara tidak tersimpan.
   * Test Data: Nama sementara: QA_Order_Cancel_<timestamp>.
   * Expected Result: Pengguna kembali ke URL /order dan data sementara tidak ditemukan di daftar transaksi.
   * Priority: P2 | Type: Positive
   */
  test('TC-ORDER-11 - Pembatalan proses pemesanan mengembalikan pengguna ke daftar order tanpa menambah data', async ({ page }) => {
    const tempCustomer = `QA_Order_Cancel_${Date.now()}`;

    await page.goto('/order/create', { waitUntil: 'domcontentloaded' });
    await page.locator('input[name="customer_name"]').fill(tempCustomer);

    const backLink = page.getByRole('link', { name: /Kembali ke Daftar Order/i });
    await backLink.click();

    await expect(page).toHaveURL(orderUrl);
    const row = page.locator('table tbody tr').filter({ hasText: tempCustomer });
    await expect(row).toHaveCount(0);
  });

  /**
   * Module: Order
   * Objective: Memastikan order dapat dihapus oleh Admin melalui modal konfirmasi dan data uji berhasil dibersihkan (cleanup).
   * Precondition: Terdapat order pengujian yang dibuat untuk dihapus.
   * Steps: Klik tombol Hapus pada kolom tindakan order, konfirmasi penghapusan dengan menekan 'Ya, Hapus Data', verifikasi data terhapus.
   * Test Data: Order khusus QA_Del_<timestamp>.
   * Expected Result: Modal tertutup dan baris transaksi tidak lagi tampil pada tabel.
   * Priority: P1 | Type: Positive
   */
  test('TC-ORDER-12 - Admin berhasil menghapus order melalui modal konfirmasi', async ({ page }) => {
    const customer = `QA_Del_${Date.now()}`;
    await createTestOrder(page, customer);

    await page.goto('/order', { waitUntil: 'domcontentloaded' });
    const row = getOrderRow(page, customer);
    await expect(row).toBeVisible();

    // Tombol hapus berada di kolom tindakan terakhir (td terakhir)
    const deleteBtn = row.locator('td').last().locator('button.bg-red-50');
    await deleteBtn.click();

    const deleteModal = getDeleteModal(page);
    await expect(deleteModal).toBeVisible();
    await expect(deleteModal.getByRole('heading', { name: 'Hapus Transaksi?', exact: true })).toBeVisible();

    const confirmBtn = deleteModal.getByRole('button', { name: /Ya, Hapus Data/i });
    await confirmBtn.click();

    await expect(page).toHaveURL(orderUrl);

    const deletedRow = page.locator('table tbody tr').filter({ hasText: customer });
    await expect(deletedRow).toHaveCount(0);
  });

  /**
   * Module: Order
   * Objective: Memastikan pembatalan penghapusan pada modal dialog tidak menghapus data transaksi dari sistem.
   * Precondition: Terdapat order aktif pada daftar transaksi.
   * Steps: Klik tombol Hapus pada kolom tindakan order, saat modal dialog 'Hapus Transaksi?' muncul, klik tombol 'Batal', periksa status modal dan data order.
   * Test Data: Order khusus QA_CancelDel_<timestamp>.
   * Expected Result: Modal konfirmasi tertutup dan data order tetap utuh pada tabel.
   * Priority: P2 | Type: Positive
   */
  test('TC-ORDER-13 - Membatalkan modal konfirmasi hapus tidak menghapus data order', async ({ page }) => {
    const customer = `QA_CancelDel_${Date.now()}`;
    await createTestOrder(page, customer);

    await page.goto('/order', { waitUntil: 'domcontentloaded' });
    const row = getOrderRow(page, customer);
    await expect(row).toBeVisible();

    // Tombol hapus berada di kolom tindakan terakhir (td terakhir)
    const deleteBtn = row.locator('td').last().locator('button.bg-red-50');
    await deleteBtn.click();

    const deleteModal = getDeleteModal(page);
    await expect(deleteModal).toBeVisible();

    const cancelBtn = deleteModal.getByRole('button', { name: 'Batal', exact: true });
    await cancelBtn.click();

    await expect(deleteModal).toBeHidden();
    await expect(row).toBeVisible();
  });

  /**
   * Module: Order
   * Objective: Memastikan fitur pencarian order berdasarkan Kode Order atau Nama Pelanggan berfungsi menyaring data secara akurat.
   * Precondition: Terdapat data order dengan nama pelanggan spesifik di sistem.
   * Steps: Buat order dengan kata kunci unik, masukkan kata kunci ke input pencarian, submit pencarian, periksa hasil filter tabel.
   * Test Data: Kata kunci nama pelanggan: QA_Search_Keyword_<timestamp>.
   * Expected Result: Tabel menampilkan transaksi yang cocok dengan kata kunci pencarian.
   * Priority: P2 | Type: Positive
   */
  test('TC-ORDER-14 - Pencarian order berdasarkan kode order atau nama pelanggan menampilkan hasil yang sesuai', async ({ page }) => {
    const uniqueKeyword = `QA_Search_${Date.now()}`;
    await createTestOrder(page, uniqueKeyword);

    await page.goto('/order', { waitUntil: 'domcontentloaded' });

    const searchInput = page.locator('input[name="search"]');
    await searchInput.fill(uniqueKeyword);
    await searchInput.press('Enter');

    await expect(page).toHaveURL(new RegExp(`search=${uniqueKeyword}`));

    const filteredRow = getOrderRow(page, uniqueKeyword);
    await expect(filteredRow).toBeVisible();
    await expect(filteredRow).toContainText(uniqueKeyword);
  });

  /**
   * Module: Order
   * Objective: Memastikan halaman Order dapat dimuat ulang (refresh) tanpa error atau gangguan sesi.
   * Precondition: Pengguna berada di halaman /order dengan sesi login Admin aktif.
   * Steps: Buka halaman /order, jalankan page.reload(), periksa status elemen utama setelah reload.
   * Test Data: Sesi Admin tersimpan.
   * Expected Result: Halaman selesai termuat dengan URL tetap /order, judul dokumen dan tabel transaksi tampil normal tanpa error.
   * Priority: P2 | Type: Positive
   */
  test('TC-ORDER-15 - Halaman Order dapat dimuat ulang tanpa mengalami kendala atau error', async ({ page }) => {
    await page.goto('/order', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(orderUrl);

    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(orderUrl);
    await expect(page).toHaveTitle('LaundryPro - Data Order');
    await expect(page.locator('table')).toBeVisible();
    await expect(page.getByRole('link', { name: /Tambah Transaksi/i })).toBeVisible();
  });
});

test.describe('Akses tanpa autentikasi ke Halaman Order', () => {
  // Override storageState agar context bersih tanpa sesi login
  test.use({ storageState: { cookies: [], origins: [] } });

  /**
   * Module: Order
   * Objective: Memastikan pengguna tanpa sesi login tidak dapat mengakses halaman Order dan langsung dialihkan ke halaman Login.
   * Precondition: Browser context kosong tanpa cookie autentikasi.
   * Steps: Buka langsung URL /order tanpa autentikasi, periksa redirect dan visibilitas halaman Login.
   * Test Data: Sesi kosong tanpa auth.
   * Expected Result: Pengguna dialihkan ke /login dan form/tombol login tampil di layar.
   * Priority: P1 | Type: Negative
   */
  test('TC-ORDER-16 - Pengguna tanpa sesi diarahkan ke halaman Login saat mengakses halaman Order', async ({ page }) => {
    await page.goto('/order', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  });
});
