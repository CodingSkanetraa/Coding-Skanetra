"use strict";
const form = document.getElementById('loginForm');
const button = document.getElementById('loginButton');
const message = document.getElementById('loginMessage');

(async () => {
  try {
    const response = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' });
    if (response.ok) window.location.replace('/pages/peringkat.html');
  } catch (_) { /* login tetap bisa dicoba saat pemeriksaan awal gagal */ }
})();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.textContent = '';
  button.disabled = true;
  button.textContent = 'Memeriksa…';
  const id = document.getElementById('studentId').value.trim();
  const pin = document.getElementById('studentPin').value;
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, pin })
    });
    const result = await response.json();
    if (!response.ok || result.sukses !== true) throw new Error(result.pesan || 'ID atau PIN tidak sesuai.');
    window.location.replace('/pages/peringkat.html');
  } catch (error) {
    message.textContent = error.message || 'Gagal masuk. Periksa koneksi lalu coba lagi.';
    button.disabled = false;
    button.textContent = 'Masuk';
  }
});
