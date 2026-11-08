// Guru menilai jawaban manual atau mengirim ulang poin yang belum masuk spreadsheet. Khusus admin.
//
//   POST /api/tantangan/setujui   { id: <id penyelesaian>, aksi: "setujui" | "tolak" | "kirim_ulang" }
'use strict';
const { json, periksaAnggota, rpcServer } = require('../_security');
const { kirimPoinKeSheet, PESAN_BELUM_MASUK } = require('../_poin');

function bacaBadan(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  return b && typeof b === 'object' ? b : {};
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { sukses: false, pesan: 'Metode tidak diizinkan.' });

  const pemanggil = await periksaAnggota(req);
  if (!pemanggil.ok) return json(res, pemanggil.status, { sukses: false, kode: pemanggil.kode, pesan: pemanggil.pesan });
  if (!pemanggil.admin) return json(res, 403, { sukses: false, pesan: 'Khusus pengelola.' });

  const badan = bacaBadan(req);
  const id = Number(badan.id);
  const aksi = String(badan.aksi || '');
  if (!Number.isSafeInteger(id) || id <= 0) return json(res, 400, { sukses: false, pesan: 'Data tidak valid.' });
  if (!['setujui', 'tolak', 'kirim_ulang'].includes(aksi)) return json(res, 400, { sukses: false, pesan: 'Aksi tidak dikenal.' });

  try {
    if (aksi === 'tolak') {
      const hasil = await rpcServer('nilai_manual', { p_id: id, p_status: 'ditolak' });
      if (!hasil || hasil.status !== 'ditolak') return json(res, 409, { sukses: false, pesan: 'Jawaban ini sudah tidak menunggu penilaian.' });
      return json(res, 200, { sukses: true, status: 'ditolak', pesan: 'Jawaban ditolak. Anak bisa mengirim ulang.' });
    }

    if (aksi === 'setujui') {
      const hasil = await rpcServer('nilai_manual', { p_id: id, p_status: 'selesai' });
      if (!hasil || hasil.baru !== true) return json(res, 409, { sukses: false, pesan: 'Jawaban ini sudah tidak menunggu penilaian.' });
    }

    // setujui (baru saja) atau kirim_ulang: kirim poin ke spreadsheet
    const baris = await rpcServer('ambil_untuk_kirim', { p_id: id });
    if (!baris) return json(res, 404, { sukses: false, pesan: 'Penyelesaian tidak ditemukan atau belum selesai.' });
    if (baris.terkirim_sheet === true) return json(res, 200, { sukses: true, status: 'selesai', terkirim: true, pesan: 'Poin sudah masuk spreadsheet.' });
    const k = await kirimPoinKeSheet({
      userId: baris.user_id, tantanganId: baris.tantangan_id, judul: baris.judul, poin: baris.poin, idSheet: baris.id_sheet
    });
    return json(res, 200, {
      sukses: true, status: 'selesai', terkirim: k.terkirim,
      pesan: k.terkirim ? `Disetujui. +${baris.poin} poin masuk spreadsheet.` : PESAN_BELUM_MASUK[k.alasan]
    });
  } catch (error) {
    console.error('Setujui error:', error.message);
    return json(res, 502, { sukses: false, pesan: 'Belum berhasil. Coba lagi sebentar lagi.' });
  }
};
