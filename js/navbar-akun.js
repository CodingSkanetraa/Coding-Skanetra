// Navbar: menu "Lainnya" (dropdown di desktop) dan tombol Masuk / @username.
//
// Dibangun dari tautan yang sudah ada di #nav-links, jadi menu tetap cukup diubah di satu tempat (HTML).
// Status login dibaca dari sesi yang disimpan js/akun.js di browser; skrip ini tidak memanggil server.
// Di layar <= 1024px (menu hamburger) semua tautan tetap tampil berurutan, tanpa dropdown.
(() => {
  "use strict";
  const KUNCI_SESI = "codingskanetra-sesi";
  const POLA_USERNAME = /^[a-z0-9_.]{3,20}$/;
  const KELOMPOK_LAINNYA = ["struktur", "dokumentasi", "about", "setting"];

  // Username akun yang sedang masuk, atau null.
  function usernameAktif() {
    try {
      const s = JSON.parse(localStorage.getItem(KUNCI_SESI));
      if (s && s.access_token && typeof s.username === "string" && POLA_USERNAME.test(s.username)) return s.username;
    } catch (e) { /* sesi rusak atau penyimpanan diblokir: anggap belum masuk */ }
    return null;
  }

  // Avatar bulat berisi huruf pertama username; warnanya selalu sama untuk username yang sama.
  function avatar(username, kelas) {
    let h = 0;
    for (const c of username) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const a = document.createElement("span");
    a.className = "cs-avatar" + (kelas ? " " + kelas : "");
    a.textContent = username.charAt(0).toUpperCase();
    a.style.setProperty("--avatar-hue", String(h % 360));
    a.setAttribute("aria-hidden", "true");
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

  // ---------- Menu "Lainnya" ----------
  const anggota = KELOMPOK_LAINNYA.map((k) => nav.querySelector('a.nav-link[data-nav="' + k + '"]')).filter(Boolean);
  if (anggota.length) {
    const wadah = el("div", "nav-lainnya");
    const tombol = el("button", "nav-link nav-lainnya-btn", "Lainnya");
    tombol.type = "button";
    tombol.setAttribute("aria-haspopup", "true");
    tombol.setAttribute("aria-expanded", "false");
    tombol.setAttribute("aria-controls", "nav-lainnya-menu");
    const menu = el("div", "nav-lainnya-menu");
    menu.id = "nav-lainnya-menu";
    anggota[0].insertAdjacentElement("beforebegin", wadah);
    wadah.append(tombol, menu);
    anggota.forEach((a) => menu.appendChild(a));
    if (anggota.some((a) => a.classList.contains("active") || a.getAttribute("aria-current") === "page")) tombol.classList.add("active");

    const buka = (ya) => {
      wadah.classList.toggle("terbuka", ya);
      tombol.setAttribute("aria-expanded", String(ya));
    };
    tombol.addEventListener("click", () => buka(!wadah.classList.contains("terbuka")));
    document.addEventListener("click", (e) => { if (!wadah.contains(e.target)) buka(false); });
    wadah.addEventListener("focusout", (e) => { if (e.relatedTarget && !wadah.contains(e.relatedTarget)) buka(false); });
    wadah.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && wadah.classList.contains("terbuka")) { buka(false); tombol.focus(); }
    });
  }

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
  window.addEventListener("storage", (e) => { if (e.key === KUNCI_SESI) gambar(); });
  window.addEventListener("cs:akun", gambar);
})();
