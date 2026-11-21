// Proyek Kelompok: fungsi bersama untuk halaman anggota dan pengelola.
//   * rpc()      : memanggil fungsi database (supabase/kelompok.sql) dengan token login.
//   * rakit()/dokumen() : merakit HTML, CSS, dan JS menjadi satu halaman utuh untuk pratinjau iframe.
//   * kode()     : "kode utuh" (hanya baca): satu berkas HTML lengkap yang bisa disalin.
//   * bukaDiTab(): membuka hasil di tab sendiri.
// Semua teks dari server hanya dipasang lewat textContent (tidak lewat innerHTML).
(() => {
  "use strict";

  const akun = () => window.CodingSkanetraAkun;
  const POLA_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const el = (tag, kelas, teks) => {
    const e = document.createElement(tag);
    if (kelas) e.className = kelas;
    if (teks !== undefined && teks !== null) e.textContent = teks;
    return e;
  };

  const tombol = (kelas, teks) => {
    const b = el("button", kelas, teks);
    b.type = "button";
    return b;
  };

  const waktu = (iso) => {
    try {
      return new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch (e) { return ""; }
  };

  const STATUS = {
    belum: { teks: "Belum dimulai", kelas: "" },
    dikerjakan: { teks: "Dikerjakan", kelas: "" },
    dikirim: { teks: "Menunggu ditinjau", kelas: "menunggu" },
    perlu_revisi: { teks: "Perlu revisi", kelas: "ditolak" },
    diterima: { teks: "Diterima", kelas: "diterima" },
    ditarik: { teks: "Ditarik", kelas: "" }
  };

  function lencana(status) {
    const s = STATUS[status] || STATUS.belum;
    const e = el("span", "tg-label kg-status" + (s.kelas ? " " + s.kelas : ""), s.teks);
    return e;
  }

  // Memanggil fungsi database. Pesan galat dari fungsi kita (errcode P0001/42501/28000) ditampilkan apa adanya.
  async function rpc(nama, isi) {
    const a = akun();
    if (!a || !a.tersedia) throw new Error("Fitur akun belum aktif. Hubungi pengelola.");
    const res = await a.minta("/rest/v1/rpc/" + encodeURIComponent(nama), { metode: "POST", body: isi || {} });
    if (res.ok) return res.data;
    const d = res.data && typeof res.data === "object" ? res.data : {};
    let pesan;
    if (res.status === 401) pesan = "Sesi berakhir. Masuk lagi (boleh di tab lain), lalu ulangi.";
    else if (res.status === 404 || d.code === "PGRST202") pesan = "Fitur kelompok belum dipasang. Pengelola perlu menjalankan supabase/kelompok.sql.";
    else if (["P0001", "42501", "28000"].includes(String(d.code)) && d.message) pesan = String(d.message);
    else if (res.status >= 500) pesan = "Server sedang bermasalah. Coba lagi sebentar lagi.";
    else pesan = "Permintaan gagal. Coba lagi.";
    const e = new Error(pesan);
    e.bentrok = /^Bentrok/.test(String(d.message || ""));
    e.status = res.status;
    throw e;
  }

  // Pastikan sudah masuk. Mengembalikan pengguna, atau menampilkan ajakan masuk dan mengembalikan null.
  async function wajibMasuk(next) {
    const a = akun();
    const tamu = document.getElementById("tg-tamu");
    const pesan = document.getElementById("tg-pesan");
    const tampil = (judul, teks, tautan) => {
      if (pesan) { pesan.textContent = ""; }
      if (!tamu) return;
      tamu.hidden = false;
      tamu.textContent = "";
      tamu.append(el("h2", "", judul), el("p", "", teks));
      if (tautan) { const l = el("a", "tg-btn utama", tautan[0]); l.href = tautan[1]; tamu.appendChild(l); }
    };
    if (!a || !a.tersedia) { tampil("Fitur akun belum aktif", "Hubungi pengelola.", null); return null; }
    try { await a.siap; } catch (e) { /* lanjut sebagai tamu */ }
    const u = a.pengguna();
    if (!u) { tampil("Masuk dulu", "Proyek kelompok hanya untuk anggota yang sudah masuk.", ["Masuk", "login.html?next=" + next]); return null; }
    return u;
  }

  // ---------- Merakit halaman dari HTML, CSS, dan JS ----------

  const amanStyle = (s) => String(s || "").replace(/<\/style/gi, "<\\/style");
  const amanSkrip = (s) => String(s || "").replace(/<\/script/gi, "<\\/script");
  const adaIsi = (s) => String(s == null ? "" : s).trim() !== "";

  // Dipasang paling awal di halaman pratinjau: penyimpanan sementara (iframe tanpa asal tidak boleh memakai
  // localStorage), console yang diteruskan ke editor, dan tautan jangkar (#bagian) yang tidak jalan di srcdoc.
  // __OFFSET__ diganti jumlah baris sebelum JS pengguna, supaya nomor baris error sesuai tab JS.
  const SKRIP_AWAL = `(function () {
  try { void window.localStorage; } catch (e) {
    var d = {};
    var pen = {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(d, k) ? d[k] : null; },
      setItem: function (k, v) { d[k] = String(v); },
      removeItem: function (k) { delete d[k]; },
      clear: function () { d = {}; },
      key: function (i) { return Object.keys(d)[i] || null; }
    };
    Object.defineProperty(pen, "length", { get: function () { return Object.keys(d).length; } });
    ["localStorage", "sessionStorage"].forEach(function (n) {
      try { Object.defineProperty(window, n, { configurable: true, get: function () { return pen; } }); } catch (x) {}
    });
  }
  var OFFSET = __OFFSET__;
  var GULIR = __GULIR__;
  if (GULIR) window.addEventListener("load", function () { window.scrollTo(0, GULIR); });
  var tungguGulir = null;
  window.addEventListener("scroll", function () {
    if (tungguGulir) return;
    tungguGulir = setTimeout(function () {
      tungguGulir = null;
      try { parent.postMessage({ kg: "gulir", y: window.scrollY }, "*"); } catch (e) {}
    }, 200);
  });
  function teks(v) {
    if (typeof v === "string") return v;
    if (v instanceof Error) return v.name + ": " + v.message;
    if (typeof v === "undefined") return "undefined";
    if (typeof v === "function") return "[fungsi " + (v.name || "") + "]";
    try { var s = JSON.stringify(v); return s === undefined ? String(v) : s; } catch (e) { return String(v); }
  }
  function kirim(jenis, isi) { try { parent.postMessage({ kg: "console", jenis: jenis, isi: isi }, "*"); } catch (e) {} }
  ["log", "info", "warn", "error"].forEach(function (n) {
    var asli = console[n];
    console[n] = function () {
      kirim(n, Array.prototype.map.call(arguments, teks).join(" "));
      try { asli.apply(console, arguments); } catch (e) {}
    };
  });
  window.addEventListener("error", function (e) {
    var tempat = e.lineno ? (e.lineno > OFFSET ? " (JS baris " + (e.lineno - OFFSET) + ")" : " (baris " + e.lineno + ")") : "";
    kirim("error", (e.message || "Terjadi kesalahan") + tempat);
  });
  window.addEventListener("unhandledrejection", function (e) {
    var r = e.reason;
    kirim("error", "Promise ditolak: " + (r && r.message ? r.message : teks(r)));
  });
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    var h = a.getAttribute("href");
    if (!h || h.charAt(0) !== "#") return;
    e.preventDefault();
    var id = ""; try { id = decodeURIComponent(h.slice(1)); } catch (x) { id = h.slice(1); }
    var t = id ? (document.getElementById(id) || document.getElementsByName(id)[0]) : null;
    if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
    else if (!id || id === "top") window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();`;

  // Merakit satu halaman utuh dari tiga tab, sama seperti editor web.
  //   * HTML berupa potongan (tanpa <html>)  : dibungkus kerangka halaman.
  //   * HTML berupa dokumen lengkap          : CSS disisipkan di <head>, JS di akhir <body>.
  //   * polos = true                         : tanpa skrip bantu; dipakai untuk "Kode utuh" (satu berkas siap salin).
  //   * gulir                                : posisi gulir (px) yang dipulihkan setelah halaman dimuat ulang.
  function rakit(html, css, js, polos, gulir) {
    const PENANDA = "\u0001KGJS\u0001";
    let dok = String(html == null ? "" : html);
    const gaya = adaIsi(css) ? "<style>\n" + amanStyle(css) + "\n</style>\n" : "";
    const skripAwal = polos ? "" : "<script>\n" + SKRIP_AWAL + "\n</script>\n";
    const skripAkhir = adaIsi(js) ? "<script>\n" + PENANDA + "\n</script>\n" : "";

    if (!/<html[\s>]/i.test(dok)) {
      dok = "<!DOCTYPE html>\n<html lang=\"id\">\n<head>\n<meta charset=\"UTF-8\">\n" +
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" +
        skripAwal + gaya + "</head>\n<body>\n" + dok + "\n" + skripAkhir + "</body>\n</html>";
    } else {
      const kepala = /<head(\s[^>]*)?>/i;
      const tutupKepala = /<\/head\s*>/i;
      if (kepala.test(dok)) {
        const adaTutup = tutupKepala.test(dok);
        dok = dok.replace(kepala, (m) => m + "\n" + skripAwal + (adaTutup ? "" : gaya));
        if (adaTutup) dok = dok.replace(tutupKepala, (m) => gaya + m);
      } else {
        dok = dok.replace(/<html(\s[^>]*)?>/i, (m) => m + "\n<head>\n<meta charset=\"UTF-8\">\n" + skripAwal + gaya + "</head>");
      }
      if (skripAkhir) {
        if (/<\/body\s*>/i.test(dok)) dok = dok.replace(/<\/body\s*>/i, (m) => skripAkhir + m);
        else if (/<\/html\s*>/i.test(dok)) dok = dok.replace(/<\/html\s*>/i, (m) => skripAkhir + m);
        else dok += "\n" + skripAkhir;
      }
    }

    const i = dok.indexOf(PENANDA);
    const offset = i >= 0 ? dok.slice(0, i).split("\n").length - 1 : 0;
    dok = dok.replace("__OFFSET__", String(offset)).replace("__GULIR__", String(Math.max(0, Math.floor(Number(gulir) || 0))));
    if (i >= 0) dok = dok.replace(PENANDA, () => amanSkrip(js));
    return dok;
  }

  // bagian: [{nama, umum, html, css, js}]. Berkas bersama = satu elemen, dipakai apa adanya.
  // Kiriman lama (beberapa bagian) digabung: Umum lebih dulu, tiap bagian diberi penanda komentar.
  function gabung(bagian) {
    const urut = (bagian || []).slice();
    if (urut.length === 1) return { html: urut[0].html || "", css: urut[0].css || "", js: urut[0].js || "" };
    const html = urut.filter((b) => adaIsi(b.html))
      .map((b) => "<!-- bagian: " + String(b.nama).replace(/--/g, "-") + " -->\n" + b.html + "\n<!-- /bagian -->").join("\n\n");
    const css = urut.filter((b) => adaIsi(b.css))
      .map((b) => "/* bagian: " + String(b.nama).replace(/\*\//g, "") + " */\n" + b.css).join("\n\n");
    const js = urut.filter((b) => adaIsi(b.js))
      .map((b) => "// bagian: " + String(b.nama).replace(/[\r\n]/g, " ") + "\n" + b.js).join("\n\n");
    return { html, css, js };
  }

  function dokumen(bagian, gulir) {
    const g = gabung(bagian);
    return rakit(g.html, g.css, g.js, false, gulir);
  }

  // "Kode utuh": satu berkas HTML lengkap yang bisa disalin dan dijalankan di mana saja.
  function kode(bagian) {
    const g = gabung(bagian);
    if (!adaIsi(g.html) && !adaIsi(g.css) && !adaIsi(g.js)) return "(belum ada kode)";
    return rakit(g.html, g.css, g.js, true);
  }

  function pasangPratinjau(iframe, bagian, gulir) {
    iframe.setAttribute("sandbox", "allow-scripts allow-modals allow-forms allow-popups");
    iframe.setAttribute("referrerpolicy", "no-referrer");
    iframe.srcdoc = dokumen(bagian, gulir);
  }

  const amanJson = (teks) => JSON.stringify(teks).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

  // Membuka hasil di tab sendiri (memenuhi layar seperti web sungguhan). Kode tetap berjalan di iframe
  // terisolasi (tanpa allow-same-origin) di dalam halaman pembungkus, jadi kode kelompok tidak bisa
  // menyentuh akun atau penyimpanan situs ini. Mengembalikan false bila tab diblokir browser.
  let alamatTab = null;
  function bukaDiTab(bagian) {
    const dok = dokumen(bagian);
    const g = gabung(bagian);
    const cocok = /<title[^>]*>([^<]*)<\/title>/i.exec(g.html || "");
    const judul = ((cocok && cocok[1].trim()) || "Pratinjau").replace(/[<>&"]/g, "").slice(0, 80);
    const pembungkus = "<!DOCTYPE html>\n<html lang=\"id\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" +
      "<title>" + judul + " | Pratinjau CodingSkanetra</title>\n" +
      "<style>html,body{margin:0;height:100%;background:#fff}iframe{display:block;width:100%;height:100%;border:0}</style></head>\n" +
      "<body><iframe id=\"f\" title=\"Pratinjau\" sandbox=\"allow-scripts allow-modals allow-forms allow-popups\" referrerpolicy=\"no-referrer\"></iframe>\n" +
      "<script>document.getElementById(\"f\").srcdoc = " + amanJson(dok) + ";</script></body></html>";
    const alamat = URL.createObjectURL(new Blob([pembungkus], { type: "text/html;charset=utf-8" }));
    const jendela = window.open(alamat, "codingskanetra-kelompok");
    if (!jendela) { URL.revokeObjectURL(alamat); return false; }
    const lama = alamatTab;
    alamatTab = alamat;
    if (lama) window.setTimeout(() => URL.revokeObjectURL(lama), 5000);
    return true;
  }
  window.addEventListener("pagehide", () => { if (alamatTab) URL.revokeObjectURL(alamatTab); });


  // Dialog bersama (elemen #kg-dialog di halaman). opsi: { judul, ok, bahaya, bangun(isiEl), aksi() }
  // aksi() boleh async; bila melempar galat, pesannya tampil di dalam dialog dan dialog tetap terbuka.
  function dialog(opsi) {
    const d = document.getElementById("kg-dialog");
    const isi = document.getElementById("kg-dlg-isi");
    const galat = document.getElementById("kg-dlg-galat");
    const ok = document.getElementById("kg-dlg-ok");
    const batal = document.getElementById("kg-dlg-batal");
    const form = document.getElementById("kg-dlg-form");
    if (!d || !isi || !ok || !batal || !form || typeof d.showModal !== "function") return;
    document.getElementById("kg-dlg-judul").textContent = opsi.judul || "";
    isi.textContent = "";
    galat.hidden = true;
    galat.textContent = "";
    ok.textContent = opsi.ok || "Simpan";
    ok.disabled = false;
    ok.className = "tg-btn " + (opsi.bahaya ? "bahaya" : "utama");
    if (opsi.bangun) opsi.bangun(isi);
    const tutup = () => { if (d.open) d.close(); };
    form.onsubmit = async (e) => {
      e.preventDefault();
      ok.disabled = true;
      galat.hidden = true;
      try {
        await opsi.aksi();
        tutup();
      } catch (er) {
        galat.textContent = (er && er.message) || "Gagal. Coba lagi.";
        galat.hidden = false;
        ok.disabled = false;
      }
    };
    batal.onclick = tutup;
    if (!d.open) d.showModal();
  }

  // Satu baris label + kolom isian di dalam dialog.
  function isian(induk, label, id, opsi) {
    const o = opsi || {};
    const l = el("label", "", label);
    l.htmlFor = id;
    let k;
    if (o.baris) { k = el("textarea", "kg-teks"); k.rows = o.baris; }
    else { k = el("input", "kg-teks"); k.type = o.tipe || "text"; }
    k.id = id;
    if (o.maks) k.maxLength = o.maks;
    if (o.nilai !== undefined && o.nilai !== null) k.value = o.nilai;
    if (o.spellcheck === false) k.spellcheck = false;
    induk.append(l, k);
    return k;
  }

  const nama = (a) => (a && (a.nama || a.username)) ? String(a.nama || a.username) : "";

  window.CSKelompok = { dialog, isian, el, tombol, waktu, STATUS, lencana, rpc, wajibMasuk, gabung, rakit, dokumen, kode, pasangPratinjau, bukaDiTab, POLA_ID, nama, akun };
})();
