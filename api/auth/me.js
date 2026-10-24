const { json, readSession } = require('../_security');
module.exports = function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { sukses: false, pesan: 'Metode tidak diizinkan.' });
  const session = readSession(req);
  if (!session) return json(res, 401, { sukses: false, pesan: 'Silakan login terlebih dahulu.' });
  return json(res, 200, { sukses: true, data: { id: session.id } });
};
