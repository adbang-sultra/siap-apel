// =====================================================================
// SIAP APEL — Logika Aplikasi
// =====================================================================

const LOGO_SULTRA = 'assets/logo.png';
let BIRO_LIST = [];
let PEGAWAI = [];
let currentInput = {}; // {pegawaiId:{status,keterangan}}

const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtTgl = (iso) => {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};
function biroIndex(b) {
  const i = BIRO_LIST.indexOf(b);
  return i < 0 ? 999 : i;
}
function toast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type === 'error' ? ' error' : '');
  clearTimeout(window._tt);
  window._tt = setTimeout(() => t.classList.add('hidden'), 3200);
}
function esc(s) {
  return (s ?? '').toString().replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
async function safeCall(fn, errMsg) {
  try {
    return await fn();
  } catch (err) {
    console.error(err);
    toast((errMsg || 'Terjadi kesalahan') + ': ' + err.message, 'error');
    throw err;
  }
}

// ---------------- CONNECTION STATUS ----------------
async function checkConnection() {
  const banner = document.getElementById('configBanner');
  const badge = document.getElementById('connBadge');
  const badgeText = document.getElementById('connBadgeText');
  const dot = document.getElementById('liveDot');
  const connText = document.getElementById('connText');
  const pengInfo = document.getElementById('pengaturanConnInfo');

  if (!DB.isConfigured()) {
    banner.style.display = 'block';
    badge.classList.add('off');
    badgeText.textContent = 'Belum dikonfigurasi';
    dot.classList.add('off');
    connText.textContent = 'Supabase belum dikonfigurasi';
    pengInfo.innerHTML = '⚠️ Aplikasi belum terhubung ke Supabase. Lengkapi <code>js/config.js</code> lalu muat ulang halaman.';
    return false;
  }
  try {
    await DB.listBiro();
    banner.style.display = 'none';
    badge.classList.remove('off');
    badgeText.textContent = 'Terhubung';
    dot.classList.remove('off');
    connText.textContent = 'Terhubung ke Supabase';
    pengInfo.innerHTML = '✅ Terhubung ke database Supabase. Perubahan data disimpan langsung ke server.';
    return true;
  } catch (err) {
    banner.style.display = 'block';
    banner.innerHTML = '⚠️ <b>Gagal terhubung ke Supabase.</b> Periksa kembali SUPABASE_URL / SUPABASE_ANON_KEY pada <code>js/config.js</code>, pastikan skrip <code>supabase/schema.sql</code> sudah dijalankan, dan periksa koneksi internet. Detail: ' + esc(err.message);
    badge.classList.add('off');
    badgeText.textContent = 'Terputus';
    dot.classList.add('off');
    connText.textContent = 'Gagal terhubung';
    pengInfo.innerHTML = '❌ Gagal terhubung ke Supabase: ' + esc(err.message);
    return false;
  }
}

// ---------------- SIDEBAR (mobile) ----------------
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
document.getElementById('btnHamburger').addEventListener('click', () => {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('show');
});
sidebarOverlay.addEventListener('click', closeSidebar);
function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('show');
}

// ---------------- NAVIGATION ----------------
const PAGE_TITLES = { dashboard: 'Dashboard', pegawai: 'Data Pegawai', input: 'Input Kehadiran', rekap: 'Rekap Kehadiran', individu: 'Rekap Individu', pengaturan: 'Pengaturan' };
document.querySelectorAll('.nav-item').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const page = btn.dataset.page;
    document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    document.getElementById('pageTitle').textContent = PAGE_TITLES[page];
    closeSidebar();
    if (page === 'dashboard') renderDashboard();
    if (page === 'pegawai') renderPegawai();
    if (page === 'input') renderInputTable();
    if (page === 'individu') fillIndividuSelect();
  });
});
document.getElementById('todayLabel').textContent = fmtTgl(todayStr());

// ---------------- BIRO DROPDOWNS ----------------
function fillBiroDropdowns() {
  const opts = BIRO_LIST.map((b) => `<option value="${esc(b)}">${esc(b)}</option>`).join('');
  document.getElementById('filterBiro').innerHTML = '<option value="">Semua Biro</option>' + opts;
  document.getElementById('rekapBiro').innerHTML = '<option value="">Semua Biro</option>' + opts;
  document.getElementById('pegawaiBiro').innerHTML = opts;
}

// ---------------- DASHBOARD ----------------
const STATUS_COLOR = { HADIR: '#1F8A57', SAKIT: '#B8860B', IZIN: '#2563A8', TUGAS_LUAR: '#7A4FB5', TK: '#C0392B' };

function statCardsHtml(c) {
  const cls = { HADIR: 'hadir', SAKIT: 'sakit', IZIN: 'izin', TUGAS_LUAR: 'tugas', TK: 'tk' };
  return STATUS_LIST.map((s) => `<div class="stat ${cls[s]}"><div class="n">${c[s]}</div><div class="l">${STATUS_LABEL[s]}</div></div>`).join('');
}

function renderDonut(counts, totalDenom) {
  const svg = document.getElementById('donutPagi');
  const r = 15.9155, cx = 18, cy = 18, circumference = 2 * Math.PI * r;
  let offset = 0;
  let circles = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#E4E9F0" stroke-width="4"></circle>`;
  const hadirCount = counts.HADIR || 0;
  const recorded = STATUS_LIST.reduce((a, s) => a + (counts[s] || 0), 0);
  const belum = Math.max(0, totalDenom - recorded);
  const segments = STATUS_LIST.map((s) => ({ key: s, val: counts[s] || 0, color: STATUS_COLOR[s] }));
  if (belum > 0) segments.push({ key: 'BELUM', val: belum, color: '#C9D3DE' });
  segments.forEach((seg) => {
    if (!seg.val || !totalDenom) return;
    const frac = seg.val / totalDenom;
    const len = frac * circumference;
    circles += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="4" stroke-dasharray="${len} ${circumference - len}" stroke-dashoffset="${-offset}" stroke-linecap="butt"></circle>`;
    offset += len;
  });
  svg.innerHTML = circles;
  const pct = totalDenom ? Math.round((hadirCount / totalDenom) * 100) : 0;
  document.getElementById('donutPagiPct').textContent = pct + '%';

  const legendLabels = { ...STATUS_LABEL, BELUM: 'Belum Diisi' };
  const legendColors = { ...STATUS_COLOR, BELUM: '#9AA7B8' };
  document.getElementById('legendPagi').innerHTML = segments
    .filter((s) => s.val > 0)
    .map((s) => `<div class="li"><div class="left"><span class="sw" style="background:${legendColors[s.key]}"></span>${legendLabels[s.key]}</div><b>${s.val}</b></div>`)
    .join('') || '<div class="muted">Belum ada data hari ini.</div>';
}

async function renderDashboard() {
  document.getElementById('dashDateLabel').textContent = '— ' + fmtTgl(todayStr());
  document.getElementById('totalAktif').textContent = PEGAWAI.filter((p) => p.aktif).length;
  const totalAktif = PEGAWAI.filter((p) => p.aktif).length;

  document.getElementById('dashPagi').innerHTML = '<div class="loading-row"><span class="spinner dark"></span>Memuat...</div>';
  document.getElementById('dashSore').innerHTML = '<div class="loading-row"><span class="spinner dark"></span>Memuat...</div>';

  try {
    const rows = await DB.listKehadiran({ dari: todayStr(), sampai: todayStr() });
    const cPagi = { HADIR: 0, SAKIT: 0, IZIN: 0, TUGAS_LUAR: 0, TK: 0 };
    const cSore = { HADIR: 0, SAKIT: 0, IZIN: 0, TUGAS_LUAR: 0, TK: 0 };
    rows.forEach((k) => {
      const target = k.jenisApel === 'Apel Pagi' ? cPagi : k.jenisApel === 'Apel Sore' ? cSore : null;
      if (target && target[k.status] !== undefined) target[k.status]++;
    });
    document.getElementById('dashPagi').innerHTML = statCardsHtml(cPagi);
    document.getElementById('dashSore').innerHTML = statCardsHtml(cSore);
    renderDonut(cPagi, totalAktif);
  } catch (err) {
    document.getElementById('dashPagi').innerHTML = '<div class="muted">Gagal memuat data.</div>';
    document.getElementById('dashSore').innerHTML = '<div class="muted">Gagal memuat data.</div>';
  }
}

// ---------------- DATA PEGAWAI ----------------
function renderPegawai() {
  const q = (document.getElementById('searchPegawai').value || '').toLowerCase();
  const jj = document.getElementById('filterJenisJabatan').value;
  const biroFilter = document.getElementById('filterBiro').value;
  const tbody = document.getElementById('tabelPegawai');
  const rows = PEGAWAI.filter((p) => (p.nama.toLowerCase().includes(q) || p.nip.includes(q)) && (!jj || p.jenisJabatan === jj) && (!biroFilter || p.biro === biroFilter));
  const biros = biroFilter ? [biroFilter] : BIRO_LIST.filter((b) => rows.some((p) => p.biro === b));
  let no = 0,
    html = '';
  biros.forEach((biro) => {
    const list = rows.filter((p) => p.biro === biro).sort((a, b) => a.nama.localeCompare(b.nama));
    if (!list.length) return;
    html += `<tr class="group-row"><td colspan="7">${esc(biro)} <span class="muted" style="font-weight:400;">(${list.length} pegawai)</span></td></tr>`;
    html += list
      .map((p) => {
        no++;
        return `<tr>
      <td>${no}</td><td>${esc(p.nama)}</td><td>${esc(p.nip)}</td><td>${esc(p.jabatan)}</td><td>${esc(p.jenisJabatan)}</td>
      <td><span class="badge ${p.aktif ? 'aktif' : 'nonaktif'}">${p.aktif ? 'Aktif' : 'Tidak Aktif'}</span></td>
      <td>
        <button class="btn small outline" onclick="editPegawai('${p.id}')">Edit</button>
        <button class="btn small ${p.aktif ? 'outline' : 'gold'}" onclick="toggleAktifPegawai('${p.id}')">${p.aktif ? 'Nonaktifkan' : 'Aktifkan'}</button>
        <button class="btn small danger" onclick="hapusPegawai('${p.id}')">Hapus</button>
      </td></tr>`;
      })
      .join('');
  });
  tbody.innerHTML = html || '<tr><td colspan="7" class="muted">Tidak ada data.</td></tr>';
}
document.getElementById('searchPegawai').addEventListener('input', renderPegawai);
document.getElementById('filterJenisJabatan').addEventListener('change', renderPegawai);
document.getElementById('filterBiro').addEventListener('change', renderPegawai);
document.getElementById('btnTambahPegawai').addEventListener('click', () => openModalPegawai());
document.getElementById('btnBatalPegawai').addEventListener('click', () => document.getElementById('modalPegawai').classList.add('hidden'));

function openModalPegawai(p) {
  document.getElementById('modalPegawaiTitle').textContent = p ? 'Edit Pegawai' : 'Tambah Pegawai';
  document.getElementById('pegawaiId').value = p ? p.id : '';
  document.getElementById('pegawaiNama').value = p ? p.nama : '';
  document.getElementById('pegawaiNip').value = p ? p.nip : '';
  document.getElementById('pegawaiBiro').value = p ? p.biro : BIRO_LIST[0];
  document.getElementById('pegawaiJabatan').value = p ? p.jabatan : '';
  document.getElementById('pegawaiJenisJabatan').value = p ? p.jenisJabatan : 'Administrator';
  document.getElementById('pegawaiAktif').value = p ? (p.aktif ? '1' : '0') : '1';
  document.getElementById('modalPegawai').classList.remove('hidden');
}
window.editPegawai = (id) => openModalPegawai(PEGAWAI.find((p) => p.id === id));
window.toggleAktifPegawai = async (id) => {
  const p = PEGAWAI.find((x) => x.id === id);
  const next = !p.aktif;
  await safeCall(() => DB.setAktifPegawai(id, next), 'Gagal memperbarui status');
  p.aktif = next;
  renderPegawai();
  toast('Status pegawai diperbarui.');
};
window.hapusPegawai = async (id) => {
  if (!confirm('Hapus pegawai ini? Seluruh riwayat kehadiran pegawai ini akan ikut terhapus permanen.')) return;
  await safeCall(() => DB.deletePegawai(id), 'Gagal menghapus pegawai');
  PEGAWAI = PEGAWAI.filter((p) => p.id !== id);
  renderPegawai();
  toast('Pegawai dihapus.');
};
document.getElementById('btnSimpanPegawai').addEventListener('click', async () => {
  const id = document.getElementById('pegawaiId').value;
  const nama = document.getElementById('pegawaiNama').value.trim();
  const nip = document.getElementById('pegawaiNip').value.trim();
  const biro = document.getElementById('pegawaiBiro').value;
  const jabatan = document.getElementById('pegawaiJabatan').value.trim();
  if (!nama || !nip || !jabatan) {
    alert('Nama, NIP, dan Jabatan wajib diisi.');
    return;
  }
  const jenisJabatan = document.getElementById('pegawaiJenisJabatan').value;
  const aktif = document.getElementById('pegawaiAktif').value === '1';
  const btn = document.getElementById('btnSimpanPegawai');
  btn.disabled = true;
  try {
    if (id) {
      const updated = await DB.updatePegawai(id, { nama, nip, biro, jabatan, jenisJabatan, aktif });
      const idx = PEGAWAI.findIndex((x) => x.id === id);
      PEGAWAI[idx] = updated;
    } else {
      const created = await DB.insertPegawai({ nama, nip, biro, jabatan, jenisJabatan, aktif });
      PEGAWAI.push(created);
    }
    document.getElementById('modalPegawai').classList.add('hidden');
    renderPegawai();
    toast('Data pegawai tersimpan.');
  } catch (err) {
    toast('Gagal menyimpan: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
  }
});

// ---------------- INPUT KEHADIRAN ----------------
const inputTanggalEl = document.getElementById('inputTanggal');
inputTanggalEl.value = todayStr();
document.getElementById('inputJenisApel').value = 'Apel Pagi';
function activePegawaiSorted() {
  return PEGAWAI.filter((p) => p.aktif).sort((a, b) => biroIndex(a.biro) - biroIndex(b.biro) || a.nama.localeCompare(b.nama));
}
async function renderInputTable() {
  const tgl = inputTanggalEl.value,
    jenis = document.getElementById('inputJenisApel').value;
  document.getElementById('tabelInput').innerHTML = '<tr><td colspan="5"><div class="loading-row"><span class="spinner dark"></span>Memuat data...</div></td></tr>';
  let existing = [];
  try {
    existing = await DB.listKehadiran({ dari: tgl, sampai: tgl, jenisApel: jenis });
  } catch (err) {
    toast('Gagal memuat data kehadiran: ' + err.message, 'error');
  }
  document.getElementById('inputExistingNotice').style.display = existing.length ? 'block' : 'none';
  currentInput = {};
  activePegawaiSorted().forEach((p) => {
    const ex = existing.find((k) => k.pegawaiId === p.id);
    currentInput[p.id] = ex ? { status: ex.status, keterangan: ex.keterangan || '' } : { status: null, keterangan: '' };
  });
  drawInputTable();
}
function drawInputTable() {
  const tbody = document.getElementById('tabelInput');
  const list = activePegawaiSorted();
  let no = 0,
    html = '',
    lastBiro = null;
  list.forEach((p) => {
    if (p.biro !== lastBiro) {
      lastBiro = p.biro;
      html += `<tr class="group-row"><td colspan="5">${esc(p.biro)}</td></tr>`;
    }
    no++;
    const cur = currentInput[p.id] || { status: null, keterangan: '' };
    const btns = STATUS_LIST.map((s) => `<button type="button" class="sbtn ${cur.status === s ? 'on-' + s : ''}" onclick="setStatus('${p.id}','${s}')">${STATUS_LABEL[s]}</button>`).join('');
    const showKet = cur.status && cur.status !== 'HADIR';
    const ket = showKet ? `<input type="text" class="ket-input" value="${esc(cur.keterangan)}" placeholder="${cur.status === 'TK' ? '(otomatis -)' : 'opsional'}" oninput="setKeterangan('${p.id}',this.value)">` : '<span class="muted">—</span>';
    html += `<tr><td>${no}</td><td>${esc(p.nama)}</td><td>${esc(p.jabatan)}</td><td><div class="status-btns">${btns}</div></td><td>${ket}</td></tr>`;
  });
  tbody.innerHTML = html || '<tr><td colspan="5" class="muted">Tidak ada pegawai aktif.</td></tr>';
}
window.setStatus = (pid, status) => {
  if (!currentInput[pid]) currentInput[pid] = { status: null, keterangan: '' };
  currentInput[pid].status = status;
  if (status === 'TK' && !currentInput[pid].keterangan) currentInput[pid].keterangan = '-';
  if (status === 'HADIR') currentInput[pid].keterangan = '';
  drawInputTable();
};
window.setKeterangan = (pid, val) => {
  currentInput[pid].keterangan = val;
};
inputTanggalEl.addEventListener('change', renderInputTable);
document.getElementById('inputJenisApel').addEventListener('change', renderInputTable);
document.getElementById('btnHadirSemua').addEventListener('click', () => {
  activePegawaiSorted().forEach((p) => (currentInput[p.id] = { status: 'HADIR', keterangan: '' }));
  drawInputTable();
  toast('Seluruh pegawai ditandai Hadir. Silakan ubah yang tidak hadir.');
});
document.getElementById('btnResetInput').addEventListener('click', () => {
  renderInputTable();
});
document.getElementById('btnSimpanKehadiran').addEventListener('click', async () => {
  const tgl = inputTanggalEl.value,
    jenis = document.getElementById('inputJenisApel').value;
  if (!tgl) {
    alert('Pilih tanggal terlebih dahulu.');
    return;
  }
  const list = activePegawaiSorted();
  const belum = list.filter((p) => !currentInput[p.id] || !currentInput[p.id].status);
  if (belum.length) {
    alert('Masih ada pegawai yang belum ditentukan status kehadirannya:\n' + belum.map((p) => '- ' + p.nama).join('\n'));
    return;
  }
  const btn = document.getElementById('btnSimpanKehadiran');
  btn.disabled = true;
  const original = btn.innerHTML;
  btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
  try {
    const entries = list.map((p) => {
      const cur = currentInput[p.id];
      return { pegawaiId: p.id, status: cur.status, keterangan: cur.status === 'HADIR' ? '' : cur.keterangan || (cur.status === 'TK' ? '-' : '') };
    });
    await DB.upsertKehadiranBatch(tgl, jenis, entries);
    toast('Data kehadiran berhasil disimpan.');
    renderInputTable();
  } catch (err) {
    toast('Gagal menyimpan kehadiran: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
});

// ---------------- REKAP ----------------
const rekapTglSatu = document.getElementById('rekapTglSatu');
rekapTglSatu.value = todayStr();
const rekapDari = document.getElementById('rekapDari'),
  rekapSampai = document.getElementById('rekapSampai');
{
  const d = new Date();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  rekapDari.value = monday.toISOString().slice(0, 10);
  rekapSampai.value = todayStr();
}
document.getElementById('rekapMode').addEventListener('change', (e) => {
  const isRange = e.target.value === 'range';
  document.getElementById('rekapTglSatuWrap').style.display = isRange ? 'none' : 'block';
  document.getElementById('rekapDariWrap').style.display = isRange ? 'block' : 'none';
  document.getElementById('rekapSampaiWrap').style.display = isRange ? 'block' : 'none';
});
let lastRekap = null;
async function getRekapData() {
  const mode = document.getElementById('rekapMode').value;
  const jenisApel = document.getElementById('rekapJenisApel').value;
  const jenisJabatan = document.getElementById('rekapJenisJabatan').value;
  const biro = document.getElementById('rekapBiro').value;
  let dari, sampai;
  if (mode === 'harian') {
    dari = sampai = rekapTglSatu.value;
  } else {
    dari = rekapDari.value;
    sampai = rekapSampai.value;
  }
  if (!dari || !sampai) {
    alert('Tanggal belum lengkap.');
    return null;
  }
  const raw = await DB.listKehadiran({ dari, sampai, jenisApel: jenisApel || undefined });
  const rows = raw
    .map((k) => ({ ...k, pegawai: PEGAWAI.find((p) => p.id === k.pegawaiId) }))
    .filter((k) => k.pegawai && (!jenisJabatan || k.pegawai.jenisJabatan === jenisJabatan) && (!biro || k.pegawai.biro === biro));
  return { mode, dari, sampai, jenisApel, jenisJabatan, biro, rows };
}
function renderRekapHarian(data) {
  const rows = data.rows.slice().sort((a, b) => biroIndex(a.pegawai.biro) - biroIndex(b.pegawai.biro) || a.pegawai.nama.localeCompare(b.pegawai.nama) || a.jenisApel.localeCompare(b.jenisApel));
  const body =
    rows.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.pegawai.biro)}</td><td>${esc(r.pegawai.nama)}</td><td>${esc(r.pegawai.jabatan)}</td><td>${esc(r.jenisApel)}</td><td><span class="badge ${r.status}">${STATUS_LABEL[r.status]}</span></td><td>${esc(r.keterangan) || '-'}</td></tr>`).join('') ||
    '<tr><td colspan="7" class="muted">Tidak ada data pada periode ini.</td></tr>';
  const c = { HADIR: 0, SAKIT: 0, IZIN: 0, TUGAS_LUAR: 0, TK: 0 };
  rows.forEach((r) => c[r.status]++);
  return `<div class="table-wrap"><table><thead><tr><th>No</th><th>Biro</th><th>Nama</th><th>Jabatan</th><th>Apel</th><th>Status</th><th>Keterangan</th></tr></thead><tbody>${body}</tbody></table></div>
  <div class="grid-cards" style="margin-top:14px;">${statCardsHtml(c)}</div>`;
}
function renderRekapMingguan(data) {
  const byPeg = {};
  data.rows.forEach((r) => {
    if (!byPeg[r.pegawaiId]) byPeg[r.pegawaiId] = { pegawai: r.pegawai, HADIR: 0, SAKIT: 0, IZIN: 0, TUGAS_LUAR: 0, TK: 0, total: 0 };
    byPeg[r.pegawaiId][r.status]++;
    byPeg[r.pegawaiId].total++;
  });
  const arr = Object.values(byPeg).sort((a, b) => biroIndex(a.pegawai.biro) - biroIndex(b.pegawai.biro) || a.pegawai.nama.localeCompare(b.pegawai.nama));
  const body =
    arr
      .map((r, i) => {
        const pct = r.total ? Math.round((r.HADIR / r.total) * 100) : 0;
        return `<tr><td>${i + 1}</td><td>${esc(r.pegawai.biro)}</td><td>${esc(r.pegawai.nama)}</td><td>${esc(r.pegawai.jabatan)}</td><td>${r.HADIR}</td><td>${r.SAKIT}</td><td>${r.IZIN}</td><td>${r.TUGAS_LUAR}</td><td>${r.TK}</td><td>${pct}%</td></tr>`;
      })
      .join('') || '<tr><td colspan="10" class="muted">Tidak ada data pada periode ini.</td></tr>';
  const tot = { HADIR: 0, SAKIT: 0, IZIN: 0, TUGAS_LUAR: 0, TK: 0 };
  data.rows.forEach((r) => tot[r.status]++);
  return `<div class="table-wrap"><table><thead><tr><th>No</th><th>Biro</th><th>Nama</th><th>Jabatan</th><th>Hadir</th><th>Sakit</th><th>Izin</th><th>Tugas Luar</th><th>TK</th><th>% Hadir</th></tr></thead><tbody>${body}</tbody></table></div>
  <div class="grid-cards" style="margin-top:14px;">${statCardsHtml(tot)}</div>`;
}
document.getElementById('btnTampilkanRekap').addEventListener('click', async () => {
  const btn = document.getElementById('btnTampilkanRekap');
  btn.disabled = true;
  document.getElementById('rekapHasil').innerHTML = '<div class="loading-row"><span class="spinner dark"></span>Memuat rekap...</div>';
  try {
    const data = await getRekapData();
    if (!data) return;
    lastRekap = data;
    document.getElementById('rekapHasil').innerHTML = data.mode === 'harian' ? renderRekapHarian(data) : renderRekapMingguan(data);
  } catch (err) {
    document.getElementById('rekapHasil').innerHTML = '<div class="muted">Gagal memuat rekap: ' + esc(err.message) + '</div>';
  } finally {
    btn.disabled = false;
  }
});

// ---------------- REKAP INDIVIDU ----------------
function fillIndividuSelect() {
  const sel = document.getElementById('individuPegawai');
  sel.innerHTML = PEGAWAI.slice()
    .sort((a, b) => biroIndex(a.biro) - biroIndex(b.biro) || a.nama.localeCompare(b.nama))
    .map((p) => `<option value="${p.id}">${esc(p.nama)} — ${esc(p.biro)}</option>`)
    .join('');
  document.getElementById('individuDari').value = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  document.getElementById('individuSampai').value = todayStr();
}
let lastIndividu = null;
document.getElementById('btnTampilkanIndividu').addEventListener('click', async () => {
  const pid = document.getElementById('individuPegawai').value;
  const dari = document.getElementById('individuDari').value,
    sampai = document.getElementById('individuSampai').value;
  const p = PEGAWAI.find((x) => x.id === pid);
  if (!p) return;
  document.getElementById('individuHasil').innerHTML = '<div class="loading-row"><span class="spinner dark"></span>Memuat riwayat...</div>';
  try {
    const rows = (await DB.listKehadiran({ dari, sampai, pegawaiId: pid })).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    lastIndividu = { p, dari, sampai, rows };
    const body = rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.tanggal}</td><td>${esc(r.jenisApel)}</td><td><span class="badge ${r.status}">${STATUS_LABEL[r.status]}</span></td><td>${esc(r.keterangan) || '-'}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Tidak ada riwayat pada periode ini.</td></tr>';
    document.getElementById('individuHasil').innerHTML = `<p class="hint">Nama: <b>${esc(p.nama)}</b> — ${esc(p.jabatan)} (${esc(p.jenisJabatan)}) — ${esc(p.biro)}</p><div class="table-wrap"><table><thead><tr><th>No</th><th>Tanggal</th><th>Jenis Apel</th><th>Status</th><th>Keterangan</th></tr></thead><tbody>${body}</tbody></table></div>`;
  } catch (err) {
    document.getElementById('individuHasil').innerHTML = '<div class="muted">Gagal memuat riwayat: ' + esc(err.message) + '</div>';
  }
});

// ---------------- CETAK / PDF ----------------
function letterhead(title, sub) {
  return `<div class="print-header">
    <img src="${LOGO_SULTRA}" alt="Logo Sulawesi Tenggara" style="width:70px;height:auto;margin-bottom:6px;">
    <h3>PEMERINTAH PROVINSI SULAWESI TENGGARA</h3><h4>SEKRETARIAT DAERAH</h4>
    <p style="margin:10px 0 0;font-weight:bold;">${title}</p>
    <p style="margin:2px 0;">${sub}</p>
    <p style="margin:2px 0;font-size:11px;color:#333;">Dicetak melalui SIAP APEL — Sistem Informasi Apel Pejabat</p></div>`;
}
function signBlock() {
  return `<div class="print-sign"><p>Mengetahui,<br>Sekretaris Daerah<br>Provinsi Sulawesi Tenggara</p><br><br><br><p>(..............................................)</p></div>
  <p style="font-size:11px;margin-top:20px;">Tanggal cetak: ${new Date().toLocaleDateString('id-ID')} — Jam cetak: ${new Date().toLocaleTimeString('id-ID')}</p>`;
}
function doPrint(html) {
  document.getElementById('printArea').innerHTML = html;
  window.print();
}
document.getElementById('btnCetakRekap').addEventListener('click', () => {
  if (!lastRekap) {
    alert('Klik "Tampilkan" terlebih dahulu.');
    return;
  }
  const sub = lastRekap.mode === 'harian' ? `Hari/Tanggal: ${fmtTgl(lastRekap.dari)}` : `Periode: ${lastRekap.dari} s.d. ${lastRekap.sampai}`;
  const title = `REKAPITULASI KEHADIRAN APEL${lastRekap.jenisApel ? ' — ' + lastRekap.jenisApel : ''}`;
  let table;
  if (lastRekap.mode === 'harian') {
    const rows = lastRekap.rows.slice().sort((a, b) => biroIndex(a.pegawai.biro) - biroIndex(b.pegawai.biro) || a.pegawai.nama.localeCompare(b.pegawai.nama));
    table = `<table class="print-table"><thead><tr><th>No</th><th>Biro</th><th>Nama</th><th>Jabatan</th><th>Apel</th><th>Status</th><th>Keterangan</th></tr></thead><tbody>
    ${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.pegawai.biro)}</td><td>${esc(r.pegawai.nama)}</td><td>${esc(r.pegawai.jabatan)}</td><td>${esc(r.jenisApel)}</td><td>${STATUS_LABEL[r.status]}</td><td>${esc(r.keterangan) || '-'}</td></tr>`).join('')}
    </tbody></table>`;
  } else {
    const byPeg = {};
    lastRekap.rows.forEach((r) => {
      if (!byPeg[r.pegawaiId]) byPeg[r.pegawaiId] = { pegawai: r.pegawai, HADIR: 0, SAKIT: 0, IZIN: 0, TUGAS_LUAR: 0, TK: 0 };
      byPeg[r.pegawaiId][r.status]++;
    });
    const arr = Object.values(byPeg).sort((a, b) => biroIndex(a.pegawai.biro) - biroIndex(b.pegawai.biro) || a.pegawai.nama.localeCompare(b.pegawai.nama));
    table = `<table class="print-table"><thead><tr><th>No</th><th>Biro</th><th>Nama</th><th>Jabatan</th><th>Hadir</th><th>Sakit</th><th>Izin</th><th>Tugas Luar</th><th>TK</th></tr></thead><tbody>
    ${arr.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.pegawai.biro)}</td><td>${esc(r.pegawai.nama)}</td><td>${esc(r.pegawai.jabatan)}</td><td>${r.HADIR}</td><td>${r.SAKIT}</td><td>${r.IZIN}</td><td>${r.TUGAS_LUAR}</td><td>${r.TK}</td></tr>`).join('')}
    </tbody></table>`;
  }
  const c = { HADIR: 0, SAKIT: 0, IZIN: 0, TUGAS_LUAR: 0, TK: 0 };
  lastRekap.rows.forEach((r) => c[r.status]++);
  const summary = `<div class="print-summary"><p>Jumlah Pegawai : ${new Set(lastRekap.rows.map((r) => r.pegawaiId)).size}</p>
    <p>Jumlah Kehadiran : ${c.HADIR}</p><p>Sakit : ${c.SAKIT}</p><p>Izin : ${c.IZIN}</p><p>Tugas Luar : ${c.TUGAS_LUAR}</p><p>Tanpa Keterangan : ${c.TK}</p></div>`;
  doPrint(letterhead(title, sub) + table + summary + signBlock());
});
document.getElementById('btnCetakIndividu').addEventListener('click', () => {
  if (!lastIndividu) {
    alert('Klik "Tampilkan" terlebih dahulu.');
    return;
  }
  const { p, dari, sampai, rows } = lastIndividu;
  const table = `<table class="print-table"><thead><tr><th>No</th><th>Tanggal</th><th>Jenis Apel</th><th>Status</th><th>Keterangan</th></tr></thead><tbody>
  ${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.tanggal}</td><td>${esc(r.jenisApel)}</td><td>${STATUS_LABEL[r.status]}</td><td>${esc(r.keterangan) || '-'}</td></tr>`).join('')}
  </tbody></table>`;
  doPrint(letterhead('REKAPITULASI KEHADIRAN APEL INDIVIDU', `Nama: ${esc(p.nama)} — ${esc(p.jabatan)}<br>Biro: ${esc(p.biro)}<br>Periode: ${dari} s.d. ${sampai}`) + table + signBlock());
});

// ---------------- BACKUP / RESTORE ----------------
document.getElementById('btnBackup').addEventListener('click', async () => {
  try {
    const data = await DB.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'backup_kehadiran_apel_' + todayStr() + '.json';
    a.click();
    toast('Backup data berhasil diunduh.');
  } catch (err) {
    toast('Gagal membuat backup: ' + err.message, 'error');
  }
});
document.getElementById('btnImportTrigger').addEventListener('click', () => document.getElementById('fileImport').click());
document.getElementById('fileImport').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.pegawai) || !Array.isArray(data.kehadiran)) throw new Error('format tidak sesuai');
      if (!confirm('Import akan MENGGANTIKAN seluruh data pegawai dan kehadiran di database Supabase saat ini. Lanjutkan?')) return;
      toast('Mengimpor data...');
      await DB.importAll(data.pegawai, data.kehadiran);
      await bootstrap();
      toast('Data berhasil dipulihkan.');
    } catch (err) {
      alert('Gagal membaca / mengimpor file backup: ' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// ---------------- REALTIME ----------------
function setupRealtime() {
  if (!DB.isConfigured()) return;
  try {
    DB.subscribeChanges(() => {
      const activePage = document.querySelector('.nav-item.active')?.dataset.page;
      if (activePage === 'dashboard') renderDashboard();
    });
  } catch (err) {
    console.warn('Realtime tidak aktif:', err.message);
  }
}

// ---------------- INIT ----------------
async function bootstrap() {
  const ok = await checkConnection();
  if (!ok) {
    document.getElementById('tabelPegawai').innerHTML = '<tr><td colspan="7" class="muted">Menunggu konfigurasi Supabase...</td></tr>';
    document.getElementById('tabelInput').innerHTML = '<tr><td colspan="5" class="muted">Menunggu konfigurasi Supabase...</td></tr>';
    return;
  }
  try {
    BIRO_LIST = await DB.listBiro();
    PEGAWAI = await DB.listPegawai();
    fillBiroDropdowns();
    await renderDashboard();
    renderPegawai();
    await renderInputTable();
    fillIndividuSelect();
    setupRealtime();
  } catch (err) {
    toast('Gagal memuat data awal: ' + err.message, 'error');
  }
}
bootstrap();
