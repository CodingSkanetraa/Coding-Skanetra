// Halaman detail tugas kelompok: penjelasan, berkas bersama, anggota, kiriman, dan Submit.
(() => {
  "use strict";
  const K = window.CSKelompok;
  const $ = (id) => document.getElementById(id);
  const { el, tombol, rpc, waktu, lencana, dialog } = K;

  const id = new URLSearchParams(location.search).get("id") || "";
  let d = null; // hasil tugas_detail

  function pesan(teks, galat) {
    const p = $("tg-pesan");
    p.textContent = teks || "";
    p.classList.toggle("galat", Boolean(galat));
  }
  function pesanAksi(teks, galat) {
    const p = $("kg-pesan-aksi");
    p.textContent = teks || "";
    p.classList.toggle("galat", Boolean(galat));
  }

    const anggota = () => d && (d.peran === "ketua" || d.peran === "anggota");
  const arsip = () => d && d.kelompok && d.kelompok.diarsipkan;

  async function muat() {
    d = await rpc("tugas_detail", { p_penugasan: id });
    gambar();
  }

  async function muatUlang() {
    try { await muat(); } catch (e) { pesanAksi(e.message, true); }
  }

  // ---------- Tampilan ----------

  function gambar() {
    $("kg-judul").textContent = d.tugas.judul;
    $("kg-sub").textContent = d.kelompok.nama + " · " +
      (d.tugas.tenggat ? "Tenggat " + waktu(d.tugas.tenggat) : "Tanpa tenggat");
    document.title = d.tugas.judul + " | CodingSkanetra";

    const l = $("kg-lencana");
    l.textContent = "";
    l.appendChild(lencana(d.status));
    if (arsip()) l.appendChild(el("span", "tg-label ditolak", "Diarsipkan (hanya baca)"));
    if (d.ada_perubahan && (d.status === "dikirim" || d.status === "diterima" || d.status === "perlu_revisi")) {
      l.appendChild(el("span", "tg-label menunggu", "Ada perubahan sejak kiriman terakhir"));
    }

    $("kg-penjelasan").textContent = d.tugas.penjelasan || "Tidak ada penjelasan tambahan.";
    gambarSyarat($("kg-syarat"), d.syarat);
    gambarAksi();
    gambarBerkas();
    gambarAnggota();
    gambarKiriman();
  }

  function gambarSyarat(ul, daftar) {
    ul.textContent = "";
    if (!daftar.length) { ul.appendChild(el("li", "", "Belum ada syarat khusus.")); return; }
    daftar.forEach((s) => {
      const li = el("li");
      li.append(el("span", "kg-tanda", "•"), el("span", "", s.teks + (s.wajib ? " (wajib)" : " (opsional, jadi bahan penilaian)")));
      ul.appendChild(li);
    });
  }

  function gambarAksi() {
    const w = $("kg-aksi-utama");
    w.textContent = "";
    const editor = el("a", "tg-btn utama", anggota() && !arsip() ? "Buka editor" : "Lihat kode (hanya baca)");
    editor.href = "kelompok-editor.html?id=" + encodeURIComponent(id);
    w.appendChild(editor);

    if (d.boleh_kirim) {
      const kirim = tombol("tg-btn", d.status === "perlu_revisi" ? "Kirim ulang" : "Kirim ke pengelola");
      kirim.addEventListener("click", bukaKonfirmasiKirim);
      w.appendChild(kirim);
    }
    const terakhir = d.kiriman[0];
    if (anggota() && !arsip() && terakhir && terakhir.status === "dikirim") {
      const tarik = tombol("tg-btn bahaya", "Tarik kembali kiriman");
      tarik.addEventListener("click", () => bukaTarik(terakhir));
      w.appendChild(tarik);
    }
    if (d.status === "diterima") pesanAksi("Tugas ini sudah diterima pengelola.");
    else if (d.status === "dikirim") pesanAksi("Kiriman menunggu ditinjau. Kamu masih bisa mengedit, tetapi yang dinilai adalah versi saat dikirim.");
    else if (d.status === "perlu_revisi") pesanAksi("Pengelola meminta revisi. Baca catatannya di bawah, perbaiki, lalu kirim ulang.");
    else pesanAksi("");
  }

  // Seluruh kelompok mengerjakan satu berkas (HTML, CSS, JS) yang sama; isinya dikelola di editor.
  function gambarBerkas() {
    const ul = $("kg-bagian");
    ul.textContent = "";
    const b = d.bagian.find((x) => x.umum) || d.bagian[0];
    $("kg-bagian-info").textContent = arsip()
      ? "Kelompok ini diarsipkan, jadi berkas hanya bisa dibaca."
      : "Semua anggota mengerjakan satu berkas yang sama di editor. Perubahan tersimpan otomatis dan hasilnya langsung tampil.";
    if (!b) { ul.appendChild(el("li", "", "Berkas belum dibuat. Hubungi pengelola.")); return; }
    const li = el("li");
    const info = el("span", "tg-info");
    info.appendChild(el("strong", "", "Berkas website kelompok"));
    info.appendChild(el("small", "", "Versi " + b.versi + " · " + Math.max(1, Math.round((b.ukuran || 0) / 1024)) + " KB" +
      (b.diubah ? " · terakhir diubah " + waktu(b.diubah) : "")));
    li.appendChild(info);
    ul.appendChild(li);
  }

  function gambarAnggota() {
    const ul = $("kg-anggota");
    ul.textContent = "";
    d.anggota.forEach((a) => {
      const li = el("li");
      li.appendChild(el("strong", "", K.nama(a)));
      li.appendChild(el("span", "tg-meta", "@" + a.username));
      if (a.peran === "ketua") li.appendChild(el("span", "tg-label kg-ketua", "Ketua"));
      ul.appendChild(li);
    });
  }

  function gambarKiriman() {
    const ul = $("kg-kiriman");
    ul.textContent = "";
    $("kg-kiriman-info").textContent = d.kiriman.length ? "" : "Belum ada kiriman.";
    d.kiriman.forEach((k) => {
      const li = el("li");
      const kepala = el("div", "kg-kiriman-kepala");
      kepala.appendChild(el("strong", "", "Kiriman " + k.nomor));
      kepala.appendChild(lencana(k.status));
      if (k.terlambat) kepala.appendChild(el("span", "tg-label kg-terlambat", "Terlambat"));
      const lihat = el("a", "tg-btn", "Lihat");
      lihat.href = "kelompok-kiriman.html?id=" + encodeURIComponent(k.id);
      kepala.appendChild(lihat);
      li.appendChild(kepala);
      li.appendChild(el("span", "tg-meta", "Dikirim " + waktu(k.dikirim) + (k.oleh ? " oleh @" + k.oleh : "")));
      if (k.catatan && k.catatan.length) {
        const c = el("ul", "kg-catatan");
        k.catatan.forEach((x) => {
          const ci = el("li", "", x.isi);
          ci.appendChild(el("small", "", "Catatan pengelola · " + waktu(x.waktu)));
          c.appendChild(ci);
        });
        li.appendChild(c);
      }
      ul.appendChild(li);
    });
  }

  // ---------- Submit dan tarik kembali ----------

  function bukaKonfirmasiKirim() {
    const wajib = d.syarat.filter((s) => s.wajib);
    const kotak = [];
    dialog({
      judul: d.status === "perlu_revisi" ? "Kirim ulang ke pengelola?" : "Kirim ke pengelola?",
      ok: "Kirim sekarang",
      bangun: (isi) => {
        isi.appendChild(el("p", "", "Yang dikirim adalah versi kode kelompok saat ini. Setelah dikirim kamu masih bisa mengedit, tetapi yang dinilai adalah versi saat dikirim."));
        if (d.tugas.tenggat && new Date(d.tugas.tenggat).getTime() < Date.now()) {
          isi.appendChild(el("p", "tg-status ditolak", "Tenggat sudah lewat. Kiriman tetap diterima dan diberi tanda terlambat."));
        }
        if (wajib.length) {
          isi.appendChild(el("p", "tg-sub", "Periksa dulu syarat wajib. Centang yang sudah kelompokmu kerjakan:"));
          const ul = el("ul", "kg-konfirmasi-daftar");
          wajib.forEach((s, i) => {
            const li = el("li");
            const lb = el("label");
            const cb = el("input");
            cb.type = "checkbox";
            cb.id = "kg-w-" + i;
            kotak.push(cb);
            lb.append(cb, el("span", "", s.teks));
            li.appendChild(lb);
            ul.appendChild(li);
          });
          isi.appendChild(ul);
          const peringatan = el("p", "tg-sub", "");
          peringatan.id = "kg-peringatan-syarat";
          isi.appendChild(peringatan);
          const perbarui = () => {
            const belum = kotak.filter((c) => !c.checked).length;
            peringatan.textContent = belum ? belum + " syarat wajib belum dicentang. Kamu tetap bisa mengirim." : "Semua syarat wajib sudah dicentang.";
          };
          kotak.forEach((c) => c.addEventListener("change", perbarui));
          perbarui();
        }
      },
      aksi: async () => {
        await rpc("pengumpulan_kirim", { p_penugasan: id });
        await muat();
        pesanAksi("Terkirim. Pengelola akan meninjau kirimanmu.");
      }
    });
  }

  function bukaTarik(k) {
    dialog({
      judul: "Tarik kembali kiriman?",
      ok: "Tarik kembali",
      bahaya: true,
      bangun: (isi) => { isi.appendChild(el("p", "", "Kiriman " + k.nomor + " dibatalkan supaya bisa diperbaiki, lalu kirim lagi setelah siap.")); },
      aksi: async () => { await rpc("pengumpulan_tarik", { p_id: k.id }); await muat(); pesanAksi("Kiriman ditarik."); }
    });
  }

  async function mulai() {
    if (!K.POLA_ID.test(id)) { pesan("Alamat halaman tidak lengkap. Buka tugas dari daftar Tugas Kelompok.", true); return; }
    const u = await K.wajibMasuk("kelompok");
    if (!u) return;
    try {
      await muat();
      pesan("");
      $("tg-isi").hidden = false;
    } catch (e) {
      pesan(e.message, true);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mulai); else mulai();
})();
