/* Navbar HP: bar ikon di bawah layar menggantikan hamburger (lebar <= 720px).
   Dibangun dari tautan yang sudah ada di .nav-links, jadi menu cukup diubah di satu tempat. */
(() => {
  const nav = document.querySelector("#nav-links");
  const ikon = window.CodingSkanetraIkon;
  if (!nav || !ikon) return;

  const UTAMA = [
    { kunci: "beranda", ikon: "beranda", label: "Beranda" },
    { kunci: "materi", ikon: "materi", label: "Materi" },
    { kunci: "playground", ikon: "editor", label: "Editor" },
    { kunci: "peringkat", ikon: "peringkat", label: "Peringkat" }
  ];
  const LAIN = { games: "games", struktur: "struktur", dokumentasi: "galeri", about: "tentang", setting: "pengaturan" };

  const tautan = {};
  nav.querySelectorAll("a.nav-link").forEach((a) => {
    tautan[a.dataset.nav] = {
      href: a.href,
      teks: a.textContent.trim(),
      aktif: a.classList.contains("active") || a.getAttribute("aria-current") === "page"
    };
  });

  const el = (tag, kelas) => { const e = document.createElement(tag); if (kelas) e.className = kelas; return e; };

  const bar = el("nav", "bar-bawah");
  bar.setAttribute("aria-label", "Navigasi bawah");

  UTAMA.forEach((u) => {
    const t = tautan[u.kunci];
    if (!t) return;
    const a = el("a", "bb-item" + (t.aktif ? " aktif" : ""));
    a.href = t.href;
    if (t.aktif) a.setAttribute("aria-current", "page");
    a.innerHTML = ikon.svg(u.ikon, 23) + "<span>" + u.label + "</span>";
    bar.appendChild(a);
  });

  const lainAktif = Object.keys(LAIN).some((k) => tautan[k] && tautan[k].aktif) || Boolean(tautan.profil && tautan.profil.aktif);
  const tombolLain = el("button", "bb-item bb-lainnya" + (lainAktif ? " aktif" : ""));
  tombolLain.type = "button";
  tombolLain.setAttribute("aria-haspopup", "true");
  tombolLain.setAttribute("aria-expanded", "false");
  tombolLain.setAttribute("aria-controls", "bb-sheet");
  tombolLain.innerHTML = ikon.svg("lainnya", 23) + "<span>Lainnya</span>";
  bar.appendChild(tombolLain);

  const latar = el("div", "bb-latar");
  latar.hidden = true;
  const sheet = el("div", "bb-sheet");
  sheet.id = "bb-sheet";
  sheet.hidden = true;
  // Baris pertama: Profil (bila sudah masuk, tampil avatar dan @username) atau Masuk.
  if (tautan.profil) {
    const t = tautan.profil;
    const nama = window.CodingSkanetraAvatar ? window.CodingSkanetraAvatar.username() : null;
    const a = el("a", "bb-sheet-item bb-profil" + (t.aktif ? " aktif" : ""));
    a.href = t.href;
    if (t.aktif) a.setAttribute("aria-current", "page");
    if (nama) {
      a.setAttribute("aria-label", "Profil, masuk sebagai @" + nama);
      a.appendChild(window.CodingSkanetraAvatar.buat(nama));
      const teks = el("span", "bb-profil-teks");
      const atas = el("strong"); atas.textContent = "@" + nama;
      const bawah = el("small"); bawah.textContent = "Lihat profil";
      teks.append(atas, bawah);
      a.appendChild(teks);
    } else {
      a.innerHTML = ikon.svg("akun", 20) + "<span>Masuk</span>";
    }
    sheet.appendChild(a);
  }
  Object.keys(LAIN).forEach((k) => {
    const t = tautan[k];
    if (!t) return;
    const a = el("a", "bb-sheet-item" + (t.aktif ? " aktif" : ""));
    a.href = t.href;
    if (t.aktif) a.setAttribute("aria-current", "page");
    a.innerHTML = ikon.svg(LAIN[k], 20) + "<span>" + t.teks + "</span>";
    sheet.appendChild(a);
  });

  const buka = (ya) => {
    sheet.hidden = !ya;
    latar.hidden = !ya;
    tombolLain.setAttribute("aria-expanded", String(ya));
  };
  tombolLain.addEventListener("click", () => buka(sheet.hidden));
  latar.addEventListener("click", () => buka(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !sheet.hidden) buka(false); });

  document.body.append(latar, sheet, bar);
  document.body.classList.add("punya-bar-bawah");

  // Saat keyboard layar terbuka (ada kolom ketik yang fokus dan area tampil menyusut), bar disembunyikan
  // supaya tidak menutupi kolom ketik. Tidak dicek saat halaman baru dimuat agar tidak salah deteksi.
  const vv = window.visualViewport;
  if (vv) {
    const periksa = () => {
      const a = document.activeElement;
      const mengetik = a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable);
      const terbuka = Boolean(mengetik) && window.innerHeight - vv.height > 140;
      document.documentElement.classList.toggle("keyboard-terbuka", terbuka);
    };
    vv.addEventListener("resize", periksa);
    document.addEventListener("focusout", () => window.setTimeout(periksa, 250));
    document.addEventListener("focusin", () => window.setTimeout(periksa, 400));
  }
})();
