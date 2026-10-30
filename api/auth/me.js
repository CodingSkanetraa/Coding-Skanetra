// Memeriksa login (token Supabase) + status anggota.
const { json, periksaAnggota } = require('../_security');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { sukses: false, pesan: 'Metode tidak diizinkan.' });
  const anggota = await periksaAnggota(req);
  if (!anggota.ok) return json(res, anggota.status, { sukses: false, kode: anggota.kode, pesan: anggota.pesan });
  return json(res, 200, { sukses: true, data: { username: anggota.username } });
};
