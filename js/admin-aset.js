// Halaman pengelola: ringkasan aset gambar per anggota, lihat dan hapus gambar bermasalah.
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const akun = () => window.CodingSkanetraAkun;
  const cfg = () => window.CS_SUPABASE || {};
  const dasar = () => String(cfg().url || "").replace(/\/+$/, "");
  const KB = (b) => b >= 1048576 ? (b / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.max(0, Math.round(b / 1024)) + " KB";
  const POLA_UID = /^[0-9a-f-]{36}$/i;
  const POLA_NAMA = /^[a-z0-9][a-z0-9._-]{0,48}\.(png|jpe?g|webp|gif)$/;
  const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; };

  function pesan(t, galat) { const p = $("tg-pesan"); p.textContent = t || ""; p.hidden = !t; p.classList.toggle("galat", Boolean(galat)); }
  function tamu(judul, teks, tautan) {
    pesan("");
    const t = $("tg-tamu"); t.hidden = false; t.textContent = "";
    t.append(el("h2", "", judul), el("p", "", teks));
    if (tautan) { const a = el("a", "btn", tautan[0]); a.href = tautan[1]; t.appendChild(a); }
  }

  async function kepala(tipe) {
    const token = await akun().token();
    return Object.assign({ apikey: String(cfg().anonKey || ""), Authorization: "Bearer " + token }, tipe ? { "Content-Type": tipe } : {});
  }
  const panggil = async (path, opsi) => {
    try { return await fetch(dasar() + path, opsi); } catch (e) { throw new Error("Tidak bisa terhubung ke server."); }
  };

  async function ringkasan() {
    const r = await panggil("/rest/v1/rpc/aset_ringkasan_admin", { method: "POST", headers: await kepala("application/json"), body: "{}", cache: "no-store" });
    if (!r.ok) throw new Error(r.status === 404 ? "Fungsi belum ada. Jalankan supabase/aset.sql." : "Ringkasan gagal dimuat (kode " + r.status + ").");
    return r.json();
  }

  async function berkasAkun(uid) {
    const r = await panggil("/storage/v1/object/list/aset", { method: "POST", headers: await kepala("application/json"), body: JSON.stringify({ prefix: uid, limit: 100, offset: 0, sortBy: { column: "name", order: "asc" } }), cache: "no-store" });
    if (!r.ok) throw new Error("Daftar gambar gagal dimuat (kode " + r.status + ").");
    return (await r.json()).filter((f) => f && POLA_NAMA.test(f.name || "")).map((f) => ({ nama: f.name, ukuran: Number(f.metadata && f.metadata.size) || 0 }));
  }

  async function tautan(uid, daftar) {
    if (!daftar.length) return {};
    const r = await panggil("/storage/v1/object/sign/aset", { method: "POST", headers: await kepala("application/json"), body: JSON.stringify({ expiresIn: 900, paths: daftar.map((x) => uid + "/" + x.nama) }), cache: "no-store" });
    if (!r.ok) return {};
    const hasil = {};
    (await r.json()).forEach((x) => { if (x && x.signedURL && !x.error) hasil[String(x.path).split("/").pop()] = dasar() + "/storage/v1" + x.signedURL; });
    return hasil;
  }

  async function hapus(uid, nama) {
    const r = await panggil("/storage/v1/object/aset/" + uid + "/" + nama, { method: "DELETE", headers: await kepala() });
    if (!r.ok) throw new Error("Hapus gagal (kode " + r.status + ").");
  }

  let baris = [];
  function gambarTabel() {
    const isi = $("aa-isi"); isi.textContent = "";
    const jumlah = baris.reduce((a, x) => a + x.jumlah, 0), byte = baris.reduce((a, x) => a + x.byte, 0);
    $("aa-total").textContent = baris.length ? jumlah + " gambar dari " + baris.length + " anggota · " + KB(byte) + " terpakai (kuota gratis Supabase: 1 GB)" : "Belum ada gambar yang diunggah.";
    baris.forEach((x) => {
      const tr = el("tr");
      const sel = el("td", "aa-orang");
      sel.append(el("strong", "", x.nama || "(nama belum diisi)"), el("small", "", "@" + x.username));
      tr.append(sel, el("td", "", String(x.jumlah)), el("td", "", KB(x.byte)));
      const aksi = el("td"); const b = el("button", "aa-lihat", "Lihat"); b.type = "button";
      b.setAttribute("aria-label", "Lihat gambar " + (x.nama || "@" + x.username));
      b.addEventListener("click", () => detail(x));
      aksi.appendChild(b); tr.appendChild(aksi); isi.appendChild(tr);
    });
  }

  async function detail(x) {
    if (!POLA_UID.test(x.user_id)) return;
    const d = $("aa-detail"); d.hidden = false;
    $("aa-detail-judul").textContent = "Gambar " + (x.nama ? x.nama + " (@" + x.username + ")" : "@" + x.username);
    const p = $("aa-detail-pesan"), grid = $("aa-grid"); grid.textContent = ""; p.textContent = "Memuat…";
    try {
      const daftar = await berkasAkun(x.user_id); const peta = await tautan(x.user_id, daftar);
      p.textContent = daftar.length ? "" : "Tidak ada gambar.";
      daftar.forEach((f) => {
        const li = el("li", "aa-kartu"); const g = el("div", "aa-gambar");
        if (peta[f.nama]) { const img = new Image(); img.alt = ""; img.loading = "lazy"; img.src = peta[f.nama]; g.appendChild(img); }
        const nama = el("code", "", f.nama), uk = el("span", "aa-uk", KB(f.ukuran));
        const b = el("button", "aa-hapus", "Hapus"); b.type = "button";
        b.addEventListener("click", async () => {
          if (b.dataset.yakin !== "1") { b.dataset.yakin = "1"; b.textContent = "Yakin hapus?"; setTimeout(() => { b.dataset.yakin = ""; b.textContent = "Hapus"; }, 4000); return; }
          b.disabled = true;
          try { await hapus(x.user_id, f.nama); li.remove(); x.jumlah = Math.max(0, x.jumlah - 1); x.byte = Math.max(0, x.byte - f.ukuran); gambarTabel(); p.textContent = "Dihapus: " + f.nama; }
          catch (e) { p.textContent = e.message; p.classList.add("galat"); b.disabled = false; }
        });
        li.append(g, nama, uk, b); grid.appendChild(li);
      });
    } catch (e) { p.textContent = e.message; p.classList.add("galat"); }
    d.scrollIntoView({ block: "nearest" });
  }

  async function mulai() {
    const a = akun();
    if (!a || !a.tersedia) { tamu("Fitur akun belum aktif", "Hubungi pengelola.", null); return; }
    try { await a.siap; } catch (e) { /* lanjut sebagai tamu */ }
    if (!a.pengguna()) { tamu("Masuk dulu", "Halaman ini khusus pengelola.", ["Masuk", "login.html?next=admin-aset"]); return; }
    try {
      const r = await a.minta("/rest/v1/profil?select=admin&id=eq." + encodeURIComponent((a.pengguna() || {}).id || "") + "&limit=1");
      const p = r.ok && Array.isArray(r.data) ? r.data[0] : null;
      if (!p) { pesan("Akunmu belum bisa diperiksa. Muat ulang halaman ini.", true); return; }
      if (p.admin !== true) { tamu("Khusus pengelola", "Akunmu tidak punya akses ke halaman ini.", ["Kembali", "peringkat.html"]); return; }
    } catch (e) { pesan((e && e.message) || "Akunmu belum bisa diperiksa.", true); return; }
    pesan(""); $("tg-isi").hidden = false;
    try { baris = await ringkasan(); gambarTabel(); } catch (e) { pesan(e.message, true); }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mulai); else mulai();
})();
