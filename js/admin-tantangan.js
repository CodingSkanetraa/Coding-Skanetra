// Halaman admin Tantangan: kelola soal dan tes tersembunyi, nilai jawaban manual, atur ID spreadsheet anggota.
// Akses dijaga di database (RLS + fungsi adalah_admin) dan di server (api/tantangan/setujui). Pemeriksaan di sini hanya untuk tampilan.
(() => {
  "use strict";
  const BAHASA = { py: "Python", cpp: "C++", web: "Web" };
  const TINGKAT = { mudah: "Mudah", sedang: "Sedang", sulit: "Sulit" };
  const POLA_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const MAKS_TES = 10;

  const $ = (id) => document.getElementById(id);
  const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks !== undefined) e.textContent = teks; return e; };
  const akun = () => window.CodingSkanetraAkun;

  let daftarSoal = [];
  let sedangSimpan = false;

  function pesan(teks, galat) { const p = $("tg-pesan"); p.textContent = teks || ""; p.classList.toggle("galat", Boolean(galat)); }
  function tamu(judul, teks, tombol) {
    pesan("");
    const t = $("tg-tamu");
    t.textContent = "";
    t.append(el("strong", "", judul), el("p", "", teks));
    if (tombol) { const a = el("a", "tg-btn utama", tombol[0]); a.href = tombol[1]; t.append(a); }
    t.hidden = false;
  }
  function pesanGalat(res, cadangan) {
    const d = res && res.data && typeof res.data === "object" ? res.data : {};
    return d.message || d.pesan || cadangan;
  }
  function tanggal(iso) {
    const d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }
  function namaAnak(p) {
    if (!p) return "(anggota dihapus)";
    return (p.nama || p.username) + (p.kelas ? " · " + p.kelas : "");
  }

  // ---------- Tab ----------
  function pilihTab(nama) {
    document.querySelectorAll(".tg-tab").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.t === nama)));
    ["soal", "menunggu", "anggota"].forEach((n) => { $("pn-" + n).hidden = n !== nama; });
    if (nama === "menunggu") muatMenunggu();
    if (nama === "anggota") muatAnggota();
  }

  // ---------- Soal ----------
  async function muatSoal() {
    const r = await akun().minta("/rest/v1/tantangan?select=id,judul,bahasa,tingkat,poin,penilaian,aktif&order=dibuat.desc&limit=300");
    if (!r.ok || !Array.isArray(r.data)) { pesan(pesanGalat(r, "Daftar soal belum bisa dimuat."), true); return; }
    daftarSoal = r.data;
    gambarSoal();
  }

  function gambarSoal() {
    const ul = $("tg-daftar");
    ul.textContent = "";
    if (!daftarSoal.length) { ul.append(el("li", "tg-pesan", "Belum ada soal. Tekan \"Soal baru\".")); return; }
    daftarSoal.forEach((s) => {
      const li = el("li", "tg-kartu admin");
      const info = el("div", "tg-info");
      info.append(el("strong", "", s.judul), el("small", "", BAHASA[s.bahasa] + " · " + TINGKAT[s.tingkat] + " · " + s.poin + " poin · " + (s.penilaian === "manual" ? "manual" : "otomatis")));
      if (!s.aktif) info.append(el("span", "tg-label ditolak", "Disembunyikan"));
      const aksi = el("div", "tg-baris-aksi");
      const ubah = el("button", "tg-btn", "Ubah"); ubah.type = "button";
      ubah.addEventListener("click", () => bukaForm(s.id));
      const hapus = el("button", "tg-btn bahaya", "Hapus"); hapus.type = "button";
      hapus.addEventListener("click", () => hapusSoal(s));
      aksi.append(ubah, hapus);
      li.append(info, aksi);
      ul.append(li);
    });
  }

  async function hapusSoal(s) {
    if (!confirm("Hapus soal \"" + s.judul + "\"? Semua jawaban anak untuk soal ini ikut terhapus. Poin yang sudah masuk spreadsheet tidak ditarik.")) return;
    const r = await akun().minta("/rest/v1/tantangan?id=eq." + encodeURIComponent(s.id), { metode: "DELETE" });
    if (!r.ok) { pesan(pesanGalat(r, "Soal belum bisa dihapus."), true); return; }
    pesan("");
    await muatSoal();
  }

  // ---------- Form soal ----------
  function barisTes(masukan, keluaran) {
    const b = el("div", "tg-baris");
    const m = el("textarea"); m.placeholder = "Masukan (stdin), boleh kosong"; m.value = masukan || ""; m.maxLength = 2000; m.spellcheck = false; m.setAttribute("aria-label", "Masukan tes");
    const k = el("textarea"); k.placeholder = "Keluaran yang diharapkan"; k.value = keluaran || ""; k.maxLength = 2000; k.spellcheck = false; k.setAttribute("aria-label", "Keluaran tes");
    const x = el("button", "tg-btn bahaya", "Hapus"); x.type = "button";
    x.addEventListener("click", () => { b.remove(); aturTombolTes(); });
    b.append(m, k, x);
    return b;
  }
  function aturTombolTes() { $("f-tes-tambah").disabled = $("f-tes").children.length >= MAKS_TES; }
  function aturBagianTes() {
    const manual = $("f-nilai").value === "manual";
    $("f-tes-bagian").hidden = manual;
  }
  function aturBahasa() {
    const web = $("f-bahasa").value === "web";
    if (web) $("f-nilai").value = "manual";
    $("f-nilai").querySelector('option[value="otomatis"]').disabled = web;
    aturBagianTes();
  }
  function galatForm(teks) { const g = $("f-galat"); g.textContent = teks || ""; g.hidden = !teks; }

  let idDiubah = null;
  async function bukaForm(id) {
    galatForm("");
    idDiubah = id || null;
    $("dlg-judul").textContent = id ? "Ubah soal" : "Soal baru";
    $("f-tes").textContent = "";
    let s = { judul: "", bahasa: "py", tingkat: "mudah", poin: 10, penilaian: "otomatis", deskripsi: "", kode_awal: "", aktif: true };
    let tes = [];
    if (id) {
      const [rs, rt] = await Promise.all([
        akun().minta("/rest/v1/tantangan?select=*&id=eq." + encodeURIComponent(id)),
        akun().minta("/rest/v1/tantangan_tes?select=masukan,keluaran&order=urutan.asc&tantangan_id=eq." + encodeURIComponent(id))
      ]);
      if (!rs.ok || !Array.isArray(rs.data) || !rs.data[0]) { pesan("Soal belum bisa dibuka.", true); return; }
      s = rs.data[0];
      tes = rt.ok && Array.isArray(rt.data) ? rt.data : [];
    }
    $("f-judul").value = s.judul; $("f-bahasa").value = s.bahasa; $("f-tingkat").value = s.tingkat;
    $("f-poin").value = s.poin; $("f-nilai").value = s.penilaian; $("f-desk").value = s.deskripsi;
    $("f-awal").value = s.kode_awal; $("f-aktif").checked = s.aktif !== false;
    tes.forEach((t) => $("f-tes").append(barisTes(t.masukan, t.keluaran)));
    aturBahasa();
    aturTombolTes();
    $("tg-dialog").showModal();
    $("f-judul").focus();
  }

  async function simpanForm(e) {
    e.preventDefault();
    if (sedangSimpan) return;
    const judul = $("f-judul").value.trim();
    const poin = Number($("f-poin").value);
    const bahasa = $("f-bahasa").value;
    const penilaian = bahasa === "web" ? "manual" : $("f-nilai").value;
    const tes = penilaian === "otomatis"
      ? Array.from($("f-tes").children).map((b) => { const t = b.querySelectorAll("textarea"); return { masukan: t[0].value, keluaran: t[1].value }; })
      : [];
    if (judul.length < 3) return galatForm("Judul minimal 3 karakter.");
    if (!Number.isInteger(poin) || poin < 1 || poin > 100) return galatForm("Poin harus bilangan bulat 1 sampai 100.");
    if (penilaian === "otomatis") {
      if (!tes.length) return galatForm("Soal otomatis butuh minimal satu tes.");
      if (tes.some((t) => !t.keluaran.trim())) return galatForm("Keluaran setiap tes tidak boleh kosong.");
    }
    const p = {
      judul, bahasa, tingkat: $("f-tingkat").value, poin, penilaian, deskripsi: $("f-desk").value,
      kode_awal: $("f-awal").value, aktif: $("f-aktif").checked, tes
    };
    if (idDiubah) p.id = idDiubah;
    sedangSimpan = true;
    $("f-simpan").disabled = true;
    galatForm("");
    try {
      const r = await akun().minta("/rest/v1/rpc/admin_simpan_tantangan", { metode: "POST", body: { p } });
      if (!r.ok) { galatForm(pesanGalat(r, "Soal belum tersimpan. Coba lagi.")); return; }
      $("tg-dialog").close();
      pesan("");
      await muatSoal();
    } catch (err) {
      galatForm((err && err.message) || "Soal belum tersimpan.");
    } finally {
      sedangSimpan = false;
      $("f-simpan").disabled = false;
    }
  }

  // ---------- Menunggu / tertunda ----------
  async function aksi(id, jenis, tombol) {
    tombol.disabled = true;
    try {
      const token = await akun().token();
      const r = await fetch("/api/tantangan/setujui", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ id, aksi: jenis })
      });
      let d = null;
      try { d = await r.json(); } catch (e) { /* bukan JSON */ }
      pesan((d && d.pesan) || (r.ok ? "Selesai." : "Belum berhasil. Coba lagi."), !r.ok);
    } catch (e) {
      pesan("Tidak bisa menghubungi server.", true);
    }
    await muatMenunggu();
  }

  function kartuJawaban(b, tombolDaftar) {
    const k = el("div", "tg-kartu admin");
    const t = b.tantangan || {};
    const info = el("div", "tg-info");
    info.append(el("strong", "", namaAnak(b.profil)), el("small", "", (t.judul || "(soal dihapus)") + " · " + (BAHASA[t.bahasa] || "") + " · " + tanggal(b.dikirim)));
    k.append(info);
    if (tombolDaftar.kode) k.append(el("pre", "", b.kode || "(kosong)"));
    const baris = el("div", "tg-baris-aksi");
    tombolDaftar.aksi.forEach(([teks, jenis, kelas]) => {
      const x = el("button", "tg-btn " + (kelas || ""), teks); x.type = "button";
      x.addEventListener("click", () => aksi(b.id, jenis, x));
      baris.append(x);
    });
    k.append(baris);
    return k;
  }

  async function muatMenunggu() {
    const pilih = "id,status,kode,dikirim,terkirim_sheet,tantangan(judul,bahasa),profil(username,nama,kelas)";
    const [a, b] = await Promise.all([
      akun().minta("/rest/v1/tantangan_selesai?select=" + pilih + "&status=eq.menunggu&order=dikirim.asc&limit=100"),
      akun().minta("/rest/v1/tantangan_selesai?select=" + pilih + "&status=eq.selesai&terkirim_sheet=eq.false&order=dikirim.asc&limit=100")
    ]);
    const antre = $("tg-antre"), tunda = $("tg-tertunda");
    antre.textContent = ""; tunda.textContent = "";
    const dA = a.ok && Array.isArray(a.data) ? a.data : [];
    const dB = b.ok && Array.isArray(b.data) ? b.data : [];
    if (!a.ok || !b.ok) pesan("Sebagian daftar belum bisa dimuat.", true);
    if (!dA.length) antre.append(el("p", "tg-meta", "Tidak ada jawaban yang menunggu."));
    if (!dB.length) tunda.append(el("p", "tg-meta", "Semua poin sudah masuk spreadsheet."));
    dA.forEach((x) => antre.append(kartuJawaban(x, { kode: true, aksi: [["Setujui", "setujui", "utama"], ["Tolak", "tolak", "bahaya"]] })));
    dB.forEach((x) => tunda.append(kartuJawaban(x, { kode: false, aksi: [["Kirim ulang poin", "kirim_ulang", "utama"]] })));
    const h = $("tg-hitung");
    h.textContent = String(dA.length + dB.length);
    h.hidden = dA.length + dB.length === 0;
  }

  // ---------- Anggota ----------
  async function muatAnggota() {
    const r = await akun().minta("/rest/v1/profil?select=id,username,nama,kelas,id_sheet&anggota=eq.true&order=username.asc&limit=500");
    const ul = $("tg-anggota");
    ul.textContent = "";
    if (!r.ok || !Array.isArray(r.data)) { pesan(pesanGalat(r, "Daftar anggota belum bisa dimuat."), true); return; }
    if (!r.data.length) ul.append(el("li", "tg-meta", "Belum ada anggota."));
    r.data.forEach((p) => {
      if (!POLA_ID.test(String(p.id))) return;
      const li = el("li");
      const info = el("div", "tg-info");
      info.append(el("strong", "", p.nama || p.username), el("small", "", "@" + p.username + (p.kelas ? " · " + p.kelas : "")));
      const input = el("input"); input.type = "text"; input.value = p.id_sheet || ""; input.maxLength = 64;
      input.placeholder = "ID spreadsheet"; input.setAttribute("aria-label", "ID spreadsheet untuk " + (p.nama || p.username));
      const simpan = el("button", "tg-btn", "Simpan"); simpan.type = "button";
      const status = el("span", "tg-meta", p.id_sheet ? "" : "belum diisi");
      simpan.addEventListener("click", async () => {
        simpan.disabled = true;
        const res = await akun().minta("/rest/v1/rpc/admin_atur_id_sheet", { metode: "POST", body: { p_user: p.id, p_id: input.value } });
        status.textContent = res.ok ? (input.value.trim() ? "tersimpan" : "dikosongkan") : pesanGalat(res, "gagal");
        simpan.disabled = false;
      });
      li.append(info, input, simpan, status);
      ul.append(li);
    });
  }

  // ---------- Mulai ----------
  async function mulai() {
    const a = akun();
    if (!a || !a.tersedia) { tamu("Fitur akun belum aktif", "Hubungi pengelola.", null); return; }
    try { await a.siap; } catch (e) { /* lanjut sebagai tamu */ }
    if (!a.pengguna()) { tamu("Masuk dulu", "Halaman ini khusus pengelola.", ["Masuk", "login.html?next=admin-tantangan"]); return; }
    try {
      const r = await a.minta("/rest/v1/profil?select=admin&limit=1");
      const p = r.ok && Array.isArray(r.data) ? r.data[0] : null;
      if (!p) { pesan("Akunmu belum bisa diperiksa. Muat ulang halaman ini.", true); return; }
      if (p.admin !== true) { tamu("Khusus pengelola", "Akunmu tidak punya akses ke halaman ini.", ["Kembali", "tantangan.html"]); return; }
    } catch (e) { pesan((e && e.message) || "Akunmu belum bisa diperiksa.", true); return; }

    pesan("");
    $("tg-isi").hidden = false;
    document.querySelectorAll(".tg-tab").forEach((b) => b.addEventListener("click", () => pilihTab(b.dataset.t)));
    $("tg-baru").addEventListener("click", () => bukaForm(null));
    $("dlg-form").addEventListener("submit", simpanForm);
    $("f-batal").addEventListener("click", () => $("tg-dialog").close());
    $("f-bahasa").addEventListener("change", aturBahasa);
    $("f-nilai").addEventListener("change", aturBagianTes);
    $("f-tes-tambah").addEventListener("click", () => { $("f-tes").append(barisTes("", "")); aturTombolTes(); });
    try { await muatSoal(); } catch (e) { pesan((e && e.message) || "Daftar soal belum bisa dimuat.", true); }
    muatMenunggu().catch(() => {});
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mulai);
  else mulai();
})();
