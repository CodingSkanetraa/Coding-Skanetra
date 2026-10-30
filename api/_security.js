// Pembantu untuk fungsi serverless di folder api/ (peringkat dari Google Sheets).
//
// Alurnya:
//   browser (login Supabase) --token--> fungsi api/ di Vercel --rahasia--> Google Apps Script --> Spreadsheet
//
// * Akun dan login tetap lewat Supabase (js/akun.js). Browser mengirim token login-nya
//   di header "Authorization: Bearer ...".
// * Fungsi di sini MEMERIKSA token itu ke Supabase dan memastikan akunnya sudah disetujui
//   (profil.anggota = true) sebelum membaca spreadsheet.
// * Rahasia Apps Script (APPS_SCRIPT_URL, APPS_SCRIPT_SECRET) hanya ada di server Vercel,
//   tidak pernah dikirim ke browser.

// Kedua nilai Supabase ini publik (sama dengan js/akun-config.js). Boleh ditimpa lewat
// Environment Variables SUPABASE_URL dan SUPABASE_ANON_KEY bila project Supabase diganti.
const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://rlwvcnnezroumlyijznq.supabase.co').replace(/\/+$/, '');
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsd3Zjbm5lenJvdW1seWlqem5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyNDgzMzQsImV4cCI6MjEwODgyNDMzNH0.sXANcmTEhr5XR7TzQkieKHaJlu-NzsC5VHz37YqIXV4';

const BATAS_WAKTU_MS = 12000;

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.end(JSON.stringify(body));
}

function ambilToken(req) {
  const header = String(req.headers.authorization || '');
  const cocok = /^Bearer\s+([\w-]+\.[\w-]+\.[\w-]+)$/.exec(header);
  return cocok ? cocok[1] : null;
}

async function fetchDenganBatas(url, opsi) {
  const kontrol = new AbortController();
  const timer = setTimeout(() => kontrol.abort(), BATAS_WAKTU_MS);
  try {
    return await fetch(url, Object.assign({}, opsi, { signal: kontrol.signal }));
  } finally {
    clearTimeout(timer);
  }
}

// Memeriksa pemanggil. Hasil:
//   { ok: true, username }
//   { ok: false, status, kode, pesan }  kode: 'sesi' (perlu login), 'belum_anggota', 'server'
//
// Pemeriksaannya memakai token pengguna itu sendiri untuk membaca tabel "profil". Aturan RLS
// di Supabase hanya mengizinkan pengguna membaca BARIS MILIKNYA, jadi token yang palsu atau
// kedaluwarsa ditolak Supabase, dan token yang sah hanya mengembalikan profil pemiliknya.
async function periksaAnggota(req) {
  const token = ambilToken(req);
  if (!token) return { ok: false, status: 401, kode: 'sesi', pesan: 'Silakan login terlebih dahulu.' };

  let respons;
  try {
    respons = await fetchDenganBatas(`${SUPABASE_URL}/rest/v1/profil?select=*&limit=1`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store'
    });
  } catch (error) {
    console.error('Supabase tidak terjangkau:', error.message);
    return { ok: false, status: 502, kode: 'server', pesan: 'Akun belum dapat diperiksa. Coba lagi sebentar lagi.' };
  }

  if (respons.status === 401 || respons.status === 403) {
    return { ok: false, status: 401, kode: 'sesi', pesan: 'Sesi tidak berlaku. Silakan masuk lagi.' };
  }
  if (!respons.ok) {
    console.error('Supabase membalas HTTP', respons.status);
    return { ok: false, status: 502, kode: 'server', pesan: 'Akun belum dapat diperiksa. Coba lagi sebentar lagi.' };
  }

  let baris;
  try { baris = await respons.json(); } catch { baris = null; }
  const profil = Array.isArray(baris) ? baris[0] : null;

  if (!profil || profil.anggota !== true) {
    return { ok: false, status: 403, kode: 'belum_anggota', pesan: 'Akunmu belum disetujui sebagai anggota.' };
  }

  return { ok: true, username: String(profil.username || '') };
}

// Memanggil Google Apps Script yang membaca spreadsheet.
async function gasPost(body) {
  const url = process.env.APPS_SCRIPT_URL;
  const secret = process.env.APPS_SCRIPT_SECRET;
  if (!url || !secret) throw new Error('APPS_SCRIPT_URL dan APPS_SCRIPT_SECRET harus disetel di Environment Variables Vercel.');
  const response = await fetchDenganBatas(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...body, secret }),
    redirect: 'follow',
    cache: 'no-store'
  });
  if (!response.ok) throw new Error(`Apps Script merespons HTTP ${response.status}.`);
  return response.json();
}

module.exports = { json, ambilToken, periksaAnggota, gasPost };
