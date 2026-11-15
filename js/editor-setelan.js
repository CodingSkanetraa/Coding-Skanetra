/* Menu "Pengaturan" di toolbar editor (menu ⋯): ukuran huruf, tab, bungkus baris, nomor baris,
   petunjuk kode, dan tema. Perubahan langsung berlaku dan disimpan di pengaturan yang sama
   dengan halaman Pengaturan, jadi keduanya selalu sejalan. */
(() => {
  "use strict";
  const I = window.CodingSkanetraIkon;
  const grup = document.getElementById("tb-more-group");
  const lebih = document.querySelector(".tb-more-btn");
  if (!I || !grup || !lebih) return;

  const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks !== undefined) e.textContent = teks; return e; };
  const P = () => window.CodingSkanetraEditorPrefs;
  const hp = window.matchMedia("(max-width: 720px)");

  let panel = null;
  let tombolAsal = null;
  const penyegar = [];

  function baris(judul, keterangan) {
    const b = el("div", "cs-set-baris");
    const t = el("div", "cs-set-teks");
    t.append(el("strong", "", judul));
    if (keterangan) t.append(el("span", "", keterangan));
    b.append(t);
    return b;
  }

  function sakelar(judul, keterangan, kunci) {
    const b = baris(judul, keterangan);
    const s = el("button", "cs-set-sakelar");
    s.type = "button";
    s.setAttribute("role", "switch");
    s.setAttribute("aria-label", judul);
    s.append(el("span", "cs-set-bulat"));
    const segar = () => s.setAttribute("aria-checked", String(Boolean(P().nilai()[kunci] !== false && P().nilai()[kunci])));
    s.addEventListener("click", () => { P().ubah({ [kunci]: s.getAttribute("aria-checked") !== "true" }); });
    penyegar.push(segar);
    b.append(s);
    return b;
  }

  function segmen(judul, pilihan, ambil, atur) {
    const b = baris(judul);
    const g = el("div", "cs-set-segmen");
    g.setAttribute("role", "radiogroup");
    g.setAttribute("aria-label", judul);
    const tombol = pilihan.map(([nilai, label]) => {
      const t = el("button", "cs-set-pilih", label);
      t.type = "button";
      t.setAttribute("role", "radio");
      t.addEventListener("click", () => atur(nilai));
      g.append(t);
      return [nilai, t];
    });
    penyegar.push(() => { const kini = ambil(); tombol.forEach(([n, t]) => { const ya = n === kini; t.setAttribute("aria-checked", String(ya)); t.classList.toggle("aktif", ya); }); });
    b.append(g);
    return b;
  }

  function buatPanel() {
    const p = el("div", "cs-setelan");
    p.setAttribute("role", "dialog");
    p.setAttribute("aria-label", "Pengaturan cepat editor");
    p.hidden = true;

    const kepala = el("div", "cs-set-kepala");
    kepala.append(el("strong", "", "Pengaturan cepat"));
    const tutup = el("button", "cs-set-tutup");
    tutup.type = "button";
    I.isiTombol(tutup, "tutup", "Tutup", { ikonSaja: true });
    tutup.addEventListener("click", () => buka(false));
    kepala.append(tutup);
    p.append(kepala);

    // Ukuran huruf: A− 14 px A+
    const bf = baris("Ukuran huruf");
    const st = el("div", "cs-set-langkah");
    const kurang = el("button", "cs-set-pilih", "A−"), tambah = el("button", "cs-set-pilih", "A+"), nilaiF = el("output", "cs-set-nilai");
    kurang.type = tambah.type = "button";
    kurang.setAttribute("aria-label", "Perkecil huruf");
    tambah.setAttribute("aria-label", "Perbesar huruf");
    const geser = (arah) => {
      const daftar = P().PILIHAN_FONT, i = daftar.indexOf(P().nilai().fontSize);
      const j = Math.min(daftar.length - 1, Math.max(0, (i < 0 ? daftar.indexOf(14) : i) + arah));
      P().ubah({ fontSize: daftar[j] });
    };
    kurang.addEventListener("click", () => geser(-1));
    tambah.addEventListener("click", () => geser(1));
    st.append(kurang, nilaiF, tambah);
    bf.append(st);
    p.append(bf);
    penyegar.push(() => {
      const n = P().nilai().fontSize, d = P().PILIHAN_FONT;
      nilaiF.textContent = n + " px";
      kurang.disabled = n <= d[0]; tambah.disabled = n >= d[d.length - 1];
    });

    p.append(segmen("Lebar tab", [[2, "2"], [4, "4"]], () => P().nilai().tabSize, (n) => P().ubah({ tabSize: n })));
    p.append(sakelar("Bungkus baris", "Baris panjang turun ke bawah", "lineWrapping"));
    p.append(sakelar("Nomor baris", null, "lineNumbers"));
    if (window.CodingSkanetraHint) p.append(sakelar("Petunjuk kode", "Saran kata saat mengetik", "hint"));

    const tema = window.CodingSkanetraTheme;
    if (tema && typeof tema.setThemeMode === "function") {
      p.append(segmen("Tema situs", [["dark", "Gelap"], ["light", "Terang"]], () => tema.getSavedMode(), (m) => {
        tema.setThemeMode(m);
        document.querySelectorAll(".CodeMirror").forEach((c) => { if (c.CodeMirror) c.CodeMirror.refresh(); });
        segarkan();
      }));
    }

    const kaki = el("div", "cs-set-kaki");
    const reset = el("button", "cs-set-tautan", "Kembalikan bawaan");
    reset.type = "button";
    reset.addEventListener("click", () => P().ubah({ ...P().BAWAAN }));
    const semua = el("a", "cs-set-tautan", "Semua pengaturan");
    semua.href = "profil.html#tampilan";
    kaki.append(reset, semua);
    p.append(kaki);

    document.body.append(p);
    return p;
  }

  function segarkan() { penyegar.forEach((f) => f()); }

  function letakkan() {
    if (!panel || hp.matches) { if (panel) { panel.style.top = ""; panel.style.right = ""; } return; }
    const k = lebih.getBoundingClientRect();
    panel.style.top = Math.round(k.bottom + 8) + "px";
    panel.style.right = Math.max(8, Math.round(window.innerWidth - k.right)) + "px";
  }

  function buka(ya, asal) {
    if (ya) {
      if (!panel) panel = buatPanel();
      tombolAsal = asal || lebih;
      segarkan();
      panel.hidden = false;
      letakkan();
      document.body.classList.add("setelan-buka");
      const fokus = panel.querySelector(".cs-set-pilih:not(:disabled), .cs-set-sakelar");
      if (fokus) fokus.focus({ preventScroll: true });
    } else if (panel && !panel.hidden) {
      panel.hidden = true;
      document.body.classList.remove("setelan-buka");
      if (tombolAsal && document.contains(tombolAsal)) tombolAsal.focus({ preventScroll: true });
    }
  }

  const item = el("button", (lebih.classList.contains("playground-reset") ? "playground-reset" : "py-btn-secondary") + " tb-btn tb-item-setelan");
  item.type = "button";
  item.setAttribute("aria-haspopup", "dialog");
  I.isiTombol(item, "pengaturan", "Pengaturan");
  item.addEventListener("click", () => window.setTimeout(() => buka(!(panel && !panel.hidden), item), 0));
  grup.prepend(item);

  document.addEventListener("cs:prefs", segarkan);
  document.addEventListener("pointerdown", (e) => {
    if (!panel || panel.hidden) return;
    if (panel.contains(e.target) || item.contains(e.target)) return;
    buka(false);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && panel && !panel.hidden) { e.stopPropagation(); buka(false); } });
  window.addEventListener("resize", letakkan);
  window.addEventListener("storage", segarkan);
})();
