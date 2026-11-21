// Halaman pengelola Proyek Kelompok: kelompok dan anggotanya, tugas (syarat + kerangka awal), pemberian tugas,
// dan daftar kiriman yang perlu ditinjau.
(() => {
  "use strict";
  const K = window.CSKelompok;
  const $ = (id) => document.getElementById(id);
  const { el, tombol, rpc, waktu, lencana, dialog, isian } = K;

  let kelompok = [];
  let tugas = [];
  let kiriman = [];
  let akunDaftar = null;
  let filterKiriman = "dikirim";

  function pesan(teks, galat) {
    const p = $("tg-pesan");
    p.textContent = teks || "";
    p.classList.toggle("galat", Boolean(galat));
  }

  const keLokal = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const p = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes());
  };

  async function akun() {
    if (!akunDaftar) akunDaftar = await rpc("admin_akun_daftar");
    return akunDaftar;
  }

  async function muat() {
    [kelompok, tugas, kiriman] = await Promise.all([rpc("admin_kelompok_daftar"), rpc("admin_tugas_daftar"), rpc("admin_pengumpulan_daftar")]);
    gambarKelompok();
    gambarTugas();
    gambarKiriman();
  }

  async function muatUlang() {
    try { await muat(); } catch (e) { pesan(e.message, true); }
  }

  // ---------- Pemilih anggota ----------

  function pemilihAnggota(isi, semua, terpilih) {
    const cari = el("input", "kg-teks");
    cari.type = "search";
    cari.placeholder = "Cari nama atau username…";
    cari.setAttribute("aria-label", "Cari anggota");
    const info = el("p", "tg-sub", "");
    const kotak = el("div", "kg-pilih-anggota");
    const baris = [];
    const dipilih = () => baris.filter((x) => x.cb.checked).length;
    const hitung = () => { info.textContent = dipilih() + " dari 10 anggota dipilih. Pilih tepat satu ketua."; };
    semua.forEach((a, i) => {
      const lb = el("label");
      const cb = el("input");
      cb.type = "checkbox";
      cb.checked = terpilih.has(a.id);
      cb.setAttribute("aria-label", "Pilih " + K.nama(a));
      const nama = el("span", "", K.nama(a) + " (@" + a.username + ")");
      const kt = el("span", "ketua");
      const r = el("input");
      r.type = "radio";
      r.name = "kg-ketua";
      r.checked = terpilih.get(a.id) === "ketua";
      r.setAttribute("aria-label", "Jadikan " + K.nama(a) + " ketua");
      kt.append(r, document.createTextNode("Ketua"));
      lb.append(cb, nama, kt);
      kotak.appendChild(lb);
      const x = { a, cb, r, lb };
      baris.push(x);
      cb.addEventListener("change", () => {
        if (cb.checked && dipilih() > 10) { cb.checked = false; info.textContent = "Maksimal 10 anggota."; return; }
        if (!cb.checked) r.checked = false;
        hitung();
      });
      r.addEventListener("change", () => {
        if (r.checked && !cb.checked) {
          if (dipilih() >= 10) { r.checked = false; info.textContent = "Maksimal 10 anggota."; return; }
          cb.checked = true;
        }
        hitung();
      });
    });
    cari.addEventListener("input", () => {
      const q = cari.value.trim().toLowerCase();
      baris.forEach((x) => { x.lb.hidden = q && !(K.nama(x.a) + " " + x.a.username).toLowerCase().includes(q); });
    });
    hitung();
    isi.append(el("label", "", "Anggota kelompok"), cari, info, kotak);
    return () => {
      const pilih = baris.filter((x) => x.cb.checked);
      const ketua = pilih.filter((x) => x.r.checked);
      if (pilih.length && ketua.length !== 1) throw new Error("Pilih tepat satu ketua dari anggota yang dicentang.");
      return pilih.map((x) => ({ user_id: x.a.id, peran: x.r.checked ? "ketua" : "anggota" }));
    };
  }

  // ---------- Kelompok ----------

  function gambarKelompok() {
    const ul = $("kg-kel-daftar");
    ul.textContent = "";
    if (!kelompok.length) ul.appendChild(el("li", "", "Belum ada kelompok. Tekan “+ Kelompok baru”."));
    kelompok.forEach((k) => {
      const li = el("li");
      const kepala = el("div", "tg-baris-aksi");
      kepala.appendChild(el("h3", "", k.nama));
      if (k.diarsipkan) kepala.appendChild(el("span", "tg-label ditolak", "Diarsipkan"));
      kepala.appendChild(el("span", "tg-meta", k.anggota.length + " anggota · " + k.jumlah_tugas + " tugas"));
      li.appendChild(kepala);

      const chips = el("div", "kg-chips-kecil");
      if (!k.anggota.length) chips.appendChild(el("span", "tg-meta", "Belum ada anggota."));
      k.anggota.forEach((a) => chips.appendChild(el("span", "tg-label" + (a.peran === "ketua" ? " kg-ketua" : ""), K.nama(a) + (a.peran === "ketua" ? " (ketua)" : ""))));
      li.appendChild(chips);

      const aksi = el("div", "tg-baris-aksi");
      const ubah = tombol("tg-btn", "Ubah");
      ubah.addEventListener("click", () => bukaKelompok(k));
      const beri = tombol("tg-btn utama", "Beri tugas");
      beri.disabled = k.diarsipkan || !tugas.length;
      beri.addEventListener("click", () => bukaBeri(null, k));
      const arsip = tombol("tg-btn", k.diarsipkan ? "Aktifkan lagi" : "Arsipkan");
      arsip.addEventListener("click", async () => {
        try { await rpc("admin_kelompok_arsip", { p_id: k.id, p_arsip: !k.diarsipkan }); await muat(); } catch (e) { pesan(e.message, true); }
      });
      const hapus = tombol("tg-btn bahaya", "Hapus");
      hapus.addEventListener("click", () => bukaHapusKelompok(k));
      aksi.append(ubah, beri, arsip, hapus);
      li.appendChild(aksi);
      ul.appendChild(li);
    });
  }

  async function bukaKelompok(k) {
    let semua;
    try { semua = await akun(); } catch (e) { pesan(e.message, true); return; }
    let nama, ambil;
    const terpilih = new Map((k ? k.anggota : []).map((a) => [a.user_id, a.peran]));
    dialog({
      judul: k ? "Ubah kelompok" : "Kelompok baru",
      bangun: (isi) => {
        nama = isian(isi, "Nama kelompok", "kg-f-nama", { maks: 60, nilai: k ? k.nama : "" });
        ambil = pemilihAnggota(isi, semua, terpilih);
        setTimeout(() => nama.focus(), 50);
      },
      aksi: async () => {
        const daftar = ambil();
        const idKel = await rpc("admin_kelompok_simpan", { p_id: k ? k.id : null, p_nama: nama.value });
        await rpc("admin_kelompok_anggota", { p_kelompok: idKel, p_anggota: daftar });
        await muat();
      }
    });
  }

  function bukaHapusKelompok(k) {
    dialog({
      judul: "Hapus kelompok?",
      ok: "Hapus",
      bahaya: true,
      bangun: (isi) => { isi.appendChild(el("p", "", "Kelompok “" + k.nama + "” beserta seluruh kode, kiriman, dan catatannya akan dihapus permanen. Bila hanya ingin menutupnya, pakai Arsipkan.")); },
      aksi: async () => { await rpc("admin_kelompok_hapus", { p_id: k.id }); await muat(); }
    });
  }

  // ---------- Tugas ----------

  function gambarTugas() {
    const ul = $("kg-tugas-daftar");
    ul.textContent = "";
    if (!tugas.length) ul.appendChild(el("li", "", "Belum ada tugas. Tekan “+ Tugas baru”."));
    tugas.forEach((t) => {
      const li = el("li");
      const kepala = el("div", "tg-baris-aksi");
      kepala.appendChild(el("h3", "", t.judul));
      kepala.appendChild(el("span", "tg-meta", (t.tenggat ? "Tenggat " + waktu(t.tenggat) : "Tanpa tenggat") + " · " + t.syarat.length + " syarat · " + t.templat.length + " kerangka awal"));
      li.appendChild(kepala);

      const chips = el("div", "kg-chips-kecil");
      if (!t.penugasan.length) chips.appendChild(el("span", "tg-meta", "Belum diberikan ke kelompok mana pun."));
      t.penugasan.forEach((p) => {
        const w = el("span", "kg-chips-kecil");
        const a = el("a", "tg-btn", p.kelompok);
        a.href = "kelompok-tugas.html?id=" + encodeURIComponent(p.id);
        a.setAttribute("aria-label", "Buka tugas " + t.judul + " milik " + p.kelompok);
        const cabut = tombol("tg-btn bahaya", "Cabut");
        cabut.setAttribute("aria-label", "Cabut tugas dari " + p.kelompok);
        cabut.addEventListener("click", () => bukaCabut(t, p));
        w.append(a, lencana(p.status), cabut);
        chips.appendChild(w);
      });
      li.appendChild(chips);

      const aksi = el("div", "tg-baris-aksi");
      const ubah = tombol("tg-btn", "Ubah");
      ubah.addEventListener("click", () => bukaTugas(t));
      const beri = tombol("tg-btn utama", "Beri ke kelompok");
      beri.addEventListener("click", () => bukaBeri(t, null));
      const hapus = tombol("tg-btn bahaya", "Hapus");
      hapus.addEventListener("click", () => bukaHapusTugas(t));
      aksi.append(ubah, beri, hapus);
      li.appendChild(aksi);
      ul.appendChild(li);
    });
  }

  function bukaTugas(t) {
    let judul, penjelasan, tenggat;
    const syarat = t ? t.syarat.map((s) => ({ id: s.id, teks: s.teks, wajib: s.wajib })) : [];
    const templat = t ? t.templat.map((m) => Object.assign({}, m)) : [];
    let wSyarat, wTemplat;

    const gambarSyarat = () => {
      wSyarat.textContent = "";
      syarat.forEach((s, i) => {
        const b = el("div", "kg-baris-edit");
        const kiri = el("div");
        const teks = el("input");
        teks.type = "text";
        teks.maxLength = 200;
        teks.value = s.teks;
        teks.setAttribute("aria-label", "Syarat " + (i + 1));
        teks.addEventListener("input", () => { s.teks = teks.value; });
        const lb = el("label", "tg-cek");
        const cb = el("input");
        cb.type = "checkbox";
        cb.checked = s.wajib;
        cb.addEventListener("change", () => { s.wajib = cb.checked; });
        lb.append(cb, document.createTextNode("Wajib (bila tidak dicentang, jadi opsional)"));
        kiri.append(teks, lb);
        const hapus = tombol("tg-btn bahaya", "Hapus");
        hapus.setAttribute("aria-label", "Hapus syarat " + (i + 1));
        hapus.addEventListener("click", () => { syarat.splice(i, 1); gambarSyarat(); });
        b.append(kiri, hapus);
        wSyarat.appendChild(b);
      });
    };

    const gambarTemplat = () => {
      wTemplat.textContent = "";
      templat.forEach((m, i) => {
        const blok = el("div", "kg-templat-blok");
        const nama = el("input", "kg-teks");
        nama.type = "text";
        nama.maxLength = 40;
        nama.value = m.nama || "";
        nama.placeholder = "Nama kerangka (mis. Header)";
        nama.setAttribute("aria-label", "Nama kerangka awal " + (i + 1));
        nama.addEventListener("input", () => { m.nama = nama.value; });
        const pet = el("input", "kg-teks");
        pet.type = "text";
        pet.maxLength = 500;
        pet.value = m.petunjuk || "";
        pet.placeholder = "Catatan untuk kelompok (opsional, tidak masuk ke kode)";
        pet.setAttribute("aria-label", "Catatan kerangka " + (i + 1));
        pet.addEventListener("input", () => { m.petunjuk = pet.value; });
        const det = el("details");
        det.appendChild(el("summary", "", "Kerangka kode awal (opsional)"));
        BAHASA_TEMPLAT.forEach((k) => {
          const ta = el("textarea", "kg-teks");
          ta.rows = 3;
          ta.maxLength = 20000;
          ta.spellcheck = false;
          ta.value = m[k] || "";
          ta.placeholder = k.toUpperCase();
          ta.setAttribute("aria-label", "Kerangka " + k.toUpperCase() + " kerangka " + (i + 1));
          ta.addEventListener("input", () => { m[k] = ta.value; });
          det.appendChild(ta);
        });
        const hapus = tombol("tg-btn bahaya", "Hapus kerangka ini");
        hapus.addEventListener("click", () => { templat.splice(i, 1); gambarTemplat(); });
        blok.append(nama, pet, det, hapus);
        wTemplat.appendChild(blok);
      });
    };

    dialog({
      judul: t ? "Ubah tugas" : "Tugas baru",
      bangun: (isi) => {
        judul = isian(isi, "Judul tugas", "kg-f-judul", { maks: 100, nilai: t ? t.judul : "" });
        penjelasan = isian(isi, "Penjelasan", "kg-f-penjelasan", { baris: 6, maks: 5000, nilai: t ? t.penjelasan : "" });
        tenggat = isian(isi, "Tenggat (opsional)", "kg-f-tenggat", { tipe: "datetime-local", nilai: t ? keLokal(t.tenggat) : "" });

        isi.appendChild(el("label", "", "Syarat (maksimal 30)"));
        wSyarat = el("div");
        isi.appendChild(wSyarat);
        const tambahS = tombol("tg-btn", "+ Syarat");
        tambahS.addEventListener("click", () => { if (syarat.length < 30) { syarat.push({ teks: "", wajib: true }); gambarSyarat(); } });
        isi.appendChild(tambahS);

        isi.appendChild(el("label", "", "Kerangka awal (opsional, maksimal 14). Saat tugas diberikan, semua kerangka digabung menjadi satu berkas awal (HTML, CSS, JS) yang dikerjakan bersama; kelompok yang sudah mengerjakan tidak berubah."));
        wTemplat = el("div");
        isi.appendChild(wTemplat);
        const tambahT = tombol("tg-btn", "+ Kerangka awal");
        tambahT.addEventListener("click", () => { if (templat.length < 14) { templat.push({ nama: "", petunjuk: "", html: "", css: "", js: "" }); gambarTemplat(); } });
        isi.appendChild(tambahT);
        gambarSyarat();
        gambarTemplat();
        setTimeout(() => judul.focus(), 50);
      },
      aksi: async () => {
        await rpc("admin_tugas_simpan", {
          p_id: t ? t.id : null,
          p_judul: judul.value,
          p_penjelasan: penjelasan.value,
          p_tenggat: tenggat.value ? new Date(tenggat.value).toISOString() : null,
          p_syarat: syarat.map((s) => ({ id: s.id || null, teks: s.teks, wajib: s.wajib })),
          p_templat: templat.map((m) => ({ nama: m.nama, petunjuk: m.petunjuk || "", html: m.html || "", css: m.css || "", js: m.js || "" }))
        });
        await muat();
      }
    });
  }
  const BAHASA_TEMPLAT = ["html", "css", "js"];

  function bukaHapusTugas(t) {
    dialog({
      judul: "Hapus tugas?",
      ok: "Hapus",
      bahaya: true,
      bangun: (isi) => { isi.appendChild(el("p", "", "Tugas “" + t.judul + "” akan dihapus beserta pekerjaan dan kiriman semua kelompok yang mengerjakannya. Tidak bisa dikembalikan.")); },
      aksi: async () => { await rpc("admin_tugas_hapus", { p_id: t.id }); await muat(); }
    });
  }

  function bukaCabut(t, p) {
    dialog({
      judul: "Cabut tugas dari kelompok?",
      ok: "Cabut",
      bahaya: true,
      bangun: (isi) => { isi.appendChild(el("p", "", "Tugas “" + t.judul + "” dicabut dari kelompok " + p.kelompok + ". Kode dan kiriman kelompok untuk tugas ini ikut terhapus.")); },
      aksi: async () => { await rpc("admin_tugas_cabut", { p_penugasan: p.id }); await muat(); }
    });
  }

  // Memberi tugas ke kelompok. Salah satu dari t (tugas) atau k (kelompok) sudah diketahui.
  function bukaBeri(t, k) {
    let pilih;
    dialog({
      judul: "Beri tugas ke kelompok",
      ok: "Berikan",
      bangun: (isi) => {
        isi.appendChild(el("label", "", k ? "Tugas untuk " + k.nama : "Kelompok untuk tugas “" + t.judul + "”")).htmlFor = "kg-f-pilih";
        pilih = el("select", "kg-teks");
        pilih.id = "kg-f-pilih";
        const sumber = k ? tugas.map((x) => ({ id: x.id, teks: x.judul })) : kelompok.filter((x) => !x.diarsipkan).map((x) => ({ id: x.id, teks: x.nama }));
        sumber.forEach((x) => { const o = el("option", "", x.teks); o.value = x.id; pilih.appendChild(o); });
        isi.appendChild(pilih);
        isi.appendChild(el("p", "tg-sub", "Kelompok mendapat satu berkas kerja baru (berisi kerangka awal tugas bila ada). Maksimal 8 tugas yang belum diterima per kelompok."));
      },
      aksi: async () => {
        if (!pilih.value) throw new Error("Belum ada pilihan yang tersedia.");
        await rpc("admin_tugas_beri", { p_tugas: k ? pilih.value : t.id, p_kelompok: k ? k.id : pilih.value });
        await muat();
      }
    });
  }

  // ---------- Tinjau ----------

  const FILTER = [["dikirim", "Menunggu ditinjau"], ["perlu_revisi", "Perlu revisi"], ["diterima", "Diterima"], ["ditarik", "Ditarik"], ["semua", "Semua"]];

  function gambarKiriman() {
    const menunggu = kiriman.filter((k) => k.status === "dikirim").length;
    const h = $("kg-hitung");
    h.hidden = !menunggu;
    h.textContent = String(menunggu);

    const f = $("kg-filter");
    f.textContent = "";
    FILTER.forEach(([nilai, teks]) => {
      const b = tombol("", teks);
      b.setAttribute("aria-pressed", String(filterKiriman === nilai));
      b.addEventListener("click", () => { filterKiriman = nilai; gambarKiriman(); });
      f.appendChild(b);
    });

    const ul = $("kg-kirim-daftar");
    ul.textContent = "";
    const tampil = kiriman.filter((k) => filterKiriman === "semua" || k.status === filterKiriman);
    if (!tampil.length) ul.appendChild(el("li", "", "Tidak ada kiriman di kategori ini."));
    tampil.forEach((k) => {
      const li = el("li");
      const kepala = el("div", "tg-baris-aksi");
      kepala.appendChild(el("h3", "", k.tugas + " · " + k.kelompok));
      kepala.appendChild(lencana(k.status));
      if (k.terlambat) kepala.appendChild(el("span", "tg-label kg-terlambat", "Terlambat"));
      li.appendChild(kepala);
      li.appendChild(el("span", "tg-meta", "Kiriman " + k.nomor + " · " + waktu(k.dikirim) + (k.oleh ? " · oleh @" + k.oleh : "")));
      const buka = el("a", "tg-btn" + (k.status === "dikirim" ? " utama" : ""), k.status === "dikirim" ? "Tinjau" : "Lihat");
      buka.href = "kelompok-kiriman.html?dari=admin&id=" + encodeURIComponent(k.id);
      li.appendChild(buka);
      ul.appendChild(li);
    });
  }

  // ---------- Mulai ----------

  function pasangTab() {
    document.querySelectorAll(".tg-tab").forEach((t) => {
      t.addEventListener("click", () => {
        document.querySelectorAll(".tg-tab").forEach((x) => {
          const aktif = x === t;
          x.setAttribute("aria-selected", String(aktif));
          $("pn-" + x.dataset.t).hidden = !aktif;
        });
      });
    });
  }

  async function mulai() {
    const u = await K.wajibMasuk("admin-kelompok");
    if (!u) return;
    const tamu = $("tg-tamu");
    try {
      const p = await K.akun().profil();
      if (!p) { pesan("Akunmu belum bisa diperiksa. Muat ulang halaman ini.", true); return; }
      if (p.admin !== true) {
        pesan("");
        tamu.hidden = false;
        tamu.textContent = "";
        tamu.append(el("h2", "", "Khusus pengelola"), el("p", "", "Akunmu tidak punya akses ke halaman ini."));
        const a = el("a", "tg-btn", "Ke Tugas Kelompok");
        a.href = "kelompok.html";
        tamu.appendChild(a);
        return;
      }
    } catch (e) { pesan(e.message || "Akunmu belum bisa diperiksa.", true); return; }

    pasangTab();
    $("kg-kel-baru").addEventListener("click", () => bukaKelompok(null));
    $("kg-tugas-baru").addEventListener("click", () => bukaTugas(null));
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
