// Aset gambar akun (Supabase Storage, bucket privat "aset"). Lihat supabase/aset.sql.
// Tanpa library: memakai fetch + sesi login dari js/akun.js. Satu-satunya sumber data adalah Storage:
// jalur file <id-akun>/<nama>, dan <nama> itulah yang dipakai di kode (<img src="kucing.png">).
//
//   CodingSkanetraAset.daftar()            -> [{ nama, ukuran, dibuat }]
//   CodingSkanetraAset.pemakaian()         -> { jumlah, byte, batasJumlah, batasByte }
//   CodingSkanetraAset.unggah(file)        -> { nama, diubah }   (dikecilkan dulu di browser)
//   CodingSkanetraAset.hapus(nama)
//   CodingSkanetraAset.segarkan()          -> memuat daftar + tautan bertanda tangan (berlaku 1 jam)
//   CodingSkanetraAset.peta()              -> { "kucing.png": "https://..." } (sinkron, dari cache)
//   CodingSkanetraAset.siapkan()           -> Promise bila cache perlu dimuat/diperbarui, selain itu null
(() => {
  "use strict";

  const BUCKET = "aset";
  const BATAS_BYTE = 512000;           // harus sama dengan supabase/aset.sql
  const BATAS_JUMLAH = 30;
  const SISI_MAKS = 1280;
  const SISI_MIN = 240;
  const TIPE = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };
  const UMUR_TAUTAN = 3600;            // detik
  const POLA_NAMA = /^[a-z0-9][a-z0-9._-]{0,48}\.(png|jpe?g|webp|gif)$/;

  const cfg = () => window.CS_SUPABASE || {};
  const dasar = () => String(cfg().url || "").replace(/\/+$/, "");
  const akun = () => window.CodingSkanetraAkun;

  function galat(pesan, kode) { const e = new Error(pesan); e.kode = kode || "galat"; return e; }

  // ---------- Nama file ----------
  // Dari nama berkas pengguna menjadi nama aman: huruf kecil, angka, titik, strip, garis bawah.
  function namaAman(namaAsli, ekstensi) {
    let dasarNama = String(namaAsli || "gambar").replace(/\.[^.]*$/, "").toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9._-]+/g, "-").replace(/^[^a-z0-9]+/, "").replace(/[-.]+$/g, "");
    if (!dasarNama) dasarNama = "gambar";
    dasarNama = dasarNama.slice(0, 40).replace(/[-.]+$/g, "");
    return dasarNama + "." + ekstensi;
  }

  function namaUnik(nama, yangAda) {
    if (!yangAda.has(nama)) return nama;
    const m = /^(.*)\.([a-z0-9]+)$/.exec(nama);
    for (let i = 2; i < 100; i++) {
      const calon = m[1].slice(0, 44) + "-" + i + "." + m[2];
      if (!yangAda.has(calon)) return calon;
    }
    throw galat("Nama file terlalu sering dipakai. Ganti nama berkasnya.", "nama");
  }

  // ---------- Pengecilan gambar (di browser) ----------
  async function muatBitmap(berkas) {
    if (window.createImageBitmap) {
      try { return await createImageBitmap(berkas); } catch (e) { /* coba cara lain */ }
    }
    return await new Promise((ok, gagal) => {
      const url = URL.createObjectURL(berkas);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); ok(img); };
      img.onerror = () => { URL.revokeObjectURL(url); gagal(galat("Berkas bukan gambar yang valid.", "gambar")); };
      img.src = url;
    });
  }

  const keBlob = (kanvas, tipe, mutu) => new Promise((ok) => kanvas.toBlob((b) => ok(b), tipe, mutu));

  // Mengembalikan { blob, tipe, diubah } dengan ukuran <= BATAS_BYTE dan sisi terpanjang <= SISI_MAKS.
  async function kecilkan(berkas) {
    const tipeAsal = berkas.type;
    if (!TIPE[tipeAsal]) throw galat("Format tidak didukung. Pakai PNG, JPG, WebP, atau GIF.", "format");
    if (berkas.size > 20 * 1024 * 1024) throw galat("Berkas terlalu besar (maksimal 20 MB sebelum dikecilkan).", "ukuran");

    if (tipeAsal === "image/gif") {
      if (berkas.size > BATAS_BYTE) throw galat("GIF maksimal 500 KB (GIF tidak bisa dikecilkan otomatis). Pakai PNG atau WebP, atau perkecil GIF-nya.", "ukuran");
      return { blob: berkas, tipe: tipeAsal, diubah: false };
    }

    const bmp = await muatBitmap(berkas);
    const lebar0 = bmp.width, tinggi0 = bmp.height;
    if (!lebar0 || !tinggi0) throw galat("Berkas bukan gambar yang valid.", "gambar");
    let skala = Math.min(1, SISI_MAKS / Math.max(lebar0, tinggi0));

    // Gambar yang sudah kecil dan sisinya wajar dipakai apa adanya.
    if (skala === 1 && berkas.size <= BATAS_BYTE) return { blob: berkas, tipe: tipeAsal, diubah: false };

    const urutanTipe = tipeAsal === "image/png" ? ["image/png", "image/webp"] : [tipeAsal];
    for (let putaran = 0; putaran < 12; putaran++) {
      const w = Math.max(1, Math.round(lebar0 * skala)), h = Math.max(1, Math.round(tinggi0 * skala));
      const kanvas = document.createElement("canvas");
      kanvas.width = w; kanvas.height = h;
      const ctx = kanvas.getContext("2d");
      if (tipeAsal === "image/jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); }
      ctx.drawImage(bmp, 0, 0, w, h);
      for (const tipe of urutanTipe) {
        const mutuAwal = tipe === "image/png" ? [undefined] : [0.86, 0.76, 0.66, 0.56];
        for (const mutu of mutuAwal) {
          const blob = await keBlob(kanvas, tipe, mutu);
          if (blob && blob.type === tipe && blob.size <= BATAS_BYTE) {
            if (bmp.close) bmp.close();
            return { blob, tipe, diubah: true };
          }
        }
      }
      if (Math.max(w, h) <= SISI_MIN) break;
      skala *= 0.85;
    }
    if (bmp.close) bmp.close();
    throw galat("Gambar tetap terlalu besar setelah dikecilkan. Coba gambar lain.", "ukuran");
  }

  // ---------- Panggilan Storage ----------
  async function kepala(tipe) {
    const a = akun();
    if (!a || !a.pengguna()) throw galat("Masuk dulu untuk memakai aset gambar.", "belum-masuk");
    const token = await a.token();
    if (!token) throw galat("Masuk dulu untuk memakai aset gambar.", "belum-masuk");
    return Object.assign({ apikey: String(cfg().anonKey || ""), Authorization: "Bearer " + token }, tipe ? { "Content-Type": tipe } : {});
  }

  async function panggil(path, opsi) {
    let res;
    try { res = await fetch(dasar() + path, opsi); }
    catch (e) { throw galat("Tidak bisa terhubung ke server. Periksa internet lalu coba lagi.", "jaringan"); }
    return res;
  }

  function pesanGalat(res, awal) {
    if (res.status === 401) return galat("Sesi habis. Masuk lagi lalu coba lagi.", "belum-masuk");
    if (res.status === 403) return galat("Hanya anggota yang sudah disetujui yang bisa menyimpan gambar.", "izin");
    if (res.status === 409) return galat("Nama file itu sudah dipakai. Ganti nama berkasnya.", "nama");
    if (res.status === 413) return galat("Berkas terlalu besar.", "ukuran");
    if (res.status === 400) return galat("Gambar ditolak server. Kemungkinan jumlah gambarmu sudah penuh (" + BATAS_JUMLAH + ") atau formatnya tidak diizinkan.", "ditolak");
    return galat(awal + " (kode " + res.status + ").", "server");
  }

  async function daftar() {
    const uid = akun().pengguna().id;
    const res = await panggil("/storage/v1/object/list/" + BUCKET, {
      method: "POST", headers: await kepala("application/json"),
      body: JSON.stringify({ prefix: uid, limit: 100, offset: 0, sortBy: { column: "name", order: "asc" } }), cache: "no-store"
    });
    if (!res.ok) throw pesanGalat(res, "Daftar aset gagal dimuat");
    const data = await res.json();
    return (Array.isArray(data) ? data : []).filter((f) => f && POLA_NAMA.test(f.name || "")).map((f) => ({
      nama: f.name, ukuran: Number(f.metadata && f.metadata.size) || 0, dibuat: f.created_at || ""
    }));
  }

  async function pemakaian() {
    const res = await panggil("/rest/v1/rpc/aset_pemakaian", { method: "POST", headers: await kepala("application/json"), body: "{}", cache: "no-store" });
    if (!res.ok) throw pesanGalat(res, "Pemakaian gagal dimuat");
    const r = (await res.json())[0] || {};
    return { jumlah: r.jumlah || 0, byte: Number(r.byte) || 0, batasJumlah: r.batas_jumlah || BATAS_JUMLAH, batasByte: r.batas_byte || BATAS_BYTE };
  }

  async function tandaiTangan(namaList) {
    if (!namaList.length) return {};
    const uid = akun().pengguna().id;
    const res = await panggil("/storage/v1/object/sign/" + BUCKET, {
      method: "POST", headers: await kepala("application/json"),
      body: JSON.stringify({ expiresIn: UMUR_TAUTAN, paths: namaList.map((n) => uid + "/" + n) }), cache: "no-store"
    });
    if (!res.ok) throw pesanGalat(res, "Tautan gambar gagal dibuat");
    const hasil = {};
    (await res.json()).forEach((r) => {
      if (r && r.signedURL && !r.error) {
        const nama = String(r.path || "").split("/").pop();
        const url = dasar() + "/storage/v1" + r.signedURL;
        if (POLA_NAMA.test(nama)) hasil[nama] = url;
      }
    });
    return hasil;
  }

  // ---------- Cache untuk pratinjau ----------
  const kas = { nama: [], tautan: {}, kadaluarsa: 0, dimuat: false, sedang: null };
  const peta = () => kas.tautan;
  const perluMuat = () => !kas.dimuat || Date.now() > kas.kadaluarsa - 5 * 60 * 1000;

  function segarkan() {
    if (kas.sedang) return kas.sedang;
    kas.sedang = (async () => {
      try {
        const d = await daftar();
        kas.tautan = await tandaiTangan(d.map((x) => x.nama));
        kas.nama = d.map((x) => x.nama);
        kas.kadaluarsa = Date.now() + UMUR_TAUTAN * 1000;
        kas.dimuat = true;
        return d;
      } finally { kas.sedang = null; }
    })();
    return kas.sedang;
  }

  function siapkan() {
    const a = akun();
    if (!a || !a.pengguna() || !perluMuat()) return null;
    return segarkan().catch(() => null);
  }

  // ---------- Unggah dan hapus ----------
  async function unggah(berkas) {
    const hasil = await kecilkan(berkas);
    const ada = new Set((await daftar()).map((x) => x.nama));
    const nama = namaUnik(namaAman(berkas.name, TIPE[hasil.tipe]), ada);
    const uid = akun().pengguna().id;
    const res = await panggil("/storage/v1/object/" + BUCKET + "/" + uid + "/" + nama, {
      method: "POST", headers: Object.assign(await kepala(hasil.tipe), { "x-upsert": "false", "cache-control": "max-age=3600" }), body: hasil.blob
    });
    if (!res.ok) throw pesanGalat(res, "Unggah gagal");
    kas.dimuat = false;
    return { nama, dikecilkan: hasil.diubah, ukuran: hasil.blob.size, ukuranAsal: berkas.size };
  }

  async function hapus(nama) {
    if (!POLA_NAMA.test(nama)) throw galat("Nama tidak valid.", "nama");
    const uid = akun().pengguna().id;
    const res = await panggil("/storage/v1/object/" + BUCKET + "/" + uid + "/" + nama, { method: "DELETE", headers: await kepala() });
    if (!res.ok) throw pesanGalat(res, "Hapus gagal");
    kas.dimuat = false;
  }

  const api = {
    BATAS_BYTE, BATAS_JUMLAH, POLA_NAMA,
    daftar, pemakaian, unggah, hapus, segarkan, siapkan, peta, tandaiTangan,
    _uji: { namaAman, namaUnik, kecilkan }
  };
  window.CodingSkanetraAset = api;
})();
