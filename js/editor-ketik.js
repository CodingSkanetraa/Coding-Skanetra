// Pelengkap pengetikan untuk keyboard HP (CodeMirror 5).
// Masalah: keyboard HP tidak mengirim tekanan tombol biasa (keypress), padahal tutup tag otomatis
// (<div> menjadi <div></div>) dan kurung otomatis bawaan CodeMirror hanya bereaksi pada keypress.
// Di sini kita bereaksi pada teks yang sudah masuk ("inputRead"), jadi jalan di keyboard HP maupun komputer.
// Bila addon bawaan sudah menanganinya (ada keypress sesaat sebelumnya), pelengkap ini diam saja.
// Dipasang lewat: CodingSkanetraKetik.pasang(cm, "html" | "css" | "js" | "py" | "cpp")
(() => {
  "use strict";

  const PASANGAN = { "(": ")", "[": "]", "{": "}", '"': '"', "'": "'", "`": "`" };
  const PENUTUP = new Set([")", "]", "}", '"', "'", "`"]);
  const KUTIP = new Set(['"', "'", "`"]);
  const TAG_TUNGGAL = new Set(("area base br col command embed hr img input keygen link meta param source track " +
    "wbr menuitem").split(" "));
  const KATA = /[A-Za-z0-9_]/;
  const POLA_BUKA = /<([A-Za-z][\w:-]*)((?:\s+[^\s"'<>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*>$/;
  const POLA_TAG = /<(\/?)([A-Za-z][\w:-]*)(?:\s+[^<>]*?)?(\/?)>/g;

  function tagTerbuka(teks) {
    // Daftar tag yang belum ditutup pada teks (tanpa komentar HTML).
    const bersih = teks.replace(/<!--[\s\S]*?-->/g, (x) => " ".repeat(x.length));
    const tumpukan = [];
    let m;
    POLA_TAG.lastIndex = 0;
    while ((m = POLA_TAG.exec(bersih))) {
      const nama = m[2].toLowerCase();
      if (m[1]) {
        const i = tumpukan.lastIndexOf(nama);
        if (i >= 0) tumpukan.length = i;
      } else if (!m[3] && !TAG_TUNGGAL.has(nama)) {
        tumpukan.push(nama);
      }
    }
    return tumpukan;
  }

  function pasang(cm, bahasa) {
    if (!cm || cm.state.csKetik) return;
    cm.state.csKetik = true;
    let keypressTerakhir = 0;
    let sibuk = false;

    cm.on("keypress", () => { keypressTerakhir = Date.now(); });

    function tutupTag(kursor) {
      const baris = cm.getLine(kursor.line);
      const sebelum = cm.getRange({ line: 0, ch: 0 }, kursor);
      const awal = sebelum.lastIndexOf("<");
      if (awal < 0) return;
      const m = POLA_BUKA.exec(sebelum.slice(awal));
      if (!m) return;
      const nama = m[1];
      if (TAG_TUNGGAL.has(nama.toLowerCase())) return;
      const sesudah = baris.slice(kursor.ch);
      if (sesudah.toLowerCase().startsWith("</" + nama.toLowerCase() + ">")) return; // sudah ada
      cm.replaceRange("</" + nama + ">", kursor, kursor, "+autoclose");
      cm.setCursor(kursor);
    }

    function lengkapiPenutup(kursor) {
      // Setelah "</" : lengkapi nama tag terdekat yang masih terbuka.
      const sebelum = cm.getRange({ line: 0, ch: 0 }, { line: kursor.line, ch: kursor.ch - 2 });
      const tumpukan = tagTerbuka(sebelum);
      if (!tumpukan.length) return;
      const nama = tumpukan[tumpukan.length - 1];
      const baris = cm.getLine(kursor.line);
      if (baris.slice(kursor.ch).toLowerCase().startsWith(nama + ">")) return;
      cm.replaceRange(nama + ">", kursor, kursor, "+autoclose");
    }

    function pasangan(c, kursor) {
      const baris = cm.getLine(kursor.line);
      const sebelumC = baris.charAt(kursor.ch - 2);
      const sesudah = baris.charAt(kursor.ch);
      // Mengetik penutup tepat di depan penutup yang sama: lewati saja (hapus yang berlebih).
      if (PENUTUP.has(c) && sesudah === c) {
        cm.replaceRange("", kursor, { line: kursor.line, ch: kursor.ch + 1 }, "+autoclose");
        return;
      }
      const penutup = PASANGAN[c];
      if (!penutup) return;
      if (KUTIP.has(c) && (KATA.test(sebelumC) || sebelumC === c)) return; // apostrof dalam kata, atau kutip ke-2
      if (sesudah && !/[\s)\]}>,;:.]/.test(sesudah)) return; // jangan membungkus kata yang sudah ada
      cm.replaceRange(penutup, kursor, kursor, "+autoclose");
      cm.setCursor(kursor);
    }

    cm.on("inputRead", (_cm, perubahan) => {
      if (sibuk || Date.now() - keypressTerakhir < 150) return;
      if (cm.getOption("readOnly") || cm.somethingSelected()) return;
      const t = perubahan.text;
      if (!t || t.length !== 1 || t[0].length !== 1) return;
      const c = t[0];
      const kursor = cm.getCursor();
      const baris = cm.getLine(kursor.line);
      if (baris.charAt(kursor.ch - 1) !== c) return; // kursor tidak tepat setelah karakter itu
      sibuk = true;
      try {
        if (bahasa === "html" && c === ">") tutupTag(kursor);
        else if (bahasa === "html" && c === "/" && baris.charAt(kursor.ch - 2) === "<") lengkapiPenutup(kursor);
        else if (PASANGAN[c] || PENUTUP.has(c)) pasangan(c, kursor);
      } finally {
        sibuk = false;
      }
    });
  }

  window.CodingSkanetraKetik = { pasang, _tagTerbuka: tagTerbuka };
})();
