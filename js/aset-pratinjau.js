// Pratinjau editor Web: mengganti nama file gambar buatan sendiri (mis. "kucing.png") menjadi
// tautan gambar yang bisa dimuat di iframe terisolasi. Murni teks masuk -> teks keluar, tanpa jaringan.
// Hanya nama yang ADA di peta (aset milik akun) yang diganti; yang lain tidak disentuh.
//
//   ganti.html(teks, peta)  : src=, poster=, srcset=, dan url(...) di dalam HTML/<style>/style=""
//   ganti.css(teks, peta)   : url(...)
//   ganti.js(teks, peta)    : .src = "x.png", setAttribute("src","x.png"), serta HTML/CSS di dalam string
//   dipakai(teks, nama[])   : nama aset yang disebut di teks (untuk meminta tautan yang perlu saja)
//
// peta: { "kucing.png": "https://.../tautan-bertanda-tangan" } (kunci huruf kecil)
(() => {
  "use strict";

  const AMAN = /^https:\/\/[^\s"'<>`\\()]+$/;
  const AWALAN = "(?:\\.\\/|\\/)?(?:aset\\/|assets\\/|images?\\/|img\\/)?";
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  function siapkan(peta) {
    const bersih = {};
    Object.keys(peta || {}).forEach((k) => {
      const nama = String(k).toLowerCase();
      if (/^[a-z0-9][a-z0-9._-]{0,48}\.(png|jpe?g|webp|gif)$/.test(nama) && AMAN.test(String(peta[k]))) bersih[nama] = String(peta[k]);
    });
    const nama = Object.keys(bersih).sort((a, b) => b.length - a.length);
    return { peta: bersih, daftar: nama, pola: nama.length ? nama.map(esc).join("|") : null };
  }

  function cari(p, teks) {
    const m = new RegExp("^" + AWALAN + "(" + p.pola + ")$", "i").exec(String(teks).trim());
    return m ? p.peta[m[1].toLowerCase()] : null;
  }

  function htmlDenganPeta(teks, p) {
    if (!p.pola) return teks;
    let s = teks.replace(new RegExp("(\\b(?:src|poster|data-src)\\s*=\\s*)([\"'])\\s*" + AWALAN + "(" + p.pola + ")\\s*\\2", "gi"),
      (_, a, q, n) => a + q + p.peta[n.toLowerCase()] + q);
    s = s.replace(/(\bsrcset\s*=\s*)(["'])([^"']*)\2/gi, (_, a, q, isi) =>
      a + q + isi.split(",").map((c) => {
        const bagian = c.trim().split(/\s+/);
        const u = cari(p, bagian[0]);
        if (u) bagian[0] = u;
        return " " + bagian.join(" ");
      }).join(",").trim() + q);
    return cssDenganPeta(s, p);
  }

  function cssDenganPeta(teks, p) {
    if (!p.pola) return teks;
    return teks.replace(new RegExp("url\\(\\s*([\"']?)\\s*" + AWALAN + "(" + p.pola + ")\\s*\\1\\s*\\)", "gi"),
      (_, q, n) => "url(" + p.peta[n.toLowerCase()] + ")"); // tanpa kutip: aman di dalam style="..."
  }

  function jsDenganPeta(teks, p) {
    if (!p.pola) return teks;
    let s = teks.replace(new RegExp("(\\.(?:src|poster)\\s*=\\s*)([\"'`])" + AWALAN + "(" + p.pola + ")\\2", "gi"),
      (_, a, q, n) => a + q + p.peta[n.toLowerCase()] + q);
    s = s.replace(new RegExp("(setAttribute\\(\\s*[\"'](?:src|poster)[\"']\\s*,\\s*)([\"'`])" + AWALAN + "(" + p.pola + ")\\2", "gi"),
      (_, a, q, n) => a + q + p.peta[n.toLowerCase()] + q);
    return htmlDenganPeta(s, p);
  }

  const bungkus = (fn) => (teks, peta) => fn(String(teks == null ? "" : teks), siapkan(peta));

  function dipakai(teks, daftar) {
    const t = String(teks == null ? "" : teks);
    return (daftar || []).filter((nama) => {
      const n = String(nama).toLowerCase();
      return new RegExp("(^|[^a-z0-9._-])" + esc(n) + "(?![a-z0-9._-])", "i").test(t);
    });
  }

  const api = { ganti: { html: bungkus(htmlDenganPeta), css: bungkus(cssDenganPeta), js: bungkus(jsDenganPeta) }, dipakai };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else window.CodingSkanetraAsetPratinjau = api;
})();
