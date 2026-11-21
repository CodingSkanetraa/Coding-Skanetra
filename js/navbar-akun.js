// Navbar: menu "Lainnya" (dropdown di desktop) dan tombol Masuk / @username.
//
// Dibangun dari tautan yang sudah ada di #nav-links, jadi menu tetap cukup diubah di satu tempat (HTML).
// Status login dibaca dari sesi yang disimpan js/akun.js di browser; skrip ini tidak memanggil server.
// Di layar <= 1024px (menu hamburger) semua tautan tetap tampil berurutan, tanpa dropdown.
(() => {
  "use strict";
  const KUNCI_SESI = "codingskanetra-sesi";
  const KUNCI_FOTO = "codingskanetra-foto";
  const KUNCI_ADMIN = "codingskanetra-admin"; // { uid, admin, t }: hanya untuk menampilkan tab; hak admin sebenarnya dicek database
  const UMUR_ADMIN = 6 * 3600 * 1000;
  const POLA_USERNAME = /^[a-z0-9_.]{3,20}$/;
  const POLA_FOTO = /^data:image\/(webp|jpeg);base64,[A-Za-z0-9+/]+=*$/;
  // Urutan menu: Beranda, Materi, Playground, Game (games, tantangan), Lainnya (sisanya).
  const KELOMPOK = [
    { id: "game", label: "Game", anggota: ["games", "tantangan"] },
    { id: "lainnya", label: "Lainnya", anggota: ["peringkat", "kelompok", "struktur", "dokumentasi", "about", "setting"] }
  ];

  // Username akun yang sedang masuk, atau null.
  function usernameAktif() {
    try {
      const s = JSON.parse(localStorage.getItem(KUNCI_SESI));
      if (s && s.access_token && typeof s.username === "string" && POLA_USERNAME.test(s.username)) return s.username;
    } catch (e) { /* sesi rusak atau penyimpanan diblokir: anggap belum masuk */ }
    return null;
  }

  // Foto profil akun yang sedang masuk (disimpan js/akun.js di browser ini), atau null.
  function fotoAktif() {
    try {
      const s = JSON.parse(localStorage.getItem(KUNCI_SESI));
      const o = JSON.parse(localStorage.getItem(KUNCI_FOTO));
      if (s && s.user && o && o.uid === s.user.id && typeof o.data === "string" && o.data.length <= 60000 && POLA_FOTO.test(o.data)) return o.data;
    } catch (e) { /* tidak ada foto */ }
    return null;
  }

  // Avatar bulat: foto profil bila ada, selain itu huruf pertama username (warna tetap untuk username yang sama).
  function avatar(username, kelas) {
    let h = 0;
    for (const c of username) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const a = document.createElement("span");
    a.className = "cs-avatar" + (kelas ? " " + kelas : "");
    a.style.setProperty("--avatar-hue", String(h % 360));
    a.setAttribute("aria-hidden", "true");
    const foto = fotoAktif();
    if (foto) {
      const img = document.createElement("img");
      img.alt = "";
      img.decoding = "async";
      img.src = foto;
      a.classList.add("berfoto");
      a.appendChild(img);
    } else {
      a.textContent = username.charAt(0).toUpperCase();
    }
    return a;
  }

  window.CodingSkanetraAvatar = { buat: avatar, username: usernameAktif };

  const nav = document.querySelector("#nav-links");
  if (!nav) return;
  const el = (tag, kelas, teks) => {
    const e = document.createElement(tag);
    if (kelas) e.className = kelas;
    if (teks !== undefined) e.textContent = teks;
    return e;
  };

  // ---------- Menu dropdown (Game, Lainnya) ----------
  const semuaWadah = [];
  KELOMPOK.forEach((g) => {
    const anggota = g.anggota.map((k) => nav.querySelector('a.nav-link[data-nav="' + k + '"]')).filter(Boolean);
    if (!anggota.length) return;
    const wadah = el("div", "nav-lainnya nav-" + g.id);
    const tombol = el("button", "nav-link nav-lainnya-btn", g.label);
    tombol.type = "button";
    tombol.setAttribute("aria-haspopup", "true");
    tombol.setAttribute("aria-expanded", "false");
    tombol.setAttribute("aria-controls", "nav-" + g.id + "-menu");
    const menu = el("div", "nav-lainnya-menu");
    menu.id = "nav-" + g.id + "-menu";
    wadah.append(tombol, menu);
    anggota.forEach((a) => menu.appendChild(a));
    nav.appendChild(wadah);
    semuaWadah.push(wadah);
    if (anggota.some((a) => a.classList.contains("active") || a.getAttribute("aria-current") === "page")) tombol.classList.add("active");

    const buka = (ya) => {
      wadah.classList.toggle("terbuka", ya);
      tombol.setAttribute("aria-expanded", String(ya));
    };
    tombol.addEventListener("click", () => {
      const ya = !wadah.classList.contains("terbuka");
      semuaWadah.forEach((w) => { if (w !== wadah) { w.classList.remove("terbuka"); const t = w.querySelector(".nav-lainnya-btn"); if (t) t.setAttribute("aria-expanded", "false"); } });
      buka(ya);
    });
    document.addEventListener("click", (e) => { if (!wadah.contains(e.target)) buka(false); });
    wadah.addEventListener("focusout", (e) => { if (e.relatedTarget && !wadah.contains(e.relatedTarget)) buka(false); });
    wadah.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && wadah.classList.contains("terbuka")) { buka(false); tombol.focus(); }
    });
  });

  // ---------- Masuk / @username ----------
  const acuan = nav.querySelector('a.nav-link[data-nav="setting"]') || nav.querySelector("a.nav-link");
  if (!acuan) return;
  const urlProfil = new URL("profil.html", acuan.href).href;
  const urlMasuk = new URL("login.html", acuan.href).href;
  const berkas = (location.pathname.split("/").pop() || "").replace(/\.html$/, "");
  const next = location.pathname.includes("/pages/") && /^[a-z0-9-]{1,40}$/.test(berkas) && berkas !== "login" ? "?next=" + berkas : "";
  const diProfil = berkas === "profil";

  const slot = el("a", "nav-link nav-akun");
  slot.dataset.nav = "profil";
  nav.appendChild(slot);

  function gambar() {
    const u = usernameAktif();
    slot.textContent = "";
    slot.classList.toggle("masuk", !u);
    slot.classList.toggle("active", diProfil);
    if (u) {
      slot.href = urlProfil;
      slot.title = "Profil @" + u;
      slot.setAttribute("aria-label", "Profil, masuk sebagai @" + u);
      if (diProfil) slot.setAttribute("aria-current", "page");
      slot.append(avatar(u), el("span", "nav-akun-nama", "@" + u));
    } else {
      slot.href = urlMasuk + next;
      slot.title = "Masuk atau daftar";
      slot.removeAttribute("aria-label");
      slot.removeAttribute("aria-current");
      slot.append(el("span", "", "Masuk"));
    }
  }
  gambar();

  // ---------- Tab "Pengelola" (hanya untuk admin) ----------
  const tabAdmin = el("a", "nav-link nav-admin", "Pengelola");
  tabAdmin.href = new URL("admin.html", acuan.href).href;
  tabAdmin.dataset.nav = "admin";
  tabAdmin.hidden = true;
  if (berkas === "admin" || berkas.startsWith("admin-")) {
    tabAdmin.classList.add("active");
    tabAdmin.setAttribute("aria-current", "page");
  }
  nav.insertBefore(tabAdmin, slot);

  function uidAktif() {
    try { const s = JSON.parse(localStorage.getItem(KUNCI_SESI)); return s && s.user && s.user.id ? s.user.id : null; } catch (e) { return null; }
  }
  function adminTersimpan(uid) {
    try {
      const o = JSON.parse(localStorage.getItem(KUNCI_ADMIN));
      if (o && o.uid === uid && typeof o.admin === "boolean" && Date.now() - o.t < UMUR_ADMIN) return o.admin;
    } catch (e) { /* tidak ada simpanan */ }
    return null;
  }
  async function perbaruiAdmin() {
    const uid = uidAktif();
    if (!uid || !usernameAktif()) { tabAdmin.hidden = true; return; }
    const simpan = adminTersimpan(uid);
    tabAdmin.hidden = simpan !== true;
    if (simpan !== null) return;
    const akun = window.CodingSkanetraAkun;
    if (!akun || !akun.tersedia || !akun.profil) return;
    try {
      await akun.siap;
      const p = await akun.profil();
      const ya = Boolean(p && p.admin === true);
      try { localStorage.setItem(KUNCI_ADMIN, JSON.stringify({ uid, admin: ya, t: Date.now() })); } catch (e) { /* abaikan */ }
      if (uidAktif() === uid) tabAdmin.hidden = !ya;
    } catch (e) { /* jaringan: tab tetap tersembunyi, dicoba lagi saat halaman dibuka berikutnya */ }
  }
  perbaruiAdmin();
  window.addEventListener("cs:akun", perbaruiAdmin);
  window.addEventListener("storage", (e) => { if (e.key === KUNCI_SESI || e.key === KUNCI_ADMIN) perbaruiAdmin(); });
  window.addEventListener("storage", (e) => { if (e.key === KUNCI_SESI || e.key === KUNCI_FOTO) gambar(); });
  window.addEventListener("cs:foto", gambar);
  window.addEventListener("cs:akun", gambar);
})();
