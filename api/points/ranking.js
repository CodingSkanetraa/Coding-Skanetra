// Peringkat semua anggota, dibaca dari Google Sheets lewat Apps Script.
const { json, periksaAnggota, gasPost } = require('../_security');

// Ingatan singkat supaya Apps Script (lambat dan berkuota) tidak dipanggil tiap kali halaman dibuka.
// Hanya berlaku selama instance fungsi masih hidup; nilai poin paling lambat 30 detik "basi".
const UMUR_INGATAN_MS = 30 * 1000;
let ingatan = null;

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { sukses: false, pesan: 'Metode tidak diizinkan.' });

  const anggota = await periksaAnggota(req);
  if (!anggota.ok) return json(res, anggota.status, { sukses: false, kode: anggota.kode, pesan: anggota.pesan });

  if (ingatan && Date.now() - ingatan.waktu < UMUR_INGATAN_MS) return json(res, 200, ingatan.hasil);

  try {
    const result = await gasPost({ action: 'ranking' });
    if (result && result.sukses === true) {
      ingatan = { waktu: Date.now(), hasil: result };
      return json(res, 200, result);
    }
    return json(res, 502, result || { sukses: false, pesan: 'Data peringkat belum dapat dimuat.' });
  } catch (error) {
    console.error('Ranking error:', error.message);
    return json(res, 502, { sukses: false, pesan: 'Data peringkat belum dapat dimuat.' });
  }
};
