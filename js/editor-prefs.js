// Menerapkan "Pengaturan editor" (halaman Pengaturan) ke editor CodeMirror.
// Dipakai oleh Editor Web, Editor Python, dan Editor C++.
// Jika pengguna belum pernah mengubah pengaturan, editor memakai nilai bawaannya sendiri.
(() => {
  "use strict";

  const KEY = "codingskanetra-editor-preferences";
  const editors = new Set();

  function read() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (!saved || typeof saved !== "object") return null;

      const prefs = {};
      if ([12, 13, 14, 15, 16, 18, 20].includes(Number(saved.fontSize))) prefs.fontSize = Number(saved.fontSize);
      if ([2, 4].includes(Number(saved.tabSize))) prefs.tabSize = Number(saved.tabSize);
      if (typeof saved.lineWrapping === "boolean") prefs.lineWrapping = saved.lineWrapping;
      if (typeof saved.lineNumbers === "boolean") prefs.lineNumbers = saved.lineNumbers;
      if (typeof saved.hint === "boolean") prefs.hint = saved.hint; // petunjuk kode; bawaan: menyala
      return Object.keys(prefs).length ? prefs : null;
    } catch (error) {
      return null;
    }
  }

  function terapkan(cm, prefs) {
    if (!cm || !prefs) return;
    if (prefs.tabSize) {
      cm.setOption("tabSize", prefs.tabSize);
      cm.setOption("indentUnit", prefs.tabSize);
    }
    if (typeof prefs.lineWrapping === "boolean") cm.setOption("lineWrapping", prefs.lineWrapping);
    if (typeof prefs.lineNumbers === "boolean") cm.setOption("lineNumbers", prefs.lineNumbers);
    if (prefs.fontSize) cm.getWrapperElement().style.fontSize = prefs.fontSize + "px";
    cm.refresh();
  }

  function pasang(cm) {
    if (!cm) return;
    editors.add(cm);
    terapkan(cm, read());
  }

  // Pengaturan diubah di tab lain: editor yang sedang terbuka ikut menyesuaikan.
  window.addEventListener("storage", (event) => {
    if (event.key !== KEY) return;
    const prefs = read();
    editors.forEach((cm) => terapkan(cm, prefs));
  });

  /* ---- Pengaturan cepat (menu di toolbar editor) ---- */
  const BAWAAN = { fontSize: 14, tabSize: 4, lineWrapping: false, lineNumbers: true, hint: true };
  const PILIHAN_FONT = [12, 13, 14, 15, 16, 18, 20];

  // Nilai yang sedang berlaku: pengaturan tersimpan, kalau belum ada ambil dari editor yang terbuka.
  function nilai() {
    const hasil = { ...BAWAAN };
    const cm = editors.values().next().value;
    if (cm) {
      hasil.tabSize = Number(cm.getOption("tabSize")) === 2 ? 2 : 4;
      hasil.lineWrapping = Boolean(cm.getOption("lineWrapping"));
      hasil.lineNumbers = Boolean(cm.getOption("lineNumbers"));
      const px = Math.round(parseFloat(getComputedStyle(cm.getWrapperElement()).fontSize));
      if (PILIHAN_FONT.includes(px)) hasil.fontSize = px;
    }
    return { ...hasil, ...(read() || {}) };
  }

  function ubah(sebagian) {
    let simpan = {};
    try { simpan = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (error) { simpan = {}; }
    if (typeof simpan !== "object") simpan = {};
    const gabung = { ...nilai(), ...simpan, ...sebagian };
    try {
      localStorage.setItem(KEY, JSON.stringify(gabung));
      if (window.CodingSkanetraAkun && window.CodingSkanetraAkun.sinkron) window.CodingSkanetraAkun.sinkron.catat(KEY);
    } catch (error) { /* penyimpanan penuh atau diblokir: perubahan tetap berlaku di halaman ini */ }
    const prefs = read() || gabung;
    editors.forEach((cm) => terapkan(cm, { ...gabung, ...prefs }));
    document.dispatchEvent(new CustomEvent("cs:prefs", { detail: gabung }));
    return gabung;
  }

  window.CodingSkanetraEditorPrefs = { read, pasang, nilai, ubah, BAWAAN, PILIHAN_FONT };
})();
