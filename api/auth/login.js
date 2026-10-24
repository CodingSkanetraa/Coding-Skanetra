const { json, createSession, COOKIE_NAME, SESSION_SECONDS, gasPost } = require('../_security');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { sukses: false, pesan: 'Metode tidak diizinkan.' });
  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body || '{}');
    body = body || {};
    const id = String(body.id || '').trim();
    const pin = String(body.pin || '');
    if (!id || !/^\d{6,12}$/.test(pin)) return json(res, 400, { sukses: false, pesan: 'ID dan PIN wajib diisi. PIN harus 6–12 angka.' });
    const result = await gasPost({ action: 'login', id, pin });
    if (result.sukses !== true || !result.data || !result.data.id) return json(res, 401, { sukses: false, pesan: result.pesan || 'ID atau PIN tidak sesuai.' });
    const token = createSession(result.data.id);
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Lax`);
    return json(res, 200, { sukses: true, data: { id: String(result.data.id), nama: String(result.data.nama || '') } });
  } catch (error) {
    console.error('Login error:', error.message);
    return json(res, 500, { sukses: false, pesan: 'Login belum dapat diproses. Periksa konfigurasi server.' });
  }
};
