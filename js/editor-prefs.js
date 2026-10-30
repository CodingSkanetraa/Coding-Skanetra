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

  window.CodingSkanetraEditorPrefs = { read, pasang };
})();
