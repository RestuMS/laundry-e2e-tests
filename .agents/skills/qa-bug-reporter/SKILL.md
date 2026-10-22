---
name: qa-bug-reporter
description: Standar pembuatan laporan bug (QA Bug Report) untuk temuan issue fungsional, UI/responsif, maupun logika bisnis pada aplikasi Laundry. Gunakan saat mendokumentasikan temuan bug hasil test Playwright.
---

# QA Bug Reporting Guidelines

Format laporan bug mengacu pada standar dokumentasi di `BUG_REPORT_ORDER.md`.

## 1. Klasifikasi Prioritas (Priority Matrix)
- **P1 (Critical / High)**:
  - Error logika bisnis / finansial (misal: perhitungan diskon ganda, grand total salah).
  - Tampilan desktop blank total atau data utama tidak muncul (misal: tabel hilang).
  - Test case utama crash atau gagal redirect.
- **P2 (Medium)**:
  - Validasi form kurang ketat atau pesan error tidak sesuai.
  - Fitur sekunder tidak merespons (misal: filter dropdown tertentu tidak bekerja).
- **P3 (Low / Minor)**:
  - Masalah estetika / kosmetik UI, typo teks label, alignment icon minor.

## 2. Struktur Template Bug Report
Setiap temuan bug harus didokumentasikan dengan format:

```markdown
### [ID-BUG]: [Judul Temuan Bug yang Singkat & Jelas]

- **ID Bug**: `BUG-[MODUL]-[NOMOR]`
- **Severity**: Critical / High / Medium / Low
- **Priority**: P1 / P2 / P3
- **Komponen**: [Nama halaman / komponen / controller]
- **File Terdampak**: [Path file view/controller/css beserta nomor baris]
- **Ringkasan**: [Penjelasan singkat mengenai akar permasalahan / perilaku anomali]

#### Langkah Reproduksi (Steps to Reproduce):
1. [Langkah 1]
2. [Langkah 2]
3. [Langkah 3]

#### Hasil yang Diharapkan (Expected Result):
[Deskripsi perilaku sistem yang benar]

#### Hasil Aktual (Actual Result):
[Deskripsi perilaku sistem saat bug terjadi]

#### Dampak Fungsional:
[Dampak langsung terhadap user atau alur transaksi bisnis]

#### Rekomendasi Solusi:
[Cuplikan kode perbaikan atau rekomendasi patch untuk developer]
```
