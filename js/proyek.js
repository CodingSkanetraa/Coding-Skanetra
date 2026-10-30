// Proyek di editor (Web, Python, C++): daftar file buatan pengguna yang tersimpan di akun.
//
//   * Hanya untuk akun yang sudah masuk. Tanpa login, editor bekerja seperti biasa (tombol Simpan di browser).
//   * Saat editor dibuka, muncul daftar "Proyek saya": buat baru, buka, ganti nama, hapus.
//   * Perubahan disimpan otomatis beberapa detik setelah berhenti mengetik.
//   * Bila ada perubahan yang belum tersimpan dan halaman akan ditutup, browser memberi peringatan.
//
// Dipasang oleh js/editor-alat.js lewat CodingSkanetraProyek.pasang(adapter). Data ada di tabel
// "proyek" (supabase/skema.sql) dan dilindungi RLS: tiap akun hanya bisa mengakses proyeknya sendiri.
(() => {
  "use strict";

  const BATAS_ISI = 100000;      // karakter JSON; batas di database 100 KB
  const BATAS_KEEPALIVE = 60000; // fetch keepalive dibatasi sekitar 64 KB
  const JEDA_SIMPAN = 2000;      // ms setelah berhenti mengetik
  const CEK_TIAP = 800;          // ms
  const ULANG_JARINGAN = 5000;   // ms sebelum mencoba menyimpan lagi
  const ULANG_SESI = 30000;
  const POLA_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const NAMA_JENIS = { web: "Editor Web", py: "Editor Python", cpp: "Editor C++" };
  const KUNCI_TUTUP_HINT = "cs-proyek-hint-tutup";

  const el = (tag, kelas, teks) => {
    const e = document.createElement(tag);
    if (kelas) e.className = kelas;
    if (teks !== undefined) e.textContent = teks;
    return e;
  };
  const tombol = (kelas, teks) => {
    const b = el("button", kelas, teks);
    b.type = "button";
    return b;
  };
  const baca = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const tulis = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* abaikan */ } };

  function waktu(iso) {
    try {
      return new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch (e) { return ""; }
  }

  function jam() {
    try { return new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; }
  }

  // Mengubah balasan Supabase yang gagal menjadi pesan untuk pengguna.
  function pesanGalat(res) {
    const d = res && res.data && typeof res.data === "object" ? res.data : {};
    const teks = String(d.message || "");
    if (res.status === 401 || res.status === 403) return { sesi: true, teks: "Sesi berakhir. Masuk lagi (boleh di tab lain)." };
    if (teks.includes("Batas jumlah proyek")) return { teks: "Batas 40 proyek per akun tercapai. Hapus proyek yang tidak dipakai." };
    if (d.code === "23514") return { teks: "Kode terlalu besar (maksimal sekitar 100 KB) atau nama tidak valid." };
    if (res.status >= 500) return { teks: "Server sedang bermasalah. Coba lagi sebentar lagi." };
    return { teks: "Proyek belum bisa disimpan. Coba lagi." };
  }

  function pasang(adapter) {
    const akun = window.CodingSkanetraAkun;
    if (!akun || !akun.tersedia || !adapter || !adapter.tombolSimpan || !adapter.jenis) return;
    mulai(adapter, akun).catch(() => { /* proyek tidak boleh mengganggu editor */ });
  }

  async function mulai(adapter, akun) {
    await akun.siap;
    const target = document.querySelector(".py-editor-layout, .playground-workspace");
    if (!target) return;

    const pengguna = akun.pengguna();
    const halaman = (location.pathname.split("/").pop() || "").replace(/\.html$/, "");
    const bar = el("div", "proyek-bar");
    target.insertAdjacentElement("beforebegin", bar);

    if (!pengguna) { barTamu(bar, halaman); return; }

    const jenis = adapter.jenis;
    const ambilIsi = adapter.ambilProyek || adapter.ambil;
    const terapkanIsi = adapter.terapkanProyek || adapter.terapkan;
    const simpanKunci = "cs-proyek-impor:" + jenis + ":" + pengguna.id;

    const minta = (path, opsi) => akun.minta("/rest/v1/" + path, opsi);

    // ---------- Keadaan ----------
    let proyek = null;           // { id, nama } proyek yang sedang terbuka
    let tersimpan = null;        // isi (JSON teks) terakhir yang sudah di server
    let terlihat = null;         // isi terakhir yang dilihat pemeriksa
    let waktuUbah = 0;
    let sedangSimpan = null;
    let tundaSampai = 0;
    let status = { jenis: "diam", teks: "" };
    let dialog = null;

    const isiSekarang = () => { try { return JSON.stringify(ambilIsi()); } catch (e) { return null; } };
    const kotor = () => Boolean(proyek) && isiSekarang() !== tersimpan;
    const beritahu = (pesan) => { try { adapter.beritahu(pesan); } catch (e) { /* abaikan */ } };

    // ---------- Bar ----------
    const label = el("span", "proyek-label", "Proyek:");
    const nama = tombol("proyek-nama", "");
    nama.title = "Klik untuk mengganti nama proyek";
    const info = el("span", "proyek-info", "");
    const statusEl = el("span", "proyek-status");
    statusEl.setAttribute("role", "status");
    statusEl.setAttribute("aria-live", "polite");
    const daftarBtn = tombol("proyek-btn", "Proyek saya");
    const jadikanBtn = tombol("proyek-btn", "Simpan sebagai proyek");
    bar.append(label, nama, info, statusEl, jadikanBtn, daftarBtn);

    function gambarBar() {
      const aktif = Boolean(proyek);
      document.documentElement.classList.toggle("proyek-aktif", aktif);
      nama.hidden = !aktif;
      jadikanBtn.hidden = aktif;
      info.hidden = aktif;
      if (aktif) nama.textContent = proyek.nama;
      info.textContent = "belum ada proyek terbuka. Kodemu belum tersimpan di akun.";
      statusEl.textContent = status.teks;
      statusEl.dataset.jenis = status.jenis;
      adapter.tombolSimpan.classList.toggle("proyek-kotor", aktif && (status.jenis === "kotor" || status.jenis === "galat"));
    }

    function setStatus(jenisStatus, teks) {
      status = { jenis: jenisStatus, teks: teks || "" };
      gambarBar();
    }

    // ---------- Simpan ----------
    function simpanSekarang(opsi) {
      opsi = opsi || {};
      if (!proyek) return Promise.resolve(true);
      if (sedangSimpan) return sedangSimpan.then(() => simpanSekarang(opsi));
      const s = isiSekarang();
      if (s === null) return Promise.resolve(false);
      if (s === tersimpan) { if (status.jenis !== "ok") setStatus("ok", "Tersimpan"); return Promise.resolve(true); }
      if (s.length > BATAS_ISI) {
        setStatus("galat", "Kode terlalu besar (maks. sekitar 100 KB)");
        tundaSampai = Date.now() + ULANG_JARINGAN;
        return Promise.resolve(false);
      }
      const id = proyek.id;
      setStatus("menyimpan", "Menyimpan…");
      sedangSimpan = (async () => {
        try {
          const res = await minta("proyek?id=eq." + id + "&select=id", {
            metode: "PATCH", body: { isi: JSON.parse(s) }, keepalive: Boolean(opsi.keepalive) && s.length < BATAS_KEEPALIVE,
            header: { Prefer: "return=representation" }
          });
          if (!res.ok) {
            const g = pesanGalat(res);
            tundaSampai = Date.now() + (g.sesi ? ULANG_SESI : ULANG_JARINGAN);
            setStatus("galat", g.teks);
            return false;
          }
          if (!Array.isArray(res.data) || !res.data.length) {
            // Proyek sudah dihapus dari perangkat lain.
            if (proyek && proyek.id === id) { proyek = null; tersimpan = null; }
            setStatus("galat", "Proyek ini sudah dihapus di perangkat lain.");
            return false;
          }
          if (proyek && proyek.id === id) tersimpan = s;
          setStatus(kotor() ? "kotor" : "ok", kotor() ? "Belum tersimpan" : "Tersimpan " + jam());
          return true;
        } catch (e) {
          tundaSampai = Date.now() + ULANG_JARINGAN;
          setStatus("galat", "Belum tersimpan. Periksa internet, mencoba lagi…");
          return false;
        } finally {
          sedangSimpan = null;
        }
      })();
      return sedangSimpan;
    }

    // Pemeriksa: mendeteksi perubahan (semua editor, termasuk pindah mode Python) lalu menyimpan otomatis.
    setInterval(() => {
      if (!proyek) return;
      const s = isiSekarang();
      if (s === null) return;
      if (s !== terlihat) { terlihat = s; waktuUbah = Date.now(); }
      if (s === tersimpan) {
        if (status.jenis === "kotor") setStatus("ok", "Tersimpan " + jam());
        return;
      }
      if (!sedangSimpan && status.jenis !== "galat" && status.jenis !== "kotor") setStatus("kotor", "Belum tersimpan");
      adapter.tombolSimpan.classList.toggle("proyek-kotor", true);
      const sepi = Date.now() - waktuUbah >= JEDA_SIMPAN;
      if (sepi && !sedangSimpan && Date.now() >= tundaSampai) simpanSekarang();
    }, CEK_TIAP);

    // Peringatan bila halaman ditutup padahal masih ada yang belum tersimpan.
    window.addEventListener("beforeunload", (e) => {
      if (proyek && (sedangSimpan || kotor())) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
      return undefined;
    });
    // Usaha terakhir: kirim saat tab disembunyikan atau ditutup (HP sering menutup tab tanpa peringatan).
    const kirimTerakhir = () => { if (kotor() && !sedangSimpan) simpanSekarang({ keepalive: true }); };
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") kirimTerakhir(); });
    window.addEventListener("pagehide", kirimTerakhir);

    // Tombol Simpan dan Ctrl + S menyimpan proyek, bukan salinan di browser, selama proyek terbuka.
    document.addEventListener("click", (e) => {
      if (!proyek || !e.target.closest) return;
      if (e.target.closest("button") !== adapter.tombolSimpan) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      simpanSekarang().then((ok) => { if (ok) { beritahu("Proyek \"" + (proyek ? proyek.nama : "") + "\" tersimpan."); kilatSimpan(); } });
    }, true);
    document.addEventListener("keydown", (e) => {
      if (!proyek || !(e.ctrlKey || e.metaKey) || String(e.key).toLowerCase() !== "s") return;
      e.preventDefault();
      e.stopPropagation();
      simpanSekarang().then((ok) => { if (ok) { beritahu("Proyek tersimpan."); kilatSimpan(); } });
    }, true);

    function kilatSimpan() {
      const b = adapter.tombolSimpan;
      b.classList.add("is-saved");
      setTimeout(() => b.classList.remove("is-saved"), 1200);
    }

    // ---------- Operasi proyek ----------
    async function daftarProyek() {
      const res = await minta("proyek?select=id,nama,diubah&jenis=eq." + jenis + "&order=diubah.desc");
      if (!res.ok || !Array.isArray(res.data)) throw new Error(pesanGalat(res).teks);
      return res.data;
    }

    async function buatProyek(namaBaru, isi) {
      const teks = JSON.stringify(isi);
      if (teks.length > BATAS_ISI) throw new Error("Kode terlalu besar untuk disimpan sebagai proyek (maks. sekitar 100 KB).");
      const res = await minta("proyek?select=id,nama,diubah", {
        metode: "POST", body: { jenis, nama: namaBaru, isi }, header: { Prefer: "return=representation" }
      });
      if (!res.ok || !Array.isArray(res.data) || !res.data[0]) throw new Error(pesanGalat(res).teks);
      return res.data[0];
    }

    async function bukaProyek(id) {
      if (!POLA_ID.test(id)) throw new Error("Proyek tidak ditemukan.");
      const res = await minta("proyek?select=id,nama,isi&id=eq." + id);
      if (!res.ok) throw new Error(pesanGalat(res).teks);
      if (!Array.isArray(res.data) || !res.data[0]) throw new Error("Proyek tidak ditemukan. Mungkin sudah dihapus.");
      return res.data[0];
    }

    async function gantiNama(id, namaBaru) {
      if (!POLA_ID.test(id)) throw new Error("Proyek tidak ditemukan.");
      const res = await minta("proyek?id=eq." + id + "&select=id,nama", {
        metode: "PATCH", body: { nama: namaBaru }, header: { Prefer: "return=representation" }
      });
      if (!res.ok) throw new Error(pesanGalat(res).teks);
      if (!Array.isArray(res.data) || !res.data[0]) throw new Error("Proyek tidak ditemukan. Mungkin sudah dihapus.");
      return res.data[0].nama;
    }

    async function hapusProyek(id) {
      if (!POLA_ID.test(id)) throw new Error("Proyek tidak ditemukan.");
      const res = await minta("proyek?id=eq." + id + "&select=id", { metode: "DELETE", header: { Prefer: "return=representation" } });
      if (!res.ok) throw new Error(pesanGalat(res).teks);
    }

    function aktifkan(baris) {
      proyek = { id: baris.id, nama: baris.nama };
      try { terapkanIsi(baris.isi); } catch (e) { /* isi tidak cocok: biarkan editor apa adanya */ }
      tersimpan = isiSekarang();
      terlihat = tersimpan;
      waktuUbah = Date.now();
      tundaSampai = 0;
      setStatus("ok", "Tersimpan");
      beritahu("Proyek \"" + baris.nama + "\" dibuka. Perubahan disimpan otomatis.");
    }

    // Sebelum membuka proyek lain: pastikan yang sekarang sudah tersimpan.
    async function amankanSebelumPindah() {
      if (!kotor() && !sedangSimpan) return true;
      const ok = await simpanSekarang();
      if (ok) return true;
      return window.confirm("Perubahan di proyek \"" + (proyek ? proyek.nama : "") + "\" belum tersimpan. Tetap pindah? Perubahan itu akan hilang.");
    }

    // ---------- Nama proyek di bar ----------
    nama.addEventListener("click", () => {
      if (!proyek) return;
      const awal = proyek.nama;
      const input = el("input", "proyek-input");
      input.type = "text"; input.maxLength = 60; input.value = awal;
      input.setAttribute("aria-label", "Nama proyek");
      nama.hidden = true;
      nama.insertAdjacentElement("afterend", input);
      input.focus(); input.select();
      let selesai = false;
      const tutup = async (simpan) => {
        if (selesai) return;
        selesai = true;
        const baru = input.value.trim();
        input.remove();
        nama.hidden = false;
        if (!simpan || !baru || baru === awal || !proyek) return;
        try {
          const hasil = await gantiNama(proyek.id, baru);
          proyek.nama = hasil;
          gambarBar();
        } catch (e) { setStatus("galat", e.message); }
      };
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); tutup(true); }
        else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); tutup(false); }
      });
      input.addEventListener("blur", () => tutup(true));
    });

    // ---------- Dialog "Proyek saya" ----------
    function bukaDialog(opsi) {
      opsi = opsi || {};
      if (dialog) dialog.remove();
      const dlg = el("dialog", "proyek-dialog");
      dialog = dlg;
      dlg.setAttribute("aria-labelledby", "proyek-judul");
      const judul = el("h2", "", "Proyek saya");
      judul.id = "proyek-judul";
      const sub = el("p", "proyek-sub", NAMA_JENIS[jenis] + ". Perubahan disimpan otomatis di akunmu.");
      const pesan = el("p", "proyek-pesan");
      pesan.setAttribute("role", "status");
      const barBaru = el("div", "proyek-baru");
      const inputBaru = el("input", "proyek-input");
      inputBaru.type = "text"; inputBaru.maxLength = 60; inputBaru.placeholder = "Nama proyek baru";
      inputBaru.setAttribute("aria-label", "Nama proyek baru");
      const buatBtn = tombol("proyek-btn proyek-btn-utama", opsi.dariKodeSekarang ? "Simpan sebagai proyek" : "+ Proyek baru");
      barBaru.append(inputBaru, buatBtn);
      const isiDaftar = el("ul", "proyek-daftar");
      const imporWadah = el("div", "proyek-impor");
      const bawah = el("div", "proyek-bawah");
      const tutupBtn = tombol("proyek-btn", proyek ? "Tutup" : "Lanjut tanpa proyek");
      bawah.append(tutupBtn);
      dlg.append(judul, sub, barBaru, pesan, isiDaftar, imporWadah, bawah);
      document.body.appendChild(dlg);

      const tampilPesan = (teks, galat) => { pesan.textContent = teks || ""; pesan.classList.toggle("galat", Boolean(galat)); };
      let sibuk = false;
      const jaga = async (fn) => {
        if (sibuk) return;
        sibuk = true;
        dlg.classList.add("sibuk");
        try { await fn(); } catch (e) { tampilPesan(e.message || "Terjadi kesalahan.", true); }
        sibuk = false;
        dlg.classList.remove("sibuk");
      };

      let daftar = [];

      function gambarDaftar() {
        isiDaftar.textContent = "";
        if (!daftar.length) {
          const kosong = el("li", "proyek-kosong", "Belum ada proyek. Buat yang pertama dengan kolom di atas.");
          isiDaftar.appendChild(kosong);
          return;
        }
        daftar.forEach((p) => isiDaftar.appendChild(barisProyek(p)));
      }

      function barisProyek(p) {
        const li = el("li", "proyek-baris" + (proyek && proyek.id === p.id ? " aktif" : ""));
        const buka = tombol("proyek-buka");
        const n = el("span", "proyek-baris-nama", p.nama);
        const t = el("span", "proyek-baris-waktu", (proyek && proyek.id === p.id ? "Sedang dibuka · " : "") + "diubah " + waktu(p.diubah));
        buka.append(n, t);
        buka.addEventListener("click", () => jaga(async () => {
          if (proyek && proyek.id === p.id) { dlg.close(); return; }
          if (!(await amankanSebelumPindah())) return;
          tampilPesan("Membuka…");
          const baris = await bukaProyek(p.id);
          aktifkan(baris);
          dlg.close();
        }));

        const ganti = tombol("proyek-kecil", "Ganti nama");
        const hapus = tombol("proyek-kecil proyek-hapus", "Hapus");
        ganti.addEventListener("click", () => {
          const input = el("input", "proyek-input");
          input.type = "text"; input.maxLength = 60; input.value = p.nama;
          input.setAttribute("aria-label", "Nama baru untuk " + p.nama);
          li.textContent = "";
          const simpan = tombol("proyek-kecil proyek-btn-utama", "Simpan");
          const batal = tombol("proyek-kecil", "Batal");
          li.classList.add("mengedit");
          li.append(input, simpan, batal);
          input.focus(); input.select();
          const kirim = () => jaga(async () => {
            const baru = input.value.trim();
            if (!baru) { tampilPesan("Nama tidak boleh kosong.", true); return; }
            p.nama = await gantiNama(p.id, baru);
            if (proyek && proyek.id === p.id) { proyek.nama = p.nama; gambarBar(); }
            tampilPesan("");
            gambarDaftar();
          });
          simpan.addEventListener("click", kirim);
          batal.addEventListener("click", gambarDaftar);
          input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") { e.preventDefault(); kirim(); }
            else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); gambarDaftar(); }
          });
        });
        hapus.addEventListener("click", () => {
          // Dua langkah supaya tidak terhapus karena salah klik.
          ganti.hidden = true; hapus.hidden = true;
          const tanya = el("span", "proyek-tanya", "Hapus permanen?");
          const ya = tombol("proyek-kecil proyek-hapus", "Ya, hapus");
          const batal = tombol("proyek-kecil", "Batal");
          li.append(tanya, ya, batal);
          batal.addEventListener("click", () => { tanya.remove(); ya.remove(); batal.remove(); ganti.hidden = false; hapus.hidden = false; });
          ya.addEventListener("click", () => jaga(async () => {
            await hapusProyek(p.id);
            daftar = daftar.filter((x) => x.id !== p.id);
            if (proyek && proyek.id === p.id) {
              proyek = null; tersimpan = null;
              setStatus("diam", "");
              beritahu("Proyek dihapus. Kodemu masih ada di editor, tetapi tidak lagi tersimpan di akun.");
              tutupBtn.textContent = "Lanjut tanpa proyek";
            }
            tampilPesan("Proyek dihapus.");
            gambarDaftar();
          }));
        });
        li.append(buka, ganti, hapus);
        return li;
      }

      const namaDefault = () => {
        for (let i = daftar.length + 1; i < daftar.length + 50; i++) {
          const kandidat = "Proyek " + i;
          if (!daftar.some((p) => p.nama === kandidat)) return kandidat;
        }
        return "Proyek baru";
      };

      async function buat(isi, namaPilihan) {
        const baru = (namaPilihan || inputBaru.value).trim() || namaDefault();
        if (!(await amankanSebelumPindah())) return;
        tampilPesan("Membuat proyek…");
        const baris = await buatProyek(baru, isi);
        const lengkap = { id: baris.id, nama: baris.nama, isi };
        aktifkan(lengkap);
        dlg.close();
      }

      const isiAwal = () => {
        if (opsi.dariKodeSekarang) return JSON.parse(isiSekarang() || "{}");
        if (typeof adapter.awal === "function") { try { return adapter.awal(); } catch (e) { /* pakai kode sekarang */ } }
        return JSON.parse(isiSekarang() || "{}");
      };

      buatBtn.addEventListener("click", () => jaga(() => buat(isiAwal())));
      inputBaru.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); buatBtn.click(); } });
      tutupBtn.addEventListener("click", () => dlg.close());
      dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
      dlg.addEventListener("close", () => {
        dlg.remove();
        if (dialog === dlg) dialog = null;
        gambarBar();
      });

      // Impor kode yang dulu disimpan di browser ini (sebelum ada proyek), sekali saja.
      function siapkanImpor() {
        if (typeof adapter.imporLama !== "function" || baca(simpanKunci) === "1") return;
        let lama = null;
        try { lama = adapter.imporLama(); } catch (e) { lama = null; }
        if (!lama) return;
        const catatan = el("p", "proyek-sub", "Ada kode yang dulu kamu simpan di browser ini.");
        const impor = tombol("proyek-btn", "Jadikan proyek \"Kode lama\"");
        impor.addEventListener("click", () => jaga(async () => {
          await buat(lama, "Kode lama");
          tulis(simpanKunci, "1");
        }));
        const lewati = tombol("proyek-kecil", "Jangan tampilkan lagi");
        lewati.addEventListener("click", () => { tulis(simpanKunci, "1"); imporWadah.textContent = ""; });
        const aksi = el("div", "proyek-impor-aksi");
        aksi.append(impor, lewati);
        imporWadah.append(catatan, aksi);
      }

      if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
      tampilPesan("Memuat daftar proyek…");
      jaga(async () => {
        daftar = await daftarProyek();
        tampilPesan("");
        inputBaru.value = namaDefault();
        gambarDaftar();
        siapkanImpor();
        const pertama = isiDaftar.querySelector(".proyek-buka");
        if (!daftar.length || opsi.dariKodeSekarang) { inputBaru.focus(); inputBaru.select(); } else if (pertama) pertama.focus();
      });
      return dlg;
    }

    daftarBtn.addEventListener("click", () => bukaDialog());
    jadikanBtn.addEventListener("click", () => bukaDialog({ dariKodeSekarang: true }));

    gambarBar();
    // Tampil otomatis sebelum menulis, kecuali halaman dibuka dari tautan "Bagikan" (kode orang lain jangan tertimpa).
    if (!location.hash.startsWith("#bagikan=")) bukaDialog();

    // Sesi berakhir di tab lain: beri tahu, tetapi jangan membuang kode yang belum tersimpan.
    window.addEventListener("cs:akun", (e) => {
      if (e.detail && e.detail.pengguna) return;
      if (proyek) setStatus("galat", "Kamu sudah keluar. Perubahan baru tidak tersimpan di akun.");
    });
  }

  function barTamu(bar, halaman) {
    if (baca(KUNCI_TUTUP_HINT) === "1") { bar.remove(); return; }
    bar.classList.add("tamu");
    const aman = /^[a-z0-9-]{1,40}$/.test(halaman) ? halaman : "";
    const info = el("span", "proyek-info", "Punya akun? Masuk untuk menyimpan proyekmu di akun dan membukanya dari perangkat lain.");
    const masuk = el("a", "proyek-btn proyek-btn-utama", "Masuk");
    masuk.href = "login.html" + (aman ? "?next=" + aman : "");
    const tutup = tombol("proyek-btn", "Sembunyikan");
    tutup.addEventListener("click", () => { tulis(KUNCI_TUTUP_HINT, "1"); bar.remove(); });
    bar.append(info, masuk, tutup);
  }

  window.CodingSkanetraProyek = { pasang };
})();
