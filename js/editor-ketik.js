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

  // bahasa boleh berupa teks ("html", "css", ...) atau fungsi yang mengembalikannya (editor yang berganti tab).
  function pasang(cm, bahasaAtauFungsi) {
    if (!cm || cm.state.csKetik) return;
    cm.state.csKetik = true;
    const lang = () => (typeof bahasaAtauFungsi === "function" ? bahasaAtauFungsi() : bahasaAtauFungsi);
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

    // hanyaLewati: tidak menutup kurung/kutip sendiri (HTML dan CSS), tetapi mengetik penutup di depan penutup yang sama tetap melewatinya.
    function pasangan(c, kursor, hanyaLewati) {
      const baris = cm.getLine(kursor.line);
      const sebelumC = baris.charAt(kursor.ch - 2);
      const sesudah = baris.charAt(kursor.ch);
      // Mengetik penutup tepat di depan penutup yang sama: lewati saja (hapus yang berlebih).
      if (PENUTUP.has(c) && sesudah === c) {
        cm.replaceRange("", kursor, { line: kursor.line, ch: kursor.ch + 1 }, "+autoclose");
        return;
      }
      const penutup = PASANGAN[c];
      if (!penutup || hanyaLewati) return;
      if (KUTIP.has(c) && (KATA.test(sebelumC) || sebelumC === c)) return; // apostrof dalam kata, atau kutip ke-2
      if (sesudah && !/[\s)\]}>,;:.]/.test(sesudah)) return; // jangan membungkus kata yang sudah ada
      cm.replaceRange(penutup, kursor, kursor, "+autoclose");
      cm.setCursor(kursor);
    }

    // Memproses karakter yang baru diketik tepat sebelum kursor.
    function proses(c, kursor) {
      if (cm.getOption("readOnly") || cm.somethingSelected()) return;
      const akhir = cm.getCursor();
      if (akhir.line !== kursor.line || akhir.ch !== kursor.ch) return; // kursor sudah pindah
      const baris = cm.getLine(kursor.line);
      if (baris.charAt(kursor.ch - 1) !== c) return;
      sibuk = true;
      try {
        // Tutup tag dan "</" aman diulang (tidak menambah bila penutupnya sudah ada), jadi tidak peduli ada keypress atau tidak.
        if (lang() === "html" && c === ">") tutupTag(kursor);
        else if (lang() === "html" && c === "/" && baris.charAt(kursor.ch - 2) === "<") lengkapiPenutup(kursor);
        else if (PASANGAN[c] || PENUTUP.has(c)) {
          // Bila addon bawaan aktif dan ada keypress, addon itulah yang bekerja; selain itu jalur ini.
          if (!cm.getOption("autoCloseBrackets") || Date.now() - keypressTerakhir >= 150) {
            pasangan(c, kursor, lang() === "html" || lang() === "css");
          }
        }
      } finally {
        sibuk = false;
      }
    }

    // Enter tepat di antara tag pembuka dan penutup (<p>|</p>): isi pindah ke baris sendiri, menjorok satu satuan indentasi,
    // dan penutup turun ke baris berikutnya. Di tempat lain Enter berjalan seperti biasa.
    cm.addKeyMap({
      Enter: () => {
        if (lang() !== "html" || cm.getOption("readOnly") || cm.somethingSelected()) return window.CodeMirror.Pass;
        const k = cm.getCursor();
        const baris = cm.getLine(k.line);
        const m = POLA_BUKA.exec(baris.slice(0, k.ch));
        if (!m || TAG_TUNGGAL.has(m[1].toLowerCase())) return window.CodeMirror.Pass;
        if (!baris.slice(k.ch).toLowerCase().startsWith("</" + m[1].toLowerCase() + ">")) return window.CodeMirror.Pass;
        const dasar = /^\s*/.exec(baris)[0];
        const satuan = cm.getOption("indentWithTabs") ? "\t" : " ".repeat(cm.getOption("indentUnit") || 4);
        cm.operation(() => {
          cm.replaceRange("\n" + dasar + satuan + "\n" + dasar, k, k, "+input");
          cm.setCursor({ line: k.line + 1, ch: dasar.length + satuan.length });
        });
        return undefined;
      }
    });

    // Backspace di dalam indentasi (hanya spasi di depan kursor): mundur satu tingkat indentasi sekaligus.
    cm.addKeyMap({
      Backspace: () => {
        if (cm.getOption("readOnly") || cm.somethingSelected()) return window.CodeMirror.Pass;
        const k = cm.getCursor();
        const depan = cm.getLine(k.line).slice(0, k.ch);
        if (!depan || /\S/.test(depan) || depan.includes("\t")) return window.CodeMirror.Pass;
        // Hapus spasi sampai batas indentasi sebelumnya (kelipatan indentUnit); selalu minimal satu spasi.
        const satuan = Math.max(1, cm.getOption("indentUnit") || 4);
        const hapus = k.ch % satuan || Math.min(satuan, k.ch);
        cm.replaceRange("", { line: k.line, ch: k.ch - hapus }, k, "+delete");
        return undefined;
      }
    });

    // Jalur utama: perubahan teks hasil ketikan (keyboard HP maupun komputer).
    // Dibaca dari karakter terakhir yang masuk, jadi tetap jalan walau keyboard HP mengirim beberapa karakter sekaligus.
    cm.on("change", (_cm, ch) => {
      if (sibuk || (ch.origin !== "+input" && ch.origin !== "*compose")) return;
      const t = ch.text;
      const terakhir = t[t.length - 1];
      if (!terakhir) return;
      const c = terakhir.slice(-1);
      const kursor = { line: ch.from.line + t.length - 1, ch: (t.length === 1 ? ch.from.ch : 0) + terakhir.length };
      window.setTimeout(() => proses(c, kursor), 25);
    });

    // Jalur cadangan untuk keyboard yang mengirim teks lewat peristiwa input saja.
    {
      cm.getInputField().addEventListener("input", (e) => {
        if (lang() !== "html" || !e.data || !/[>\/]$/.test(e.data) || /^insertFrom/.test(e.inputType || "")) return;
        window.setTimeout(() => { const k = cm.getCursor(); proses(cm.getLine(k.line).charAt(k.ch - 1), k); }, 40);
      });
    }
  }

  window.CodingSkanetraKetik = { pasang, _tagTerbuka: tagTerbuka };
})();
