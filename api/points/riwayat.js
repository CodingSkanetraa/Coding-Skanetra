// Riwayat poin SATU anggota (tanggal dan jumlah poin), dibaca dari Google Sheets.
// Terbuka untuk semua akun yang sudah login dan disetujui sebagai anggota: sesama anggota boleh
// melihat riwayat anggota mana pun. Pemanggil yang belum login atau belum disetujui ditolak.
const { json, periksaAnggota, gasPost } = require('../_security');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { sukses: false, pesan: 'Metode tidak diizinkan.' });

  const anggota = await periksaAnggota(req);
  if (!anggota.ok) return json(res, anggota.status, { sukses: false, kode: anggota.kode, pesan: anggota.pesan });

  const id = String((req.query && req.query.id) || '').trim();
  if (!id) return json(res, 400, { sukses: false, pesan: 'ID anggota wajib diisi.' });
  if (id.length > 64 || /[\u0000-\u001f]/.test(id)) return json(res, 400, { sukses: false, pesan: 'ID anggota tidak valid.' });

  try {
    const result = await gasPost({ action: 'riwayat', id });
    return json(res, result && result.sukses === true ? 200 : 404, result || { sukses: false, pesan: 'Riwayat poin tidak ditemukan.' });
  } catch (error) {
    console.error('History error:', error.message);
    return json(res, 502, { sukses: false, pesan: 'Riwayat poin belum dapat dimuat.' });
  }
};
