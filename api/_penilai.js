// Penilai otomatis untuk Tantangan Python dan C++.
//
// Kode anak TIDAK dijalankan di server kita. Kode dikirim ke layanan sandbox publik Wandbox, sama seperti
// Editor C++ di browser, sehingga kode anak tidak punya akses ke rahasia di server (Apps Script, rahasia penilai).
// Tiap tes = satu kali jalan dengan masukan (stdin) tertentu; keluaran (stdout) dibandingkan dengan yang diharapkan.
'use strict';

const WANDBOX = 'https://wandbox.org/api';
const BATAS_MS = 9000;          // batas waktu satu permintaan ke Wandbox
const MAKS_TES = 10;
const MAKS_PESAN = 600;

const FLAG_CPP = ['-std=c++17', '-O1', '-Wall'];
const KOMPILATOR = {
  cpp: { bahasa: 'C++', pola: /^gcc-\d+(\.\d+)*$/, cadangan: 'gcc-head' },
  py: { bahasa: 'Python', pola: /^cpython-\d+(\.\d+)*$/, cadangan: 'cpython-head' }
};
const dipilih = {};

class LayananGalat extends Error {}

async function ambilJson(f, url, opsi) {
  const kontrol = new AbortController();
  const timer = setTimeout(() => kontrol.abort(), BATAS_MS);
  let respons;
  try {
    respons = await f(url, Object.assign({}, opsi, { signal: kontrol.signal }));
  } catch (e) {
    throw new LayananGalat(e && e.name === 'AbortError' ? 'Penilai terlalu lama menjawab.' : 'Penilai tidak terjangkau.');
  } finally {
    clearTimeout(timer);
  }
  if (!respons.ok) throw new LayananGalat(`Penilai membalas HTTP ${respons.status}.`);
  try { return await respons.json(); } catch { throw new LayananGalat('Balasan penilai tidak terbaca.'); }
}

function bandingVersi(a, b) {
  const pa = a.replace(/^[a-z]+-/, '').split('.').map(Number);
  const pb = b.replace(/^[a-z]+-/, '').split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pb[i] || 0) !== (pa[i] || 0)) return (pb[i] || 0) - (pa[i] || 0);
  }
  return 0;
}

// Memakai rilis stabil terbaru (bukan versi "head" yang berubah-ubah).
async function pilihKompilator(bahasa, f) {
  if (dipilih[bahasa]) return dipilih[bahasa];
  const k = KOMPILATOR[bahasa];
  try {
    const daftar = await ambilJson(f, WANDBOX + '/list.json', {});
    const rilis = (Array.isArray(daftar) ? daftar : [])
      .filter((x) => x && x.language === k.bahasa && k.pola.test(String(x.name)))
      .map((x) => String(x.name))
      .sort(bandingVersi);
    if (rilis.length) { dipilih[bahasa] = rilis[0]; return rilis[0]; }
  } catch (e) { /* pakai cadangan */ }
  return k.cadangan;   // tidak disimpan, dicoba lagi lain kali
}

function bersihkan(s) {
  return String(s || '').replace(/\u001b\[[0-9;]*[A-Za-z]/g, '').trim();
}
const potong = (s, n) => (s.length > n ? s.slice(0, n) + '…' : s);

async function jalankan(bahasa, kode, masukan, f) {
  const compiler = await pilihKompilator(bahasa, f);
  const badan = { code: kode, compiler, stdin: masukan, save: false };
  if (bahasa === 'cpp') badan['compiler-option-raw'] = FLAG_CPP.join('\n');
  const hasil = await ambilJson(f, WANDBOX + '/compile.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(badan)
  });
  if (!hasil || typeof hasil !== 'object' || !('status' in hasil || 'compiler_error' in hasil || 'program_output' in hasil)) {
    throw new LayananGalat('Balasan penilai tidak lengkap.');
  }
  const pesanKompilasi = bersihkan(hasil.compiler_error || hasil.compiler_message);
  const stdout = String(hasil.program_output || '');
  const stderr = String(hasil.program_error || '');
  const kode_keluar = Number(hasil.status || 0);
  const berjalan = Boolean(hasil.program_message || stdout || stderr) || kode_keluar === 0;
  return {
    kompilasiGagal: !berjalan && Boolean(pesanKompilasi),
    pesanKompilasi,
    stdout,
    stderr: bersihkan(stderr),
    kodeKeluar: Number.isFinite(kode_keluar) ? kode_keluar : 1,
    sinyal: hasil.signal ? String(hasil.signal) : ''
  };
}

// Spasi di ujung baris dan baris kosong di akhir diabaikan; selebihnya harus sama persis.
function normal(s) {
  return String(s).replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/[ \t]+$/, '')).join('\n').replace(/\n+$/, '');
}

function tentukan(hasil, tes) {
  if (hasil.sinyal || hasil.kodeKeluar !== 0) {
    const lama = /killed|terminated|timeout|sigkill/i.test(hasil.sinyal + ' ' + hasil.stderr);
    return { status: lama ? 'waktu' : 'galat', pesan: lama ? 'Program terlalu lama atau memakai memori berlebih.' : potong(hasil.stderr, MAKS_PESAN) };
  }
  return { status: normal(hasil.stdout) === normal(tes.keluaran) ? 'benar' : 'salah' };
}

// tes: [{ masukan, keluaran }]. Hasil:
//   { lulus, kompilasi: string|null, hasil: [{ no, status: 'benar'|'salah'|'galat'|'waktu', pesan? }] }
// Melempar LayananGalat bila layanan penilai tidak bisa dipakai (bukan salah anak).
async function nilai({ bahasa, kode, tes, fetch: f, konkurensi }) {
  if (!KOMPILATOR[bahasa]) throw new Error('Bahasa tidak didukung penilai otomatis.');
  const fetchImpl = f || globalThis.fetch;
  const daftar = (tes || []).slice(0, MAKS_TES);
  if (!daftar.length) throw new Error('Soal belum punya tes.');
  const jalur = Math.max(1, konkurensi || 3);

  // Tes pertama lebih dulu: kalau kodenya tidak bisa dikompilasi, tidak perlu menjalankan sisanya.
  const pertama = await jalankan(bahasa, kode, daftar[0].masukan, fetchImpl);
  if (pertama.kompilasiGagal) return { lulus: false, kompilasi: potong(pertama.pesanKompilasi, MAKS_PESAN * 2), hasil: [] };

  const hasil = new Array(daftar.length);
  hasil[0] = Object.assign({ no: 1 }, tentukan(pertama, daftar[0]));

  let berikut = 1;
  const pekerja = Array.from({ length: Math.min(jalur, daftar.length - 1) }, async () => {
    while (berikut < daftar.length) {
      const i = berikut++;
      const r = await jalankan(bahasa, kode, daftar[i].masukan, fetchImpl);
      hasil[i] = Object.assign({ no: i + 1 }, tentukan(r, daftar[i]));
    }
  });
  await Promise.all(pekerja);
  return { lulus: hasil.every((h) => h.status === 'benar'), kompilasi: null, hasil };
}

module.exports = { nilai, normal, LayananGalat, MAKS_TES };
