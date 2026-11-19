// Proyek Kelompok: fungsi bersama untuk halaman anggota dan pengelola.
//   * rpc()      : memanggil fungsi database (supabase/kelompok.sql) dengan token login.
//   * dokumen()  : menggabungkan semua bagian menjadi satu halaman utuh untuk pratinjau iframe.
//   * kode()     : tampilan "kode utuh" (hanya baca) dengan penanda tiap bagian.
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

  // ---------- Menggabungkan bagian ----------

  const amanStyle = (s) => String(s || "").replace(/<\/style/gi, "<\\/style");
  const amanSkrip = (s) => String(s || "").replace(/<\/script/gi, "<\\/script");

  // bagian: [{nama, umum, html, css, js}] sudah berurutan (Umum lebih dulu).
  function gabung(bagian) {
    const urut = (bagian || []).slice();
    const html = urut.filter((b) => !b.umum && String(b.html || "").trim())
      .map((b) => "<!-- bagian: " + String(b.nama).replace(/--/g, "-") + " -->\n" + b.html + "\n<!-- /bagian -->").join("\n\n");
    const css = urut.filter((b) => String(b.css || "").trim())
      .map((b) => "/* bagian: " + String(b.nama).replace(/\*\//g, "") + " */\n" + b.css).join("\n\n");
    const js = urut.filter((b) => String(b.js || "").trim())
      .map((b) => "// bagian: " + String(b.nama).replace(/[\r\n]/g, " ") + "\n" + b.js).join("\n\n");
    return { html, css, js };
  }

  // Menggulir tautan jangkar (#bagian) di dalam iframe srcdoc, sama seperti pratinjau editor.
  const SKRIP_JANGKAR = "document.addEventListener('click',function(e){var a=e.target&&e.target.closest?e.target.closest('a[href^=\"#\"]'):null;" +
    "if(!a)return;var id=a.getAttribute('href').slice(1);e.preventDefault();if(!id){window.scrollTo(0,0);return;}" +
    "var t=document.getElementById(id)||document.getElementsByName(id)[0];if(t&&t.scrollIntoView)t.scrollIntoView();});";

  function dokumen(bagian) {
    const g = gabung(bagian);
    return "<!DOCTYPE html>\n<html lang=\"id\">\n<head>\n<meta charset=\"UTF-8\">\n" +
      "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<style>\n" + amanStyle(g.css) + "\n</style>\n</head>\n<body>\n" +
      g.html + "\n<script>\n" + SKRIP_JANGKAR + "\n</script>\n<script>\n" + amanSkrip(g.js) + "\n</script>\n</body>\n</html>";
  }

  // Satu teks utuh untuk dibaca (bukan untuk dijalankan).
  function kode(bagian) {
    const g = gabung(bagian);
    return "<!-- ===== HTML ===== -->\n" + (g.html || "(belum ada HTML)") +
      "\n\n/* ===== CSS ===== */\n" + (g.css || "(belum ada CSS)") +
      "\n\n// ===== JavaScript =====\n" + (g.js || "(belum ada JavaScript)");
  }

  function pasangPratinjau(iframe, bagian) {
    iframe.setAttribute("sandbox", "allow-scripts allow-modals allow-forms");
    iframe.setAttribute("referrerpolicy", "no-referrer");
    iframe.srcdoc = dokumen(bagian);
  }


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

  window.CSKelompok = { dialog, isian, el, tombol, waktu, STATUS, lencana, rpc, wajibMasuk, gabung, dokumen, kode, pasangPratinjau, POLA_ID, nama, akun };
})();
