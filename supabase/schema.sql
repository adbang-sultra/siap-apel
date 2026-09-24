-- =====================================================================
-- SIAP APEL — Skema Database Supabase
-- Sistem Informasi Apel Pejabat | Setda Provinsi Sulawesi Tenggara
-- =====================================================================
-- Cara pakai:
-- 1. Buka project Supabase Anda -> SQL Editor -> New query
-- 2. Tempel seluruh isi file ini -> Run
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Tabel: biro
-- Daftar biro di lingkungan Sekretariat Daerah
-- ---------------------------------------------------------------------
create table if not exists biro (
  id           uuid primary key default gen_random_uuid(),
  nama         text not null unique,
  urutan       integer not null default 0,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Tabel: pegawai
-- ---------------------------------------------------------------------
create table if not exists pegawai (
  id             uuid primary key default gen_random_uuid(),
  nama           text not null,
  nip            text not null unique,
  biro           text not null,
  jabatan        text not null,
  jenis_jabatan  text not null check (jenis_jabatan in ('Administrator','Fungsional Ahli Madya')),
  aktif          boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_pegawai_biro on pegawai (biro);
create index if not exists idx_pegawai_aktif on pegawai (aktif);
create index if not exists idx_pegawai_nama on pegawai (nama);

-- ---------------------------------------------------------------------
-- Tabel: kehadiran
-- ---------------------------------------------------------------------
create table if not exists kehadiran (
  id            uuid primary key default gen_random_uuid(),
  tanggal       date not null,
  jenis_apel    text not null check (jenis_apel in ('Apel Pagi','Apel Sore')),
  pegawai_id    uuid not null references pegawai(id) on delete cascade,
  status        text not null check (status in ('HADIR','SAKIT','IZIN','TUGAS_LUAR','TK')),
  keterangan    text default '',
  waktu_input   timestamptz not null default now(),
  unique (tanggal, jenis_apel, pegawai_id)
);

create index if not exists idx_kehadiran_tanggal on kehadiran (tanggal);
create index if not exists idx_kehadiran_pegawai on kehadiran (pegawai_id);
create index if not exists idx_kehadiran_jenis on kehadiran (jenis_apel);

-- ---------------------------------------------------------------------
-- Trigger: auto-update updated_at pada pegawai
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_pegawai_updated_at on pegawai;
create trigger trg_pegawai_updated_at
  before update on pegawai
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security
-- Catatan keamanan: kebijakan di bawah ini mengizinkan akses baca/tulis
-- menggunakan kunci "anon" (dipakai langsung di browser). Ini cocok
-- untuk aplikasi internal yang dipakai di jaringan terbatas/terpercaya.
-- Jika aplikasi akan diakses publik, tambahkan Supabase Auth dan ganti
-- kebijakan "true" di bawah dengan pengecekan auth.uid() / role.
-- ---------------------------------------------------------------------
alter table biro enable row level security;
alter table pegawai enable row level security;
alter table kehadiran enable row level security;

drop policy if exists "biro_select" on biro;
create policy "biro_select" on biro for select using (true);
drop policy if exists "biro_write" on biro;
create policy "biro_write" on biro for all using (true) with check (true);

drop policy if exists "pegawai_select" on pegawai;
create policy "pegawai_select" on pegawai for select using (true);
drop policy if exists "pegawai_write" on pegawai;
create policy "pegawai_write" on pegawai for all using (true) with check (true);

drop policy if exists "kehadiran_select" on kehadiran;
create policy "kehadiran_select" on kehadiran for select using (true);
drop policy if exists "kehadiran_write" on kehadiran;
create policy "kehadiran_write" on kehadiran for all using (true) with check (true);

-- ---------------------------------------------------------------------
-- Data awal: Biro
-- ---------------------------------------------------------------------
insert into biro (nama, urutan) values
  ('Biro Administrasi Pimpinan', 1),
  ('Biro Umum', 2),
  ('Biro Organisasi', 3),
  ('Biro Pemerintahan', 4),
  ('Biro Kesejahteraan Rakyat', 5),
  ('Biro Hukum', 6),
  ('Biro Perekonomian', 7),
  ('Biro Administrasi Pembangunan', 8),
  ('Biro Pengadaan Barang dan Jasa Pemerintah', 9)
on conflict (nama) do nothing;

-- ---------------------------------------------------------------------
-- Data awal: Pegawai (contoh data — silakan sesuaikan/hapus)
-- ---------------------------------------------------------------------
insert into pegawai (nama, nip, biro, jabatan, jenis_jabatan, aktif) values
  ('Drs. Andi Wirawan, M.Si.', '196805121994031002', 'Biro Administrasi Pimpinan', 'Kepala Biro Administrasi Pimpinan', 'Administrator', true),
  ('Wa Ode Fitriani, S.IP., M.M.', '198507172010012006', 'Biro Administrasi Pimpinan', 'Analis Kebijakan Ahli Madya', 'Fungsional Ahli Madya', true),
  ('Muhammad Fajar, S.Sos., M.AP.', '198006202006041003', 'Biro Umum', 'Kepala Biro Umum', 'Administrator', true),
  ('Arifuddin, S.Kom., M.Kom.', '198111052008011002', 'Biro Umum', 'Pranata Komputer Ahli Madya', 'Fungsional Ahli Madya', true),
  ('Rahmawati Sari, S.H., M.H.', '197303151998032005', 'Biro Organisasi', 'Kepala Biro Organisasi', 'Administrator', true),
  ('Herlina Dewi, S.Psi., M.Psi.', '197609221999032002', 'Biro Organisasi', 'Analis SDM Aparatur Ahli Madya', 'Fungsional Ahli Madya', false),
  ('La Ode Zainal, S.IP., M.Si.', '197505142001121002', 'Biro Pemerintahan', 'Kepala Biro Pemerintahan', 'Administrator', true),
  ('Nurul Hikmah, S.STP., M.Si.', '198609102008022003', 'Biro Pemerintahan', 'Analis Kebijakan Ahli Madya', 'Fungsional Ahli Madya', true),
  ('Sitti Aminah, S.Sos., M.M.', '197211302000032001', 'Biro Kesejahteraan Rakyat', 'Kepala Biro Kesejahteraan Rakyat', 'Administrator', true),
  ('Muh. Yusuf, S.Sos., M.Si.', '198310052010011004', 'Biro Kesejahteraan Rakyat', 'Penyuluh Sosial Ahli Madya', 'Fungsional Ahli Madya', true),
  ('Andi Muh. Ikram, S.H., M.H.', '197804182003121001', 'Biro Hukum', 'Kepala Biro Hukum', 'Administrator', true),
  ('Wa Ode Sartika, S.H., M.H.', '198702202011012005', 'Biro Hukum', 'Perancang Peraturan Perundang-undangan Ahli Madya', 'Fungsional Ahli Madya', true),
  ('Hasanuddin, S.E., M.Si.', '197106252001121001', 'Biro Perekonomian', 'Kepala Biro Perekonomian', 'Administrator', true),
  ('Rosmawati, S.E., M.M.', '198409152009022004', 'Biro Perekonomian', 'Analis Kebijakan Ahli Madya', 'Fungsional Ahli Madya', true),
  ('Muhammad Iqbal, S.T., M.T.', '197609302003121002', 'Biro Administrasi Pembangunan', 'Kepala Biro Administrasi Pembangunan', 'Administrator', true),
  ('Nirmala Sari, S.E., M.M.', '198302142010012007', 'Biro Administrasi Pembangunan', 'Perencana Ahli Madya', 'Fungsional Ahli Madya', true),
  ('Ahmad Fauzi, S.T., M.T.', '197505202002121003', 'Biro Pengadaan Barang dan Jasa Pemerintah', 'Kepala Biro Pengadaan Barang dan Jasa Pemerintah', 'Administrator', true),
  ('Yuliana Putri, S.E., M.M.', '198801082012022002', 'Biro Pengadaan Barang dan Jasa Pemerintah', 'Pengelola Pengadaan Barang/Jasa Ahli Madya', 'Fungsional Ahli Madya', true)
on conflict (nip) do nothing;
