// Petunjuk kode (autocomplete) untuk editor CodeMirror di Editor Web.
// Muncul otomatis saat mengetik HTML, CSS, atau JavaScript.
//   ↑ ↓ pilih   Enter atau Tab terima   Esc tutup   (klik atau ketuk juga bisa)
// Berdiri sendiri: tidak memakai addon CodeMirror tambahan dan tidak menjalankan kode pengguna.
// Dipasang lewat: CodingSkanetraHint.pasang(cm, "html" | "css" | "js")
(() => {
  "use strict";

  const MAKS_TINGGI_ITEM = 8; // jumlah baris yang terlihat sebelum daftar bisa digulir

  // ---------- Data ----------

  const TAG = ("a abbr address article aside audio b blockquote body br button canvas caption code div em " +
    "footer form h1 h2 h3 h4 h5 h6 head header hr html i iframe img input label li link main meta nav ol " +
    "option p pre script section select small span strong style sub sup table tbody td textarea tfoot th " +
    "thead title tr u ul video").split(" ");

  const ATRIBUT_UMUM = ["class", "id", "style", "title", "lang", "hidden", "tabindex", "data-",
    "onclick", "oninput", "onchange", "onsubmit", "onkeydown", "onload"];
  const BOOLEAN = new Set(["hidden", "required", "disabled", "checked", "readonly", "selected", "controls",
    "autoplay", "loop", "muted", "defer", "async", "autofocus", "multiple", "download"]);
  const ATRIBUT_TAG = {
    a: ["href", "target", "rel", "download"],
    img: ["src", "alt", "width", "height", "loading"],
    input: ["type", "name", "value", "placeholder", "required", "disabled", "checked", "min", "max",
      "maxlength", "readonly", "autofocus"],
    label: ["for"],
    form: ["action", "method"],
    link: ["rel", "href", "type"],
    meta: ["charset", "name", "content"],
    script: ["src", "defer", "async", "type"],
    button: ["type", "disabled"],
    textarea: ["name", "rows", "cols", "placeholder", "required", "readonly"],
    select: ["name", "multiple", "required"],
    option: ["value", "selected"],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan"],
    ol: ["start", "type"],
    video: ["src", "controls", "autoplay", "loop", "muted", "width", "height"],
    audio: ["src", "controls", "autoplay", "loop", "muted"],
    iframe: ["src", "width", "height", "title"],
    html: ["lang"],
    canvas: ["width", "height"]
  };
  const NILAI_ATRIBUT = {
    type: ["text", "number", "password", "email", "checkbox", "radio", "submit", "button", "date", "color", "range", "file"],
    target: ["_blank", "_self"],
    rel: ["stylesheet", "noopener", "noreferrer", "icon"],
    method: ["get", "post"],
    lang: ["id", "en"],
    charset: ["UTF-8"],
    name: ["viewport", "description"],
    loading: ["lazy", "eager"]
  };

  const WARNA = ["red", "blue", "green", "yellow", "orange", "purple", "pink", "black", "white", "gray",
    "brown", "cyan", "gold", "navy", "teal", "silver", "transparent", "currentColor"];
  const NILAI_CSS = {
    display: ["block", "inline", "inline-block", "flex", "grid", "none"],
    position: ["static", "relative", "absolute", "fixed", "sticky"],
    "flex-direction": ["row", "column", "row-reverse", "column-reverse"],
    "flex-wrap": ["nowrap", "wrap"],
    "justify-content": ["flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"],
    "align-items": ["stretch", "flex-start", "center", "flex-end", "baseline"],
    "text-align": ["left", "center", "right", "justify"],
    "font-weight": ["normal", "bold", "lighter", "bolder", "400", "500", "600", "700"],
    "font-style": ["normal", "italic"],
    "text-decoration": ["none", "underline", "line-through"],
    "text-transform": ["none", "uppercase", "lowercase", "capitalize"],
    cursor: ["pointer", "default", "text", "move", "not-allowed"],
    overflow: ["visible", "hidden", "scroll", "auto"],
    "overflow-x": ["visible", "hidden", "scroll", "auto"],
    "overflow-y": ["visible", "hidden", "scroll", "auto"],
    "border-style": ["solid", "dashed", "dotted", "none"],
    "background-repeat": ["repeat", "no-repeat", "repeat-x", "repeat-y"],
    "background-size": ["cover", "contain", "auto"],
    "background-position": ["center", "top", "bottom", "left", "right"],
    "box-sizing": ["border-box", "content-box"],
    visibility: ["visible", "hidden"],
    float: ["left", "right", "none"],
    "white-space": ["normal", "nowrap", "pre", "pre-wrap"],
    "list-style-type": ["disc", "circle", "square", "decimal", "none"],
    "object-fit": ["cover", "contain", "fill", "none"],
    "font-family": ["sans-serif", "serif", "monospace", "Arial", "Verdana", "Georgia"],
    width: ["auto", "100%", "100vw", "fit-content"],
    height: ["auto", "100%", "100vh", "fit-content"],
    margin: ["0", "auto"],
    padding: ["0"],
    border: ["1px solid", "none"],
    "border-radius": ["50%", "8px"],
    opacity: ["0", "0.5", "1"],
    "z-index": ["1", "10", "-1"],
    transition: ["all 0.3s ease", "0.3s"]
  };
  ["color", "background-color", "border-color", "outline-color", "fill", "stroke"].forEach((p) => {
    NILAI_CSS[p] = WARNA;
  });
  NILAI_CSS.background = WARNA.concat(["none"]);
  const PROPERTI_CSS = ("align-items align-self animation background background-color background-image " +
    "background-position background-repeat background-size border border-bottom border-color border-left " +
    "border-radius border-right border-style border-top border-width bottom box-shadow box-sizing color " +
    "cursor display flex flex-direction flex-wrap flex-grow flex-shrink font-family font-size font-style " +
    "font-weight gap grid-template-columns grid-template-rows height justify-content left letter-spacing " +
    "line-height list-style margin margin-bottom margin-left margin-right margin-top max-height max-width " +
    "min-height min-width object-fit opacity outline overflow overflow-x overflow-y padding padding-bottom " +
    "padding-left padding-right padding-top position right text-align text-decoration text-shadow " +
    "text-transform top transform transition visibility white-space width z-index").split(" ");
  const PSEUDO_CSS = ["hover", "focus", "active", "first-child", "last-child", "nth-child(", "before", "after",
    "disabled", "checked", "not(", "root"];
  const AT_CSS = ["@media", "@import", "@keyframes", "@font-face"];

  const KATA_KUNCI = ("const let var function return if else for while do switch case break continue default " +
    "new this class extends try catch finally throw typeof instanceof async await true false null undefined " +
    "import export").split(" ");
  const GLOBAL_JS = ("document window console alert prompt confirm setTimeout setInterval clearTimeout " +
    "clearInterval parseInt parseFloat Number String Boolean Array Object Math JSON Date isNaN localStorage " +
    "fetch Promise Set Map").split(" ");

  const m = (...n) => n.map((x) => [x, "metode"]);
  const p = (...n) => n.map((x) => [x, "properti"]);
  const ELEMEN = [].concat(
    p("textContent", "innerHTML", "value", "style", "classList", "children", "parentElement", "dataset", "id",
      "className", "checked", "disabled", "src", "href"),
    m("addEventListener", "appendChild", "remove", "setAttribute", "getAttribute", "querySelector",
      "querySelectorAll", "click", "focus", "append", "removeChild", "closest"));
  const TEKS = [].concat(
    p("length"),
    m("toUpperCase", "toLowerCase", "trim", "split", "replace", "includes", "startsWith", "endsWith",
      "indexOf", "slice", "substring", "charAt", "padStart", "repeat", "concat", "toString", "toFixed"));
  const LARIK = m("push", "pop", "shift", "unshift", "map", "filter", "forEach", "reduce", "join", "find",
    "sort", "reverse", "splice", "some", "every");
  const CSS_JS = p("color", "backgroundColor", "fontSize", "fontWeight", "display", "width", "height", "margin",
    "padding", "border", "borderRadius", "opacity", "transform", "position", "top", "left", "textAlign", "cursor");
  const ANGGOTA = {
    document: [].concat(p("body", "title", "head", "documentElement"),
      m("getElementById", "querySelector", "querySelectorAll", "createElement", "addEventListener",
        "getElementsByClassName", "getElementsByTagName", "createTextNode")),
    console: m("log", "error", "warn", "info", "table", "clear"),
    Math: [].concat(p("PI"), m("random", "floor", "ceil", "round", "max", "min", "abs", "sqrt", "pow", "trunc", "sign")),
    JSON: m("stringify", "parse"),
    Object: m("keys", "values", "entries", "assign"),
    Array: m("isArray", "from"),
    Number: m("isInteger", "parseFloat", "parseInt"),
    Date: m("now"),
    localStorage: m("getItem", "setItem", "removeItem", "clear"),
    window: [].concat(p("innerWidth", "innerHeight", "location"), m("alert", "addEventListener", "setTimeout", "setInterval")),
    location: [].concat(p("href"), m("reload")),
    classList: m("add", "remove", "toggle", "contains"),
    style: CSS_JS
  };
  const UMUM = [].concat(ELEMEN, TEKS, LARIK);

  // ---------- Pemindai: apakah kursor berada di dalam string/komentar? ----------

  function keadaan(teks, bahasa) {
    let i = 0;
    const n = teks.length;
    while (i < n) {
      const c = teks[i];
      const d = teks[i + 1];
      if (c === "/" && d === "*") {
        const akhir = teks.indexOf("*/", i + 2);
        if (akhir < 0) return "komentar";
        i = akhir + 2;
      } else if (bahasa === "js" && c === "/" && d === "/") {
        const akhir = teks.indexOf("\n", i);
        if (akhir < 0) return "komentar";
        i = akhir + 1;
      } else if (c === '"' || c === "'" || (c === "`" && bahasa === "js")) {
        let j = i + 1;
        while (j < n && teks[j] !== c) {
          if (teks[j] === "\\") j++;
          else if (teks[j] === "\n" && c !== "`") return "kode"; // string tak ditutup: anggap berakhir di baris
          j++;
        }
        if (j >= n) return "string";
        i = j + 1;
      } else {
        i++;
      }
    }
    return "kode";
  }

  // ---------- Konteks: apa yang sedang diketik? ----------
  // Mengembalikan { prefix, daftar: [[teks, jenis], ...], pemicuKosong } atau null.

  function konteksHtml(T) {
    if (T.lastIndexOf("<!--") > T.lastIndexOf("-->")) return null;

    // Di dalam <script> atau <style>: tidak memberi petunjuk HTML.
    const reBuka = /<(script|style)\b[^>]*>/gi;
    let terakhir = null;
    let hasil;
    while ((hasil = reBuka.exec(T))) terakhir = hasil;
    if (terakhir) {
      const sesudah = T.slice(terakhir.index + terakhir[0].length);
      if (!new RegExp("</" + terakhir[1], "i").test(sesudah)) return null;
    }

    const lt = T.lastIndexOf("<");
    if (lt < 0 || T.lastIndexOf(">") > lt) return null;
    const dalam = T.slice(lt + 1);
    if (dalam[0] === "/") return null;

    // Nama tag
    if (/^[!\w-]*$/.test(dalam)) {
      const daftar = TAG.map((t) => [t, "tag"]);
      if (dalam[0] === "!") return { prefix: dalam, daftar: [["!DOCTYPE html", "tag"]], pemicuKosong: true };
      return { prefix: dalam, daftar, pemicuKosong: true };
    }

    const nama = /^([\w-]+)/.exec(dalam);
    if (!nama) return null;
    const tag = nama[1].toLowerCase();
    const sisa = dalam.slice(nama[1].length);

    // Apakah kursor ada di dalam tanda kutip nilai atribut?
    let kutip = null;
    for (const c of sisa) {
      if (kutip) { if (c === kutip) kutip = null; }
      else if (c === '"' || c === "'") kutip = c;
    }
    if (kutip) {
      const atr = /([\w:@-]+)\s*=\s*["'][^"']*$/.exec(sisa);
      if (!atr) return null;
      const nilai = NILAI_ATRIBUT[atr[1].toLowerCase()];
      if (!nilai || atr[1].toLowerCase() === "name" && tag !== "meta") return null;
      const prefix = /([^\s"']*)$/.exec(sisa)[1];
      return { prefix, daftar: nilai.map((v) => [v, "nilai"]), pemicuKosong: true, nilai: true };
    }

    // Nama atribut
    const prefix = /([\w:-]*)$/.exec(sisa)[1];
    const sebelum = sisa.slice(0, sisa.length - prefix.length);
    if (!/\s$/.test(sebelum)) return null;
    const ada = (a) => new RegExp("\\s" + a + "(\\s|=|$)", "i").test(sisa.slice(0, sisa.length - prefix.length));
    const daftar = (ATRIBUT_TAG[tag] || []).concat(ATRIBUT_UMUM)
      .filter((a) => !ada(a))
      .map((a) => [a, "atribut"]);
    return { prefix, daftar, pemicuKosong: true };
  }

  function konteksCss(T) {
    if (keadaan(T, "css") !== "kode") return null;
    const tumpukan = [];
    let awal = 0;
    for (let i = 0; i < T.length; i++) {
      const c = T[i];
      if (c === "/" && T[i + 1] === "*") {
        i = T.indexOf("*/", i + 2);
        if (i < 0) return null;
        i++;
      } else if (c === '"' || c === "'") {
        const akhir = T.indexOf(c, i + 1);
        if (akhir < 0) return null;
        i = akhir;
      } else if (c === "{") { tumpukan.push(T.slice(awal, i).trim()); awal = i + 1; }
      else if (c === "}") { tumpukan.pop(); awal = i + 1; }
      else if (c === ";") awal = i + 1;
    }
    const seg = T.slice(awal);
    if (seg.split("(").length > seg.split(")").length) return null;

    const kepala = tumpukan.length ? tumpukan[tumpukan.length - 1] : null;
    const diBlokProperti = kepala !== null && (!kepala.startsWith("@") || /^@(font-face|page)/.test(kepala));

    if (diBlokProperti) {
      const titikDua = seg.indexOf(":");
      if (titikDua < 0) {
        const prefix = /([\w-]*)$/.exec(seg)[1];
        if (/[^\s\w-]/.test(seg)) return null;
        return { prefix, daftar: PROPERTI_CSS.map((x) => [x, "properti"]), pemicuKosong: false, properti: true };
      }
      const prop = seg.slice(0, titikDua).trim().toLowerCase();
      const nilai = NILAI_CSS[prop];
      if (!nilai) return null;
      const bagianNilai = seg.slice(titikDua + 1);
      const prefix = /([\w#-]*)$/.exec(bagianNilai)[1];
      if (prefix.startsWith("#")) return null;
      // Daftar nilai hanya dibuka otomatis untuk nilai pertama (setelah "properti:")
      const awalNilai = bagianNilai.slice(0, bagianNilai.length - prefix.length).trim() === "";
      return { prefix, daftar: nilai.map((v) => [v, "nilai"]), pemicuKosong: awalNilai };
    }

    // Di luar blok: pemilih (selector)
    const at = /(@[\w-]*)$/.exec(seg);
    if (at) return { prefix: at[1], daftar: AT_CSS.map((x) => [x, "at-rule"]), pemicuKosong: false };
    const pseudo = /:{1,2}([\w-]*)$/.exec(seg);
    if (pseudo) return { prefix: pseudo[1], daftar: PSEUDO_CSS.map((x) => [x, "pseudo"]), pemicuKosong: true };
    const tag = /(?:^|[\s,>+~])([a-zA-Z][\w-]*)$/.exec(seg);
    if (tag && !/\([^)]*$/.test(seg)) return { prefix: tag[1], daftar: TAG.map((x) => [x, "tag"]), pemicuKosong: false };
    return null;
  }

  function konteksJs(T, teksLengkap) {
    if (keadaan(T, "js") !== "kode") return null;
    const prefix = /([\w$]*)$/.exec(T)[1];
    if (/^\d/.test(prefix)) return null;
    const sebelum = T.slice(0, T.length - prefix.length);

    if (/(^|[^.])\.$/.test(sebelum) || /\?\.$/.test(sebelum)) {
      const obj = /([\w$]+)\??\.$/.exec(sebelum);
      if (obj && /^\d/.test(obj[1])) return null; // angka desimal, mis. 3.14
      const daftar = (obj && ANGGOTA[obj[1]]) || UMUM;
      const unik = [];
      const lihat = new Set();
      daftar.forEach(([t, j]) => { if (!lihat.has(t)) { lihat.add(t); unik.push([t, j]); } });
      return { prefix, daftar: unik, pemicuKosong: true };
    }
    if (!prefix) return null;
    if (/\b(const|let|var|function|class)\s+$/.test(sebelum)) return null; // sedang memberi nama baru

    const daftar = KATA_KUNCI.map((t) => [t, "keyword"]).concat(GLOBAL_JS.map((t) => [t, "global"]));
    const sudah = new Set(daftar.map((d) => d[0]));
    const kata = teksLengkap.match(/[A-Za-z_$][\w$]*/g) || [];
    kata.forEach((k) => {
      if (k.length >= 3 && k !== prefix && !sudah.has(k)) { sudah.add(k); daftar.push([k, "local"]); }
    });
    return { prefix, daftar, pemicuKosong: false };
  }

  // ---------- Pemasangan pada satu editor ----------

  function pasang(cm, bahasa) {
    if (!cm || cm.__csHint) return;
    cm.__csHint = true;

    let popup = null;
    let daftar = [];
    let indeks = 0;
    let konteks = null;
    let awalPos = null;
    let sibuk = false;

    const peta = {
      Down: () => pindah(1),
      Up: () => pindah(-1),
      PageDown: () => pindah(MAKS_TINGGI_ITEM),
      PageUp: () => pindah(-MAKS_TINGGI_ITEM),
      Enter: () => terima(),
      Tab: () => terima(),
      Esc: () => tutup()
    };

    function nyala() {
      const pref = window.CodingSkanetraEditorPrefs && window.CodingSkanetraEditorPrefs.read();
      return !(pref && pref.hint === false);
    }

    function hitungKonteks() {
      const kursor = cm.getCursor();
      if (cm.somethingSelected()) return null;
      const T = cm.getRange({ line: 0, ch: 0 }, kursor);
      let k = null;
      if (bahasa === "html") k = konteksHtml(T);
      else if (bahasa === "css") k = konteksCss(T);
      else if (bahasa === "js") k = konteksJs(T, cm.getValue());
      if (!k) return null;

      const rendah = k.prefix.toLowerCase();
      let hasil = k.daftar.filter(([t]) => t.toLowerCase().startsWith(rendah));
      if (hasil.length === 1 && hasil[0][0] === k.prefix) return null; // sudah lengkap
      const urut = { local: 1 };
      hasil.sort((a, b) =>
        (urut[a[1]] || 0) - (urut[b[1]] || 0) ||
        (k.properti || a[1] === "local" ? a[0].localeCompare(b[0]) : 0));
      if (!hasil.length) return null;
      return {
        k,
        daftar: hasil,
        dari: { line: kursor.line, ch: kursor.ch - k.prefix.length },
        sampai: kursor
      };
    }

    function buka(paksa) {
      if (!nyala()) return;
      const h = hitungKonteks();
      if (!h || (!paksa && !h.k.prefix && !h.k.pemicuKosong)) { tutup(); return; }
      konteks = h.k;
      daftar = h.daftar;
      awalPos = h.dari;
      if (!popup) buatPopup();
      indeks = Math.min(indeks, daftar.length - 1);
      if (!cm.state.csHintAktif) { indeks = 0; cm.addKeyMap(peta); cm.state.csHintAktif = true; }
      gambar();
    }

    function perbarui() {
      const h = hitungKonteks();
      if (!h) { tutup(); return; }
      const lama = daftar.length && daftar[indeks] ? daftar[indeks][0] : null;
      konteks = h.k;
      daftar = h.daftar;
      awalPos = h.dari;
      const baru = lama ? daftar.findIndex((d) => d[0] === lama) : -1;
      indeks = baru >= 0 ? baru : 0;
      gambar();
    }

    function tutup() {
      if (cm.state.csHintAktif) {
        cm.removeKeyMap(peta);
        cm.state.csHintAktif = false;
      }
      if (popup) popup.hidden = true;
      daftar = [];
    }

    function terbuka() { return Boolean(cm.state.csHintAktif); }

    function buatPopup() {
      popup = document.createElement("div");
      popup.className = "cs-hint";
      popup.setAttribute("role", "listbox");
      popup.setAttribute("aria-label", "Petunjuk kode");
      popup.hidden = true;
      popup.addEventListener("mousedown", (e) => {
        e.preventDefault(); // jaga fokus tetap di editor
        const item = e.target.closest(".cs-hint-item");
        if (item) { indeks = Number(item.dataset.i); terima(); }
      });
      document.body.appendChild(popup);
    }

    function gambar() {
      popup.textContent = "";
      daftar.forEach(([teks, jenis], i) => {
        const el = document.createElement("div");
        el.className = "cs-hint-item" + (i === indeks ? " aktif" : "");
        el.dataset.i = String(i);
        el.setAttribute("role", "option");
        el.setAttribute("aria-selected", i === indeks ? "true" : "false");
        const a = document.createElement("span");
        a.className = "cs-hint-teks";
        a.textContent = teks;
        const b = document.createElement("span");
        b.className = "cs-hint-jenis";
        b.textContent = jenis;
        el.append(a, b);
        popup.appendChild(el);
      });
      popup.hidden = false;
      const gaya = getComputedStyle(cm.getWrapperElement());
      const ukuran = Math.min(Math.max(parseFloat(gaya.fontSize) || 14, 12), 15);
      popup.style.fontSize = ukuran + "px";
      posisi();
      const aktif = popup.querySelector(".aktif");
      if (aktif && aktif.scrollIntoView) aktif.scrollIntoView({ block: "nearest" });
    }

    function posisi() {
      const koordAwal = cm.cursorCoords(awalPos, "window");
      const baris = popup.firstChild ? popup.firstChild.getBoundingClientRect().height || 24 : 24;
      const tinggi = Math.min(daftar.length, MAKS_TINGGI_ITEM) * baris + 6;
      popup.style.maxHeight = tinggi + "px";
      const lebar = popup.offsetWidth;
      let kiri = Math.min(koordAwal.left, window.innerWidth - lebar - 8);
      kiri = Math.max(8, kiri);
      let atas = koordAwal.bottom + 2;
      if (atas + tinggi > window.innerHeight - 8 && koordAwal.top - tinggi - 2 > 8) {
        atas = koordAwal.top - tinggi - 2;
      }
      popup.style.left = kiri + "px";
      popup.style.top = atas + "px";
    }

    function pindah(arah) {
      if (!daftar.length) return;
      const batas = daftar.length - 1;
      if (Math.abs(arah) > 1) indeks = Math.max(0, Math.min(batas, indeks + arah));
      else indeks = (indeks + arah + daftar.length) % daftar.length;
      gambar();
    }

    function terima() {
      if (!terbuka() || !daftar[indeks]) { tutup(); return CodeMirror.Pass; }
      const [teks, jenis] = daftar[indeks];
      const kursor = cm.getCursor();
      const dari = { line: awalPos.line, ch: awalPos.ch };
      let sisip = teks;
      let geser = null; // posisi kursor relatif dari awal sisipan
      let lanjut = false;

      if (jenis === "atribut" && teks !== "data-" && !BOOLEAN.has(teks)) {
        sisip = teks + '=""';
        geser = teks.length + 2;
        lanjut = Boolean(NILAI_ATRIBUT[teks]);
      } else if (jenis === "properti" && bahasa === "css") {
        sisip = teks + ": ";
        lanjut = Boolean(NILAI_CSS[teks]);
      }

      sibuk = true;
      tutup();
      cm.replaceRange(sisip, dari, kursor, "complete");
      if (geser !== null) cm.setCursor({ line: dari.line, ch: dari.ch + geser });
      sibuk = false;
      cm.focus();
      if (lanjut) setTimeout(() => buka(true), 0);
      return undefined;
    }

    cm.on("change", (_cm, perubahan) => {
      if (sibuk) return;
      if (terbuka()) { perbarui(); return; }
      if (perubahan.origin !== "+input") return;
      if (perubahan.text.length > 1 || perubahan.text[0].length > 1) {
        // Bukan satu ketukan biasa (tempel, kurung otomatis, tag otomatis, dll.): hanya lanjut bila satu karakter
        const t = perubahan.text.join("\n");
        if (t.length > 2) return;
      }
      buka(false);
    });
    cm.on("cursorActivity", () => {
      if (!terbuka() || sibuk) return;
      const k = cm.getCursor();
      if (!awalPos || k.line !== awalPos.line || k.ch < awalPos.ch) tutup();
    });
    cm.on("blur", () => setTimeout(() => { if (!cm.hasFocus()) tutup(); }, 120));
    cm.on("scroll", () => { if (terbuka()) posisi(); });
    window.addEventListener("resize", () => { if (terbuka()) tutup(); });
  }

  window.CodingSkanetraHint = { pasang };
})();
