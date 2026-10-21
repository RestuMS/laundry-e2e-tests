# Catatan QA Automation

## Kondisi Saat Ini

- Setup autentikasi Admin dan Owner sudah terpisah, masing-masing menyimpan `auth.json` sendiri.
- Test Login positif/negatif dan akses Dashboard tanpa sesi sudah tersedia.
- Test Dashboard Admin telah diperkuat (TC-DASH-ADMIN-01 s/d 07 dan 10 s/d 17): verifikasi kartu statistik, format Rupiah, canvas grafik pemasukan, stabilitas reload tanpa error JS, kelengkapan menu navigasi sidebar, tabel pesanan terbaru, panel pelanggan baru, tombol aksi tambah order & search bar, serta interaksi buka/tutup notifikasi.
- Akun Owner dummy berhasil dipakai untuk masuk ke halaman `/owner`.
- File test Layanan Admin telah diimplementasikan (TC-LAYANAN-ADMIN-01 s/d 13): verifikasi judul & heading halaman, elemen antarmuka, struktur kartu layanan & empty state, interaksi buka/tutup modal tambah/edit, validasi HTML5 client-side (required & min=0), validasi error server-side Laravel via noValidate, alur CRUD lengkap (Create, Read, Update, Delete dengan konfirmasi browser), serta pengalihan akses tanpa autentikasi.
- File test Order Admin telah diimplementasikan dan 100% Lulus (TC-ORDER-01 s/d 16): verifikasi akses Admin & judul halaman, struktur tabel & header kolom, alur form Tambah Order, pembuatan order valid, validasi client-side field wajib kosong, validasi penolakan kuantitas non-positif/0, kalkulasi otomatis subtotal/diskon/total, pembaruan status workflow (Diterima -> Dicuci), pembaruan status bayar (Belum Bayar -> Lunas), cetak struk thermal invoice, pembatalan form order, penghapusan order via modal popup konfirmasi (cleanup), pembatalan dialog hapus, pencarian live server query, reload halaman tanpa error, dan proteksi redirect bagi pengguna tanpa sesi.

## Prioritas Pengembangan

1. **[SELESAI] Perkuat test Dashboard Admin**
   Assertion terhadap elemen khas dan kartu statistik telah diverifikasi penuh.

2. **[SELESAI] Tambahkan test Order**
   16 skenario pengujian positif dan negatif telah diimplementasikan secara deterministik dan terisolasi dengan hasil 100% PASS.

3. **Dokumentasikan Bug & Observasi Modul Order**
   Pencatatan bug UI pada validasi kuantitas (ketiadaan atribut `min="0.01"` di frontend) dan observasi truncation struk thermal di `BUG_REPORT_ORDER.md`.

4. **Tambahkan test Modul Pelanggan (Customer Management)**
   Implementasikan test suite `tests/admin/pelanggan/pelanggan.spec.ts` mencakup pencarian, penambahan pelanggan baru, validasi nomor handphone, pengubahan status/tier, dan hapus pelanggan.

5. **Perluas test Modul Owner & Laporan**
   Lengkapi `tests/owner/owner.spec.ts` untuk pengujian Executive Overview, Laporan Pemasukan, dan ekspor dokumen PDF/Excel.

6. **Uji batas akses antar-role (RBAC)**
   Pastikan Admin, Kasir, dan Owner dibatasi secara ketat hanya pada rute dan fungsi sesuai hak akses masing-masing. Pertahankan test pengguna tanpa sesi yang diarahkan ke Login.

5. **Jaga isolasi dan keamanan data**
   Gunakan database khusus testing dengan seed yang dapat diulang dan cleanup yang konsisten. File JSON kredensial dan `auth.json` hanya untuk lokal serta tetap di-ignore Git; gunakan environment secrets untuk CI.

6. **Lengkapi bukti saat test gagal**
   Pertimbangkan screenshot saat gagal dan trace yang dapat diakses pada rerun/retry, agar investigasi kegagalan lebih mudah.

## Perintah Validasi

- `npx playwright test --list`: daftar test tanpa menjalankannya.
- `npm run test:auth`: test autentikasi Admin.
- `npm run test:admin`: setup Admin dan test modul Admin.
- `npm run test:owner`: setup Owner dan test Owner.
- Jalankan suite penuh hanya terhadap server dan database testing yang aman.

## Kriteria Siap untuk Suite Lebih Luas

- Test Dashboard, Layanan, dan Order memiliki assertion terhadap perilaku atau UI yang relevan, bukan hanya URL.
- Test dapat diulang tanpa bergantung pada urutan atau data sisa dari test sebelumnya.
- Setup Admin dan Owner menghasilkan sesi masing-masing secara independen.
- Semua transaksi yang dibuat test menggunakan data khusus testing dan tidak menyentuh data produksi.
