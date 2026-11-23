// Garis panduan indentasi (garis tegak tipis di tiap tingkat indentasi) dan tombol lipat kode di kolom nomor baris.
// Dipasang lewat: CodingSkanetraLipat.pasang(cm, "html" | "css" | "js" | "py" | "cpp" | () => bahasa)
// Tombol lipat memerlukan addon CodeMirror foldcode, foldgutter, xml-fold, brace-fold, indent-fold; tanpa itu hanya garis panduan yang tampil.
(() => {
  "use strict";

  function pasang(cm, bahasaAtauFungsi) {
    if (!cm || cm.state.csLipat) return;
    cm.state.csLipat = true;
    const CM = window.CodeMirror;
    const lang = () => (typeof bahasaAtauFungsi === "function" ? bahasaAtauFungsi() : bahasaAtauFungsi);

    // ---------- Garis panduan indentasi ----------
    // Tiap baris diberi lebar indentasinya lewat variabel CSS; gambarnya dibuat di css/editor-lipat.css.
    function kolomIndentasi(teks, lebarTab) {
      let kol = 0;
      for (let i = 0; i < teks.length; i++) {
        const c = teks.charAt(i);
        if (c === " ") kol++;
        else if (c === "\t") kol += lebarTab - (kol % lebarTab);
        else break;
      }
      return kol;
    }
    cm.on("renderLine", (_cm, baris, elt) => {
      const satuan = Math.max(2, cm.getOption("indentUnit") || 4);
      const kol = kolomIndentasi(baris.text, cm.getOption("tabSize") || satuan);
      // Garis pertama di dalam indentasi tingkat 2 dst.; tingkat pertama tidak diberi garis supaya tepi kiri tetap bersih.
      const lebar = Math.max(0, kol - satuan);
      if (lebar > 0) {
        elt.classList.add("cs-panduan");
        elt.style.setProperty("--cs-lebar", String(lebar));
        elt.style.setProperty("--cs-satuan", String(satuan));
      }
    });
    cm.refresh();

    // ---------- Lipat kode ----------
    const F = CM && CM.fold;
    if (!F) return;
    const cari = (c, pos) => {
      const b = lang();
      if (b === "html") return F.xml ? F.xml(c, pos) : undefined;
      if (b === "py") return F.indent ? F.indent(c, pos) : undefined;
      return F.brace ? F.brace(c, pos) : undefined; // css, js, cpp
    };
    cm.setOption("gutters", ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]);
    // minFoldSize 1: blok yang seluruhnya ada di satu baris (<p>Hai</p>) tidak diberi tombol lipat.
    cm.setOption("foldGutter", { rangeFinder: cari, minFoldSize: 1 });
  }

  window.CodingSkanetraLipat = { pasang };
})();
