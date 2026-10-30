"use strict";
// Halaman masuk / daftar. Logika akun ada di js/akun.js.
(() => {
  const akun = window.CodingSkanetraAkun;
  const el = {
    judul: document.getElementById("loginTitle"),
    sub: document.getElementById("loginSubtitle"),
    form: document.getElementById("loginForm"),
    tabMasuk: document.getElementById("tabMasuk"),
    tabDaftar: document.getElementById("tabDaftar"),
    user: document.getElementById("loginUsername"),
    pass: document.getElementById("loginPassword"),
    pass2: document.getElementById("loginPasswordUlang"),
    grup2: document.getElementById("confirmGroup"),
    hint: document.getElementById("usernameHint"),
    lihat: document.getElementById("showPassword"),
    tombol: document.getElementById("loginButton"),
    pesan: document.getElementById("loginMessage")
  };

  // Tujuan setelah berhasil: ?next=peringkat membuka pages/peringkat.html. Hanya nama halaman biasa yang diterima.
  const next = new URLSearchParams(location.search).get("next") || "";
  const tujuan = /^[a-z0-9-]{1,40}$/.test(next) ? next + ".html" : "../index.html";

  let daftar = new URLSearchParams(location.search).get("mode") === "daftar";

  function atur() {
    el.judul.textContent = daftar ? "Buat akun" : "Masuk";
    el.sub.textContent = daftar
      ? "Pilih username dan password. Kodemu nanti tersimpan di akun ini."
      : "Masuk untuk menyimpan kodemu di akun dan membuka halaman Peringkat.";
    el.tombol.textContent = daftar ? "Daftar" : "Masuk";
    el.grup2.hidden = !daftar;
    el.hint.hidden = !daftar;
    el.pass2.required = daftar;
    el.pass.autocomplete = daftar ? "new-password" : "current-password";
    el.tabMasuk.setAttribute("aria-selected", String(!daftar));
    el.tabDaftar.setAttribute("aria-selected", String(daftar));
    el.tabMasuk.tabIndex = daftar ? -1 : 0;
    el.tabDaftar.tabIndex = daftar ? 0 : -1;
    el.pesan.textContent = "";
  }

  el.tabMasuk.addEventListener("click", () => { daftar = false; atur(); });
  el.tabDaftar.addEventListener("click", () => { daftar = true; atur(); });
  el.lihat.addEventListener("change", () => {
    const tipe = el.lihat.checked ? "text" : "password";
    el.pass.type = tipe;
    el.pass2.type = tipe;
  });

  function selesai() { window.location.replace(tujuan); }

  async function kirim(event) {
    event.preventDefault();
    el.pesan.textContent = "";
    if (!akun || !akun.tersedia) {
      el.pesan.textContent = "Fitur akun belum siap. Hubungi pengelola.";
      return;
    }
    const username = el.user.value.trim().toLowerCase();
    const password = el.pass.value;
    if (daftar && password !== el.pass2.value) {
      el.pesan.textContent = "Kedua password tidak sama.";
      return;
    }
    el.tombol.disabled = true;
    el.tombol.textContent = daftar ? "Membuat akun…" : "Memeriksa…";
    try {
      if (daftar) await akun.daftar(username, password);
      else await akun.masuk(username, password);
      selesai();
    } catch (error) {
      el.pesan.textContent = error.message || "Gagal. Periksa koneksi lalu coba lagi.";
      el.tombol.disabled = false;
      el.tombol.textContent = daftar ? "Daftar" : "Masuk";
    }
  }

  el.form.addEventListener("submit", kirim);
  atur();

  // Sudah masuk: langsung ke tujuan.
  if (akun) akun.siap.then(() => { if (akun.pengguna()) selesai(); });
})();
