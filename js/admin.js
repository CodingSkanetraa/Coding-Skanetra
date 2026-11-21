// Pusat pengelola: hanya tampil untuk akun admin. Pemeriksaan sebenarnya ada di database (adalah_admin).
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  function tamu(judul, teks, tombol) {
    $("tg-pesan").textContent = "";
    const t = $("tg-tamu");
    t.textContent = "";
    const s = document.createElement("strong"); s.textContent = judul;
    const p = document.createElement("p"); p.textContent = teks;
    t.append(s, p);
    if (tombol) { const a = document.createElement("a"); a.className = "tg-btn utama"; a.textContent = tombol[0]; a.href = tombol[1]; t.append(a); }
    t.hidden = false;
  }
  async function mulai() {
    const akun = window.CodingSkanetraAkun;
    if (!akun || !akun.tersedia) { tamu("Fitur akun belum aktif", "Hubungi pengelola."); return; }
    try { await akun.siap; } catch (e) { /* lanjut */ }
    if (!akun.pengguna()) { tamu("Masuk dulu", "Halaman ini untuk pengelola.", ["Masuk", "login.html?next=admin"]); return; }
    try {
      const p = await akun.profil();
      if (!p || p.admin !== true) { tamu("Khusus pengelola", "Akunmu bukan pengelola, jadi halaman ini tidak bisa dibuka."); return; }
      $("tg-pesan").textContent = "";
      $("tg-isi").hidden = false;
    } catch (e) {
      $("tg-pesan").textContent = "Data belum bisa dimuat. Coba muat ulang.";
      $("tg-pesan").classList.add("galat");
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mulai); else mulai();
})();
