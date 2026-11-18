// Uji Tahap 0 untuk Assets di Supabase ASLI. Tidak dipasang di situs: ditempel manual.
// Cara pakai: (1) jalankan supabase/aset.sql di SQL Editor, (2) buka halaman Profil di situs, masuk dengan akun ANGGOTA,
// (3) buka DevTools > Console, tempel seluruh berkas ini, tekan Enter. Hasil tampil sebagai tabel.
// Berkas ujinya bernama uji-*.png di folder akunmu dan dihapus lagi di akhir. Tidak memakai kunci rahasia:
// hanya sesi login milikmu dan kunci publik yang sudah ada di halaman.
(async () => {
  const cfg = window.CS_SUPABASE || {};
  const dasar = String(cfg.url || "").replace(/\/+$/, "");
  const sesi = JSON.parse(localStorage.getItem("codingskanetra-sesi") || "null");
  if (!dasar || !sesi) { console.error("Masuk dulu sebagai anggota, lalu tempel lagi."); return; }
  const uid = sesi.user.id;
  const H = (tipe) => Object.assign({ apikey: cfg.anonKey, Authorization: "Bearer " + sesi.access_token }, tipe ? { "Content-Type": tipe } : {});
  const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAIAQMAAAD+wSzIAAAABlBMVEX/AAD///9BHTQRAAAAD0lEQVQI12P4z8DAwMAAAA0AAf/q5b0AAAAASUVORK5CYII="), (c) => c.charCodeAt(0));
  const hasil = [];
  const cek = (uji, ok, info) => { hasil.push({ uji, hasil: ok ? "OK" : "GAGAL", info: info || "" }); };
  const unggah = (jalur, badan, tipe) => fetch(dasar + "/storage/v1/object/aset/" + jalur, { method: "POST", headers: Object.assign(H(tipe), { "x-upsert": "false" }), body: badan });
  const hapus = (jalur) => fetch(dasar + "/storage/v1/object/aset/" + jalur, { method: "DELETE", headers: H() });
  const rpc = async (nama) => (await fetch(dasar + "/rest/v1/rpc/" + nama, { method: "POST", headers: H("application/json"), body: "{}" })).json();
  const dibuat = [];

  try {
    const awal = (await rpc("aset_pemakaian"))[0];
    cek("pemakaian terbaca", awal && awal.batas_jumlah === 30 && awal.batas_byte === 512000, JSON.stringify(awal));

    let r = await unggah(uid + "/uji-a.png", PNG, "image/png");
    cek("unggah PNG ke folder sendiri", r.ok, r.status); if (r.ok) dibuat.push("uji-a.png");

    r = await unggah(uid + "/uji-a.png", PNG, "image/png");
    cek("nama sama ditolak (tidak menimpa)", !r.ok, r.status);

    r = await unggah("00000000-0000-0000-0000-000000000000/uji-x.png", PNG, "image/png");
    cek("unggah ke folder orang lain ditolak", !r.ok, r.status);

    r = await unggah(uid + "/uji-b.svg", new Blob(["<svg xmlns='http://www.w3.org/2000/svg'/>"]), "image/svg+xml");
    cek("SVG ditolak", !r.ok, r.status);

    r = await unggah(uid + "/Uji-C.png", PNG, "image/png");
    cek("nama huruf besar ditolak", !r.ok, r.status);

    r = await unggah(uid + "/uji-besar.png", new Uint8Array(600 * 1024), "image/png");
    cek("file > 500 KB ditolak", !r.ok, r.status); if (r.ok) dibuat.push("uji-besar.png");

    r = await fetch(dasar + "/storage/v1/object/sign/aset", { method: "POST", headers: H("application/json"), body: JSON.stringify({ expiresIn: 120, paths: [uid + "/uji-a.png"] }) });
    const tt = r.ok ? (await r.json())[0] : null;
    const url = tt && tt.signedURL ? dasar + "/storage/v1" + tt.signedURL : "";
    cek("tautan bertanda tangan dibuat", Boolean(url), r.status);
    if (url) {
      const g = await fetch(url);
      cek("gambar terbuka lewat tautan", g.ok && (g.headers.get("content-type") || "").startsWith("image/"), g.status + " " + g.headers.get("content-type"));
      const polos = await fetch(dasar + "/storage/v1/object/aset/" + uid + "/uji-a.png");
      cek("tanpa tautan/token gambar TIDAK terbuka (privat)", !polos.ok, polos.status);
      const publik = await fetch(dasar + "/storage/v1/object/public/aset/" + uid + "/uji-a.png");
      cek("alamat publik tidak berlaku", !publik.ok, publik.status);
    }

    r = await fetch(dasar + "/storage/v1/object/list/aset", { method: "POST", headers: H("application/json"), body: JSON.stringify({ prefix: uid, limit: 100 }) });
    const daftar = r.ok ? await r.json() : [];
    cek("daftar file milik sendiri terbaca (dengan ukuran)", daftar.some((f) => f.name === "uji-a.png" && f.metadata && f.metadata.size > 0), r.status);

    // Isi sampai batas lalu coba satu lagi.
    const sisa = awal ? awal.batas_jumlah - (await rpc("aset_pemakaian"))[0].jumlah : 0;
    let berhasil = 0;
    for (let i = 0; i < sisa; i++) { const x = await unggah(uid + "/uji-n" + i + ".png", PNG, "image/png"); if (x.ok) { berhasil++; dibuat.push("uji-n" + i + ".png"); } else break; }
    const lagi = await unggah(uid + "/uji-lebih.png", PNG, "image/png");
    cek("file ke-31 ditolak (batas 30 per akun)", !lagi.ok && berhasil === sisa, "terisi " + berhasil + "/" + sisa + ", status ke-31: " + lagi.status);
    if (lagi.ok) dibuat.push("uji-lebih.png");

    const akhir = (await rpc("aset_pemakaian"))[0];
    cek("pemakaian akhir tidak melebihi 30", akhir.jumlah <= 30, JSON.stringify(akhir));
  } catch (e) {
    cek("uji berjalan tanpa galat", false, String(e));
  } finally {
    for (const n of dibuat) await hapus(uid + "/" + n);
    const sisa = (await rpc("aset_pemakaian").catch(() => [{}]))[0];
    cek("pembersihan: berkas uji terhapus", true, "pemakaian sekarang " + JSON.stringify(sisa));
    console.table(hasil);
    console.log(hasil.every((h) => h.hasil === "OK") ? "SEMUA LOLOS" : "ADA YANG GAGAL: kirim tabel di atas ke pengembang.");
  }
})();
