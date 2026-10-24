const crypto = require('node:crypto');

const COOKIE_NAME = 'cs_session';
const SESSION_SECONDS = 60 * 60 * 8;

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.end(JSON.stringify(body));
}

function parseCookies(req) {
  const raw = req.headers.cookie || '';
  return Object.fromEntries(raw.split(';').map(part => part.trim()).filter(Boolean).map(part => {
    const i = part.indexOf('=');
    return i < 0 ? [part, ''] : [part.slice(0, i), decodeURIComponent(part.slice(i + 1))];
  }));
}

function sign(value) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET belum disetel atau terlalu pendek (minimal 32 karakter).');
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function createSession(id) {
  const payload = Buffer.from(JSON.stringify({ id: String(id), exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function readSession(req) {
  const token = parseCookies(req)[COOKIE_NAME];
  if (!token || !process.env.SESSION_SECRET) return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.id || !Number.isFinite(data.exp) || data.exp <= Math.floor(Date.now() / 1000)) return null;
    return { id: String(data.id) };
  } catch { return null; }
}

async function gasPost(body) {
  const url = process.env.APPS_SCRIPT_URL;
  const secret = process.env.APPS_SCRIPT_SECRET;
  if (!url || !secret) throw new Error('APPS_SCRIPT_URL dan APPS_SCRIPT_SECRET harus disetel di Environment Variables Vercel.');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...body, secret }),
    redirect: 'follow',
    cache: 'no-store'
  });
  if (!response.ok) throw new Error(`Apps Script merespons HTTP ${response.status}.`);
  return response.json();
}

module.exports = { COOKIE_NAME, SESSION_SECONDS, json, parseCookies, createSession, readSession, gasPost };
