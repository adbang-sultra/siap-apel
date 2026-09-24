# SIAP APEL — Sistem Informasi Apel Pejabat

Aplikasi pencatatan & rekapitulasi kehadiran Apel Pagi/Sore untuk Pejabat Administrator dan Fungsional Ahli Madya — Sekretariat Daerah Provinsi Sulawesi Tenggara.

Versi ini adalah **situs statis murni** (HTML/CSS/JS, tanpa proses build) yang terhubung langsung ke **Supabase** sebagai database, dan siap di-deploy ke **Vercel**.

## Struktur folder

```
siap-apel/
├─ index.html            Halaman utama aplikasi
├─ css/styles.css         Semua styling
├─ js/config.js           Kredensial koneksi Supabase (WAJIB diisi)
├─ js/db.js                Lapisan akses data (query ke Supabase)
├─ js/app.js               Logika UI aplikasi
├─ assets/logo.png         Logo Provinsi Sulawesi Tenggara
├─ supabase/schema.sql     Skrip SQL pembuatan tabel + data awal
├─ vercel.json             Konfigurasi deploy Vercel
└─ README.md
```

## 1. Menyiapkan database Supabase

1. Buat akun/project baru di [supabase.com](https://supabase.com) (gratis untuk skala kecil-menengah).
2. Masuk ke project Anda → menu **SQL Editor** → **New query**.
3. Salin seluruh isi file `supabase/schema.sql`, tempel, lalu klik **Run**.
   - Ini akan membuat tabel `biro`, `pegawai`, `kehadiran`, mengaktifkan Row Level Security (RLS), dan mengisi beberapa data contoh (silakan diubah/dihapus nanti lewat aplikasi).
4. Buka menu **Project Settings → API**. Catat dua nilai berikut:
   - **Project URL**
   - **anon / public key**

## 2. Menghubungkan aplikasi ke Supabase

Buka file `js/config.js` dan isi dengan nilai dari langkah di atas:

```js
window.SIAP_APEL_CONFIG = {
  SUPABASE_URL: 'https://xxxxxxxx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOi........',
};
```

> Kunci **anon** aman ditaruh di kode front-end (bukan rahasia) karena akses data tetap dibatasi oleh RLS. **Jangan pernah** memakai `service_role key` di file ini.

## 3. Menjalankan secara lokal (opsional, untuk pratinjau)

Karena aplikasi ini murni statis, cukup jalankan server statis apa saja dari dalam folder `siap-apel/`, misalnya:

```bash
npx serve .
# atau
python3 -m http.server 5500
```

Lalu buka `http://localhost:5500` (atau port yang ditampilkan) di browser.

## 4. Deploy ke Vercel

**Opsi A — via Vercel CLI (tercepat):**

```bash
npm install -g vercel
cd siap-apel
vercel        # ikuti instruksi login & pengaturan project
vercel --prod # deploy ke production
```

**Opsi B — via dashboard Vercel + Git (direkomendasikan untuk tim):**

1. Push folder `siap-apel/` ini ke repository GitHub/GitLab/Bitbucket.
2. Di [vercel.com](https://vercel.com) → **Add New Project** → pilih repository tersebut.
3. Framework preset: pilih **Other** (situs statis, tidak perlu build command).
   - Build Command: kosongkan
   - Output Directory: `.` (root)
4. Klik **Deploy**. Selesai — aplikasi langsung online dengan URL `*.vercel.app`.

Karena kredensial Supabase berada di `js/config.js` (bukan environment variable), tidak ada langkah tambahan environment variable yang diperlukan di Vercel. Pastikan saja file tersebut sudah terisi sebelum di-push/deploy.

## 5. Keamanan & catatan penting

- Skema `supabase/schema.sql` mengaktifkan RLS dengan kebijakan yang **mengizinkan baca & tulis oleh siapa pun yang memegang anon key** (cocok untuk aplikasi internal di jaringan terbatas/terpercaya, tanpa login).
- Jika aplikasi ini akan diakses lebih luas / publik, disarankan menambahkan **Supabase Auth** (misalnya login email/password untuk operator), lalu mengganti kebijakan RLS di `schema.sql` dari `using (true)` menjadi pengecekan `auth.uid()` / role tertentu.
- Menghapus data pegawai akan **ikut menghapus seluruh riwayat kehadirannya** (relasi `ON DELETE CASCADE`). Gunakan tombol **Nonaktifkan** jika hanya ingin menghentikan pencatatan tanpa kehilangan riwayat.
- Fitur **Backup (JSON)** di menu Pengaturan tetap tersedia sebagai arsip/cadangan tambahan di luar Supabase.

## 6. Fitur utama

- **Dashboard** — ringkasan kehadiran hari ini (Apel Pagi & Sore) dengan grafik donat proporsi kehadiran, status koneksi database real-time.
- **Data Pegawai** — tambah/edit/nonaktifkan/hapus pegawai, pencarian & filter per biro/jenis jabatan.
- **Input Kehadiran** — input status per pegawai per tanggal & jenis apel, opsi "Hadir Semua".
- **Rekap Kehadiran** — rekap harian atau rentang tanggal, filter jenis apel/jabatan/biro, cetak ke PDF/printer dengan kop surat resmi.
- **Rekap Individu** — riwayat kehadiran per pegawai dalam suatu periode, cetak ke PDF/printer.
- **Pengaturan** — status koneksi Supabase, backup/restore data JSON.
- Perubahan data dari perangkat lain akan otomatis memperbarui Dashboard secara real-time (Supabase Realtime).
- Tampilan responsif: sidebar dapat disembunyikan di layar kecil/mobile.
