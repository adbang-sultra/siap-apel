// =====================================================================
// SIAP APEL — Lapisan Akses Data (Supabase) — Versi Pejabat
// Memakai client bersama dari js/supabase-init.js (window.SB)
// =====================================================================

const STATUS_LIST = ['HADIR', 'SAKIT', 'IZIN', 'TUGAS_LUAR', 'TK'];
const STATUS_LABEL = { HADIR: 'Hadir', SAKIT: 'Sakit', IZIN: 'Izin', TUGAS_LUAR: 'Tugas Luar', TK: 'Tanpa Keterangan' };

const throwIfError = window.throwIfError;
function client() {
  return window.SB.client();
}

const DB = {
  isConfigured() {
    return window.SB.isConfigured();
  },
  configError() {
    return window.SB.configError();
  },

  // ---------------- BIRO ----------------
  async listBiro() {
    const { data, error } = await client().from('biro').select('*').order('urutan', { ascending: true });
    throwIfError(error);
    return data.map((b) => b.nama);
  },

  // ---------------- PEGAWAI ----------------
  async listPegawai() {
    const { data, error } = await client().from('pegawai').select('*').order('nama', { ascending: true });
    throwIfError(error);
    return data.map(rowToPegawai);
  },

  async insertPegawai(p) {
    const { data, error } = await client()
      .from('pegawai')
      .insert({
        nama: p.nama,
        nip: p.nip,
        biro: p.biro,
        jabatan: p.jabatan,
        jenis_jabatan: p.jenisJabatan,
        aktif: p.aktif,
      })
      .select()
      .single();
    throwIfError(error);
    return rowToPegawai(data);
  },

  async updatePegawai(id, p) {
    const { data, error } = await client()
      .from('pegawai')
      .update({
        nama: p.nama,
        nip: p.nip,
        biro: p.biro,
        jabatan: p.jabatan,
        jenis_jabatan: p.jenisJabatan,
        aktif: p.aktif,
      })
      .eq('id', id)
      .select()
      .single();
    throwIfError(error);
    return rowToPegawai(data);
  },

  async setAktifPegawai(id, aktif) {
    const { error } = await client().from('pegawai').update({ aktif }).eq('id', id);
    throwIfError(error);
  },

  async deletePegawai(id) {
    const { error } = await client().from('pegawai').delete().eq('id', id);
    throwIfError(error);
  },

  // ---------------- KEHADIRAN ----------------
  async listKehadiran({ dari, sampai, jenisApel, pegawaiId } = {}) {
    let q = client().from('kehadiran').select('*');
    if (dari) q = q.gte('tanggal', dari);
    if (sampai) q = q.lte('tanggal', sampai);
    if (jenisApel) q = q.eq('jenis_apel', jenisApel);
    if (pegawaiId) q = q.eq('pegawai_id', pegawaiId);
    const { data, error } = await q;
    throwIfError(error);
    return data.map(rowToKehadiran);
  },

  async upsertKehadiranBatch(tanggal, jenisApel, entries) {
    // entries: [{pegawaiId, status, keterangan}]
    // Hapus dulu data lama utk tanggal+jenisApel ini, lalu insert baru
    // (menyamai perilaku "replace" pada versi localStorage)
    const del = await client().from('kehadiran').delete().eq('tanggal', tanggal).eq('jenis_apel', jenisApel);
    throwIfError(del.error);
    const rows = entries.map((e) => ({
      tanggal,
      jenis_apel: jenisApel,
      pegawai_id: e.pegawaiId,
      status: e.status,
      keterangan: e.keterangan || '',
    }));
    const { error } = await client().from('kehadiran').insert(rows);
    throwIfError(error);
  },

  // ---------------- BACKUP / RESTORE ----------------
  async exportAll() {
    const [pegawai, kehadiran] = await Promise.all([this.listPegawai(), this.listKehadiran()]);
    return { pegawai, kehadiran, exportedAt: new Date().toISOString() };
  },

  async importAll(pegawaiArr, kehadiranArr) {
    // Hapus semua data lama, lalu masukkan data baru.
    throwIfError((await client().from('kehadiran').delete().neq('id', '00000000-0000-0000-0000-000000000000')).error);
    throwIfError((await client().from('pegawai').delete().neq('id', '00000000-0000-0000-0000-000000000000')).error);

    const pegawaiRows = pegawaiArr.map((p) => ({
      id: p.id,
      nama: p.nama,
      nip: p.nip,
      biro: p.biro,
      jabatan: p.jabatan,
      jenis_jabatan: p.jenisJabatan,
      aktif: p.aktif,
    }));
    if (pegawaiRows.length) throwIfError((await client().from('pegawai').insert(pegawaiRows)).error);

    const kehadiranRows = kehadiranArr.map((k) => ({
      tanggal: k.tanggal,
      jenis_apel: k.jenisApel,
      pegawai_id: k.pegawaiId,
      status: k.status,
      keterangan: k.keterangan || '',
    }));
    if (kehadiranRows.length) throwIfError((await client().from('kehadiran').insert(kehadiranRows)).error);
  },

  // ---------------- REALTIME ----------------
  subscribeChanges(onChange) {
    return client()
      .channel('siap-apel-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pegawai' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kehadiran' }, onChange)
      .subscribe();
  },
};

function rowToPegawai(r) {
  return { id: r.id, nama: r.nama, nip: r.nip, biro: r.biro, jabatan: r.jabatan, jenisJabatan: r.jenis_jabatan, aktif: r.aktif };
}
function rowToKehadiran(r) {
  return { id: r.id, tanggal: r.tanggal, jenisApel: r.jenis_apel, pegawaiId: r.pegawai_id, status: r.status, keterangan: r.keterangan, waktuInput: r.waktu_input };
}

window.DB = DB;
window.STATUS_LIST = STATUS_LIST;
window.STATUS_LABEL = STATUS_LABEL;
