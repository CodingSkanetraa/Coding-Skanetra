// Anak mengirim jawaban Tantangan. Server yang menilai, mencatat, dan mengirim poin ke spreadsheet.
//
//   POST /api/tantangan/kirim   { id: <uuid soal>, kode: "<jawaban>" }   Authorization: Bearer <token login>
//
// Alur: periksa login dan status anggota -> ambil soal dan tes tersembunyi (rahasia penilai) -> nilai lewat
// Wandbox (soal otomatis) atau tandai "menunggu" (soal manual) -> catat di database -> kirim poin ke Apps Script.
'use strict';
const { json, ambilToken, periksaAnggota, rpcServer, restUser } = require('../_security');
const { nilai, LayananGalat } = require('../_penilai');
const { kirimPoinKeSheet, PESAN_BELUM_MASUK } = require('../_poin');

const POLA_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAKS_KODE = 20000;
const JEDA_MS = 5000;                 // jeda antar pengiriman per anak (per instance fungsi)
const terakhir = new Map();
const sedangDinilai = new Set();

function bacaBadan(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  return b && typeof b === 'object' ? b : {};
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { sukses: false, pesan: 'Metode tidak diizinkan.' });

  const anggota = await periksaAnggota(req);
  if (!anggota.ok) return json(res, anggota.status, { sukses: false, kode: anggota.kode, pesan: anggota.pesan });

  const badan = bacaBadan(req);
  const id = String(badan.id || '');
  const kode = typeof badan.kode === 'string' ? badan.kode : '';
  if (!POLA_ID.test(id)) return json(res, 400, { sukses: false, pesan: 'Soal tidak valid.' });
  if (!kode.trim()) return json(res, 400, { sukses: false, pesan: 'Jawaban masih kosong.' });
  if (kode.length > MAKS_KODE) return json(res, 400, { sukses: false, pesan: 'Jawaban terlalu panjang (maksimal 20.000 karakter).' });

  const sekarang = Date.now();
  if (sedangDinilai.has(anggota.id)) return json(res, 429, { sukses: false, pesan: 'Jawabanmu masih dinilai. Tunggu sebentar.' });
  if (sekarang - (terakhir.get(anggota.id) || 0) < JEDA_MS) {
    return json(res, 429, { sukses: false, pesan: 'Terlalu cepat. Tunggu beberapa detik lalu kirim lagi.' });
  }
  terakhir.set(anggota.id, sekarang);
  if (terakhir.size > 500) { for (const [k, w] of terakhir) if (sekarang - w > 60000) terakhir.delete(k); }

  sedangDinilai.add(anggota.id);
  try {
    let soal;
    try {
      soal = await rpcServer('ambil_tes_nilai', { p_tantangan: id });
    } catch (error) {
      console.error('ambil_tes_nilai error:', error.message);
      return json(res, 502, { sukses: false, pesan: 'Soal belum dapat dimuat. Coba lagi sebentar lagi.' });
    }
    if (!soal || soal.aktif !== true) return json(res, 404, { sukses: false, pesan: 'Soal tidak ditemukan.' });

    // Sudah selesai? Tidak perlu dinilai lagi (hemat layanan penilai); poin yang tertunda boleh dikirim ulang.
    const token = ambilToken(req);
    let milikku = null;
    try {
      const baris = await restUser(`tantangan_selesai?select=status,terkirim_sheet&tantangan_id=eq.${id}`, token);
      milikku = Array.isArray(baris) ? baris[0] : null;
    } catch (error) { /* lanjut; database tetap menjaga agar poin tidak ganda */ }
    if (milikku && milikku.status === 'selesai') {
      let terkirim = milikku.terkirim_sheet === true;
      let pesan = 'Soal ini sudah kamu selesaikan.';
      if (!terkirim) {
        const k = await kirimPoinKeSheet({ userId: anggota.id, tantanganId: id, judul: soal.judul, poin: soal.poin, idSheet: anggota.idSheet });
        terkirim = k.terkirim;
        if (!terkirim) pesan = PESAN_BELUM_MASUK[k.alasan];
      }
      return json(res, 200, { sukses: true, status: 'selesai', lulus: true, poin: soal.poin, baru: false, terkirim, pesan });
    }

    // ----- Soal manual: tunggu guru -----
    if (soal.penilaian === 'manual') {
      try {
        await rpcServer('catat_penyelesaian', { p_user: anggota.id, p_tantangan: id, p_status: 'menunggu', p_kode: kode });
      } catch (error) {
        console.error('catat_penyelesaian error:', error.message);
        return json(res, 502, { sukses: false, pesan: 'Jawaban belum tersimpan. Coba kirim lagi.' });
      }
      return json(res, 200, { sukses: true, status: 'menunggu', lulus: false, pesan: 'Jawaban terkirim. Menunggu dinilai guru.' });
    }

    // ----- Soal otomatis -----
    if (!Array.isArray(soal.tes) || soal.tes.length === 0) {
      return json(res, 409, { sukses: false, pesan: 'Soal ini belum siap dinilai. Hubungi guru.' });
    }
    let penilaian;
    try {
      penilaian = await nilai({ bahasa: soal.bahasa, kode, tes: soal.tes });
    } catch (error) {
      if (error instanceof LayananGalat) {
        console.error('Penilai error:', error.message);
        terakhir.delete(anggota.id);   // bukan salah anak: boleh coba lagi segera
        return json(res, 503, { sukses: false, pesan: 'Penilai sedang sibuk atau terganggu. Jawabanmu belum dinilai, coba lagi sebentar lagi.' });
      }
      console.error('Penilaian error:', error.message);
      return json(res, 500, { sukses: false, pesan: 'Penilaian gagal. Hubungi guru.' });
    }

    if (!penilaian.lulus) {
      return json(res, 200, {
        sukses: true, status: 'salah', lulus: false, kompilasi: penilaian.kompilasi, hasil: penilaian.hasil,
        pesan: penilaian.kompilasi ? 'Kodemu belum bisa dikompilasi.' : 'Belum semua tes benar. Periksa lagi kodemu.'
      });
    }

    let catatan;
    try {
      catatan = await rpcServer('catat_penyelesaian', { p_user: anggota.id, p_tantangan: id, p_status: 'selesai', p_kode: kode });
    } catch (error) {
      console.error('catat_penyelesaian error:', error.message);
      return json(res, 502, { sukses: false, pesan: 'Jawabanmu benar, tetapi belum bisa dicatat. Coba kirim lagi.' });
    }

    let terkirim = Boolean(catatan && catatan.terkirim_sheet);
    let pesan = 'Benar semua! Soal selesai.';
    if (catatan && catatan.baru) {
      const k = await kirimPoinKeSheet({ userId: anggota.id, tantanganId: id, judul: soal.judul, poin: soal.poin, idSheet: anggota.idSheet });
      terkirim = k.terkirim;
      pesan = terkirim ? `Benar semua! +${soal.poin} poin masuk spreadsheet.` : PESAN_BELUM_MASUK[k.alasan];
    } else {
      pesan = 'Soal ini sudah kamu selesaikan sebelumnya.';
    }
    return json(res, 200, {
      sukses: true, status: 'selesai', lulus: true, hasil: penilaian.hasil, poin: soal.poin,
      baru: Boolean(catatan && catatan.baru), terkirim, pesan
    });
  } finally {
    sedangDinilai.delete(anggota.id);
  }
};
