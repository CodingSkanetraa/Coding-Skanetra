
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

  // Hanya terima pesan dari iframe preview yang sedang aktif.
  window.addEventListener("message", (event) => {
    if (!preview || event.source !== preview.contentWindow) return;
    const data = event.data;
    if (!data || data.ck !== "console" || typeof data.text !== "string") return;
    tambahBarisConsole(["log", "warn", "error"].includes(data.level) ? data.level : "log", data.text);
  });

  consoleClear.addEventListener("click", bersihkanConsole);

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

    // Skrip console dipasang lebih dulu. Nomor baris error dihitung relatif terhadap kode JS pengguna:
    // mengganti __OFFSET__ dengan angka tidak mengubah jumlah baris, jadi hitungannya tetap tepat.
    const sambungan = "\n</script>\n<script>\n";
    const offset = (awal + "<script>\n" + SKRIP_CONSOLE + sambungan).split("\n").length - 1;
    const skrip = SKRIP_CONSOLE.replace("__OFFSET__", String(offset));

    return awal + "<script>\n" + skrip + sambungan + js + "\n</script>\n</body>\n</html>";
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

  // 10. Kondisi awal
  pilihTab("html");
});
