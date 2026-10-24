const { json, COOKIE_NAME } = require('../_security');
module.exports = function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { sukses: false, pesan: 'Metode tidak diizinkan.' });
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
  return json(res, 200, { sukses: true });
};
