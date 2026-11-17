// Riwayat poin SATU anggota (tanggal dan jumlah poin) pada semester aktif, dibaca dari database.
// Terbuka untuk semua akun yang sudah login dan disetujui sebagai anggota: sesama anggota boleh
// melihat riwayat anggota mana pun. Pemanggil yang belum login atau belum disetujui ditolak.
const { json, ambilToken, periksaAnggota, rpcUser } = require('../_security');

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// "2026-09-07" -> "7 Sep 2026"
function tanggalIndonesia(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return String(iso || '');
  return `${Number(m[3])} ${BULAN[Number(m[2]) - 1]} ${m[1]}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { sukses: false, pesan: 'Metode tidak diizinkan.' });

  const anggota = await periksaAnggota(req);
  if (!anggota.ok) return json(res, anggota.status, { sukses: false, kode: anggota.kode, pesan: anggota.pesan });

  const id = String((req.query && req.query.id) || '').trim();
  if (!id) return json(res, 400, { sukses: false, pesan: 'ID anggota wajib diisi.' });
  if (id.length > 64 || /[\u0000-\u001f]/.test(id)) return json(res, 400, { sukses: false, pesan: 'ID anggota tidak valid.' });

  try {
    const hasil = await rpcUser('poin_riwayat', { p_id: id }, ambilToken(req));
    if (!hasil || typeof hasil !== 'object') {
      return json(res, 404, { sukses: false, pesan: 'Anggota dengan ID tersebut tidak ditemukan.' });
    }
    const riwayat = (Array.isArray(hasil.riwayat) ? hasil.riwayat : []).map((r) => ({
      tanggal: tanggalIndonesia(r.tanggal),
      poin: Number(r.poin) || 0,
      alasan: r.alasan || ''
    }));
    return json(res, 200, { sukses: true, data: { id: hasil.id, nama: hasil.nama, kelas: hasil.kelas, riwayat } });
  } catch (error) {
    console.error('History error:', error.message);
    return json(res, 502, { sukses: false, pesan: 'Riwayat poin belum dapat dimuat.' });
  }
};
