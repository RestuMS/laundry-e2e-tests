---
name: gsheet-testcase-sync
description: Panduan sinkronisasi dan pencatatan hasil test case Playwright ke Google Spreadsheet. Gunakan saat mengisi, merapikan, atau menyelaraskan test case pada Google Sheets.
---

# Google Sheets Test Case Sync Guidelines

## 1. Struktur 13 Kolom Header Wajib
Setiap sheet modul (Login, Dashboard, Layanan, Laporan, Order, Pelanggan, dll.) mengikuti susunan 13 kolom standar berikut:

| No | Nama Kolom | Keterangan Format |
| :-: | :--- | :--- |
| 1 | **TC ID** | Kode unik skenario test (contoh: `TC-01`) |
| 2 | **Module** | Nama modul yang diuji (contoh: `Layanan Admin`, `Dashboard Admin`) |
| 3 | **Scenario** | Judul skenario pengujian deskriptif (tanpa mengulang TC ID) |
| 4 | **Precondition** | Prasyarat sebelum pengujian (contoh: `Sesi Admin valid (auth.json)`, `Data layanan tersedia`) |
| 5 | **Steps** | Langkah pengujian bertingkat dengan penomoran angka (`1.`, `2.`, `3.`, dst.) |
| 6 | **Test Data** | Nilai input atau data uji yang ringkas dan jelas |
| 7 | **Expected Result** | Perilaku sistem yang diharapkan terjadi |
| 8 | **Actual Result** | Hasil observasi aktual saat test Playwright dieksekusi |
| 9 | **Test Type** | Klasifikasi test (`Positive Test` / `Negative Test`) |
| 10 | **Status** | Status pengujian (`Passed` / `Failed` / `Tested`) |
| 11 | **Test PIC** | Nama QA / Penanggung jawab eksekusi test (contoh: `QA Engineer` / `Restu MS`) |
| 12 | **Test Date** | Tanggal eksekusi test (format: `YYYY-MM-DD` atau `DD/MM/YYYY`) |
| 13 | **Notes** | Catatan tambahan, nomor tiket bug (misal: `BUG-ORD-03`), atau keterangan penting lainnya |

## 2. Aturan Tampilan & Styling Header
- **Posisi Header**: Wajib berada tepat di **Baris 1** (A1 sampai M1).
- **Warna Background Kolom Header**: Warna **Hijau** (misalnya Hijau Google Sheets Table `#274e13` atau `#137333`).
- **Format Font Teks Header**: **Bold (Tebal)** dan berwarna **Putih (`#FFFFFF`)**.
- **Perataan (Alignment)**: Teks di-set **Center** atau rata tengah vertikal (*middle alignment*).
- **Pembekuan Baris**: Freeze **Baris 1** agar header tetap terlihat saat data di-scroll.

## 3. Ketentuan Pengisian Baris Data
- **Baris 2**: Langsung dimulai dengan data test case pertama (`TC ID` pertama). Tidak boleh ada baris header duplikat di baris 2.
- **Format Steps**: Gunakan newline untuk memisahkan tiap langkah:
  ```text
  1. Akses halaman /layanan
  2. Klik tombol "Tambah Layanan"
  3. Isi form nama layanan dan tarif
  4. Klik tombol "Simpan"
  ```
- **Format Test Data**: Ringkas dan terstruktur (tidak menaruh log atau debug dump yang terlalu panjang).
