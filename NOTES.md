# Catatan QA Automation

## Kondisi Saat Ini

- Setup autentikasi Admin dan Owner sudah terpisah, masing-masing menyimpan `auth.json` sendiri.
- Test Login positif/negatif dan akses Dashboard tanpa sesi sudah tersedia.
- Test Dashboard Admin telah diperkuat (TC-DASH-ADMIN-01 s/d 07 dan 10 s/d 17): verifikasi kartu statistik, format Rupiah, canvas grafik pemasukan, stabilitas reload tanpa error JS, kelengkapan menu navigasi sidebar, tabel pesanan terbaru, panel pelanggan baru, tombol aksi tambah order & search bar, serta interaksi buka/tutup notifikasi.
- Akun Owner dummy berhasil dipakai untuk masuk ke halaman `/owner`.
- File test Layanan Admin telah diimplementasikan (TC-LAYANAN-ADMIN-01 s/d 13): verifikasi judul & heading halaman, elemen antarmuka, struktur kartu layanan & empty state, interaksi buka/tutup modal tambah/edit, validasi HTML5 client-side (required & min=0), validasi error server-side Laravel via noValidate, alur CRUD lengkap (Create, Read, Update, Delete dengan konfirmasi browser), serta pengalihan akses tanpa autentikasi. File test Order saat ini masih berupa file kosong.

## Prioritas Pengembangan

1. **Perkuat test Dashboard Admin**
   Selain memeriksa URL, verifikasi heading atau elemen khas Dashboard agar test memastikan halaman benar-benar dimuat.

2. **Tambahkan test Order**
   Siapkan pelanggan dan order dummy yang deterministik. Verifikasi alur/status order tanpa mengubah transaksi nyata.

4. **Uji batas akses antar-role**
   Pastikan Admin dan Owner hanya dapat mengakses halaman sesuai haknya. Pertahankan juga test pengguna tanpa sesi yang diarahkan ke Login.

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
