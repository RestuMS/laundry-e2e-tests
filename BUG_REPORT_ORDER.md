# QA Bug Report & Design Observations: Modul Order, Pelanggan, & Laporan

**Aplikasi**: LaundryPro Management System  
**Modul**: Order, Dashboard, Pelanggan, & Laporan  
**Tanggal Pengujian**: 20 - 21 Oktober 2026  
**Penulis**: Senior QA Engineer & Playwright Automation Engineer  
**Status Test Suite Order**: 17 / 17 Passed (100% Lulus pada `tests/admin/order/order.spec.ts`)  
**Status Test Suite Pelanggan**: 8 Passed, 9 Failed (Akibat `BUG-CUST-01` pada `tests/admin/pelanggan/pelanggan.spec.ts`)  
**Status Test Suite Laporan**: 9 Passed, 5 Failed (pada `tests/admin/laporan/laporan.spec.ts`)

---

## 1. Temuan Cacat / Bug (Defects)

### BUG-ORD-01: Ketiadaan Atribut Validasi HTML5 `min="0.01"` pada Input Kuantitas / Berat

- **ID Bug**: `BUG-ORD-01`
- **Severity**: **Medium**
- **Priority**: **P2**
- **Komponen**: Form Tambah Transaksi (`/order/create`)
- **File Terdampak**: `resources/views/dashboard/order_create.blade.php` (Baris 140-155)
- **Ringkasan**: Input kuantitas (`qty`) tidak memblokir angka `0` atau angka negatif di sisi browser (client-side), melainkan membiarkan form terkirim ke server sebelum akhirnya ditolak oleh Laravel.

#### Langkah Reproduksi (Steps to Reproduce):
1. Login sebagai Admin dan buka form tambah order: `http://127.0.0.1:8000/order/create`.
2. Isi Nama Pelanggan valid (misal: `QA Customer`).
3. Pilih salah satu layanan dari dropdown.
4. Pada kolom **Qty / Berat**, masukkan nilai `0` atau angka negatif (misal `-2`).
5. Klik tombol **Simpan Order Sekarang**.

#### Hasil Aktual (Actual Result):
- Browser tidak menampilkan popup validasi HTML5.
- Halaman melakukan request POST `/order` ke backend.
- Controller Laravel menangkap error validasi dari `StoreOrderRequest` (`items.*.qty => min:0.01`), lalu melakukan redirect kembali ke `/order/create` dengan pesan error:
  > *"Jumlah item minimal 0.01."*
- State form ter-reset ke nilai default kuantitas (`1`).

#### Hasil yang Diharapkan (Expected Result):
- Input `<input type="number">` memiliki atribut `min="0.01"`.
- Browser langsung memblokir pengiriman form di sisi client dan memfokuskan kursor ke input qty dengan peringatan *"Value must be greater than or equal to 0.01"*, tanpa membebani request ke server Laravel.

#### Rekomendasi Solusi Teknis (Code Fix Recommendation):
Ubah elemen input qty pada file `resources/views/dashboard/order_create.blade.php`:
```diff
- <input type="number" step="0.01" x-model="item.qty" @input="calculate()" :name="'items['+index+'][qty]'" required placeholder="1" class="...">
+ <input type="number" step="0.01" min="0.01" x-model="item.qty" @input="calculate()" :name="'items['+index+'][qty]'" required placeholder="1" class="...">
```

---

### BUG-ORD-02: Ketiadaan Atribut Validasi HTML5 `min="0.01"` pada Input Kuantitas Form Edit Transaksi

- **ID Bug**: `BUG-ORD-02`
- **Severity**: **Medium**
- **Priority**: **P2**
- **Komponen**: Form Edit Transaksi (`/order/{order}/edit`)
- **File Terdampak**: `resources/views/dashboard/order_edit.blade.php` (Baris 135-145)
- **Ringkasan**: Serupa dengan form pembuatan order baru, input kuantitas (`qty`) pada form edit order tidak memiliki atribut HTML5 `min="0.01"`. Pengguna dapat memasukkan angka `0` atau angka negatif tanpa ada pencegahan langsung di sisi browser.

#### Langkah Reproduksi (Steps to Reproduce):
1. Login sebagai Admin dan buka salah satu order untuk diedit: `http://127.0.0.1:8000/order/{id}/edit`.
2. Pada item layanan, ubah kolom **Qty** menjadi `0` atau `-1`.
3. Klik tombol **Simpan Perubahan Order**.

#### Hasil Aktual (Actual Result):
- Browser tidak memblokir pengiriman form di sisi client.
- Request PUT `/order/{id}` dikirim ke backend dan baru ditolak oleh `UpdateOrderRequest` dengan pesan error:
  > *"Jumlah item minimal 0.01."*

#### Hasil yang Diharapkan (Expected Result):
- Input `<input type="number">` memiliki atribut `min="0.01"`.
- Form ditahan langsung di sisi browser dengan validasi native HTML5 sebelum dikirim ke server.

#### Rekomendasi Solusi Teknis (Code Fix Recommendation):
```diff
- <input type="number" step="0.01" x-model="item.qty" @input="calculateEdit()" :name="'items['+index+'][qty]'" required placeholder="1" class="...">
+ <input type="number" step="0.01" min="0.01" x-model="item.qty" @input="calculateEdit()" :name="'items['+index+'][qty]'" required placeholder="1" class="...">
```

---

### BUG-ORD-03: Potongan Diskon Dihitung Dua Kali (Double Discount Deduction) pada Penghitungan `grand_total` Order

- **ID Bug**: `BUG-ORD-03`
- **Severity**: **High (Financial / Business Logic)**
- **Priority**: **P1**
- **Komponen**: Model Order & Modul Kelola Pembayaran (`PaymentController.php`)
- **File Terdampak**: `app/Models/Order.php` (Baris 147-150) & `resources/views/dashboard/order_create.blade.php`
- **Ringkasan**: Nilai field `total_price` di database sudah merupakan harga bersih yang dikurangi diskon oleh kalkulasi frontend Alpine.js. Namun, accessor `getGrandTotalAttribute()` di model `Order.php` kembali mengurangkan diskon untuk kedua kalinya, sehingga sisa tagihan pada modal pembayaran menjadi lebih kecil daripada tagihan nyata.

#### Langkah Reproduksi (Steps to Reproduce):
1. Buat transaksi baru dengan subtotal Rp 50.000 dan Diskon Rp 10.000.
2. Form menghitung Total Tagihan = Rp 40.000 dan menyimpannya ke kolom `total_price` = 40000, `discount` = 10000.
3. Buka modal kelola pembayaran pada daftar order (`openPaymentModal`).
4. Periksa ringkasan `grand_total` dan `remaining` yang dikembalikan oleh endpoint `/order/{id}/payments`.

#### Hasil Aktual (Actual Result):
- Accessor `getGrandTotalAttribute` mengevaluasi formula:
  `$this->total_price - ($this->discount ?? 0) + ($this->tax ?? 0)`
  = `40.000 - 10.000 = Rp 30.000`.
- Pelanggan ditagih Rp 30.000 (diskon terpotong 2x sebesar Rp 20.000), mengakibatkan kerugian finansial pada pencatatan pendapatan laundry.

#### Hasil yang Diharapkan (Expected Result):
- Nilai `grand_total` harus konsisten dengan nilai final tagihan transaksi (`total_price`), yaitu Rp 40.000.

#### Rekomendasi Solusi Teknis (Code Fix Recommendation):
Pada `app/Models/Order.php`, perbaiki accessor `getGrandTotalAttribute`:
```diff
    public function getGrandTotalAttribute(): int
    {
-       return $this->total_price - ($this->discount ?? 0) + ($this->tax ?? 0);
+       // total_price sudah merupakan nilai bersih (subtotal - discount + tax)
+       return (int) $this->total_price;
    }
```

---

### BUG-DASH-01: Inkonsistensi Query Status "Order Diproses" pada Dashboard Admin

- **ID Bug**: `BUG-DASH-01`
- **Severity**: **High (Reporting / Data Inaccuracy)**
- **Priority**: **P1**
- **Komponen**: Dashboard Admin (`DashboardController.php`)
- **File Terdampak**: `app/Http/Controllers/DashboardController.php` (Baris 20)
- **Ringkasan**: Kartu statistik "Order Diproses" pada Admin Dashboard selalu bernilai `0` meskipun ada banyak order yang sedang dikerjakan di tempat laundry (status Dicuci, Dikeringkan, Disetrika, atau Quality Control).

#### Langkah Reproduksi (Steps to Reproduce):
1. Buat 3 order baru di sistem (status otomatis `'Diterima'`).
2. Ubah salah satu order ke status `'Dicuci'` dan order lain ke status `'Disetrika'`.
3. Buka Admin Dashboard: `http://127.0.0.1:8000/dashboard`.
4. Periksa angka statistik pada kartu **Order Diproses**.

#### Hasil Aktual (Actual Result):
- Kartu menampilkan angka `0` (atau hanya menghitung order yang secara eksplisit berstatus string `'Diproses'`).
- Query pada controller adalah:
  `$orderDiproses = Order::where('status', 'Diproses')->count();`
- Padahal pada model `Order::WORKFLOW_STATUSES` dan UI dropdown order, status pengerjaan yang tersedia adalah `'Diterima'`, `'Dicuci'`, `'Dikeringkan'`, `'Disetrika'`, dan `'Quality Control'`.

#### Hasil yang Diharapkan (Expected Result):
- Kartu **Order Diproses** menampilkan jumlah seluruh order aktif yang sedang dalam proses pengerjaan (belum Selesai dan belum Diambil).

#### Rekomendasi Solusi Teknis (Code Fix Recommendation):
Ubah query pada `app/Http/Controllers/DashboardController.php`:
```diff
- $orderDiproses = Order::where('status', 'Diproses')->count();
+ $orderDiproses = Order::whereIn('status', ['Diterima', 'Dicuci', 'Dikeringkan', 'Disetrika', 'Quality Control', 'Diproses'])->count();
```

---

### BUG-DASH-02: Tombol Aksi "Tambah Order", "Lihat Semua", dan Input Pencarian Header pada Dashboard Tidak Berfungsi (Dead UI Elements)

- **ID Bug**: `BUG-DASH-02`
- **Severity**: **Medium**
- **Priority**: **P2**
- **Komponen**: Antarmuka Dashboard Admin (`/dashboard`)
- **File Terdampak**: `resources/views/dashboard/index.blade.php` (Baris 11-25 & Baris 153-158)
- **Ringkasan**: Beberapa tombol aksi dan input pada Dashboard Admin merupakan elemen HTML statis tanpa event handler atau tautan, sehingga pengguna tidak dapat menggunakannya.

#### Rincian Elemen Mati (Dead Elements):
1. **Tombol "Tambah Order" (Header Atas)**:
   - Dibuat menggunakan `<button>` biasa tanpa atribut `onclick`, event `@click`, maupun tag pembungkus `<a>`.
   - Mengklik tombol tidak mengarahkan ke form pembuatan order `/order/create`.
2. **Tombol "Lihat Semua" (Panel Pesanan Terbaru)**:
   - Dibuat menggunakan `<button>` biasa tanpa `href` menuju halaman `/order`.
3. **Input Pencarian Header**:
   - Memiliki placeholder dengan kesalahan ketik: `placeholder="Cari cara borus..."`.
   - Tidak berada di dalam `<form>` dan tidak memiliki event listener JavaScript untuk memfilter data.

#### Hasil yang Diharapkan (Expected Result):
- Tombol "Tambah Order" dibungkus link `<a href="{{ route('order.create') }}">`.
- Tombol "Lihat Semua" dibungkus link `<a href="{{ route('order.index') }}">`.
- Input pencarian diarahkan ke pencarian transaksi `/order?search=...` dengan placeholder yang relevan (misal: `"Cari transaksi atau pelanggan..."`).

#### Rekomendasi Solusi Teknis (Code Fix Recommendation):
Pada `resources/views/dashboard/index.blade.php`:
```diff
- <button class="flex-shrink-0 bg-primary hover:bg-[#4A7CE0] text-white px-6 py-3.5 rounded-[16px] flex items-center gap-2 ...">
-     Tambah Order
- </button>
+ <a href="{{ route('order.create') }}" class="flex-shrink-0 bg-primary hover:bg-[#4A7CE0] text-white px-6 py-3.5 rounded-[16px] flex items-center gap-2 font-semibold text-[14.5px] shadow-[0_8px_20px_rgba(91,141,239,0.3)]">
+     <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
+     Tambah Order
+ </a>

- <button class="text-[13px] font-semibold text-primary ...">Lihat Semua</button>
+ <a href="{{ route('order.index') }}" class="text-[13px] font-semibold text-primary ...">Lihat Semua</a>
```

---

### BUG-DASH-03: Teks Paginasi Statis (Hardcoded Mockup) dan Label Tombol Dummy pada Panel Dashboard

- **ID Bug**: `BUG-DASH-03`
- **Severity**: **Low**
- **Priority**: **P3**
- **Komponen**: Panel Data Dashboard Admin (`/dashboard`)
- **File Terdampak**: `resources/views/dashboard/index.blade.php` (Baris 236-243 & Baris 264)
- **Ringkasan**: Terdapat data tiruan (mockup hardcoded) yang belum diganti dengan data dinamis pada tabel dashboard.

#### Rincian Data Tiruan:
1. **Mockup Paginasi Pesanan Terbaru**:
   - Menampilkan teks statis: `<span>Menampilkan 1-4.053</span>` dengan tombol panah `<button class="... disable">` yang tidak berfungsi.
2. **Label Tombol Panel Pelanggan Baru**:
   - Tombol di bawah daftar pelanggan baru menampilkan teks angka acak: `<button ...>+ 44 2010</button>`.

#### Rekomendasi Solusi Teknis (Code Fix Recommendation):
- Hapus pagination mockup statis atau sambungkan dengan total transaksi dinamis: `<span>Menampilkan {{ $recentOrders->count() }} pesanan terbaru</span>`.
- Ubah label tombol pelanggan baru menjadi: `<a href="{{ route('pelanggan.index') }}" ...>Lihat Semua Pelanggan</a>`.

---

### BUG-CUST-01: Tabel Data Pelanggan Tersembunyi Total pada Tampilan Desktop (>= 1024px) Akibat Class Tailwind `lg:block` Tidak Ter-compile pada Bundle CSS Produksi

- **ID Bug**: `BUG-CUST-01`
- **Severity**: **High**
- **Priority**: **P1**
- **Komponen**: Halaman Manajemen Pelanggan Desktop (`/pelanggan`)
- **File Terdampak**: `resources/views/dashboard/pelanggan.blade.php` (Baris 82) & `public/build/assets/app-*.css`
- **Ringkasan**:
  Kontainer tabel data pelanggan desktop menggunakan class Tailwind `class="hidden lg:block overflow-x-auto custom-scrollbar pb-3 p-2 sm:p-4"`. Namun, class utilitas responsif `lg:block` **tidak ter-compile** ke dalam file asset bundle CSS produksi (`public/build/assets/app-BbODU38p.css`).
  Akibatnya, browser menerapkan deklarasi `.hidden { display: none; }` dan tidak pernah meng-override-nya menjadi `display: block` pada layar desktop ($\ge 1024px$). Di saat yang sama, kontainer tampilan mobile memiliki class `lg:hidden` yang secara benar menerapkan `display: none` pada layar $\ge 1024px$.
  **Dampak Fungsional**: Pengguna atau Admin yang membuka halaman Pelanggan menggunakan layar desktop / laptop melihat area tabel putih kosong melompong (tidak ada baris data, nama, kontak, tombol edit, maupun tombol hapus; hanya bar navigasi paginasi di bagian bawah yang terlihat).

#### Langkah Reproduksi (Steps to Reproduce):
1. Login sebagai Admin dan buka browser dengan ukuran layar desktop standar ($\ge 1024px$, misal `1280x720`).
2. Akses halaman Manajemen Pelanggan: `http://127.0.0.1:8000/pelanggan`.
3. Periksa area di bawah tombol "Tambah Pelanggan" dan form pencarian.

#### Hasil Aktual (Actual Result):
- Area tabel data pelanggan tidak tampil sama sekali (kosong putih).
- Elemen `<div class="hidden lg:block ...">` memiliki computed style `display: none`.
- Elemen `<div class="lg:hidden ...">` juga memiliki computed style `display: none`.
- Tidak ada data pelanggan yang dapat dilihat, diedit, atau dihapus oleh pengguna desktop.

#### Hasil yang Diharapkan (Expected Result):
- Kontainer tabel pelanggan desktop memiliki computed style `display: block` pada viewport desktop ($\ge 1024px$), sehingga tabel beserta data pelanggan tampil lengkap.

#### Rekomendasi Solusi Teknis (Code Fix Recommendation):
1. Jalankan proses build Vite di root project aplikasi Laravel:
   ```bash
   npm run build
   ```
   agar Tailwind CSS memindai `resources/views/dashboard/pelanggan.blade.php` dan menyertakan class `@media (min-width: 1024px) { .lg\:block { display: block; } }` ke dalam asset bundle produksi.
2. Alternatif solusi defensif pada file `resources/views/dashboard/pelanggan.blade.php`:
   ```diff
   - <div class="hidden lg:block overflow-x-auto custom-scrollbar pb-3 p-2 sm:p-4">
   + <div class="hidden lg:block overflow-x-auto custom-scrollbar pb-3 p-2 sm:p-4" style="display: block;">
   ```

---

### BUG-CUST-02: Karakter Mojibake / Teks Ikon Korup (`dY"? `) pada Informasi Alamat Card Mobile Pelanggan

- **ID Bug**: `BUG-CUST-02`
- **Severity**: **Low**
- **Priority**: **P3**
- **Komponen**: Card List Pelanggan Tampilan Mobile (`/pelanggan`)
- **File Terdampak**: `resources/views/dashboard/pelanggan.blade.php` (Baris 188)
- **Ringkasan**:
  Pada template card mobile pelanggan, baris alamat mencetak karakter rusak / mojibake `dY"? `:
  ```blade
  @if($customer->address)
  <div class="text-[11px] text-slate-400 font-medium mt-0.5 truncate">dY"? {{ $customer->address }}</div>
  @endif
  ```
  Hal ini disebabkan oleh encoding unicode emoji (seperti ikon pin lokasi 📍) yang terdistorsi saat penyimpanan file template.

#### Rekomendasi Solusi Teknis (Code Fix Recommendation):
Ganti karakter korup tersebut dengan SVG icon atau Phosphor Icon yang valid:
```diff
- <div class="text-[11px] text-slate-400 font-medium mt-0.5 truncate">dY"? {{ $customer->address }}</div>
+ <div class="text-[11px] text-slate-400 font-medium mt-0.5 truncate flex items-center gap-1">
+     <svg class="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
+     <span>{{ $customer->address }}</span>
+ </div>
```

---

### BUG-LAP-01: Kontrol "Filter Default" Tidak Menggunakan Semantic Tag `<a>` / `<button>` atau `role="button"` (Accessibility Defect)

- **ID Bug**: `BUG-LAP-01`
- **Severity**: **Medium**
- **Priority**: **P2**
- **Komponen**: Toolbar Filter Tanggal Halaman Laporan (`/laporan`)
- **File Terdampak**: `resources/views/dashboard/laporan.blade.php` (atau template terkait toolbar filter)
- **Ringkasan**:
  Elemen kontrol "Filter Default" dirender menggunakan static text container (`<div>` / `<span>`) tanpa tag semantic interaktif `<a>` atau `<button>`, serta tanpa atribut aksesibilitas `role="button"` atau `tabindex="0"`.
  **Dampak Fungsional**:
  1. Kontrol tidak dapat difokuskan atau diaktifkan oleh pengguna yang menggunakan navigasi keyboard (tidak aksesibel).
  2. Screen reader dan accessibility tree browser memperlakukan elemen ini hanya sebagai static text node (`- text: Filter Default Pilih Hari/Tgl`), bukan sebagai pemicu aksi (actionable control).
  3. Playwright accessibility role locator `getByRole('button')` atau `getByRole('link')` gagal menemukan elemen ini (`TC-LAPORAN-09` gagal timeout).

#### Langkah Reproduksi (Steps to Reproduce):
1. Login sebagai Admin dan buka rute laporan berparameter tanggal: `http://127.0.0.1:8000/laporan?tanggal=2024-01-15`.
2. Buka DevTools Browser (Inspect Element) pada teks **Filter Default**.
3. Coba lakukan navigasi tombol Tab keyboard untuk menuju ke kontrol "Filter Default".

#### Hasil Aktual (Actual Result):
- Elemen tidak memiliki tag `<a>` maupun `<button>`, dan tidak memiliki `role="button"`.
- Tab keyboard melompati teks "Filter Default" dan langsung fokus ke input date picker.
- Pohon aksesibilitas (Accessibility Tree) mencatat:
  ```yaml
  - text: Filter Default Pilih Hari/Tgl
  - textbox
  ```

#### Hasil yang Diharapkan (Expected Result):
- Elemen menggunakan semantic link atau button:
  `<a href="{{ route('laporan.index') }}" role="button" class="...">Filter Default</a>`
- Pengguna keyboard dapat memfokuskan elemen dan menekan `Enter` / `Space` untuk mereset filter tanggal kembali ke kondisi awal.

#### Rekomendasi Solusi Teknis (Code Fix Recommendation):
Ganti elemen teks pembungkus "Filter Default" dengan semantic anchor link:
```diff
- <span class="...">Filter Default</span>
+ <a href="{{ route('laporan.index') }}" role="button" class="inline-flex items-center text-xs font-semibold text-primary hover:underline cursor-pointer">Filter Default</a>
```

---

### BUG-LAP-02: Ketiadaan Visualisasi / Empty State Rendering pada Panel "Distribusi Layanan"

- **ID Bug**: `BUG-LAP-02`
- **Severity**: **Low**
- **Priority**: **P3**
- **Komponen**: Panel Distribusi Layanan Halaman Laporan (`/laporan`)
- **File Terdampak**: `resources/views/dashboard/laporan.blade.php`
- **Ringkasan**:
  Panel "Distribusi Layanan" menampilkan heading level 3 dan subjudul deskriptif *"Estimasi kontribusi per produk."*, namun area konten visual di dalamnya kosong melompong (tidak ada elemen canvas, donut/bar chart, maupun placeholder teks empty state).
  **Dampak Visual**:
  Tampilan kartu terlihat seperti fitur yang terpotong atau belum selesai dikembangkan (*unfinished component*) ketika Admin meninjau laporan analitik operasional.

#### Hasil Aktual (Actual Result):
- Kontainer card hanya memuat teks judul tanpa ada elemen visual grafik maupun pesan fallback.

#### Hasil yang Diharapkan (Expected Result):
- Jika data transaksi layanan tersedia: Tampilkan chart visualisasi (misal Doughnut Chart via Chart.js).
- Jika data transaksi layanan belum ada: Tampilkan ilustrasi empty state informatif, misal: *"Belum ada data distribusi pesanan layanan pada periode ini."*.

---

## 2. Observasi Desain & Antarmuka (UX & Design Observations)

### OBS-ORD-01: Pemotongan (Truncation) Nama Pelanggan pada Cetak Struk Thermal

- **Komponen**: Cetak Struk / Invoice Thermal (`/order/{order}/invoice`)
- **File Terdampak**: `resources/views/dashboard/order_invoice.blade.php` (Baris 78)
- **Implementasi Saat Ini**:
  ```blade
  <span class="font-bold uppercase">{{ substr($order->customer_name, 0, 18) }}</span>
  ```
- **Observasi**:
  Nama pelanggan yang panjangnya lebih dari 18 karakter secara otomatis dipotong tanpa tanda elipsis (`...`). Contoh: `QA_Invoice_Test_1792478550205` dicetak menjadi `QA_INVOICE_TEST_17`.
- **Rekomendasi**:
  Jika pemotongan ditujukan untuk menjaga kerapian kertas thermal 58mm, pertimbangkan untuk menggunakan wrapping teks multi-baris (`word-break: break-word`) atau menambahkan elipsis (`...`) jika nama terpotong, agar nama pelanggan pada struk fisik tetap mudah dikenali.

---

### OBS-ORD-02: Ketiadaan Filter Dropdown Status dan Tanggal pada Halaman Order

- **Komponen**: Toolbar Halaman Order (`/order`)
- **File Terdampak**: `resources/views/dashboard/order.blade.php`
- **Observasi**:
  Di atas tabel transaksi hanya tersedia input pencarian teks (`input[name="search"]`) yang memfilter Nama Pelanggan, Kode Order, dan Nomor HP. Belum terdapat tombol/dropdown cepat untuk menyaring order berdasarkan:
  1. **Status Alur Kerja**: Filter `Diterima`, `Diproses`, `Selesai`, `Diambil`.
  2. **Status Pembayaran**: Filter `Belum Bayar`, `DP`, `Lunas`.
  3. **Rentang Tanggal**: Hari ini, Minggu ini, Bulan ini.
- **Rekomendasi**:
  Tambahkan dropdown filter status pada form pencarian di `order.blade.php` dan sesuaikan query builder di `OrderController::index()` agar Admin/Kasir dapat mengelola transaksi bervolume tinggi dengan lebih efisien.

---

### OBS-ORD-03: Multiple Element Match pada Direktif Alpine.js Modal

- **Komponen**: Modal Popup Konfirmasi Hapus & Kelola Pembayaran
- **File Terdampak**: `resources/views/dashboard/order.blade.php`
- **Observasi QA Automation**:
  Elemen backdrop (`div.absolute`) dan elemen container luar (`div.fixed`) keduanya menggunakan `x-show="deleteModalOpen"` / `x-show="paymentModalOpen"`. Selector umum seperti `div[x-show="deleteModalOpen"]` menghasilkan 3 node di DOM tree.
- **Rekomendasi**:
  Pada sisi test automation Playwright, pastikan selalu menggunakan selector spesifik `div.fixed[x-show="deleteModalOpen"]` untuk menghindari ambiguitas strict mode.

---

### OBS-LAP-01: Ketiadaan Tabel Rincian Transaksi, Filter Status Pembayaran, dan Paginasi pada Modul Laporan

- **Komponen**: Halaman Utama Laporan & Analitik (`/laporan`)
- **Observasi Arsitektur & Bisnis**:
  Halaman Laporan saat ini difungsikan sebagai dashboard ringkasan eksekutif (agregat 4 kartu metrik dan grafik trend pemasukan bulanan). Tidak tersedia:
  1. **Tabel Data Transaksi Detail**: Admin tidak dapat melihat daftar transaksi individual (No Nota, Tanggal, Pelanggan, Layanan, Subtotal, Status Bayar) secara langsung di halaman web.
  2. **Filter Status Transaksi**: Tidak ada penyaringan berdasarkan status bayar (*Lunas*, *Belum Lunas*, *Dibatalkan*).
  3. **Rentang Tanggal (Date Range Picker)**: Hanya tersedia *single date picker* (`PILIH HARI/TGL`), bukan rentang Tanggal Mulai s/d Tanggal Selesai.
- **Dampak Pengujian Otomasi**:
  Skenario `TC-LAPORAN-05` (validasi Tanggal Selesai < Tanggal Mulai) dan `TC-LAPORAN-06` (filter status) tidak dapat diimplementasikan karena komponen UI terkait tidak disediakan oleh desain aplikasi saat ini.
- **Rekomendasi**:
  Tambahkan tabel rincian transaksi di bawah grafik analitik lengkap dengan filter status pembayaran, date range picker (Start - End Date), dan paginasi server-side agar Admin dapat melakukan audit data sebelum mengekspor PDF/Excel.

---

### OBS-LAP-02: Ambiguitas Keyword "Pemasukan" pada DOM Tree Menimbulkan Strict Mode Collision

- **Komponen**: Kartu Ringkasan Metrik & Panel Grafik Trend (`/laporan`)
- **Observasi QA Automation**:
  Kata teks "PEMASUKAN" hadir pada kartu ringkasan keuangan (`PEMASUKAN (21 OCT 2026)`) dan sekaligus hadir pada heading panel grafik (`Trend Pemasukan Bulanan`). Karena kedua elemen dibungkus oleh container kartu Tailwind `.glass-panel` yang seragam, locator filter berbasis teks `/PEMASUKAN/i` pada Playwright menghasilkan 2 node elemen (strict mode violation pada `TC-LAPORAN-02` dan `TC-LAPORAN-08`).
- **Rekomendasi**:
  Tambahkan penanda atribut uji yang unik pada elemen kartu ringkasan, misalnya `data-testid="summary-card-income"` atau class spesifik `report-card-income` agar locator automation tidak rentan terhadap duplikasi kata kunci antar-komponen.

---

### OBS-LAP-03: Indikator Trend Persentase Menggunakan Icon SVG Tanpa Text/Aria-label Unicode

- **Komponen**: Badge Trend Persentase Kartu Ringkasan
- **Observasi Aksesibilitas**:
  Indikator arah panah (naik/turun) pada badge persentase (misal `2.4%`, `14.5%`) dirender murni sebagai SVG icon inline tanpa teks deskriptor unicode (`↑` atau `↓`) dan tanpa atribut `aria-label="naik 2.4%"`. Akibatnya, `innerText` hanya menghasilkan `"2.4%"` atau `"14.5%"` tanpa konteks arah fluktuasi, dan screen reader tidak dapat mengumumkan apakah angka tersebut merepresentasikan kenaikan atau penurunan omset.
- **Rekomendasi**:
  Sertakan teks tersembunyi untuk screen reader: `<span class="sr-only">Naik</span> 2.4%` atau tambahkan `aria-label="Kenaikan 2.4%"`.

---

## 3. Matriks Hasil Pengujian Otomasi (Test Execution Matrix)

| Test Case ID | Modul | Jenis | Status | Durasi Rata-rata |
| :--- | :--- | :--- | :--- | :--- |
| **TC-ORDER-01** | Order | Positive | **PASS** | 3.8s |
| **TC-ORDER-02** | Order | Positive | **PASS** | 4.7s |
| **TC-ORDER-03** | Order | Positive | **PASS** | 6.3s |
| **TC-ORDER-04** | Order | Positive | **PASS** | 5.3s |
| **TC-ORDER-05** | Order | **Negative** | **PASS** | 9.0s |
| **TC-ORDER-06** | Order | **Negative** | **PASS** | 5.5s |
| **TC-ORDER-07** | Order | Positive | **PASS** | 3.6s |
| **TC-ORDER-08** | Order | Positive | **PASS** | 12.7s |
| **TC-ORDER-09** | Order | Positive | **PASS** | 10.8s |
| **TC-ORDER-10** | Order | Positive | **PASS** | 8.0s |
| **TC-ORDER-11** | Order | Positive | **PASS** | 4.3s |
| **TC-ORDER-12** | Order | Positive | **PASS** | 7.3s |
| **TC-ORDER-13** | Order | Positive | **PASS** | 7.2s |
| **TC-ORDER-14** | Order | Positive | **PASS** | 7.1s |
| **TC-ORDER-15** | Order | Positive | **PASS** | 2.8s |
| **TC-ORDER-16** | Order | **Negative** | **PASS** | 1.0s |

---

### Modul Pelanggan (`tests/admin/pelanggan/pelanggan.spec.ts`)

| Test Case ID | Modul | Jenis | Status | Durasi | Keterangan / Root Cause |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-PELANGGAN-01** | Pelanggan | Positive | **PASS** | 1.2s | Berhasil membuka rute `/pelanggan` dan mengenali title serta heading. |
| **TC-PELANGGAN-02** | Pelanggan | Positive | **FAIL** | 5.9s | Tabel desktop tersembunyi (`display: none`) akibat `BUG-CUST-01`. |
| **TC-PELANGGAN-03** | Pelanggan | Positive | **PASS** | 1.6s | Modal tambah pelanggan berhasil dibuka dengan komponen input lengkap. |
| **TC-PELANGGAN-04** | Pelanggan | Positive | **FAIL** | 8.1s | Data tersimpan di DB, namun assertion baris tabel gagal akibat `BUG-CUST-01`. |
| **TC-PELANGGAN-05** | Pelanggan | **Negative** | **PASS** | 1.8s | Validasi field wajib `full_name` (`valueMissing: true`) berfungsi normal. |
| **TC-PELANGGAN-06** | Pelanggan | **Negative** | **PASS** | 3.0s | Validasi nomor HP > 20 karakter memunculkan pesan error server dengan benar. |
| **TC-PELANGGAN-08** | Pelanggan | Positive | **FAIL** | 9.8s | Tombol edit tidak dapat diklik karena baris tabel tersembunyi akibat `BUG-CUST-01`. |
| **TC-PELANGGAN-09** | Pelanggan | Positive | **FAIL** | 8.4s | Tombol edit tidak dapat diklik karena baris tabel tersembunyi akibat `BUG-CUST-01`. |
| **TC-PELANGGAN-10** | Pelanggan | Positive | **FAIL** | 9.6s | Tombol hapus tidak dapat diklik karena baris tabel tersembunyi akibat `BUG-CUST-01`. |
| **TC-PELANGGAN-11** | Pelanggan | Positive | **FAIL** | 9.3s | Tombol hapus tidak dapat diklik karena baris tabel tersembunyi akibat `BUG-CUST-01`. |
| **TC-PELANGGAN-12** | Pelanggan | Positive | **FAIL** | 9.2s | Tampilan kolom tabel tidak dapat diverifikasi akibat `BUG-CUST-01`. |
| **TC-PELANGGAN-13** | Pelanggan | Positive | **FAIL** | 10.6s | Baris hasil pencarian tidak dapat diverifikasi akibat `BUG-CUST-01`. |
| **TC-PELANGGAN-15** | Pelanggan | Positive | **FAIL** | 7.4s | Assertion elemen `table` gagal karena tersembunyi akibat `BUG-CUST-01`. |
| **TC-PELANGGAN-16** | Pelanggan | **Negative** | **PASS** | 0.8s | Akses rute `/pelanggan` tanpa sesi login dialihkan ke `/login`. |
| **TC-PELANGGAN-17** | Pelanggan | **Negative** | **PASS** | 2.8s | Pencarian dengan keyword acak berhasil menampilkan empty state. |
| **TC-PELANGGAN-18** | Pelanggan | **Negative** | **PASS** | 3.2s | Validasi server nama > 255 karakter memunculkan pesan error dengan benar. |

---

### Modul Laporan (`tests/admin/laporan/laporan.spec.ts`)

| Test Case ID | Modul | Jenis | Status | Durasi | Keterangan / Root Cause |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-LAPORAN-01** | Laporan | Positive | **PASS** | 2.1s | Berhasil membuka rute `/laporan` setelah login Admin dan mengenali heading "Laporan & Analitik". |
| **TC-LAPORAN-02** | Laporan | Positive | **FAIL** | 2.0s | Strict mode violation: kata "PEMASUKAN" terduplikasi pada kartu metrik dan panel grafik `Trend Pemasukan Bulanan` (`OBS-LAP-02`). |
| **TC-LAPORAN-03** | Laporan | Positive | **PASS** | 4.4s | Input tanggal (`input[type="date"]`) dapat dipilih dan diisi dengan format valid. |
| **TC-LAPORAN-04** | Laporan | Positive | **PASS** | 2.8s | Halaman memproses submit filter tanggal dan data ringkasan tetap valid. |
| **TC-LAPORAN-07** | Laporan | Positive | **PASS** | 1.8s | Empty state saat filter tanggal masa depan menampilkan Rp 0 tanpa karakter rusak NaN/null/undefined. |
| **TC-LAPORAN-08** | Laporan | Positive | **FAIL** | 1.2s | Strict mode violation: locator kartu PEMASUKAN ambigu dengan panel grafik Trend Pemasukan Bulanan (`OBS-LAP-02`). |
| **TC-LAPORAN-09** | Laporan | Positive | **FAIL** | 7.0s | Kontrol "Filter Default" dirender sebagai plain static text tanpa semantic `<a>` / `<button>` / `role="button"` (`BUG-LAP-01`). |
| **TC-LAPORAN-10** | Laporan | Positive | **PASS** | 16.6s | Tombol "Export PDF" berhasil dipicu dan membuka stream download/cetak dokumen PDF. |
| **TC-LAPORAN-11** | Laporan | Positive | **PASS** | 1.9s | Tombol "Export Excel" berhasil dipicu dan mengunduh file spreadsheet laporan. |
| **TC-LAPORAN-12** | Laporan | Positive | **FAIL** | 6.9s | Canvas grafik Trend Pemasukan Bulanan berada di dalam hirarki kontainer terpisah yang tidak terjangkau locator heading-to-canvas (`OBS-LAP-04`). |
| **TC-LAPORAN-13** | Laporan | Positive | **PASS** | 1.7s | Heading dan panel kontainer "Distribusi Layanan" berhasil diverifikasi tampil. |
| **TC-LAPORAN-14** | Laporan | Positive | **FAIL** | 1.1s | Badge trend persentase menggunakan inline SVG icon tanpa teks panah unicode `↑/↓` (`OBS-LAP-03`). |
| **TC-LAPORAN-15** | Laporan | Positive | **PASS** | 2.1s | Halaman Laporan dapat dimuat ulang (refresh) tanpa error JavaScript atau runtime exception. |
| **TC-LAPORAN-16** | Laporan | **Negative** | **PASS** | 1.3s | Pengguna tanpa sesi login yang mengakses `/laporan` diarahkan kembali ke `/login`. |
