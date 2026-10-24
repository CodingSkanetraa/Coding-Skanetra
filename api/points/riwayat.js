const { json, readSession, gasPost } = require('../_security');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return json(res, 405, {
      sukses: false,
      pesan: 'Metode tidak diizinkan.'
    });
  }

  const session = readSession(req);

  if (!session) {
    return json(res, 401, {
      sukses: false,
      pesan: 'Silakan login terlebih dahulu.'
    });
  }

  const id = String(req.query.id || '').trim();

  if (!id) {
    return json(res, 400, {
      sukses: false,
      pesan: 'ID anggota wajib diisi.'
    });
  }

  if (id !== session.id) {
    return json(res, 403, {
      sukses: false,
      pesan: 'Kamu hanya dapat melihat riwayat poin milikmu sendiri.'
    });
  }

  try {
    const result = await gasPost({ action: 'riwayat', id });

    return json(res, result.sukses === true ? 200 : 404, result);
  } catch (error) {
    console.error('History error:', error.message);

    return json(res, 502, {
      sukses: false,
      pesan: 'Riwayat poin belum dapat dimuat.'
    });
  }
};