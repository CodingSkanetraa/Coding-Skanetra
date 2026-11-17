// Halaman admin Poin: tambah poin per tanggal, riwayat input dan pembatalan, kelola anggota, semester.
// Akses dijaga di database (fungsi admin_poin_* memeriksa adalah_admin). Pemeriksaan di sini hanya untuk tampilan.
// Semua perubahan lewat fungsi database; tidak ada kunci rahasia di halaman ini.
(() => {
  "use strict";

  const POLA_ID = /^[A-Za-z0-9_-]{1,20}$/;
  const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  const $ = (id) => document.getElementById(id);
  const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks !== undefined) e.textContent = teks; return e; };
  const akun = () => window.CodingSkanetraAkun;

  let anggota = [];              // semua anggota (id_siswa, nama, kelas, aktif)
  let dipilih = new Set();       // ID yang dicentang di tab Tambah poin
  let semester = [];             // daftar semester, terbaru di atas
  let aktif = null;              // semester aktif
  let sedangSimpan = false;
  let anggotaTerbuka = null;     // ID yang sedang diubah di dialog (null = anggota baru)

  // ---------- Pembantu ----------
  function pesan(teks, galat) { const p = $("tg-pesan"); p.textContent = teks || ""; p.classList.toggle("galat", Boolean(galat)); }
  function tamu(judul, teks, tombol) {
    pesan("");
    const t = $("tg-tamu");
    t.textContent = "";
    t.append(el("strong", "", judul), el("p", "", teks));
    if (tombol) { const a = el("a", "tg-btn utama", tombol[0]); a.href = tombol[1]; t.append(a); }
    t.hidden = false;
  }
  function hariIni() { return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" }); }   // YYYY-MM-DD
  function tanggalIndo(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
    return m ? Number(m[3]) + " " + BULAN[Number(m[2]) - 1] + " " + m[1] : String(iso || "");
  }
  function angka(n) { return Number(n || 0).toLocaleString("id-ID"); }

  // Memanggil fungsi database. Galatnya dilempar sebagai Error berisi pesan dari database (bahasa Indonesia).
  async function panggil(nama, isi) {
    const res = await akun().minta("/rest/v1/rpc/" + encodeURIComponent(nama), { metode: "POST", body: isi || {} });
    if (res.status === 401) throw new Error("Sesi berakhir. Masuk lagi.");
    if (!res.ok) {
      const d = res.data && typeof res.data === "object" ? res.data : {};
      throw new Error(d.message || d.pesan || "Permintaan belum berhasil. Coba lagi.");
    }
    return res.data;
  }
  async function ambil(path) {
    const res = await akun().minta("/rest/v1/" + path);
    if (res.status === 401) throw new Error("Sesi berakhir. Masuk lagi.");
    if (!res.ok || !Array.isArray(res.data)) throw new Error("Data belum bisa dimuat.");
    return res.data;
  }

  // ---------- Tab ----------
  function pilihTab(nama) {
    document.querySelectorAll(".tg-tab").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.t === nama)));
    ["tambah", "riwayat", "anggota", "semester"].forEach((n) => { $("pn-" + n).hidden = n !== nama; });
    pesan("");
    if (nama === "riwayat") muatRiwayat().catch((e) => pesan(e.message, true));
    if (nama === "anggota") gambarAnggota().catch((e) => pesan(e.message, true));
    if (nama === "semester") gambarSemester();
  }

  // ---------- Semester ----------
  async function muatSemester() {
    const d = await panggil("poin_semester_daftar");
    semester = Array.isArray(d) ? d : [];
    aktif = semester.find((s) => s.aktif) || null;
    const info = $("ap-semester");
    if (aktif) info.textContent = "Semester aktif: " + aktif.nama + " (mulai " + tanggalIndo(aktif.mulai) + ")";
    else info.textContent = "Belum ada semester aktif. Buka tab Semester untuk membuatnya.";
    $("ap-simpan").disabled = !aktif;
    ringkasan();
  }

  function gambarSemester() {
    const ul = $("ap-sem");
    ul.textContent = "";
    if (!semester.length) { ul.append(el("li", "tg-meta", "Belum ada semester.")); return; }
    semester.forEach((s) => {
      const li = el("li");
      const info = el("div", "tg-info");
      info.append(
        el("strong", "", s.nama),
        el("small", "", tanggalIndo(s.mulai) + " – " + (s.selesai ? tanggalIndo(s.selesai) : "sekarang"))
      );
      if (s.aktif) info.append(el("span", "tg-label", "Aktif"));
      const csv = el("button", "tg-btn", "Unduh CSV"); csv.type = "button";
      csv.addEventListener("click", () => unduhCsv(s, csv));
      li.append(info, csv);
      ul.append(li);
    });
  }

  function namaSemesterDari(iso) {
    const m = /^(\d{4})-(\d{2})/.exec(iso || "");
    if (!m) return "";
    const th = Number(m[1]), bl = Number(m[2]);
    return bl >= 7 ? "Semester Ganjil " + th + "/" + (th + 1) : "Semester Genap " + (th - 1) + "/" + th;
  }

  let namaSemesterDiketik = false;
  function bukaSemesterBaru() {
    $("as-galat").hidden = true;
    $("as-mulai").value = hariIni();
    $("as-nama").value = namaSemesterDari(hariIni());
    namaSemesterDiketik = false;
    $("ap-dlg-sem").showModal();
    $("as-nama").focus();
  }

  async function simpanSemesterBaru(e) {
    e.preventDefault();
    if (sedangSimpan) return;
    const nama = $("as-nama").value.trim(), mulai = $("as-mulai").value;
    const galat = $("as-galat");
    if (nama.length < 3) { galat.textContent = "Nama semester minimal 3 huruf."; galat.hidden = false; return; }
    if (!mulai) { galat.textContent = "Tanggal mulai wajib diisi."; galat.hidden = false; return; }
    const lama = aktif ? aktif.nama : "(belum ada)";
    if (!window.confirm("Mulai \"" + nama + "\"?\n\nPeringkat akan mulai dari 0. Poin \"" + lama + "\" tetap tersimpan sebagai arsip.")) return;
    sedangSimpan = true; $("as-simpan").disabled = true;
    try {
      await panggil("admin_poin_semester_baru", { p_nama: nama, p_mulai: mulai });
      $("ap-dlg-sem").close();
      await muatSemester();
      gambarSemester();
      pesan("Semester baru dimulai: " + nama + ". Peringkat kini mulai dari 0.");
      riwayat = null;
    } catch (err) { galat.textContent = err.message; galat.hidden = false; }
    finally { sedangSimpan = false; $("as-simpan").disabled = false; }
  }

  // ---------- CSV ----------
  function selCsv(v) {
    let t = String(v == null ? "" : v);
    if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;          // cegah rumus di Excel/Sheets
    return /[",\n\r]/.test(t) ? "\"" + t.replace(/"/g, "\"\"") + "\"" : t;
  }
  async function unduhCsv(s, tombol) {
    tombol.disabled = true;
    try {
      const baris = await panggil("poin_peringkat", { p_semester: s.id });
      const isi = ["Peringkat,ID,Nama,Kelas,Total poin"]
        .concat((Array.isArray(baris) ? baris : []).map((r) => [r.ranking, r.id, r.nama, r.kelas, r.total].map(selCsv).join(",")))
        .join("\r\n");
      const blob = new Blob(["﻿" + isi], { type: "text/csv;charset=utf-8" });
      const a = el("a"); a.href = URL.createObjectURL(blob);
      a.download = "poin-" + s.nama.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".csv";
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (err) { pesan(err.message, true); }
    finally { tombol.disabled = false; }
  }

  // ---------- Tambah poin ----------
  // Urutan kelas yang umum di sini (js/urutan-kelas.js): angkatan, lalu PPLG, TJKT, TKL, TO.
  const bandingKelas = (window.CodingSkanetraKelas && window.CodingSkanetraKelas.banding)
    || ((a, b) => String(a).localeCompare(String(b), "id"));
  const urutKelasLaluNama = (a, b) => bandingKelas(a.kelas, b.kelas) || a.nama.localeCompare(b.nama, "id");

  function anggotaTampil() {
    const kata = $("ap-cari").value.trim().toLocaleLowerCase("id-ID");
    const kelas = $("ap-kelas").value;
    const hasil = anggota.filter((a) => a.aktif
      && (!kelas || a.kelas === kelas)
      && (!kata || a.nama.toLocaleLowerCase("id-ID").includes(kata) || a.id_siswa.toLocaleLowerCase("id-ID").includes(kata)));
    return hasil.sort($("ap-urut").value === "nama" ? (a, b) => a.nama.localeCompare(b.nama, "id") : urutKelasLaluNama);
  }

  function gambarDaftar() {
    const ul = $("ap-daftar");
    ul.textContent = "";
    const tampil = anggotaTampil();
    if (!tampil.length) { ul.append(el("li", "ap-kosong", anggota.length ? "Tidak ada anggota yang cocok." : "Belum ada anggota.")); return; }
    const frag = document.createDocumentFragment();
    tampil.forEach((a) => {
      const li = el("li");
      const label = el("label", "ap-item");
      const cek = el("input"); cek.type = "checkbox"; cek.value = a.id_siswa; cek.checked = dipilih.has(a.id_siswa);
      const info = el("div", "tg-info");
      info.append(el("strong", "", a.nama), el("small", "", a.id_siswa + (a.kelas ? " · " + a.kelas : "")));
      label.append(cek, info);
      li.append(label);
      frag.append(li);
    });
    ul.append(frag);
  }

  function isiFilterKelas() {
    const pilih = $("ap-kelas"), lama = pilih.value;
    const kelas = [...new Set(anggota.filter((a) => a.aktif && a.kelas).map((a) => a.kelas))].sort(bandingKelas);
    pilih.textContent = "";
    pilih.append(new Option("Semua kelas", ""));
    kelas.forEach((k) => pilih.append(new Option(k, k)));
    pilih.value = kelas.includes(lama) ? lama : "";
  }

  function ringkasan() {
    const kotak = $("ap-ringkas"), n = dipilih.size;
    const poin = Number($("ap-poin").value), tgl = $("ap-tanggal").value, ket = $("ap-ket").value.trim();
    kotak.textContent = "";
    kotak.classList.toggle("siap", n > 0);
    if (!n) { kotak.textContent = "Belum ada anggota yang dipilih."; return; }
    const b = el("b", "", n + " anggota");
    kotak.append(b);
    if (Number.isInteger(poin) && poin > 0) {
      kotak.append(" × " + angka(poin) + " poin = ", el("b", "", angka(n * poin) + " poin"));
    } else {
      kotak.append(" dipilih. Isi jumlah poin.");
    }
    if (tgl) kotak.append(" · " + tanggalIndo(tgl));
    if (ket) kotak.append(" · " + ket);
    if (aktif && tgl && (tgl < aktif.mulai || (aktif.selesai && tgl > aktif.selesai))) {
      kotak.append(el("span", "ap-awas", "Tanggal ini di luar rentang semester aktif, tetapi poin tetap dihitung di semester aktif."));
    }
  }

  async function simpanPoin(e) {
    e.preventDefault();
    if (sedangSimpan) return;
    const galat = $("ap-galat");
    galat.hidden = true;
    const tgl = $("ap-tanggal").value, poin = Number($("ap-poin").value), ket = $("ap-ket").value.trim();
    const salah = !tgl ? "Pilih tanggal kegiatan."
      : !Number.isInteger(poin) || poin < 1 || poin > 1000 ? "Poin harus bilangan bulat 1 sampai 1000."
      : !dipilih.size ? "Pilih minimal satu anggota."
      : "";
    if (salah) { galat.textContent = salah; galat.hidden = false; return; }

    sedangSimpan = true; $("ap-simpan").disabled = true;
    try {
      const h = await panggil("admin_poin_tambah", { p_tanggal: tgl, p_jumlah: poin, p_keterangan: ket, p_ids: [...dipilih] });
      pesan("Tersimpan sebagai " + h.kode + ": " + h.jumlah + " anggota × " + angka(h.poin) + " poin. Salah input? Batalkan di tab Riwayat input.");
      dipilih = new Set();
      $("ap-poin").value = ""; $("ap-ket").value = "";
      gambarDaftar(); ringkasan();
      riwayat = null;
    } catch (err) { galat.textContent = err.message; galat.hidden = false; }
    finally { sedangSimpan = false; $("ap-simpan").disabled = !aktif; }
  }

  // ---------- Riwayat input ----------
  let riwayat = null;

  const LABEL_STATUS = { aktif: ["Aktif", "tg-label"], sebagian: ["Sebagian dibatalkan", "tg-label menunggu"], dibatalkan: ["Dibatalkan", "tg-label ditolak"] };

  async function muatRiwayat() {
    const d = await panggil("admin_poin_riwayat_input", { p_batas: 200 });
    riwayat = Array.isArray(d) ? d : [];
    gambarRiwayat();
  }

  function gambarRiwayat() {
    const ul = $("ap-riwayat");
    ul.textContent = "";
    if (!riwayat || !riwayat.length) { ul.append(el("li", "tg-meta", "Belum ada input di semester ini.")); return; }
    riwayat.forEach((b) => {
      const li = el("li", "tg-kartu admin");
      const info = el("div", "tg-info");
      const judul = b.kode + " · " + tanggalIndo(b.tanggal) + (b.keterangan ? " · " + b.keterangan : "");
      const rincian = b.sumber === "saldo_awal"
        ? "Poin lama dari spreadsheet · " + b.jumlah_aktif + " anggota · total " + angka(b.total_poin)
        : b.jumlah_aktif + " anggota" + (b.poin_per_anggota ? " × " + angka(b.poin_per_anggota) + " poin" : "") + " · total " + angka(b.total_poin)
          + (b.jumlah_batal ? " · " + b.jumlah_batal + " dibatalkan" : "");
      info.append(el("strong", "", judul), el("small", "", rincian));
      const st = LABEL_STATUS[b.status] || LABEL_STATUS.aktif;
      info.append(el("span", st[1], st[0]));

      const aksi = el("div", "tg-baris-aksi");
      const lihat = el("button", "tg-btn", "Lihat isi"); lihat.type = "button";
      const isi = el("ul", "ap-isi"); isi.hidden = true;
      lihat.addEventListener("click", () => bukaIsi(b, isi, lihat));
      aksi.append(lihat);
      if (b.sumber !== "saldo_awal" && b.status !== "dibatalkan") {
        const batal = el("button", "tg-btn bahaya", "Batalkan semua"); batal.type = "button";
        batal.addEventListener("click", () => batalkanBatch(b, batal));
        aksi.append(batal);
      } else if (b.sumber === "saldo_awal") {
        aksi.append(el("span", "ap-lencana-lama", "tidak bisa dibatalkan"));
      }
      li.append(info, aksi, isi);
      ul.append(li);
    });
  }

  async function bukaIsi(b, ul, tombol) {
    if (!ul.hidden) { ul.hidden = true; tombol.textContent = "Lihat isi"; return; }
    tombol.disabled = true;
    try {
      const baris = await panggil("admin_poin_isi_batch", { p_kode: b.kode });
      ul.textContent = "";
      (Array.isArray(baris) ? baris : []).forEach((r) => {
        const li = el("li", r.dibatalkan ? "batal" : "");
        const info = el("div", "tg-info");
        info.append(el("strong", "", r.nama), el("small", "", r.id + (r.kelas ? " · " + r.kelas : "") + " · " + angka(r.poin) + " poin"));
        li.append(info);
        if (!r.dibatalkan && b.sumber !== "saldo_awal") {
          const x = el("button", "tg-btn bahaya", "Batalkan"); x.type = "button";
          x.addEventListener("click", () => batalkanAnggota(b, r, x));
          li.append(x);
        }
        ul.append(li);
      });
      ul.hidden = false; tombol.textContent = "Tutup isi";
    } catch (err) { pesan(err.message, true); }
    finally { tombol.disabled = false; }
  }

  async function batalkanBatch(b, tombol) {
    if (!window.confirm("Batalkan " + b.kode + "?\n\n" + b.jumlah_aktif + " anggota kehilangan " + (b.poin_per_anggota ? angka(b.poin_per_anggota) + " poin" : "poin dari input ini") + ". Catatan tetap tersimpan sebagai dibatalkan.")) return;
    tombol.disabled = true;
    try {
      await panggil("admin_poin_batal_batch", { p_kode: b.kode, p_alasan: null });
      pesan(b.kode + " dibatalkan.");
      await muatRiwayat();
    } catch (err) { pesan(err.message, true); tombol.disabled = false; }
  }

  async function batalkanAnggota(b, r, tombol) {
    if (!window.confirm("Batalkan " + angka(r.poin) + " poin untuk " + r.nama + " di " + b.kode + "?")) return;
    tombol.disabled = true;
    try {
      await panggil("admin_poin_batal_anggota", { p_kode: b.kode, p_id_siswa: r.id, p_alasan: null });
      pesan("Poin " + r.nama + " di " + b.kode + " dibatalkan.");
      await muatRiwayat();
    } catch (err) { pesan(err.message, true); tombol.disabled = false; }
  }

  // ---------- Anggota ----------
  async function muatAnggota() {
    anggota = await ambil("poin_anggota?select=id_siswa,nama,kelas,aktif&order=nama.asc&limit=1000");
    dipilih = new Set([...dipilih].filter((id) => anggota.some((a) => a.id_siswa === id && a.aktif)));
    isiFilterKelas();
    gambarDaftar();
    ringkasan();
  }

  async function gambarAnggota() {
    const ul = $("ap-anggota");
    let total = new Map();
    try {
      const baris = await panggil("poin_peringkat");
      total = new Map((Array.isArray(baris) ? baris : []).map((r) => [r.id, r.total]));
    } catch (err) { /* total hanya tambahan; daftar tetap tampil */ }
    const kata = $("ap-cari-anggota").value.trim().toLocaleLowerCase("id-ID");
    ul.textContent = "";
    const tampil = anggota.filter((a) => !kata || a.nama.toLocaleLowerCase("id-ID").includes(kata) || a.id_siswa.toLocaleLowerCase("id-ID").includes(kata)).sort(urutKelasLaluNama);
    if (!tampil.length) { ul.append(el("li", "tg-meta", "Tidak ada anggota yang cocok.")); return; }
    tampil.forEach((a) => {
      const li = el("li");
      const info = el("div", "tg-info");
      info.append(el("strong", "", a.nama), el("small", "", a.id_siswa + (a.kelas ? " · " + a.kelas : "") + (total.has(a.id_siswa) ? " · " + angka(total.get(a.id_siswa)) + " poin" : "")));
      if (!a.aktif) info.append(el("span", "tg-label ditolak", "Nonaktif"));
      const ubah = el("button", "tg-btn", "Ubah"); ubah.type = "button";
      ubah.addEventListener("click", () => bukaAnggota(a));
      li.append(info, ubah);
      ul.append(li);
    });
  }

  function idBerikutnya() {
    let maks = 0;
    anggota.forEach((a) => { const m = /^S(\d+)$/i.exec(a.id_siswa); if (m) maks = Math.max(maks, Number(m[1])); });
    return "S" + String(maks + 1).padStart(3, "0");
  }

  function bukaAnggota(a) {
    anggotaTerbuka = a ? a.id_siswa : null;
    $("ap-dlg-anggota-judul").textContent = a ? "Ubah anggota" : "Anggota baru";
    $("aa-id").value = a ? a.id_siswa : idBerikutnya();
    $("aa-id").readOnly = Boolean(a);
    $("aa-nama").value = a ? a.nama : "";
    $("aa-kelas").value = a ? a.kelas : "";
    $("aa-aktif").checked = a ? a.aktif : true;
    $("aa-galat").hidden = true;
    $("ap-dlg-anggota").showModal();
    $(a ? "aa-nama" : "aa-id").focus();
  }

  async function simpanAnggota(e) {
    e.preventDefault();
    if (sedangSimpan) return;
    const galat = $("aa-galat");
    const id = $("aa-id").value.trim(), nama = $("aa-nama").value.trim(), kelas = $("aa-kelas").value.trim();
    const salah = !POLA_ID.test(id) ? "ID hanya huruf, angka, - dan _ (maksimal 20)."
      : !nama ? "Nama wajib diisi."
      : anggotaTerbuka === null && anggota.some((a) => a.id_siswa.toLowerCase() === id.toLowerCase()) ? "ID ini sudah dipakai."
      : "";
    if (salah) { galat.textContent = salah; galat.hidden = false; return; }
    sedangSimpan = true; $("aa-simpan").disabled = true;
    try {
      await panggil("admin_poin_anggota_simpan", { p_id: id, p_nama: nama, p_kelas: kelas, p_aktif: $("aa-aktif").checked });
      $("ap-dlg-anggota").close();
      await muatAnggota();
      await gambarAnggota();
      pesan("Anggota " + nama + " tersimpan.");
    } catch (err) { galat.textContent = err.message; galat.hidden = false; }
    finally { sedangSimpan = false; $("aa-simpan").disabled = false; }
  }

  // ---------- Mulai ----------
  function pasangEvent() {
    document.querySelectorAll(".tg-tab").forEach((b) => b.addEventListener("click", () => pilihTab(b.dataset.t)));

    $("ap-form").addEventListener("submit", simpanPoin);
    $("ap-tanggal").addEventListener("input", ringkasan);
    $("ap-poin").addEventListener("input", ringkasan);
    $("ap-ket").addEventListener("input", ringkasan);
    $("ap-cari").addEventListener("input", gambarDaftar);
    $("ap-kelas").addEventListener("change", gambarDaftar);
    $("ap-urut").addEventListener("change", gambarDaftar);
    $("ap-semua").addEventListener("click", () => { anggotaTampil().forEach((a) => dipilih.add(a.id_siswa)); gambarDaftar(); ringkasan(); });
    $("ap-kosong").addEventListener("click", () => { dipilih = new Set(); gambarDaftar(); ringkasan(); });
    $("ap-daftar").addEventListener("change", (e) => {
      const cek = e.target.closest("input[type=checkbox]");
      if (!cek) return;
      if (cek.checked) dipilih.add(cek.value); else dipilih.delete(cek.value);
      ringkasan();
    });

    $("ap-muat-riwayat").addEventListener("click", () => muatRiwayat().catch((e) => pesan(e.message, true)));

    $("ap-anggota-baru").addEventListener("click", () => bukaAnggota(null));
    $("ap-cari-anggota").addEventListener("input", () => gambarAnggota());
    $("ap-form-anggota").addEventListener("submit", simpanAnggota);
    $("aa-batal").addEventListener("click", () => $("ap-dlg-anggota").close());

    $("ap-sem-baru").addEventListener("click", bukaSemesterBaru);
    $("ap-form-sem").addEventListener("submit", simpanSemesterBaru);
    $("as-batal").addEventListener("click", () => $("ap-dlg-sem").close());
    $("as-nama").addEventListener("input", () => { namaSemesterDiketik = true; });
    $("as-mulai").addEventListener("change", () => { if (!namaSemesterDiketik) $("as-nama").value = namaSemesterDari($("as-mulai").value); });
  }

  async function mulai() {
    const a = akun();
    if (!a || !a.tersedia) { tamu("Fitur akun belum aktif", "Hubungi pengelola.", null); return; }
    try { await a.siap; } catch (e) { /* lanjut sebagai tamu */ }
    if (!a.pengguna()) { tamu("Masuk dulu", "Halaman ini khusus pengelola.", ["Masuk", "login.html?next=admin-poin"]); return; }
    try {
      const r = await a.minta("/rest/v1/profil?select=admin&limit=1");
      const p = r.ok && Array.isArray(r.data) ? r.data[0] : null;
      if (!p) { pesan("Akunmu belum bisa diperiksa. Muat ulang halaman ini.", true); return; }
      if (p.admin !== true) { tamu("Khusus pengelola", "Akunmu tidak punya akses ke halaman ini.", ["Kembali", "peringkat.html"]); return; }
    } catch (e) { pesan((e && e.message) || "Akunmu belum bisa diperiksa.", true); return; }

    pesan("");
    $("tg-isi").hidden = false;
    $("ap-tanggal").value = hariIni();
    pasangEvent();
    try {
      await muatSemester();
      await muatAnggota();
    } catch (e) {
      pesan((e && e.message) || "Data belum bisa dimuat. Pastikan supabase/poin.sql sudah dijalankan.", true);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mulai);
  else mulai();
})();
