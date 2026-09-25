# SIAP APEL — Versi Pejabat

Aplikasi pencatatan & rekapitulasi kehadiran Apel Pagi/Sore untuk Pejabat Administrator dan Fungsional Ahli Madya — Sekretariat Daerah Provinsi Sulawesi Tenggara.

Situs statis (HTML/CSS/JS, tanpa proses build) yang terhubung langsung ke **Supabase** sebagai database, dan siap di-deploy ke **Vercel**. Aplikasi ini berdiri sendiri — tidak bergantung pada aplikasi/proyek lain.

## Struktur folder

```
siap-apel-pejabat/
├─ index.html            Halaman utama aplikasi
├─ css/styles.css         Semua styling
├─ js/
│  ├─ config.js            Kredensial koneksi Supabase (WAJIB diisi)
│  ├─ supabase-init.js     Inisialisasi client Supabase
│  ├─ db.js                 Lapisan akses data (query ke Supabase)
│  └─ app.js                 Logika UI aplikasi
├─ assets/logo.png         Logo Provinsi Sulawesi Tenggara
├─ supabase/schema.sql     Skrip SQL pembuatan tabel + data awal
├─ vercel.json             Konfigurasi deploy Vercel
└─ README.md
```

## 1. Menyiapkan database Supabase

1. Buat akun/project baru di [supabase.com](https://supabase.com).
2. Masuk ke project Anda → menu **SQL Editor** → **New query**.
3. Salin seluruh isi file `supabase/schema.sql`, tempel, lalu klik **Run**.
   - Ini membuat tabel `biro`, `pegawai`, `kehadiran`, mengaktifkan Row Level Security (RLS), dan mengisi beberapa data contoh (silakan diubah/dihapus nanti lewat aplikasi).
4. Buka **Project Settings → API**. Catat **Project URL** dan **anon / public key**.

## 2. Menghubungkan aplikasi ke Supabase

Buka `js/config.js` dan isi:

```js
window.SIAP_APEL_CONFIG = {
  SUPABASE_URL: 'https://xxxxxxxx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOi........',
};
```

> Kunci **anon** aman ditaruh di kode front-end karena akses data dibatasi oleh RLS. Jangan pernah memakai `service_role key` di sini.

## 3. Menjalankan secara lokal (opsional)

```bash
npx serve .
# atau
python3 -m http.server 5500
```

## 4. Deploy ke Vercel

**Opsi A — CLI:**
```bash
npm install -g vercel
cd siap-apel-pejabat
vercel
vercel --prod
```

**Opsi B — Dashboard + Git:**
1. Push folder ini ke repository GitHub/GitLab/Bitbucket.
2. Di [vercel.com](https://vercel.com) → **Add New Project** → pilih repository.
3. Framework preset: **Other** (situs statis). Build Command kosong, Output Directory `.`.
4. **Deploy**.

## 5. Keamanan & catatan

- RLS pada `schema.sql` mengizinkan baca & tulis oleh siapa pun yang memegang anon key — cocok untuk aplikasi internal tanpa login. Untuk akses lebih luas, tambahkan Supabase Auth dan sesuaikan kebijakan RLS.
- Menghapus data pegawai akan ikut menghapus seluruh riwayat kehadirannya (`ON DELETE CASCADE`). Gunakan tombol **Nonaktifkan** jika hanya ingin menghentikan pencatatan tanpa kehilangan riwayat.
- Fitur **Backup (JSON)** di menu Pengaturan tersedia sebagai arsip tambahan di luar Supabase.

## 6. Fitur utama

- **Dashboard** — ringkasan kehadiran hari ini dengan grafik donat, status koneksi database real-time.
- **Data Pegawai** — tambah/edit/nonaktifkan/hapus, pencarian & filter per biro/jenis jabatan.
- **Input Kehadiran** — input status per pegawai per tanggal & jenis apel, opsi "Hadir Semua".
- **Rekap Kehadiran** — harian atau rentang tanggal, filter jenis apel/jabatan/biro, cetak PDF/printer dengan kop surat resmi.
- **Rekap Individu** — riwayat kehadiran per pegawai, cetak PDF/printer.
- **Pengaturan** — status koneksi Supabase, backup/restore data JSON.
- Perubahan data dari perangkat lain otomatis memperbarui Dashboard (Supabase Realtime).
- Tampilan responsif, sidebar dapat disembunyikan di layar kecil/mobile.
