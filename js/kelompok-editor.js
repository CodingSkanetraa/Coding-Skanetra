// Editor kelompok: satu website (HTML, CSS, JS) dikerjakan bersama, konsepnya sama dengan editor web.
//   * Semua anggota mengubah satu berkas yang sama. Hasil langsung tampil dan "Kode utuh" menampilkan satu berkas lengkap.
//   * Simpan otomatis sebentar setelah berhenti mengetik. Bila temanmu menyimpan lebih dulu, perubahan kalian
//     digabung otomatis per baris (js/kelompok-gabung.js); tidak ada dialog bentrok.
//   * Tiap beberapa detik editor menyelaraskan diri dengan server dan melaporkan posisi kursormu. Dari situ tampil
//     siapa yang sedang aktif, di tab mana, dan di baris berapa (nama berwarna di baris teman).
//   * Kesalahan satu anggota adalah urusan kelompok; versi lama selalu bisa dipulihkan lewat Riwayat.
(() => {
  "use strict";
  const K = window.CSKelompok;
  const G = window.CSGabung;
  const $ = (id) => document.getElementById(id);
  const { el, tombol, rpc, waktu } = K;

  const id = new URLSearchParams(location.search).get("id") || "";
  const MODE = { html: "htmlmixed", css: "css", js: "javascript" };
  const NAMA_TAB = { html: "HTML", css: "CSS", js: "JS" };
  const BAHASA = ["html", "css", "js"];
  const JEDA_SIMPAN = 1500;
  const JEDA_PRATINJAU = 600;
  const JEDA_SINKRON = 3000;
  const BATAS_BERKAS = 60000;
  const JUMLAH_WARNA = 10;
  const BATAS_CONSOLE = 200;

  let cm = null;
  let detail = null;
  let b = null;            // berkas bersama
  let anggota = [];        // anggota kelompok (dari tugas_detail)
  let saya = null;         // id akun yang sedang masuk
  let bahasa = "html";
  let tampilan = "hasil";
  let teman = [];          // anggota lain yang sedang aktif
  let penanda = [];        // penanda kursor teman di editor
  let timerPratinjau = null;
  let timerStatus = null;
  let rantai = Promise.resolve();
  let gulirPratinjau = 0;
  let sinkronMenunggu = false;
  let gagalBeruntun = 0;

  function pesan(teks, galat) {
    const p = $("tg-pesan");
    p.textContent = teks || "";
    p.classList.toggle("galat", Boolean(galat));
  }

  // Semua panggilan ke server (simpan, selaraskan, pulihkan) dijalankan satu per satu supaya urutannya pasti.
  const serial = (fn) => {
    const p = rantai.then(fn);
    rantai = p.catch(() => {});
    return p;
  };

  const norm = (t) => String(t == null ? "" : t).replace(/\r\n?/g, "\n");
  const nilai = () => ({ html: b.docs.html.getValue(), css: b.docs.css.getValue(), js: b.docs.js.getValue() });
  const beda = () => BAHASA.some((k) => b.docs[k].getValue() !== b.dasar[k]);
  const panjang = (v) => v.html.length + v.css.length + v.js.length;
  const warna = (userId) => { const i = anggota.findIndex((a) => a.user_id === userId); return (i < 0 ? 0 : i) % JUMLAH_WARNA; };
  const bagianPratinjau = () => [Object.assign({ nama: "Berkas", umum: true }, nilai())];

  // ---------- Berkas ----------

  function buatBerkas(r) {
    const berkas = {
      id: r.id, versi: r.versi, versiDasar: r.versi, boleh_edit: Boolean(r.boleh_edit),
      dasar: { html: norm(r.html), css: norm(r.css), js: norm(r.js) },
      docs: {}, kotor: false, muat: false, menyimpan: false, gagal: null, timer: null,
      diubah: r.diubah || null, diubahOleh: r.diubah_oleh || ""
    };
    BAHASA.forEach((k) => {
      berkas.docs[k] = new window.CodeMirror.Doc(berkas.dasar[k], MODE[k]);
      berkas.docs[k].on("change", () => {
        jadwalPratinjau();
        if (berkas.muat || !berkas.boleh_edit) return;
        berkas.kotor = beda();
        if (berkas.kotor) jadwalSimpan(); else clearTimeout(berkas.timer);
        tampilStatus();
      });
    });
    return berkas;
  }

  // Mengganti isi dokumen dengan teks baru tanpa menggeser kursor dan gulir: hanya bagian yang berbeda yang diubah.
  function terapkanTeks(doc, baru) {
    const lama = doc.getValue();
    if (lama === baru) return;
    let awal = 0;
    const maks = Math.min(lama.length, baru.length);
    while (awal < maks && lama.charCodeAt(awal) === baru.charCodeAt(awal)) awal++;
    let akhirLama = lama.length;
    let akhirBaru = baru.length;
    while (akhirLama > awal && akhirBaru > awal && lama.charCodeAt(akhirLama - 1) === baru.charCodeAt(akhirBaru - 1)) { akhirLama--; akhirBaru--; }
    doc.replaceRange(baru.slice(awal, akhirBaru), doc.posFromIndex(awal), doc.posFromIndex(akhirLama), "+kg-server");
  }

  // r: { versi, html, css, js, diubah, diubah_oleh }. Perubahanmu yang belum tersimpan digabung dengan versi server.
  // paksa = true: isi server menggantikan editor (dipakai setelah Pulihkan).
  function gabungkanServer(r, paksa) {
    let tumpang = false;
    b.muat = true;
    try {
      BAHASA.forEach((k) => {
        const baru = norm(r[k]);
        const milikku = b.docs[k].getValue();
        const g = (!paksa && b.boleh_edit && milikku !== b.dasar[k])
          ? G.gabung3(b.dasar[k], milikku, baru)
          : { teks: baru, tumpang: false };
        if (g.tumpang) tumpang = true;
        terapkanTeks(b.docs[k], g.teks);
        b.dasar[k] = baru;
      });
    } finally {
      b.muat = false;
    }
    b.versi = r.versi;
    b.versiDasar = r.versi;
    b.diubah = r.diubah || b.diubah;
    b.diubahOleh = r.diubah_oleh || b.diubahOleh;
    b.kotor = beda();
    if (b.kotor && b.boleh_edit) jadwalSimpan(); else clearTimeout(b.timer);
    if (tumpang) pesanSementara("Kamu dan temanmu mengubah baris yang sama. Punyamu dipakai; versi temanmu ada di Riwayat.", 8000);
    jadwalPratinjau(true);
    tampilStatus();
    gambarInfo();
  }

  async function ambilBerkas() {
    const daftar = await rpc("bagian_ambil", { p_penugasan: id });
    const r = (Array.isArray(daftar) ? daftar : []).find((x) => x.umum) || (Array.isArray(daftar) ? daftar[0] : null);
    if (!r) throw new Error("Berkas kelompok belum dibuat. Hubungi pengelola.");
    return r;
  }

  // ---------- Simpan ----------

  function jadwalSimpan() {
    clearTimeout(b.timer);
    b.timer = setTimeout(() => { serial(simpanSekarang).catch(() => {}); }, JEDA_SIMPAN);
  }

  // Dijalankan lewat serial(). Bila server menolak karena temanmu menyimpan lebih dulu, perubahan digabung lalu dicoba lagi.
  async function simpanSekarang() {
    clearTimeout(b.timer);
    if (!b.boleh_edit || !b.kotor) return true;
    for (let percobaan = 0; percobaan < 6; percobaan++) {
      clearTimeout(b.timer);
      const isi = nilai();
      if (panjang(isi) > BATAS_BERKAS) {
        b.gagal = "Berkas terlalu besar (maksimal 60.000 karakter).";
        tampilStatus();
        return false;
      }
      b.menyimpan = true;
      b.gagal = null;
      tampilStatus();
      try {
        const r = await rpc("bagian_simpan", { p_bagian: b.id, p_versi_dasar: b.versiDasar, p_html: isi.html, p_css: isi.css, p_js: isi.js });
        b.versi = r.versi;
        b.versiDasar = r.versi;
        b.dasar = isi;
        b.diubahOleh = namaSaya();
        b.diubah = r.diubah || b.diubah;
        b.kotor = beda();
        if (b.kotor) jadwalSimpan();
        b.menyimpan = false;
        tampilStatus();
        gambarInfo();
        return true;
      } catch (e) {
        b.menyimpan = false;
        if (e.bentrok) {
          try { gabungkanServer(await ambilBerkas()); }
          catch (e2) { b.gagal = e2.message; tampilStatus(); return false; }
          if (!b.kotor) return true;
          continue;
        }
        b.gagal = e.message;
        if (!e.status) b.timer = setTimeout(() => { serial(simpanSekarang).catch(() => {}); }, 15000); // jaringan: coba lagi
        tampilStatus();
        return false;
      }
    }
    b.gagal = "Banyak orang menyimpan bersamaan. Coba lagi sebentar.";
    tampilStatus();
    return false;
  }

  const simpanTombol = () => serial(simpanSekarang).catch(() => {});

  function namaSaya() {
    const a = anggota.find((x) => x.user_id === saya);
    return a ? K.nama(a) : "";
  }

  function tampilStatus() {
    const s = $("kg-simpan-status");
    let teks = b && !b.boleh_edit ? "Hanya baca" : "Tersimpan otomatis";
    let kelas = "";
    if (b && b.gagal) { teks = "Belum tersimpan: " + b.gagal; kelas = "galat"; }
    else if (gagalBeruntun >= 3) { teks = "Tidak tersambung, mencoba lagi…"; kelas = "galat"; }
    else if (b && b.menyimpan) { teks = "Menyimpan…"; kelas = "belum"; }
    else if (b && b.kotor) { teks = "Belum tersimpan"; kelas = "belum"; }
    s.textContent = teks;
    s.className = "kg-simpan-status" + (kelas ? " " + kelas : "");
  }

  function pesanSementara(teks, ms) {
    const s = $("kg-simpan-status");
    s.textContent = teks;
    s.className = "kg-simpan-status galat";
    clearTimeout(timerStatus);
    timerStatus = setTimeout(tampilStatus, ms || 4000);
  }

  // ---------- Selaraskan dengan server dan kehadiran ----------

  async function sinkron() {
    const pos = cm.getCursor();
    const r = await rpc("berkas_sinkron", { p_penugasan: id, p_versi: b.versiDasar, p_tab: bahasa, p_baris: pos.line, p_kolom: pos.ch });
    teman = Array.isArray(r.aktif) ? r.aktif : [];
    if (r.berkas && r.berkas.versi !== b.versiDasar) gabungkanServer(r.berkas);
    gambarAktif();
    gambarTab();
    gambarKursorTeman();
  }

  function jalankanSinkron() {
    if (!b || sinkronMenunggu || document.hidden) return;
    sinkronMenunggu = true;
    serial(async () => {
      if (b.menyimpan) return;
      try {
        await sinkron();
        if (gagalBeruntun) { gagalBeruntun = 0; tampilStatus(); }
      } catch (e) {
        gagalBeruntun++;
        if (gagalBeruntun === 3) tampilStatus();
      }
    }).catch(() => {}).then(() => { sinkronMenunggu = false; });
  }

  // ---------- Tampilan ----------

  // Baris anggota kelompok: siapa yang sedang aktif dan di mana.
  function gambarAktif() {
    const w = $("kg-aktif");
    w.textContent = "";
    const posSaya = cm ? cm.getCursor().line + 1 : 1;
    anggota.forEach((a) => {
      const aku = a.user_id === saya;
      const t = teman.find((x) => x.user_id === a.user_id);
      const hidup = aku || Boolean(t);
      const chip = el("span", "kg-orang kg-w" + warna(a.user_id) + (hidup ? " aktif" : ""));
      chip.appendChild(el("i", "kg-titik kg-w" + warna(a.user_id)));
      chip.appendChild(el("span", "kg-orang-nama", aku ? "Kamu" : K.nama(a)));
      if (aku && b && b.boleh_edit) chip.appendChild(el("small", "", NAMA_TAB[bahasa] + ", baris " + posSaya));
      else if (t) chip.appendChild(el("small", "", NAMA_TAB[t.tab] + ", baris " + (t.baris + 1)));
      else if (!aku) chip.appendChild(el("small", "", "tidak aktif"));
      chip.title = aku ? "Kamu" : (K.nama(a) + " (@" + a.username + ")" + (t ? " sedang mengerjakan " + NAMA_TAB[t.tab] : " sedang tidak aktif"));
      w.appendChild(chip);
    });
    if (!anggota.length) w.hidden = true;
  }

  // Titik berwarna di tab (HTML/CSS/JS) tempat teman sedang bekerja.
  function gambarTab() {
    document.querySelectorAll(".kg-tab-btn[data-b]").forEach((t) => {
      const k = t.dataset.b;
      t.textContent = NAMA_TAB[k];
      teman.filter((x) => x.tab === k).forEach((x) => {
        const d = el("i", "kg-titik kg-w" + warna(x.user_id));
        d.title = K.nama(x) + " sedang di " + NAMA_TAB[k];
        t.appendChild(d);
      });
    });
  }

  // Kursor dan nama teman di dalam editor (hanya untuk tab yang sedang dibuka).
  function gambarKursorTeman() {
    penanda.forEach((p) => {
      try { p.bm.clear(); } catch (e) { /* sudah hilang */ }
      try { p.doc.removeLineClass(p.garis, "background", p.kelas); } catch (e) { /* sudah hilang */ }
    });
    penanda = [];
    if (!cm || !b) return;
    const doc = b.docs[bahasa];
    teman.filter((t) => t.tab === bahasa).forEach((t) => {
      const baris = Math.max(0, Math.min(t.baris, doc.lastLine()));
      const ch = Math.max(0, Math.min(t.kolom, doc.getLine(baris).length));
      const w = warna(t.user_id);
      const widget = el("span", "kg-kursor kg-w" + w);
      widget.appendChild(el("span", "kg-kursor-nama", K.nama(t)));
      const bm = doc.setBookmark({ line: baris, ch }, { widget, insertLeft: true });
      const kelas = "kg-garis-w" + w;
      const garis = doc.addLineClass(baris, "background", kelas);
      penanda.push({ bm, doc, garis, kelas });
    });
  }

  function gambarInfo() {
    const w = $("kg-info");
    w.textContent = "";
    if (!b) return;
    const arsip = detail && detail.kelompok && detail.kelompok.diarsipkan;
    const baris = el("div");
    baris.appendChild(el("strong", "", "Satu berkas untuk seluruh kelompok"));
    let teks;
    if (arsip) teks = " · Kelompok diarsipkan, hanya baca.";
    else if (!b.boleh_edit) teks = " · Hanya baca.";
    else teks = " · Semua anggota bisa mengubahnya. Warna menunjukkan siapa sedang mengerjakan bagian mana.";
    teks += " Versi " + b.versi + (b.diubahOleh ? ", terakhir diubah " + b.diubahOleh + (b.diubah ? " pukul " + waktu(b.diubah) : "") : "") + ".";
    baris.appendChild(document.createTextNode(teks));
    w.appendChild(baris);
    $("kg-riwayat").hidden = false;
  }

  function tampilkan(bhs) {
    if (bhs) bahasa = bhs;
    cm.swapDoc(b.docs[bahasa]);
    cm.setOption("readOnly", b.boleh_edit ? false : true);
    $("kg-cm").classList.toggle("baca-saja", !b.boleh_edit);
    document.querySelectorAll(".kg-tab-btn[data-b]").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.b === bahasa)));
    gambarTab();
    gambarAktif();
    gambarKursorTeman();
    gambarInfo();
    tampilStatus();
    setTimeout(() => cm.refresh(), 0);
  }

  // ---------- Hasil, kode utuh, dan console ----------

  function jadwalPratinjau(segera) {
    clearTimeout(timerPratinjau);
    const kerja = () => {
      if (tampilan === "hasil") {
        bersihkanConsole();
        K.pasangPratinjau($("kg-iframe"), bagianPratinjau(), gulirPratinjau);
      } else {
        $("kg-kode").textContent = K.kode(bagianPratinjau());
      }
    };
    if (segera) kerja(); else timerPratinjau = setTimeout(kerja, JEDA_PRATINJAU);
  }

  function bersihkanConsole() { $("kg-console").textContent = ""; }

  function tambahConsole(jenis, isi) {
    const w = $("kg-console");
    const baris = el("div", "kg-console-baris " + (["warn", "error"].includes(jenis) ? jenis : "log"), String(isi));
    w.appendChild(baris);
    while (w.childNodes.length > BATAS_CONSOLE) w.removeChild(w.firstChild);
    w.scrollTop = w.scrollHeight;
  }

  function pasangPesanPratinjau() {
    window.addEventListener("message", (e) => {
      const f = $("kg-iframe");
      if (!f || e.source !== f.contentWindow || !e.data || typeof e.data !== "object") return;
      if (e.data.kg === "console") tambahConsole(e.data.jenis, e.data.isi);
      else if (e.data.kg === "gulir" && Number.isFinite(e.data.y)) gulirPratinjau = e.data.y;
    });
  }

  function aturPerbesar(nyala) {
    $("kg-hasil-kolom").classList.toggle("penuh", nyala);
    document.body.classList.toggle("kg-tanpa-gulir", nyala);
    const t = $("kg-perbesar");
    t.textContent = nyala ? "Kembali ke editor" : "Perbesar";
    t.setAttribute("aria-pressed", String(nyala));
  }

  function pasangTab() {
    document.querySelectorAll(".kg-tab-btn[data-b]").forEach((t) => {
      t.addEventListener("click", () => { tampilkan(t.dataset.b); jalankanSinkron(); });
    });
    document.querySelectorAll(".kg-tab-btn[data-v]").forEach((t) => {
      t.addEventListener("click", () => {
        tampilan = t.dataset.v;
        document.querySelectorAll(".kg-tab-btn[data-v]").forEach((x) => x.setAttribute("aria-selected", String(x === t)));
        $("kg-iframe").hidden = tampilan !== "hasil";
        $("kg-kode").hidden = tampilan !== "kode";
        $("kg-console-bungkus").hidden = tampilan !== "hasil";
        jadwalPratinjau(true);
      });
    });
    $("kg-perbesar").addEventListener("click", () => aturPerbesar(!$("kg-hasil-kolom").classList.contains("penuh")));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && $("kg-hasil-kolom").classList.contains("penuh") && !$("kg-dialog").open) aturPerbesar(false);
    });
    $("kg-tab-lain").addEventListener("click", () => {
      if (!K.bukaDiTab(bagianPratinjau())) pesanSementara("Tab baru diblokir browser. Izinkan pop-up untuk situs ini, lalu coba lagi.", 6000);
    });
    $("kg-console-bersih").addEventListener("click", bersihkanConsole);
  }

  // ---------- Dialog Riwayat ----------

  function bukaDialog(judul, bangun, tombolAksi) {
    const dlg = $("kg-dialog");
    if (typeof dlg.showModal !== "function") return;
    $("kg-dlg-judul").textContent = judul;
    const isi = $("kg-dlg-isi");
    isi.textContent = "";
    $("kg-dlg-galat").hidden = true;
    $("kg-dlg-form").onsubmit = (e) => e.preventDefault();
    const aksi = $("kg-dlg-aksi");
    aksi.textContent = "";
    bangun(isi);
    tombolAksi.forEach((t) => {
      const tb = tombol("tg-btn" + (t.kelas ? " " + t.kelas : ""), t.teks);
      tb.addEventListener("click", async () => {
        tb.disabled = true;
        try {
          const tutup = await t.aksi();
          if (tutup !== false && dlg.open) dlg.close();
        } catch (e) {
          const g = $("kg-dlg-galat");
          g.textContent = e.message || "Gagal.";
          g.hidden = false;
        } finally { tb.disabled = false; }
      });
      aksi.appendChild(tb);
    });
    if (!dlg.open) dlg.showModal();
  }

  async function bukaRiwayat() {
    let daftar;
    try { daftar = await rpc("bagian_riwayat", { p_bagian: b.id }); }
    catch (e) { pesanSementara(e.message); return; }
    bukaDialog("Riwayat berkas", (isi) => {
      isi.appendChild(el("p", "tg-sub", "Versi lama dicatat tiap beberapa menit selama berkas diubah. Memulihkan membuat versi baru, jadi versi sekarang tidak hilang."));
      if (!daftar.length) { isi.appendChild(el("p", "", "Belum ada riwayat.")); return; }
      const ul = el("ul", "kg-riwayat-daftar");
      daftar.forEach((r) => {
        const li = el("li");
        li.appendChild(el("span", "", "Versi " + r.versi + " · " + waktu(r.waktu) + (r.oleh ? " · @" + r.oleh : "") + " · " + Math.max(1, Math.round(r.ukuran / 1024)) + " KB"));
        if (b.boleh_edit) {
          const pulih = tombol("tg-btn", "Pulihkan");
          pulih.addEventListener("click", async () => {
            pulih.disabled = true;
            try {
              await serial(async () => {
                if (b.kotor) await simpanSekarang();
                await rpc("bagian_pulihkan", { p_bagian: b.id, p_riwayat: r.id, p_versi_dasar: b.versiDasar });
                gabungkanServer(await ambilBerkas(), true);
              });
              $("kg-dialog").close();
            } catch (e) {
              const g = $("kg-dlg-galat");
              g.textContent = e.bentrok ? "Berkas baru saja diubah orang lain. Tutup dan buka Riwayat lagi." : e.message;
              g.hidden = false;
              pulih.disabled = false;
            }
          });
          li.appendChild(pulih);
        }
        ul.appendChild(li);
      });
      isi.appendChild(ul);
    }, [{ teks: "Tutup", aksi: async () => {} }]);
  }

  // ---------- Mulai ----------

  function pasangPeringatanTutup() {
    window.addEventListener("beforeunload", (e) => {
      if (b && (b.kotor || b.menyimpan)) { e.preventDefault(); e.returnValue = ""; }
    });
    window.addEventListener("pagehide", () => {
      const a = K.akun();
      if (!b || !b.boleh_edit || !b.kotor || b.menyimpan) return;
      const isi = nilai();
      if (panjang(isi) > 40000) return; // batas keepalive sekitar 64 KB
      a.minta("/rest/v1/rpc/bagian_simpan", {
        metode: "POST", keepalive: true,
        body: { p_bagian: b.id, p_versi_dasar: b.versiDasar, p_html: isi.html, p_css: isi.css, p_js: isi.js }
      }).catch(() => {});
    });
  }

  async function mulai() {
    if (!K.POLA_ID.test(id)) { pesan("Alamat halaman tidak lengkap. Buka editor dari halaman tugas.", true); return; }
    const u = await K.wajibMasuk("kelompok");
    if (!u) return;
    if (!window.CodeMirror) { pesan("Editor kode belum termuat. Periksa internet lalu muat ulang halaman.", true); return; }
    if (!G) { pesan("Skrip editor belum lengkap. Muat ulang halaman.", true); return; }
    try {
      const [dt, r] = await Promise.all([rpc("tugas_detail", { p_penugasan: id }), ambilBerkas()]);
      detail = dt;
      anggota = Array.isArray(dt.anggota) ? dt.anggota : [];
      saya = u.id;
      $("kg-judul").textContent = dt.tugas.judul;
      $("kg-sub").textContent = dt.kelompok.nama + " · " + (dt.tugas.tenggat ? "Tenggat " + waktu(dt.tugas.tenggat) : "Tanpa tenggat");
      document.title = "Editor: " + dt.tugas.judul + " | CodingSkanetra";
      $("kg-balik").href = "kelompok-tugas.html?id=" + encodeURIComponent(id);

      pesan("");
      $("tg-isi").hidden = false;
      cm = window.CodeMirror($("kg-cm"), {
        lineNumbers: true, theme: "material-darker", tabSize: 2, indentUnit: 2, lineWrapping: true,
        autoCloseBrackets: true, autoCloseTags: true, spellcheck: false,
        extraKeys: {
          "Ctrl-S": () => { simpanTombol(); },
          "Cmd-S": () => { simpanTombol(); }
        }
      });
      b = buatBerkas(r);
      pasangTab();
      pasangPesanPratinjau();
      tampilkan("html");
      jadwalPratinjau(true);

      $("kg-simpan").addEventListener("click", simpanTombol);
      $("kg-riwayat").addEventListener("click", bukaRiwayat);
      pasangPeringatanTutup();

      jalankanSinkron();
      setInterval(jalankanSinkron, JEDA_SINKRON);
      document.addEventListener("visibilitychange", () => { if (!document.hidden) jalankanSinkron(); });
    } catch (e) {
      pesan(e.message, true);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mulai); else mulai();
})();
