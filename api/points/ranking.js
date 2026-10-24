const { json, readSession, gasPost } = require('../_security');
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { sukses: false, pesan: 'Metode tidak diizinkan.' });
  if (!readSession(req)) return json(res, 401, { sukses: false, pesan: 'Silakan login terlebih dahulu.' });
  try {
    const result = await gasPost({ action: 'ranking' });
    return json(res, result.sukses === true ? 200 : 502, result);
  } catch (error) {
    console.error('Ranking error:', error.message);
    return json(res, 502, { sukses: false, pesan: 'Data peringkat belum dapat dimuat.' });
  }
};
