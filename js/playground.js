
console.log("PLAYGROUND.JS BERHASIL DIMUAT");

document.addEventListener("DOMContentLoaded", () => {
  // 1. Ambil elemen HTML
  const htmlTextarea = document.querySelector("#html-code");
  const cssTextarea = document.querySelector("#css-code");
  const jsTextarea = document.querySelector("#js-code");
  let preview = document.querySelector("#code-preview");

  const runButton = document.querySelector("#run-code");
  const resetButton = document.querySelector("#reset-code");
  const downloadToggle = document.querySelector("#download-toggle");
  const downloadOptions = document.querySelector("#download-options");
  const downloadMenu = document.querySelector(".download-menu");
  const downloadButtons = document.querySelectorAll("[data-download]");

  const hidePreviewButton = document.querySelector("#hide-preview");
  const enlargePreviewButton = document.querySelector("#enlarge-preview");
  const status = document.querySelector("#editor-status");

  const htmlTab = document.querySelector("#tab-html");
  const cssTab = document.querySelector("#tab-css");
  const jsTab = document.querySelector("#tab-js");
  const htmlPanel = document.querySelector("#panel-html");
  const cssPanel = document.querySelector("#panel-css");
  const jsPanel = document.querySelector("#panel-js");
  const consoleOutput = document.querySelector("#web-console");
  const consoleClear = document.querySelector("#console-clear");
  const workspace = document.querySelector(".playground-workspace");

  // 2. Pastikan elemen tersedia
  if (
    !htmlTextarea ||
    !cssTextarea ||
    !jsTextarea ||
    !preview ||
    !runButton ||
    !resetButton ||
    !hidePreviewButton ||
    !enlargePreviewButton ||
    !status ||
    !htmlTab ||
    !cssTab ||
    !jsTab ||
    !htmlPanel ||
    !cssPanel ||
    !jsPanel ||
    !consoleOutput ||
    !consoleClear ||
    !downloadToggle || 
    !downloadOptions || 
    !downloadMenu ||
    !workspace
  ) {
    console.error("Playground gagal: ada elemen HTML yang tidak ditemukan.");
    return;
  }

  // Pastikan library CodeMirror sudah dimuat
  if (typeof CodeMirror === "undefined") {
    console.error("CodeMirror gagal dimuat. Periksa koneksi internet dan CDN.");
    status.textContent = "Editor gagal dimuat. Periksa koneksi internet.";
    return;
  }

  // 3. Simpan contoh awal untuk tombol Reset
  const initialHTML = htmlTextarea.value;
  const initialCSS = cssTextarea.value;
  const initialJS = jsTextarea.value;

  // 4. Buat editor CodeMirror
  const htmlEditor = CodeMirror.fromTextArea(htmlTextarea, {
    mode: "htmlmixed",
    theme: "material-darker",
    lineNumbers: true,
    indentUnit: 4,
    tabSize: 4,
    indentWithTabs: false,
    smartIndent: true,
    autoCloseTags: true,
    autoCloseBrackets: true,
    matchBrackets: true,
    lineWrapping: false,

    extraKeys: {
    "Ctrl-F": (editor) => bukaPencarian(editor),
    "Cmd-F": (editor) => bukaPencarian(editor),
    Tab: (editor) => editor.execCommand("insertSoftTab"),
    "Shift-Tab": (editor) => editor.execCommand("indentLess")
    }

  });

  const cssEditor = CodeMirror.fromTextArea(cssTextarea, {
    mode: "css",
    theme: "material-darker",
    lineNumbers: true,
    indentUnit: 4,
    tabSize: 4,
    indentWithTabs: false,
    smartIndent: true,
    autoCloseBrackets: true,
    matchBrackets: true,
    lineWrapping: false,

    extraKeys: {
    "Ctrl-F": (editor) => bukaPencarian(editor),
    "Cmd-F": (editor) => bukaPencarian(editor),
    Tab: (editor) => editor.execCommand("insertSoftTab"),
    "Shift-Tab": (editor) => editor.execCommand("indentLess")
    }

  });

  const jsEditor = CodeMirror.fromTextArea(jsTextarea, {
    mode: "javascript",
    theme: "material-darker",
    lineNumbers: true,
    indentUnit: 2,
    tabSize: 2,
    indentWithTabs: false,
    smartIndent: true,
    autoCloseBrackets: true,
    matchBrackets: true,
    lineWrapping: false,

    extraKeys: {
    "Ctrl-F": (editor) => bukaPencarian(editor),
    "Cmd-F": (editor) => bukaPencarian(editor),
    Tab: (editor) => editor.execCommand("insertSoftTab"),
    "Shift-Tab": (editor) => editor.execCommand("indentLess")
    }
  });

  // Sesuaikan tinggi editor dengan panel
  htmlEditor.setSize("100%", "100%");
  cssEditor.setSize("100%", "100%");
  jsEditor.setSize("100%", "100%");

  // Terapkan Pengaturan editor (ukuran font, indentasi, nomor baris, line wrapping)
  if (window.CodingSkanetraEditorPrefs) {
    [htmlEditor, cssEditor, jsEditor].forEach((cm) => window.CodingSkanetraEditorPrefs.pasang(cm));
  }

  // Pembuka kotak pencarian untuk setiap editor (diisi di bawah)
  const pembukaPencarian = new Map();
  function bukaPencarian(editor) {
    const buka = pembukaPencarian.get(editor);
    if (buka) buka();
  }
  
  
  // Menu unduh
  function tutupMenuUnduh() {
    downloadOptions.hidden = true;
    downloadToggle.setAttribute("aria-expanded", "false");
  }

  downloadToggle.addEventListener("click", () => {
    const akanDibuka = downloadOptions.hidden;
    downloadOptions.hidden = !akanDibuka;
    downloadToggle.setAttribute("aria-expanded", String(akanDibuka));
  });

  // Membuat dan mengunduh file dari teks
  function unduhFile(namaFile, isiFile, tipe = "text/plain;charset=utf-8") {
    const blob = new Blob(["\uFEFF", isiFile], { type: tipe });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = namaFile;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Menggabungkan HTML dan CSS menjadi satu file mandiri
  function buatHTMLLengkap() {
    const hasil = buatHTMLDasar();
    const js = jsEditor.getValue();
    if (!js.trim()) return hasil;

    // </script di dalam kode JS akan menutup tag lebih awal, jadi diamankan.
    const scriptTag = `<script>\n${js.replace(/<\/script/gi, "<\\/script")}\n</script>`;
    if (/<\/body\s*>/i.test(hasil)) {
      return hasil.replace(/<\/body\s*>/i, () => `${scriptTag}\n</body>`);
    }
    return `${hasil}\n${scriptTag}`;
  }

  function buatHTMLDasar() {
    const html = htmlEditor.getValue();
    const css = cssEditor.getValue();

    const styleTag = `<style>\n${css}\n</style>`;

    // Jika kode HTML sudah memiliki head, masukkan CSS ke dalamnya.
    if (/<head(?:\s[^>]*)?>/i.test(html)) {
      return html.replace(/<\/head\s*>/i, `${styleTag}\n</head>`);
    }

    // Jika HTML memiliki html tetapi tidak memiliki head, tambahkan head.
    if (/<html(?:\s[^>]*)?>/i.test(html)) {
      return html.replace(
        /<html(?:\s[^>]*)?>/i,
        (tag) => `${tag}\n<head>\n<meta charset="UTF-8">\n${styleTag}\n</head>`
      );
    }

    // Jika hanya berupa potongan HTML, bungkus menjadi dokumen lengkap.
    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${styleTag}
</head>
<body>
${html}
</body>
</html>`;
  }

  downloadButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const jenis = button.dataset.download;

      if (jenis === "html") {
        unduhFile(
          "index.html",
          htmlEditor.getValue(),
          "text/html;charset=utf-8"
        );
      } else if (jenis === "css") {
        unduhFile(
          "style.css",
          cssEditor.getValue(),
          "text/css;charset=utf-8"
        );
      } else if (jenis === "js") {
        unduhFile(
          "script.js",
          jsEditor.getValue(),
          "text/javascript;charset=utf-8"
        );
      } else if (jenis === "project") {
        unduhFile(
          "proyek.html",
          buatHTMLLengkap(),
          "text/html;charset=utf-8"
        );
      }

      tutupMenuUnduh();
      status.textContent = "File disiapkan untuk diunduh.";
    });
  });

  // Tutup menu saat klik di luar atau menekan Escape.
  document.addEventListener("click", (event) => {
    if (!downloadMenu.contains(event.target)) {
      tutupMenuUnduh();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      tutupMenuUnduh();
    }
  });


  // 11. Pencarian khusus untuk editor HTML dan CSS
  function pasangPencarian(editor) {
    const canvas = editor.getWrapperElement().parentElement;
    const searchBox = canvas.querySelector(".editor-search");
    const input = searchBox.querySelector(".editor-search-input");
    const count = searchBox.querySelector(".editor-search-count");
    const prevButton = searchBox.querySelector(".editor-search-prev");
    const nextButton = searchBox.querySelector(".editor-search-next");
    const closeButton = searchBox.querySelector(".editor-search-close");

    let matches = [];
    let markers = [];
    let activeMarker = null;
    let activeIndex = -1;

    function bersihkanPenanda() {
      markers.forEach((marker) => marker.clear());
      markers = [];

      if (activeMarker) {
        activeMarker.clear();
        activeMarker = null;
      }
    }

    function perbaruiPencarian() {
      bersihkanPenanda();
      matches = [];
      activeIndex = -1;

      const query = input.value;
      if (!query) {
        count.textContent = "0/0";
        return;
      }

      const cursor = editor.getSearchCursor(query, { line: 0, ch: 0 }, {
        caseFold: true
      });

      while (cursor.findNext()) {
        matches.push({
          from: cursor.from(),
          to: cursor.to()
        });
      }

      matches.forEach((match) => {
        markers.push(
          editor.markText(match.from, match.to, {
            className: "editor-search-match"
          })
        );
      });

      if (matches.length > 0) {
        pilihHasil(0);
      } else {
        count.textContent = "0/0";
      }
    }

    function pilihHasil(index) {
      if (matches.length === 0) {
        count.textContent = "0/0";
        return;
      }

      activeIndex = (index + matches.length) % matches.length;
      const match = matches[activeIndex];

      if (activeMarker) activeMarker.clear();

      activeMarker = editor.markText(match.from, match.to, {
        className: "editor-search-match-active"
      });

      editor.setSelection(match.from, match.to);
      editor.scrollIntoView({
        from: match.from,
        to: match.to
      }, 80);

      count.textContent = `${activeIndex + 1}/${matches.length}`;
    }

    function bukaPencarian() {
      const selection = editor.getSelection();

      searchBox.hidden = false;

      if (selection) {
        input.value = selection;
        perbaruiPencarian();
      }

      input.focus();
      input.select();

      return true;
    }

    function tutupPencarian() {
      searchBox.hidden = true;
      editor.focus();
    }

    input.addEventListener("input", perbaruiPencarian);

    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        tutupPencarian();
      } else if (event.key === "Enter") {
        event.preventDefault();
        pilihHasil(activeIndex + (event.shiftKey ? -1 : 1));
      }
    });

    prevButton.addEventListener("click", () => {
      pilihHasil(activeIndex - 1);
      input.focus();
    });

    nextButton.addEventListener("click", () => {
      pilihHasil(activeIndex + 1);
      input.focus();
    });

    closeButton.addEventListener("click", tutupPencarian);

    return bukaPencarian;
  }

  pembukaPencarian.set(htmlEditor, pasangPencarian(htmlEditor));
  pembukaPencarian.set(cssEditor, pasangPencarian(cssEditor));
  pembukaPencarian.set(jsEditor, pasangPencarian(jsEditor));

  // 5. Fungsi berpindah tab (HTML, CSS, JS)
  const daftarTab = {
    html: { tab: htmlTab, panel: htmlPanel },
    css: { tab: cssTab, panel: cssPanel },
    js: { tab: jsTab, panel: jsPanel }
  };

  function pilihTab(nama) {
    Object.keys(daftarTab).forEach((kunci) => {
      const { tab, panel } = daftarTab[kunci];
      const aktif = kunci === nama;

      panel.hidden = !aktif;
      tab.classList.toggle("active", aktif);
      tab.setAttribute("aria-selected", String(aktif));
      tab.tabIndex = aktif ? 0 : -1;
    });

    // Penting: ukur ulang editor setelah panel ditampilkan
    requestAnimationFrame(() => {
      htmlEditor.refresh();
      cssEditor.refresh();
      jsEditor.refresh();
    });
  }

  htmlTab.addEventListener("click", () => pilihTab("html"));
  cssTab.addEventListener("click", () => pilihTab("css"));
  jsTab.addEventListener("click", () => pilihTab("js"));

  // Panel console: menampilkan console.log dan error dari kode JS di preview
  const MAKS_BARIS_CONSOLE = 500;
  let jumlahBarisConsole = 0;

  function bersihkanConsole() {
    consoleOutput.textContent = "";
    jumlahBarisConsole = 0;
  }

  function tambahBarisConsole(level, teks) {
    if (jumlahBarisConsole >= MAKS_BARIS_CONSOLE) return;
    jumlahBarisConsole += 1;

    const baris = document.createElement("div");
    baris.className = "console-line console-" + level;
    baris.textContent = (level === "error" ? "✖ " : level === "warn" ? "⚠ " : "") + teks;
    consoleOutput.appendChild(baris);

    if (jumlahBarisConsole === MAKS_BARIS_CONSOLE) {
      const batas = document.createElement("div");
      batas.className = "console-line console-warn";
      batas.textContent = "… (output dipotong, terlalu panjang)";
      consoleOutput.appendChild(batas);
    }
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  }

  // Penyimpanan untuk preview. Preview berjalan di iframe terisolasi (tanpa allow-same-origin),
  // jadi localStorage asli tidak bisa dipakai di sana. Sebagai gantinya, iframe memakai
  // localStorage tiruan yang datanya disimpan oleh halaman ini, dengan kunci khusus agar tidak
  // bercampur dengan data situs (tema, skor game, dsb.).
  const KUNCI_PENYIMPANAN = "codingskanetra-preview-storage";
  const BATAS_PENYIMPANAN = 512 * 1024; // karakter, kira-kira 512 KB
  const BATAS_ENTRI = 200;

  function bacaPenyimpanan() {
    try {
      const data = JSON.parse(localStorage.getItem(KUNCI_PENYIMPANAN) || "{}");
      if (!data || typeof data !== "object" || Array.isArray(data)) return {};
      const bersih = Object.create(null);
      Object.keys(data).forEach((k) => { if (typeof data[k] === "string") bersih[k] = data[k]; });
      return bersih;
    } catch (e) {
      return Object.create(null);
    }
  }

  function tulisPenyimpanan(data) {
    try {
      if (Object.keys(data).length) localStorage.setItem(KUNCI_PENYIMPANAN, JSON.stringify(data));
      else localStorage.removeItem(KUNCI_PENYIMPANAN);
      return true;
    } catch (e) {
      return false;
    }
  }

  function ukuranPenyimpanan(data) {
    return Object.keys(data).reduce((total, k) => total + k.length + data[k].length, 0);
  }

  function tanganiPenyimpanan(data) {
    const simpan = bacaPenyimpanan();
    if (data.op === "clear") {
      tulisPenyimpanan(Object.create(null));
    } else if (typeof data.key === "string" && data.op === "remove") {
      delete simpan[data.key];
      tulisPenyimpanan(simpan);
    } else if (typeof data.key === "string" && data.op === "set" && typeof data.value === "string") {
      const sebelum = Object.prototype.hasOwnProperty.call(simpan, data.key);
      simpan[data.key] = data.value;
      if (ukuranPenyimpanan(simpan) > BATAS_PENYIMPANAN || (!sebelum && Object.keys(simpan).length > BATAS_ENTRI)) return;
      tulisPenyimpanan(simpan);
    }
  }

  // Hanya terima pesan dari iframe preview yang sedang aktif.
  window.addEventListener("message", (event) => {
    if (!preview || event.source !== preview.contentWindow) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.ck === "storage") {
      tanganiPenyimpanan(data);
      return;
    }
    if (data.ck !== "console" || typeof data.text !== "string") return;
    tambahBarisConsole(["log", "warn", "error"].includes(data.level) ? data.level : "log", data.text);
  });

  consoleClear.addEventListener("click", bersihkanConsole);

  const storageClear = document.querySelector("#storage-clear");
  if (storageClear) {
    storageClear.addEventListener("click", () => {
      tulisPenyimpanan(Object.create(null));
      status.textContent = "Penyimpanan preview dihapus. Jalankan ulang untuk melihat efeknya.";
    });
  }

  // Skrip yang dipasang sebelum kode pengguna: meneruskan console.* dan error ke halaman utama.
  const SKRIP_CONSOLE = `(function () {
  var kirim = function (level, teks) {
    try { parent.postMessage({ ck: "console", level: level, text: String(teks) }, "*"); } catch (e) {}
  };
  var format = function (nilai) {
    if (typeof nilai === "string") return nilai;
    if (nilai instanceof Error) return nilai.name + ": " + nilai.message;
    if (typeof nilai === "undefined") return "undefined";
    if (typeof nilai === "function" || typeof nilai === "symbol") return String(nilai);
    if (typeof nilai === "bigint") return String(nilai) + "n";
    try { var json = JSON.stringify(nilai); return json === undefined ? String(nilai) : json; } catch (e) { return String(nilai); }
  };
  var buat = function (level) {
    return function () { kirim(level, Array.prototype.map.call(arguments, format).join(" ")); };
  };
  window.console = { log: buat("log"), info: buat("log"), debug: buat("log"), warn: buat("warn"), error: buat("error") };
  window.addEventListener("error", function (e) {
    var baris = e.lineno ? " (baris " + Math.max(1, e.lineno - __OFFSET__) + ")" : "";
    kirim("error", (e.message || "Terjadi error") + baris);
  });
  window.addEventListener("unhandledrejection", function (e) { kirim("error", "Promise ditolak: " + format(e.reason)); });
})();`;

  // localStorage / sessionStorage tiruan untuk di dalam iframe. Disisipkan sebelum kode pengguna.
  // __DATA__ diganti dengan salinan data tersimpan (JSON satu baris).
  const SKRIP_PENYIMPANAN = `(function () {
  var BATAS = __BATAS__;
  var awal = __DATA__;
  var buatPenyimpanan = function (data, simpanKeLuar) {
    var isi = Object.create(null);
    Object.keys(data).forEach(function (k) { if (typeof data[k] === "string") isi[k] = data[k]; });
    var ukuran = function () { var n = 0; for (var k in isi) n += k.length + isi[k].length; return n; };
    var api = {
      getItem: function (k) { k = String(k); return k in isi ? isi[k] : null; },
      setItem: function (k, v) {
        k = String(k); v = String(v);
        var lama = k in isi ? isi[k] : null;
        var tambahan = k.length + v.length - (lama === null ? 0 : k.length + lama.length);
        if (ukuran() + tambahan > BATAS) {
          var galat = new Error("Penyimpanan penuh (batas sekitar 512 KB).");
          galat.name = "QuotaExceededError";
          throw galat;
        }
        isi[k] = v;
        simpanKeLuar({ op: "set", key: k, value: v });
      },
      removeItem: function (k) { k = String(k); if (k in isi) { delete isi[k]; simpanKeLuar({ op: "remove", key: k }); } },
      clear: function () { isi = Object.create(null); simpanKeLuar({ op: "clear" }); },
      key: function (i) { var kunci = Object.keys(isi); i = Number(i); return i >= 0 && i < kunci.length ? kunci[i] : null; }
    };
    return new Proxy(api, {
      get: function (t, p) {
        if (p === "length") return Object.keys(isi).length;
        if (typeof p === "string" && Object.prototype.hasOwnProperty.call(api, p)) return api[p];
        if (p === Symbol.toStringTag) return "Storage";
        return typeof p === "string" && p in isi ? isi[p] : undefined;
      },
      set: function (t, p, v) { if (typeof p === "string") api.setItem(p, v); return true; },
      deleteProperty: function (t, p) { if (typeof p === "string") api.removeItem(p); return true; },
      has: function (t, p) { return typeof p === "string" && (p in isi || Object.prototype.hasOwnProperty.call(api, p) || p === "length"); },
      ownKeys: function () { return Object.keys(isi); },
      getOwnPropertyDescriptor: function (t, p) {
        return typeof p === "string" && p in isi ? { value: isi[p], writable: true, enumerable: true, configurable: true } : undefined;
      }
    });
  };
  var pasang = function (nama, penyimpanan) {
    try { Object.defineProperty(window, nama, { configurable: true, get: function () { return penyimpanan; } }); } catch (e) {}
  };
  pasang("localStorage", buatPenyimpanan(awal, function (pesan) {
    pesan.ck = "storage";
    try { parent.postMessage(pesan, "*"); } catch (e) {}
  }));
  pasang("sessionStorage", buatPenyimpanan({}, function () {}));
})();`;

  // 6. Fungsi menjalankan HTML, CSS, dan JavaScript
  function bangunDokumen() {
    const html = htmlEditor.getValue();
    const css = cssEditor.getValue();
    const js = jsEditor.getValue().replace(/<\/script/gi, "<\\/script");

    const awal = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
${css}
  </style>
</head>
<body>
${html}
`;

    // Skrip penyimpanan dan console dipasang lebih dulu. Nomor baris error dihitung relatif terhadap
    // kode JS pengguna. Semua penggantian di bawah tidak menambah baris (JSON satu baris), jadi hitungannya tetap tepat.
    const dataTersimpan = JSON.stringify(bacaPenyimpanan())
      .replace(/</g, "\\u003c")
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029");
    const skripPenyimpanan = SKRIP_PENYIMPANAN
      .replace("__BATAS__", String(BATAS_PENYIMPANAN))
      .replace("__DATA__", () => dataTersimpan);
    const sambungan = "\n</script>\n<script>\n";
    const awalSkrip = awal + "<script>\n" + skripPenyimpanan + sambungan;
    const offset = (awalSkrip + SKRIP_CONSOLE + sambungan).split("\n").length - 1;
    const skrip = SKRIP_CONSOLE.replace("__OFFSET__", String(offset));

    return awalSkrip + skrip + sambungan + js + "\n</script>\n</body>\n</html>";
  }

  function jalankanKode() {
    const dokumen = bangunDokumen();
    bersihkanConsole();

    // Tampilkan preview dalam mode fullscreen
    workspace.classList.add("preview-visible");
    workspace.classList.add("preview-fullscreen");

    enlargePreviewButton.textContent = "⤢ Kembali ke editor";
    enlargePreviewButton.setAttribute("aria-pressed", "true");

    // Buat iframe baru agar hasil preview diperbarui dengan bersih
    const previewBaru = preview.cloneNode(false);
    previewBaru.removeAttribute("srcdoc");

    preview.replaceWith(previewBaru);
    preview = previewBaru;

    // Jalankan HTML dan CSS di iframe terisolasi
    preview.srcdoc = dokumen;

    status.textContent = "Pratinjau diperbarui.";
  }

  runButton.addEventListener("click", jalankanKode);

  // 7. Perbesar preview atau kembali ke editor
  enlargePreviewButton.addEventListener("click", () => {
    const diperbesar = workspace.classList.toggle("preview-fullscreen");

    enlargePreviewButton.textContent = diperbesar
      ? "⤢ Kembali ke editor"
      : "⛶ Perbesar";

    enlargePreviewButton.setAttribute(
      "aria-pressed",
      String(diperbesar)
    );

    status.textContent = diperbesar
      ? "Mode preview diperbesar."
      : "Kembali ke editor dan preview.";
  });

  // 8. Sembunyikan preview
  hidePreviewButton.addEventListener("click", () => {
    workspace.classList.remove("preview-visible");
    workspace.classList.remove("preview-fullscreen");

    enlargePreviewButton.textContent = "⛶ Perbesar";
    enlargePreviewButton.setAttribute("aria-pressed", "false");

    status.textContent = "Pratinjau disembunyikan.";

    requestAnimationFrame(() => {
      htmlEditor.refresh();
      cssEditor.refresh();
      jsEditor.refresh();
    });
  });

  // 9. Reset kode ke contoh awal
  resetButton.addEventListener("click", () => {
    htmlEditor.setValue(initialHTML);
    cssEditor.setValue(initialCSS);
    jsEditor.setValue(initialJS);
    bersihkanConsole();

    pilihTab("html");

    status.textContent = "Kode dikembalikan ke contoh awal.";
    htmlEditor.focus();
  });

  // 10. Simpan kode di browser ini
  // Tombol Simpan (atau Ctrl + S) menyimpan isi ketiga tab (HTML, CSS, JS) sekaligus.
  // Kode tersimpan dimuat otomatis saat halaman dibuka. Reset tidak menghapus simpanan.
  const saveButton = document.querySelector("#save-code");
  if (saveButton && window.CodeStorage) {
    const saved = window.CodeStorage.read("html-playground");
    if (saved && saved.data && typeof saved.data === "object") {
      if (typeof saved.data.html === "string") htmlEditor.setValue(saved.data.html);
      if (typeof saved.data.css === "string") cssEditor.setValue(saved.data.css);
      if (typeof saved.data.js === "string") jsEditor.setValue(saved.data.js);
      status.textContent = "Kode tersimpan dimuat (disimpan " + window.CodeStorage.formatTime(saved.savedAt) + ").";
    }

    const saver = window.CodeStorage.bindButton({
      button: saveButton,
      getKey: () => "html-playground",
      getData: () => ({ html: htmlEditor.getValue(), css: cssEditor.getValue(), js: jsEditor.getValue() }),
      notify: (pesan) => { status.textContent = pesan; },
      successMessage: () => "Kode HTML, CSS, dan JS disimpan di browser ini."
    });

    [htmlEditor, cssEditor, jsEditor].forEach((editor) => {
      editor.on("change", () => saver.refresh());
      editor.addKeyMap({
        "Ctrl-S": () => { saver.save(); },
        "Cmd-S": () => { saver.save(); }
      });
    });
    saver.refresh();
  }

  // 11. Kondisi awal
  pilihTab("html");
});
