// Editor kelompok: satu website dikerjakan bersama, dibagi per bagian.
//   * Tiap bagian punya tab HTML, CSS, dan JS sendiri. Bagian milik orang lain bisa dibaca, tidak bisa diubah.
//   * Pratinjau dan "Kode utuh" menggabungkan semua bagian (Umum lebih dulu).
//   * Simpan otomatis beberapa detik setelah berhenti mengetik. Server menolak simpan bila versi dasar
//     sudah berubah (bentrok); pengguna lalu memilih: muat versi terbaru, timpa, atau salin kodenya.
//   * Bagian orang lain disegarkan tiap 20 detik.
(() => {
  "use strict";
  const K = window.CSKelompok;
  const $ = (id) => document.getElementById(id);
  const { el, tombol, rpc, waktu } = K;

  const id = new URLSearchParams(location.search).get("id") || "";
  const MODE = { html: "htmlmixed", css: "css", js: "javascript" };
  const BAHASA = ["html", "css", "js"];
  const JEDA_SIMPAN = 4000;
  const JEDA_PRATINJAU = 800;
  const JEDA_SEGAR = 20000;
  const BATAS_BAGIAN = 60000;

  let cm = null;
  let detail = null;
  let bagian = [];
  let aktif = 0;
  let bahasa = "html";
  let tampilan = "hasil";
  let timerPratinjau = null;
  let sedangSegar = false;

  function pesan(teks, galat) {
    const p = $("tg-pesan");
    p.textContent = teks || "";
    p.classList.toggle("galat", Boolean(galat));
  }

  // ---------- Model bagian ----------

  function nilai(b) {
    return { html: b.docs.html.getValue(), css: b.docs.css.getValue(), js: b.docs.js.getValue() };
  }
  const beda = (b) => BAHASA.some((k) => b.docs[k].getValue() !== b.dasar[k]);

  function buatBagian(r) {
    const b = {
      id: r.id, nama: r.nama, petunjuk: r.petunjuk || "", umum: Boolean(r.umum),
      pemilik_nama: r.pemilik_nama || "", boleh_edit: Boolean(r.boleh_edit),
      versi: r.versi, versiDasar: r.versi,
      dasar: { html: r.html || "", css: r.css || "", js: r.js || "" },
      docs: {}, kotor: false, muat: false, menyimpan: false, bentrok: false, gagal: null, diubahLain: false, timer: null
    };
    BAHASA.forEach((k) => {
      b.docs[k] = new window.CodeMirror.Doc(b.dasar[k], MODE[k]);
      b.docs[k].on("change", () => {
        if (b.muat || !b.boleh_edit) return;
        b.kotor = beda(b);
        if (b.kotor) jadwalSimpan(b); else clearTimeout(b.timer);
        jadwalPratinjau();
        tampilStatus();
        gambarChip();
      });
    });
    return b;
  }

  function isiDariServer(b, r) {
    b.muat = true;
    BAHASA.forEach((k) => { b.docs[k].setValue(r[k] || ""); });
    b.muat = false;
    b.dasar = { html: r.html || "", css: r.css || "", js: r.js || "" };
    b.versi = r.versi;
    b.versiDasar = r.versi;
    b.kotor = false;
    b.bentrok = false;
    b.gagal = null;
    b.diubahLain = false;
    clearTimeout(b.timer);
  }

  // Menyamakan dengan data terbaru dari server. Bagian yang sedang saya ubah tidak ditimpa.
  function terapkanServer(baru, paksaId) {
    const lama = new Map(bagian.map((b) => [b.id, b]));
    const hasil = [];
    let berubah = baru.length !== bagian.length;
    baru.forEach((r) => {
      let b = lama.get(r.id);
      if (!b) { hasil.push(buatBagian(r)); berubah = true; return; }
      if (b.nama !== r.nama || b.boleh_edit !== Boolean(r.boleh_edit) || b.pemilik_nama !== (r.pemilik_nama || "")) berubah = true;
      b.nama = r.nama;
      b.petunjuk = r.petunjuk || "";
      b.pemilik_nama = r.pemilik_nama || "";
      b.boleh_edit = Boolean(r.boleh_edit);
      b.umum = Boolean(r.umum);
      if (r.versi !== b.versi || r.id === paksaId) {
        berubah = true;
        if (b.kotor && r.id !== paksaId) { b.versi = r.versi; b.diubahLain = true; }
        else isiDariServer(b, r);
      }
      hasil.push(b);
    });
    const idAktif = bagian[aktif] ? bagian[aktif].id : null;
    bagian = hasil;
    const i = bagian.findIndex((b) => b.id === idAktif);
    aktif = i >= 0 ? i : 0;
    return berubah;
  }

  // Memperbarui tampilan tanpa mengganti dokumen yang sedang dibuka (supaya kursor dan gulir tidak loncat).
  function segarkanTampilan() {
    const b = bagian[aktif];
    if (!b) return;
    if (cm.getDoc() !== b.docs[bahasa]) { tampilkan(aktif); return; }
    cm.setOption("readOnly", b.boleh_edit ? false : true);
    $("kg-cm").classList.toggle("baca-saja", !b.boleh_edit);
    gambarChip();
    gambarInfo();
    tampilStatus();
  }

  async function segarkan(paksaId) {
    const baru = await rpc("bagian_ambil", { p_penugasan: id });
    const berubah = terapkanServer(Array.isArray(baru) ? baru : [], paksaId);
    segarkanTampilan();
    if (berubah) jadwalPratinjau(true);
  }

  // ---------- Simpan ----------

  function jadwalSimpan(b) {
    clearTimeout(b.timer);
    b.timer = setTimeout(() => { simpan(b); }, JEDA_SIMPAN);
  }

  async function simpan(b) {
    clearTimeout(b.timer);
    if (!b.boleh_edit || !b.kotor || b.menyimpan || b.bentrok) return false;
    const isi = nilai(b);
    if (isi.html.length + isi.css.length + isi.js.length > BATAS_BAGIAN) {
      b.gagal = "Bagian terlalu besar (maksimal 60.000 karakter).";
      tampilStatus();
      return false;
    }
    b.menyimpan = true;
    b.gagal = null;
    tampilStatus();
    try {
      const r = await rpc("bagian_simpan", { p_bagian: b.id, p_versi_dasar: b.versiDasar, p_html: isi.html, p_css: isi.css, p_js: isi.js });
      b.versiDasar = r.versi;
      b.versi = r.versi;
      b.dasar = isi;
      b.diubahLain = false;
      b.kotor = beda(b);
      if (b.kotor) jadwalSimpan(b);
      return true;
    } catch (e) {
      if (e.bentrok) {
        b.bentrok = true;
        bukaBentrok(b);
      } else {
        b.gagal = e.message;
        if (!e.status) b.timer = setTimeout(() => { simpan(b); }, 15000); // jaringan: coba lagi
      }
      return false;
    } finally {
      b.menyimpan = false;
      tampilStatus();
      gambarChip();
      gambarInfo();
    }
  }

  async function simpanSemua() {
    const macet = bagian.find((b) => b.bentrok);
    if (macet) { tampilkan(bagian.indexOf(macet)); bukaBentrok(macet); return; }
    for (const b of bagian) { await simpan(b); }
  }

  function tampilStatus() {
    const s = $("kg-simpan-status");
    let teks = "Tersimpan";
    let kelas = "";
    if (bagian.some((b) => b.bentrok)) { teks = "Bentrok: perlu keputusanmu"; kelas = "galat"; }
    else if (bagian.some((b) => b.gagal)) { teks = "Belum tersimpan: " + bagian.find((b) => b.gagal).gagal; kelas = "galat"; }
    else if (bagian.some((b) => b.menyimpan)) { teks = "Menyimpan…"; kelas = "belum"; }
    else if (bagian.some((b) => b.kotor)) { teks = "Belum tersimpan"; kelas = "belum"; }
    s.textContent = teks;
    s.className = "kg-simpan-status" + (kelas ? " " + kelas : "");
  }

  // ---------- Tampilan ----------

  function gambarChip() {
    const w = $("kg-chip");
    w.textContent = "";
    bagian.forEach((b, i) => {
      const c = tombol("kg-chip" + (b.boleh_edit ? " bisa" : "") + (b.kotor ? " kotor" : ""), b.nama);
      c.setAttribute("role", "tab");
      c.setAttribute("aria-selected", String(i === aktif));
      c.setAttribute("aria-label", b.nama + (b.boleh_edit ? ", bisa diedit" : ", hanya baca") + (b.kotor ? ", belum tersimpan" : ""));
      c.addEventListener("click", () => tampilkan(i));
      w.appendChild(c);
    });
  }

  function gambarInfo() {
    const b = bagian[aktif];
    const w = $("kg-info");
    w.textContent = "";
    if (!b) return;
    const arsip = detail && detail.kelompok && detail.kelompok.diarsipkan;
    const baris = el("div");
    baris.appendChild(el("strong", "", b.nama));
    let teks;
    if (arsip) teks = " · Kelompok diarsipkan, semua bagian hanya baca.";
    else if (b.boleh_edit) teks = b.umum ? " · Dipakai bersama: simpanan orang lain bisa bentrok dengan milikmu." : (b.pemilik_nama ? " · Bagianmu." : " · Belum ada pemilik, kamu boleh mengisinya.");
    else teks = " · Hanya baca" + (b.pemilik_nama ? " (dipegang " + b.pemilik_nama + ")" : "") + ".";
    teks += " Versi " + b.versi + ".";
    baris.appendChild(document.createTextNode(teks));
    w.appendChild(baris);
    if (b.petunjuk) w.appendChild(el("div", "", "Petunjuk: " + b.petunjuk));
    if (b.diubahLain) w.appendChild(el("div", "", "Bagian ini sudah diubah orang lain. Saat menyimpan, kamu akan diminta memilih."));
    $("kg-riwayat").hidden = false;
  }

  function tampilkan(i, bhs) {
    if (!bagian.length) return;
    aktif = Math.max(0, Math.min(i, bagian.length - 1));
    if (bhs) bahasa = bhs;
    const b = bagian[aktif];
    cm.swapDoc(b.docs[bahasa]);
    cm.setOption("readOnly", b.boleh_edit ? false : true);
    $("kg-cm").classList.toggle("baca-saja", !b.boleh_edit);
    document.querySelectorAll(".kg-tab-btn[data-b]").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.b === bahasa)));
    gambarChip();
    gambarInfo();
    tampilStatus();
    setTimeout(() => cm.refresh(), 0);
  }

  function semuaBagian() {
    return bagian.map((b) => Object.assign({ nama: b.nama, umum: b.umum }, nilai(b)));
  }

  function jadwalPratinjau(segera) {
    clearTimeout(timerPratinjau);
    const kerja = () => {
      const bg = semuaBagian();
      if (tampilan === "hasil") K.pasangPratinjau($("kg-iframe"), bg);
      else $("kg-kode").textContent = K.kode(bg);
    };
    if (segera) kerja(); else timerPratinjau = setTimeout(kerja, JEDA_PRATINJAU);
  }

  function pasangTab() {
    document.querySelectorAll(".kg-tab-btn[data-b]").forEach((t) => {
      t.addEventListener("click", () => tampilkan(aktif, t.dataset.b));
    });
    document.querySelectorAll(".kg-tab-btn[data-v]").forEach((t) => {
      t.addEventListener("click", () => {
        tampilan = t.dataset.v;
        document.querySelectorAll(".kg-tab-btn[data-v]").forEach((x) => x.setAttribute("aria-selected", String(x === t)));
        $("kg-iframe").hidden = tampilan !== "hasil";
        $("kg-kode").hidden = tampilan !== "kode";
        jadwalPratinjau(true);
      });
    });
  }

  // ---------- Dialog khusus editor ----------

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
      const b = tombol("tg-btn" + (t.kelas ? " " + t.kelas : ""), t.teks);
      b.addEventListener("click", async () => {
        b.disabled = true;
        try {
          const tutup = await t.aksi();
          if (tutup !== false && dlg.open) dlg.close();
        } catch (e) {
          const g = $("kg-dlg-galat");
          g.textContent = e.message || "Gagal.";
          g.hidden = false;
        } finally { b.disabled = false; }
      });
      aksi.appendChild(b);
    });
    if (!dlg.open) dlg.showModal();
  }

  function bukaBentrok(b) {
    const teksKode = () => "HTML:\n" + b.docs.html.getValue() + "\n\nCSS:\n" + b.docs.css.getValue() + "\n\nJS:\n" + b.docs.js.getValue();
    bukaDialog("Bagian ini sudah diubah orang lain", (isi) => {
      isi.appendChild(el("p", "", "Seseorang menyimpan bagian “" + b.nama + "” setelah kamu membukanya, jadi simpananmu belum masuk. Pilih salah satu:"));
      const ul = el("ul", "kg-konfirmasi-daftar");
      ul.appendChild(el("li", "", "Muat versi terbaru: perubahanmu yang belum tersimpan dibuang."));
      ul.appendChild(el("li", "", "Timpa dengan milikku: kodemu menggantikan versi orang lain (versi mereka tetap ada di Riwayat)."));
      ul.appendChild(el("li", "", "Salin kodeku: kodemu disalin dulu supaya bisa digabung manual."));
      isi.appendChild(ul);
    }, [
      { teks: "Muat versi terbaru", kelas: "utama", aksi: async () => { await segarkan(b.id); } },
      { teks: "Timpa dengan milikku", kelas: "bahaya", aksi: async () => {
        const baru = await rpc("bagian_ambil", { p_penugasan: id });
        const r = baru.find((x) => x.id === b.id);
        if (!r) throw new Error("Bagian tidak ditemukan lagi.");
        b.versiDasar = r.versi;
        b.versi = r.versi;
        b.bentrok = false;
        b.kotor = true;
        await simpan(b);
      } },
      { teks: "Salin kodeku", aksi: async () => {
        try { await navigator.clipboard.writeText(teksKode()); $("kg-dlg-galat").textContent = "Tersalin ke papan klip."; }
        catch (e) { $("kg-dlg-galat").textContent = "Tidak bisa menyalin otomatis. Pilih dan salin kodenya dari editor."; }
        $("kg-dlg-galat").hidden = false;
        return false;
      } },
      { teks: "Nanti saja", aksi: async () => { /* biarkan status bentrok */ } }
    ]);
  }

  async function bukaRiwayat() {
    const b = bagian[aktif];
    if (!b) return;
    let daftar;
    try { daftar = await rpc("bagian_riwayat", { p_bagian: b.id }); }
    catch (e) { pesanSementara(e.message); return; }
    bukaDialog("Riwayat bagian " + b.nama, (isi) => {
      isi.appendChild(el("p", "tg-sub", "Versi lama dicatat saat orang lain menyimpan atau tiap beberapa menit. Memulihkan membuat versi baru, jadi versi sekarang tidak hilang."));
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
              if (b.kotor) await simpan(b);
              if (b.bentrok) throw new Error("Selesaikan bentrok dulu.");
              await rpc("bagian_pulihkan", { p_bagian: b.id, p_riwayat: r.id, p_versi_dasar: b.versiDasar });
              await segarkan(b.id);
              $("kg-dialog").close();
            } catch (e) {
              const g = $("kg-dlg-galat");
              g.textContent = e.bentrok ? "Bagian baru saja diubah orang lain. Tutup dan buka Riwayat lagi." : e.message;
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

  function pesanSementara(teks) {
    const s = $("kg-simpan-status");
    s.textContent = teks;
    s.className = "kg-simpan-status galat";
    setTimeout(tampilStatus, 4000);
  }

  // ---------- Mulai ----------

  function pasangPeringatanTutup() {
    window.addEventListener("beforeunload", (e) => {
      if (bagian.some((b) => b.kotor || b.menyimpan)) { e.preventDefault(); e.returnValue = ""; }
    });
    window.addEventListener("pagehide", () => {
      const a = K.akun();
      bagian.forEach((b) => {
        if (!b.boleh_edit || !b.kotor || b.bentrok || b.menyimpan) return;
        const isi = nilai(b);
        if (isi.html.length + isi.css.length + isi.js.length > 40000) return; // batas keepalive sekitar 64 KB
        a.minta("/rest/v1/rpc/bagian_simpan", {
          metode: "POST", keepalive: true,
          body: { p_bagian: b.id, p_versi_dasar: b.versiDasar, p_html: isi.html, p_css: isi.css, p_js: isi.js }
        }).catch(() => {});
      });
    });
  }

  async function mulai() {
    if (!K.POLA_ID.test(id)) { pesan("Alamat halaman tidak lengkap. Buka editor dari halaman tugas.", true); return; }
    const u = await K.wajibMasuk("kelompok");
    if (!u) return;
    if (!window.CodeMirror) { pesan("Editor kode belum termuat. Periksa internet lalu muat ulang halaman.", true); return; }
    try {
      const [dt, daftar] = await Promise.all([rpc("tugas_detail", { p_penugasan: id }), rpc("bagian_ambil", { p_penugasan: id })]);
      detail = dt;
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
          "Ctrl-S": () => { simpanSemua(); },
          "Cmd-S": () => { simpanSemua(); }
        }
      });
      bagian = (Array.isArray(daftar) ? daftar : []).map(buatBagian);
      const pertama = bagian.findIndex((b) => b.boleh_edit && !b.umum);
      pasangTab();
      tampilkan(pertama >= 0 ? pertama : 0, "html");
      jadwalPratinjau(true);

      $("kg-simpan").addEventListener("click", simpanSemua);
      $("kg-riwayat").addEventListener("click", bukaRiwayat);
      pasangPeringatanTutup();

      const segarBerkala = async () => {
        if (sedangSegar || document.hidden || bagian.some((b) => b.menyimpan)) return;
        sedangSegar = true;
        try { await segarkan(); } catch (e) { /* diam: coba lagi nanti */ } finally { sedangSegar = false; }
      };
      setInterval(segarBerkala, JEDA_SEGAR);
      document.addEventListener("visibilitychange", () => { if (!document.hidden) segarBerkala(); });
    } catch (e) {
      pesan(e.message, true);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mulai); else mulai();
})();
