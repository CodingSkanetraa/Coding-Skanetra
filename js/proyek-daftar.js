// Halaman daftar proyek: pintu masuk ke Editor Web, Python, dan C++.
//
//   * Tiap editor punya daftar sendiri (?j=web | py | cpp), jadi proyek tidak tercampur.
//   * Daftar membaca tabel "proyek" (supabase/skema.sql) lewat akun login; RLS membatasi ke milik sendiri.
//   * Membuka proyek = ke halaman editor dengan ?p=<id>. Proyek baru = ?baru=<nama>; editor yang membuatnya
//     supaya isi awalnya sama dengan yang dipakai editor itu.
//   * Tanpa akun, editor tetap bisa dipakai lewat ?bebas=1 (kode hanya tersimpan di browser ini).
(() => {
  "use strict";

  const JENIS = {
    web: { nama: "Web", editor: "editor-html.html", ikon: "html", teks: "HTML" },
    py: { nama: "Python", editor: "editor-python.html", ikon: "python", teks: "Py" },
    cpp: { nama: "C++", editor: "editor-cpp.html", ikon: "cpp", teks: "C++" }
  };
  const BATAS_PROYEK = 40;
  const POLA_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const POLA_KODE = /^[0-9a-f]{12}$/;
  const KUNCI_TERAKHIR = "codingskanetra-terakhir";
  const KUNCI_NAMA = "cs-nama-bagikan";

  const $ = (id) => document.getElementById(id);
  const el = (tag, kelas, teks) => {
    const e = document.createElement(tag);
    if (kelas) e.className = kelas;
    if (teks !== undefined) e.textContent = teks;
    return e;
  };
  const tombol = (kelas, teks) => { const b = el("button", kelas, teks); b.type = "button"; return b; };
  const baca = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const tulis = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* abaikan */ } };

  const terakhir = (() => {
    try { const t = JSON.parse(baca(KUNCI_TERAKHIR) || "null"); return t && typeof t === "object" ? t : {}; } catch (e) { return {}; }
  })();

  const q = new URLSearchParams(location.search);
  const j = JENIS[q.get("j")] ? q.get("j") : (JENIS[terakhir.jenis] ? terakhir.jenis : "web");
  const info = JENIS[j];

  const IKON_TITIK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="19" r="2" fill="currentColor"/></svg>';

  const tgl = (iso) => {
    try { return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return ""; }
  };
  const jam = (iso) => {
    try { return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; }
  };
  const hariKunci = (iso) => { const d = new Date(iso); return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate(); };

  // ---------- Header, pilihan editor ----------
  document.title = "Proyek " + info.nama + " | CodingSkanetra";
  $("pd-judul").textContent = "Proyek " + info.nama;
  document.querySelectorAll(".pd-jenis a").forEach((a) => {
    if (a.dataset.j === j) a.setAttribute("aria-current", "page");
  });

  const pasangIkon = () => {
    const i = window.CodingSkanetraIkon;
    if (i) $("pd-setting").innerHTML = i.svg("pengaturan", 22);
  };

  // ---------- Keadaan ----------
  let akun = null;
  let pengguna = null;
  let daftar = [];

  const pesan = (teks, galat) => { const p = $("pd-pesan"); p.textContent = teks || ""; p.classList.toggle("galat", Boolean(galat)); };
  const minta = (path, opsi) => akun.minta("/rest/v1/" + path, opsi);

  function pesanGalat(res) {
    const d = res && res.data && typeof res.data === "object" ? res.data : {};
    const teks = String(d.message || "");
    if (res && (res.status === 401 || res.status === 403)) return "Sesi berakhir. Masuk lagi.";
    if (teks.includes("Batas jumlah proyek")) return "Batas " + BATAS_PROYEK + " proyek per akun tercapai. Hapus proyek yang tidak dipakai.";
    if (teks.includes("Batas 20")) return "Batas 20 tautan aktif tercapai. Hapus tautan lama di halaman Profil.";
    if (res && res.status >= 500) return "Server sedang bermasalah. Coba lagi sebentar lagi.";
    return "Belum berhasil. Periksa internet lalu coba lagi.";
  }

  // ---------- Tampilan daftar ----------
  function urutkan(baris) {
    const kunci = $("pd-urut").value;
    const salin = baris.slice();
    if (kunci === "nama") salin.sort((a, b) => a.nama.localeCompare(b.nama, "id", { sensitivity: "base", numeric: true }));
    else salin.sort((a, b) => new Date(b[kunci]) - new Date(a[kunci]));
    return salin;
  }

  function tile() {
    const t = el("span", "pd-tile", info.teks);
    t.setAttribute("aria-hidden", "true");
    const img = new Image();
    img.alt = "";
    img.decoding = "async";
    img.onload = () => t.replaceChildren(img);
    img.src = "../assets/icon/" + info.ikon + ".png";
    return t;
  }

  function barisProyek(p) {
    const li = el("li", "pd-item" + (terakhir.id === p.id ? " terakhir" : ""));
    const buka = el("a", "pd-buka");
    buka.href = info.editor + "?p=" + encodeURIComponent(p.id);
    const teks = el("span", "pd-teks");
    teks.append(el("strong", "", p.nama), el("small", "", "Diubah " + tgl(p.diubah) + ", " + jam(p.diubah)));
    if (terakhir.id === p.id) teks.append(el("span", "pd-label", "Terakhir dibuka"));
    buka.append(tile(), teks);
    const titik = tombol("pd-titik");
    titik.innerHTML = IKON_TITIK;
    titik.setAttribute("aria-haspopup", "menu");
    titik.setAttribute("aria-expanded", "false");
    titik.setAttribute("aria-label", "Menu proyek " + p.nama);
    titik.addEventListener("click", (e) => { e.stopPropagation(); bukaMenu(titik, p); });
    li.append(buka, titik);
    return li;
  }

  function gambar() {
    const wadah = $("pd-isi");
    wadah.textContent = "";
    const kata = $("pd-cari").value.trim().toLowerCase();
    const tampil = urutkan(daftar.filter((p) => !kata || p.nama.toLowerCase().includes(kata)));
    $("pd-alat").hidden = daftar.length === 0;
    if (!daftar.length) {
      wadah.append(el("p", "pd-kosong", "Belum ada proyek " + info.nama + ". Tekan tombol + untuk membuat yang pertama."));
      return;
    }
    if (!tampil.length) { wadah.append(el("p", "pd-kosong", "Tidak ada proyek bernama \"" + $("pd-cari").value.trim() + "\".")); return; }

    const kelompokTanggal = $("pd-urut").value !== "nama";
    const grup = [];
    tampil.forEach((p) => {
      const kunci = kelompokTanggal ? hariKunci(p[$("pd-urut").value]) : "semua";
      let g = grup[grup.length - 1];
      if (!g || g.kunci !== kunci) {
        g = { kunci, judul: kelompokTanggal ? tgl(p[$("pd-urut").value]) : "", baris: [] };
        grup.push(g);
      }
      g.baris.push(p);
    });
    grup.forEach((g) => {
      const bagian = el("section", "pd-grup");
      if (g.judul) bagian.append(el("h2", "", g.judul));
      const ul = el("ul", "pd-daftar");
      g.baris.forEach((p) => ul.append(barisProyek(p)));
      bagian.append(ul);
      wadah.append(bagian);
    });
  }

  async function muat() {
    pesan("Memuat proyek…");
    const res = await minta("proyek?select=id,nama,dibuat,diubah&jenis=eq." + j + "&order=diubah.desc");
    if (!res.ok || !Array.isArray(res.data)) { pesan(pesanGalat(res), true); return false; }
    daftar = res.data.filter((p) => p && POLA_ID.test(String(p.id)));
    pesan("");
    gambar();
    return true;
  }

  // ---------- Menu titik tiga ----------
  const menu = $("pd-menu");
  let pemicu = null;
  function tutupMenu() {
    if (menu.hidden) return;
    menu.hidden = true;
    if (pemicu) { pemicu.setAttribute("aria-expanded", "false"); pemicu = null; }
  }
  function bukaMenu(btn, p) {
    if (!menu.hidden && pemicu === btn) { tutupMenu(); return; }
    tutupMenu();
    menu.textContent = "";
    const butir = [
      ["Ubah nama", () => dialogNama(p)],
      ["Duplikat", () => duplikat(p)],
      ["Bagikan link", () => dialogBagikan(p)],
      ["Hapus", () => dialogHapus(p), "bahaya"]
    ];
    butir.forEach(([teks, aksi, kelas]) => {
      const b = tombol(kelas || "", teks);
      b.setAttribute("role", "menuitem");
      b.addEventListener("click", () => { tutupMenu(); aksi(); });
      menu.append(b);
    });
    menu.hidden = false;
    pemicu = btn;
    btn.setAttribute("aria-expanded", "true");
    const r = btn.getBoundingClientRect();
    const lebar = menu.offsetWidth, tinggi = menu.offsetHeight;
    const kiri = Math.min(Math.max(8, r.right - lebar), window.innerWidth - lebar - 8);
    let atas = r.bottom + 4;
    if (atas + tinggi > window.innerHeight - 8) atas = Math.max(8, r.top - tinggi - 4);
    menu.style.left = kiri + "px";
    menu.style.top = atas + "px";
    menu.querySelector("button").focus();
  }
  document.addEventListener("click", (e) => { if (!menu.hidden && !menu.contains(e.target)) tutupMenu(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") tutupMenu(); });
  window.addEventListener("scroll", tutupMenu, { passive: true });
  window.addEventListener("resize", tutupMenu);

  // ---------- Dialog ----------
  const dlg = $("pd-dialog");
  function bukaDialog(judul, isi) {
    dlg.textContent = "";
    const h = el("h2", "", judul);
    h.id = "pd-dialog-judul";
    dlg.append(h, ...isi);
    if (!dlg.open) { if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", ""); }
  }
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });

  const galatDialog = () => {
    const p = el("p", "pd-galat");
    p.setAttribute("role", "alert");
    return p;
  };

  function dialogNama(p) {
    const label = el("label", "", "Nama proyek");
    label.htmlFor = "pd-nama";
    const input = el("input");
    input.id = "pd-nama"; input.type = "text"; input.maxLength = 60; input.value = p.nama;
    const galat = galatDialog();
    const simpan = tombol("pd-btn utama", "Simpan");
    const batal = tombol("pd-btn", "Batal");
    const aksi = el("div", "pd-aksi");
    aksi.append(simpan, batal);
    const kirim = async () => {
      const baru = input.value.trim();
      if (!baru) { galat.textContent = "Nama tidak boleh kosong."; input.focus(); return; }
      if (baru === p.nama) { dlg.close(); return; }
      simpan.disabled = true;
      galat.textContent = "";
      try {
        const res = await minta("proyek?id=eq." + p.id + "&select=id,nama", { metode: "PATCH", body: { nama: baru }, header: { Prefer: "return=representation" } });
        if (!res.ok) throw new Error(pesanGalat(res));
        if (!Array.isArray(res.data) || !res.data[0]) throw new Error("Proyek tidak ditemukan. Mungkin sudah dihapus.");
        p.nama = res.data[0].nama;
        if (terakhir.id === p.id) { terakhir.nama = p.nama; tulis(KUNCI_TERAKHIR, JSON.stringify(terakhir)); }
        dlg.close();
        gambar();
      } catch (e) { galat.textContent = e.message || "Belum berhasil."; simpan.disabled = false; }
    };
    simpan.addEventListener("click", kirim);
    batal.addEventListener("click", () => dlg.close());
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); kirim(); } });
    bukaDialog("Ubah nama", [label, input, galat, aksi]);
    input.focus(); input.select();
  }

  function dialogHapus(p) {
    const teks = el("p", "", "Proyek \"" + p.nama + "\" akan dihapus permanen dan tidak bisa dikembalikan. Tautan berbagi yang sudah dibuat dari proyek ini tetap berlaku sampai kedaluwarsa.");
    const galat = galatDialog();
    const ya = tombol("pd-btn bahaya", "Ya, hapus");
    const batal = tombol("pd-btn", "Batal");
    const aksi = el("div", "pd-aksi");
    aksi.append(ya, batal);
    ya.addEventListener("click", async () => {
      ya.disabled = true;
      try {
        const res = await minta("proyek?id=eq." + p.id + "&select=id", { metode: "DELETE", header: { Prefer: "return=representation" } });
        if (!res.ok) throw new Error(pesanGalat(res));
        daftar = daftar.filter((x) => x.id !== p.id);
        if (terakhir.id === p.id) { try { localStorage.removeItem(KUNCI_TERAKHIR); } catch (e) { /* abaikan */ } delete terakhir.id; delete terakhir.nama; }
        dlg.close();
        gambar();
        pesan("Proyek dihapus.");
      } catch (e) { galat.textContent = e.message || "Belum berhasil."; ya.disabled = false; }
    });
    batal.addEventListener("click", () => dlg.close());
    bukaDialog("Hapus proyek?", [teks, galat, aksi]);
    batal.focus();
  }

  async function ambilIsi(id) {
    const res = await minta("proyek?select=nama,isi&id=eq." + id);
    if (!res.ok) throw new Error(pesanGalat(res));
    if (!Array.isArray(res.data) || !res.data[0]) throw new Error("Proyek tidak ditemukan. Mungkin sudah dihapus.");
    return res.data[0];
  }

  async function duplikat(p) {
    if (daftar.length >= BATAS_PROYEK) { pesan("Batas " + BATAS_PROYEK + " proyek per akun tercapai. Hapus proyek yang tidak dipakai.", true); return; }
    pesan("Menduplikat…");
    try {
      const asal = await ambilIsi(p.id);
      const sufiks = " (salinan)";
      const nama = (asal.nama.length + sufiks.length > 60 ? asal.nama.slice(0, 60 - sufiks.length) : asal.nama) + sufiks;
      const res = await minta("proyek?select=id,nama,dibuat,diubah", { metode: "POST", body: { jenis: j, nama, isi: asal.isi }, header: { Prefer: "return=representation" } });
      if (!res.ok || !Array.isArray(res.data) || !res.data[0]) throw new Error(pesanGalat(res));
      daftar.unshift(res.data[0]);
      gambar();
      pesan("Proyek diduplikat sebagai \"" + res.data[0].nama + "\".");
    } catch (e) { pesan(e.message || "Belum berhasil menduplikat.", true); }
  }

  // Bentuk isi untuk tautan berbagi sama dengan yang dibuat tombol Bagikan di editor (ambil), bukan bentuk proyek.
  function isiBagikan(isi) {
    if (j === "py") {
      const mode = isi && isi.m === "visual" ? "visual" : "console";
      const kode = mode === "visual" ? isi && isi.v : isi && isi.c;
      return { m: mode, k: typeof kode === "string" ? kode : "" };
    }
    return isi;
  }

  function dialogBagikan(p) {
    const info1 = el("p", "", "Tautan pendek berlaku 7 hari, lalu kedaluwarsa otomatis. Isinya salinan proyek saat ini, bisa dibuka siapa pun yang punya tautannya.");
    const label = el("label", "", "Nama / kelas (boleh dikosongkan)");
    label.htmlFor = "pd-nama-bagikan";
    const nama = el("input");
    nama.id = "pd-nama-bagikan"; nama.type = "text"; nama.maxLength = 40; nama.value = baca(KUNCI_NAMA) || "";
    nama.placeholder = "Contoh: Kaito, XI RPL 1";
    const labelLink = el("label", "", "Tautan");
    labelLink.htmlFor = "pd-link";
    const link = el("textarea");
    link.id = "pd-link"; link.readOnly = true; link.rows = 3; link.hidden = true; labelLink.hidden = true;
    const galat = galatDialog();
    const buat = tombol("pd-btn utama", "Buat tautan");
    const salin = tombol("pd-btn", "Salin tautan");
    salin.hidden = true;
    const tutup = tombol("pd-btn", "Tutup");
    const aksi = el("div", "pd-aksi");
    aksi.append(buat, salin, tutup);

    buat.addEventListener("click", async () => {
      buat.disabled = true;
      galat.textContent = "";
      try {
        const asal = await ambilIsi(p.id);
        const n = nama.value.trim();
        tulis(KUNCI_NAMA, n);
        const res = await akun.minta("/rest/v1/rpc/buat_bagikan", { metode: "POST", body: { p_jenis: j, p_isi: isiBagikan(asal.isi), p_nama: n || null } });
        if (!res.ok) throw new Error(pesanGalat(res));
        const baris = Array.isArray(res.data) ? res.data[0] : res.data;
        if (!baris || !POLA_KODE.test(String(baris.kode))) throw new Error("Tautan belum bisa dibuat. Coba lagi.");
        const dasar = new URL(info.editor, location.href);
        link.value = dasar.origin + dasar.pathname + "#b=" + baris.kode;
        link.hidden = false; labelLink.hidden = false; salin.hidden = false;
        nama.disabled = true;
        buat.hidden = true;
        galat.textContent = "";
        info1.textContent = "Tautan siap dikirim. Berlaku sampai " + tgl(baris.kedaluwarsa) + ", " + jam(baris.kedaluwarsa) + ". Bisa dihapus lebih awal di halaman Profil.";
        salin.focus();
      } catch (e) { galat.textContent = e.message || "Tautan belum bisa dibuat."; buat.disabled = false; }
    });
    salin.addEventListener("click", async () => {
      let ok = false;
      try { await navigator.clipboard.writeText(link.value); ok = true; } catch (e) {
        link.focus(); link.select();
        try { ok = document.execCommand("copy"); } catch (e2) { ok = false; }
      }
      salin.textContent = ok ? "Tersalin" : "Tekan Ctrl + C";
      setTimeout(() => { salin.textContent = "Salin tautan"; }, 2000);
    });
    link.addEventListener("focus", () => link.select());
    tutup.addEventListener("click", () => dlg.close());
    bukaDialog("Bagikan \"" + p.nama + "\"", [info1, label, nama, labelLink, link, galat, aksi]);
    nama.focus();
  }

  // ---------- Proyek baru ----------
  function namaDefault() {
    for (let i = daftar.length + 1; i < daftar.length + 60; i++) {
      const k = "Proyek " + i;
      if (!daftar.some((p) => p.nama === k)) return k;
    }
    return "Proyek baru";
  }

  function dialogBaru() {
    if (daftar.length >= BATAS_PROYEK) { pesan("Batas " + BATAS_PROYEK + " proyek per akun tercapai. Hapus proyek yang tidak dipakai.", true); return; }
    const label = el("label", "", "Nama proyek");
    label.htmlFor = "pd-nama-baru";
    const input = el("input");
    input.id = "pd-nama-baru"; input.type = "text"; input.maxLength = 60; input.value = namaDefault();
    const galat = galatDialog();
    const buat = tombol("pd-btn utama", "Buat dan buka");
    const batal = tombol("pd-btn", "Batal");
    const aksi = el("div", "pd-aksi");
    aksi.append(buat, batal);
    const kirim = () => {
      const nama = input.value.trim();
      if (!nama) { galat.textContent = "Nama tidak boleh kosong."; input.focus(); return; }
      location.href = info.editor + "?baru=" + encodeURIComponent(nama);
    };
    buat.addEventListener("click", kirim);
    batal.addEventListener("click", () => dlg.close());
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); kirim(); } });
    bukaDialog("Proyek " + info.nama + " baru", [label, input, galat, aksi]);
    input.focus(); input.select();
  }

  // ---------- Impor kode lama (yang dulu disimpan di browser ini) ----------
  function kodeLama() {
    const baru = (k) => { try { const o = JSON.parse(baca("codingskanetra-code:" + k) || "null"); return o && o.data !== undefined ? o.data : null; } catch (e) { return null; } };
    if (j === "web") {
      const d = baru("html-playground");
      return d && typeof d === "object" ? { h: String(d.html || ""), c: String(d.css || ""), s: String(d.js || "") } : null;
    }
    if (j === "cpp") { const d = baru("cpp"); return typeof d === "string" ? { k: d } : null; }
    const c = baru("python-console"), v = baru("python-visual");
    if (typeof c !== "string" && typeof v !== "string") return null;
    const isi = { m: "console" };
    if (typeof c === "string") isi.c = c;
    if (typeof v === "string") isi.v = v;
    return isi;
  }

  function tawarkanImpor() {
    const kunci = "cs-proyek-impor:" + j + ":" + pengguna.id;
    const wadah = $("pd-impor");
    wadah.hidden = true;
    if (baca(kunci) === "1") return;
    const lama = kodeLama();
    if (!lama) return;
    wadah.textContent = "";
    wadah.append(el("p", "", "Ada kode " + info.nama + " yang dulu kamu simpan di browser ini. Mau dijadikan proyek?"));
    const impor = tombol("pd-btn utama", "Jadikan proyek \"Kode lama\"");
    const lewati = tombol("pd-btn", "Jangan tampilkan lagi");
    const aksi = el("div", "pd-aksi");
    aksi.append(impor, lewati);
    wadah.append(aksi);
    wadah.hidden = false;
    impor.addEventListener("click", async () => {
      impor.disabled = true;
      try {
        const res = await minta("proyek?select=id,nama,dibuat,diubah", { metode: "POST", body: { jenis: j, nama: "Kode lama", isi: lama }, header: { Prefer: "return=representation" } });
        if (!res.ok || !Array.isArray(res.data) || !res.data[0]) throw new Error(pesanGalat(res));
        tulis(kunci, "1");
        wadah.hidden = true;
        daftar.unshift(res.data[0]);
        gambar();
        pesan("Kode lama dijadikan proyek \"Kode lama\".");
      } catch (e) { pesan(e.message || "Belum berhasil.", true); impor.disabled = false; }
    });
    lewati.addEventListener("click", () => { tulis(kunci, "1"); wadah.hidden = true; });
  }

  // ---------- Belum masuk ----------
  function tampilTamu(akunTersedia) {
    pesan("");
    const t = $("pd-tamu");
    t.textContent = "";
    if (akunTersedia) {
      t.append(el("strong", "", "Masuk untuk menyimpan proyekmu"));
      t.append(el("p", "", "Proyek disimpan di akunmu dan bisa dibuka dari perangkat mana saja."));
    } else {
      t.append(el("p", "", "Fitur akun belum aktif, jadi proyek belum bisa disimpan di akun."));
    }
    const aksi = el("div", "pd-aksi");
    if (akunTersedia) {
      const masuk = el("a", "pd-btn utama", "Masuk");
      masuk.href = "login.html?next=proyek-daftar";
      aksi.append(masuk);
    }
    const bebas = el("a", "pd-btn", "Coba editor tanpa akun");
    bebas.href = info.editor + "?bebas=1";
    aksi.append(bebas);
    t.append(aksi);
    t.hidden = false;
  }

  // ---------- Mulai ----------
  async function mulai() {
    pasangIkon();
    $("pd-urut").addEventListener("change", gambar);
    $("pd-cari").addEventListener("input", gambar);
    $("pd-baru").addEventListener("click", dialogBaru);

    akun = window.CodingSkanetraAkun;
    if (!akun || !akun.tersedia) { tampilTamu(false); return; }
    try { await akun.siap; } catch (e) { /* tetap lanjut sebagai tamu */ }
    pengguna = akun.pengguna();

    const profil = $("pd-profil");
    if (pengguna) {
      profil.href = "profil.html";
      profil.setAttribute("aria-label", "Profil, masuk sebagai @" + pengguna.username);
      if (window.CodingSkanetraAvatar) profil.append(window.CodingSkanetraAvatar.buat(pengguna.username));
      else profil.textContent = pengguna.username.charAt(0).toUpperCase();
    } else if (window.CodingSkanetraIkon) {
      profil.innerHTML = window.CodingSkanetraIkon.svg("akun", 22);
    }

    if (!pengguna) { tampilTamu(true); return; }
    $("pd-baru").hidden = false;
    try { if (await muat()) tawarkanImpor(); } catch (e) { pesan((e && e.message) || "Proyek belum bisa dimuat.", true); }

    // Sesi berakhir di tab lain
    window.addEventListener("cs:akun", (e) => {
      if (e.detail && e.detail.pengguna) return;
      location.reload();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mulai);
  else mulai();
})();
