---
name: playwright-e2e-tester
description: Panduan eksekusi, penulisan, dan debugging Playwright E2E tests pada aplikasi Laundry Management (Laravel + Tailwind). Gunakan saat membuat, menjalankan, atau mendebug skenario test.
---

# Playwright E2E Testing Guidelines

## 1. Lingkungan & Server
- **Base URL**: `http://127.0.0.1:8000`
- **Backend**: Laravel berjalan via `php artisan serve`.
- **Frontend**: Blade + Tailwind CSS (bundled via Vite).

## 2. Autentikasi & State
- Jangan lakukan proses login berulang pada setiap test case.
- Manfaatkan state sesi admin yang tersimpan di `tests/admin/auth.json` menggunakan:
  ```typescript
  test.use({ storageState: 'tests/admin/auth.json' });
  ```

## 3. Penamaan Test Case & File
- **Format ID**: `TC-[MODUL]-ADMIN-[NOMOR]` (contoh: `TC-DASH-ADMIN-01`, `TC-LAP-ADMIN-02`, `TC-ORD-ADMIN-03`).
- **Lokasi File**: `tests/admin/<nama-modul>/<nama-modul>.spec.ts`.
- **Judul Test**: Gunakan kalimat deskriptif yang jelas dalam bahasa Indonesia (contoh: `Admin berhasil memfilter laporan berdasarkan rentang tanggal`).

## 4. Eksekusi Test
Jalankan test secara terfokus per modul untuk efisiensi:
```bash
# Menjalankan spesifik satu modul
npx playwright test tests/admin/<modul>/<modul>.spec.ts

# Menjalankan dengan mode heading atau debug jika diperlukan
npx playwright test tests/admin/<modul>/<modul>.spec.ts --headed
```

## 5. Viewport & Responsivitas
- **Desktop**: Standar `1280x720` atau `1536x730` (perhatikan class seperti `lg:block`, `lg:hidden`).
- **Mobile**: Standar `390x844` jika menguji tampilan drawer / responsive cards.
- Pastikan tidak ada bug compile Tailwind (misalnya elemen desktop hilang karena class `lg:block` ter-override `hidden`).
