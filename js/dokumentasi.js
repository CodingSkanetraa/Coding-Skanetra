// Halaman Dokumentasi: membuat kartu otomatis dari daftar di js/dokumentasi-data.js.
//   * Klik kartu: jendela detail (foto, judul, tanggal, lokasi, deskripsi) dengan tombol sebelumnya/berikutnya.
//   * Klik foto di detail: tampilan penuh dengan zoom (tombol, roda mouse, klik dua kali), geser, dan layar penuh.
// Foto diambil dari folder assets/dokumentasi/ (berkas lokal, tanpa layanan luar).
(() => {
  "use strict";

  const FOLDER = "../assets/dokumentasi/";
  // Nama berkas aman: tanpa "..", tanpa awalan "/", hanya ekstensi gambar.
  const POLA_FOTO = /^(?:[\w][\w .()+-]*\/)*[\w][\w .()+-]*\.(?:jpe?g|png|webp|avif|gif)$/i;
  const ZOOM_MIN = 1;
  const ZOOM_MAX = 6;

  const grid = document.getElementById("dok-grid");
  const kosong = document.getElementById("dok-kosong");
  const jumlah = document.getElementById("dok-jumlah");
  const catatan = document.getElementById("dok-catatan");
  if (!grid) return;

  const el = (tag, kelas, teks) => {
    const e = document.createElement(tag);
    if (kelas) e.className = kelas;
    if (teks !== undefined) e.textContent = teks;
    return e;
  };
  const tombol = (kelas, teks, label) => {
    const b = el("button", kelas, teks);
    b.type = "button";
    if (label) b.setAttribute("aria-label", label);
    return b;
  };

  // ---------- Data ----------
  function bacaTanggal(teks) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(teks || "").trim());
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    // Tolak tanggal yang tidak ada (mis. 2026-02-31): bulan dan hari harus kembali sama.
    return d.getFullYear() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]) ? d : null;
  }

  function formatTanggal(d) {
    try { return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }); }
    catch (e) { return d.toISOString().slice(0, 10); }
  }

  const masalah = [];
  const sumber = Array.isArray(window.DOKUMENTASI) ? window.DOKUMENTASI : [];
  const daftar = [];
  sumber.forEach((d, i) => {
    const nomor = "Item ke-" + (i + 1);
    if (!d || typeof d !== "object") { masalah.push(nomor + ": bukan blok { ... }."); return; }
    const foto = String(d.foto || "").trim();
    if (!POLA_FOTO.test(foto)) { masalah.push(nomor + ": nama foto tidak valid (\"" + foto + "\")."); return; }
    const tanggal = bacaTanggal(d.tanggal);
    if (d.tanggal && !tanggal) masalah.push(nomor + ": tanggal \"" + d.tanggal + "\" tidak dikenali, tulis seperti 2026-10-12.");
    daftar.push({
      urut: i,
      foto,
      src: FOLDER + foto.split("/").map(encodeURIComponent).join("/"),
      judul: String(d.judul || "").trim().slice(0, 120) || "Tanpa judul",
      tanggal,
      lokasi: String(d.lokasi || "").trim().slice(0, 80),
      deskripsi: String(d.deskripsi || "").trim().slice(0, 1500)
    });
  });
  // Terbaru dulu; yang tanpa tanggal di akhir. Sort stabil: tanggal sama mengikuti urutan penulisan.
  daftar.sort((a, b) => (b.tanggal ? b.tanggal.getTime() : -Infinity) - (a.tanggal ? a.tanggal.getTime() : -Infinity) || a.urut - b.urut);

  if (masalah.length) {
    try { console.warn("[Dokumentasi] Ada data yang dilewati atau perlu diperbaiki:\n- " + masalah.join("\n- ")); } catch (e) { /* abaikan */ }
    if (catatan && /^(localhost|127\.|\[::1\])/.test(location.hostname)) {
      catatan.hidden = false;
      catatan.textContent = masalah.length + " item di dokumentasi-data.js perlu diperbaiki (hanya terlihat di komputer lokal): " + masalah.join(" ");
    }
  }

  if (jumlah) jumlah.textContent = daftar.length ? daftar.length + " foto" : "";
  if (!daftar.length) { if (kosong) kosong.hidden = false; return; }

  // ---------- Foto yang gagal dimuat ----------
  function tandaiGagal(wadah, item) {
    if (wadah.dataset.gagal) return;
    wadah.dataset.gagal = "1";
    wadah.classList.add("gagal");
    const img = wadah.querySelector("img");
    if (img) img.hidden = true;
    wadah.appendChild(el("span", "dok-gagal", "Foto belum tersedia"));
    try { console.warn("[Dokumentasi] Foto tidak ditemukan: assets/dokumentasi/" + item.foto); } catch (e) { /* abaikan */ }
  }

  function buatFoto(item, kelas, alt, eager) {
    const wadah = el("span", kelas);
    const img = el("img");
    img.alt = alt;
    img.decoding = "async";
    if (!eager) img.loading = "lazy";
    img.addEventListener("error", () => tandaiGagal(wadah, item));
    img.src = item.src;
    wadah.appendChild(img);
    return wadah;
  }

  // ---------- Kartu ----------
  daftar.forEach((item, idx) => {
    const kartu = tombol("dok-kartu");
    kartu.dataset.idx = String(idx);
    kartu.appendChild(buatFoto(item, "dok-kartu-foto", "", false));
    const isi = el("span", "dok-kartu-isi");
    isi.appendChild(el("span", "dok-kartu-judul", item.judul));
    if (item.tanggal) isi.appendChild(el("span", "dok-kartu-tanggal", formatTanggal(item.tanggal)));
    if (item.deskripsi) isi.appendChild(el("span", "dok-kartu-deskripsi", item.deskripsi));
    kartu.appendChild(isi);
    grid.appendChild(kartu);
  });

  // ---------- Kunci scroll saat jendela terbuka ----------
  let terbuka = 0;
  const kunci = (ya) => {
    terbuka = Math.max(0, terbuka + (ya ? 1 : -1));
    document.documentElement.classList.toggle("dok-terkunci", terbuka > 0);
  };

  function bukaModal(dlg) {
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    kunci(true);
  }

  // ---------- Jendela detail ----------
  const detail = el("dialog", "dok-dialog");
  detail.setAttribute("aria-labelledby", "dok-d-judul");
  const dFotoBtn = tombol("dok-d-fotobtn", "", "Perbesar foto");
  const dFotoWadah = el("span", "dok-d-fotowadah");
  dFotoBtn.appendChild(dFotoWadah);
  dFotoBtn.appendChild(el("span", "dok-d-perbesar", "Perbesar"));
  const dInfo = el("div", "dok-d-info");
  const dJudul = el("h2", "dok-d-judul");
  dJudul.id = "dok-d-judul";
  const dMeta = el("p", "dok-d-meta");
  const dDeskripsi = el("p", "dok-d-deskripsi");
  const dNav = el("div", "dok-d-nav");
  const dSebelum = tombol("dok-btn", "‹ Sebelumnya", "Foto sebelumnya");
  const dHitung = el("span", "dok-d-hitung");
  const dBerikut = tombol("dok-btn", "Berikutnya ›", "Foto berikutnya");
  dNav.append(dSebelum, dHitung, dBerikut);
  const dTutup = tombol("dok-tutup", "✕", "Tutup");
  dInfo.append(dJudul, dMeta, dDeskripsi, dNav);
  detail.append(dTutup, dFotoBtn, dInfo);
  document.body.appendChild(detail);

  let sekarang = 0;
  let pembuka = null;
  const cache = new Map();
  const praMuat = (i) => {
    const item = daftar[(i + daftar.length) % daftar.length];
    if (!item || cache.has(item.src)) return;
    const im = new Image();
    im.src = item.src;
    cache.set(item.src, im);
  };

  function tampilDetail(i) {
    sekarang = (i + daftar.length) % daftar.length;
    const item = daftar[sekarang];
    dFotoWadah.textContent = "";
    delete dFotoWadah.dataset.gagal;
    dFotoWadah.className = "dok-d-fotowadah";
    const img = el("img");
    img.alt = item.judul;
    img.decoding = "async";
    img.addEventListener("error", () => tandaiGagal(dFotoWadah, item));
    img.src = item.src;
    dFotoWadah.appendChild(img);
    dFotoBtn.disabled = false;
    dJudul.textContent = item.judul;
    dMeta.textContent = "";
    if (item.tanggal) {
      const t = el("time", "dok-chip", formatTanggal(item.tanggal));
      t.dateTime = item.tanggal.getFullYear() + "-" + String(item.tanggal.getMonth() + 1).padStart(2, "0") + "-" + String(item.tanggal.getDate()).padStart(2, "0");
      dMeta.appendChild(t);
    }
    if (item.lokasi) dMeta.appendChild(el("span", "dok-chip", item.lokasi));
    dMeta.hidden = !dMeta.childNodes.length;
    dDeskripsi.textContent = item.deskripsi || "Belum ada deskripsi untuk foto ini.";
    dDeskripsi.classList.toggle("kosong", !item.deskripsi);
    dHitung.textContent = (sekarang + 1) + " / " + daftar.length;
    const satu = daftar.length < 2;
    dSebelum.disabled = satu; dBerikut.disabled = satu;
    detail.scrollTop = 0;
    praMuat(sekarang + 1); praMuat(sekarang - 1);
  }

  function bukaDetail(i, dari) {
    pembuka = dari || null;
    tampilDetail(i);
    if (!detail.open) bukaModal(detail);
  }

  grid.addEventListener("click", (e) => {
    const kartu = e.target.closest && e.target.closest(".dok-kartu");
    if (kartu) bukaDetail(Number(kartu.dataset.idx), kartu);
  });
  dSebelum.addEventListener("click", () => tampilDetail(sekarang - 1));
  dBerikut.addEventListener("click", () => tampilDetail(sekarang + 1));
  dTutup.addEventListener("click", () => detail.close());
  detail.addEventListener("click", (e) => { if (e.target === detail) detail.close(); });
  detail.addEventListener("close", () => {
    kunci(false);
    if (pembuka && document.contains(pembuka)) pembuka.focus();
  });
  detail.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); tampilDetail(sekarang - 1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); tampilDetail(sekarang + 1); }
  });

  // ---------- Tampilan penuh (lightbox) ----------
  const lb = el("dialog", "dok-lb");
  lb.setAttribute("aria-label", "Foto diperbesar");
  const panggung = el("div", "dok-lb-panggung");
  panggung.tabIndex = 0;
  const lbImg = el("img", "dok-lb-img");
  lbImg.draggable = false;
  panggung.appendChild(lbImg);
  const lbGagal = el("p", "dok-lb-gagal", "Foto belum tersedia");
  lbGagal.hidden = true;
  const lbBar = el("div", "dok-lb-bar");
  const lbHitung = el("span", "dok-lb-hitung");
  const lbKecil = tombol("dok-lb-btn", "−", "Perkecil");
  const lbPersen = tombol("dok-lb-btn dok-lb-persen", "100%", "Kembalikan ukuran pas layar");
  const lbBesar = tombol("dok-lb-btn", "+", "Perbesar");
  const lbPenuh = tombol("dok-lb-btn", "⛶", "Layar penuh");
  const lbTutup = tombol("dok-lb-btn", "✕", "Tutup");
  const grupZoom = el("span", "dok-lb-grup");
  grupZoom.append(lbKecil, lbPersen, lbBesar);
  lbBar.append(lbHitung, grupZoom, lbPenuh, lbTutup);
  const lbKiri = tombol("dok-lb-panah kiri", "‹", "Foto sebelumnya");
  const lbKanan = tombol("dok-lb-panah kanan", "›", "Foto berikutnya");
  const lbCap = el("div", "dok-lb-cap");
  const lbCapJudul = el("strong");
  const lbCapTgl = el("span");
  lbCap.append(lbCapJudul, lbCapTgl);
  lb.append(panggung, lbGagal, lbBar, lbKiri, lbKanan, lbCap);
  document.body.appendChild(lb);

  let zoom = 1;
  let masukPenuh = false;
  const bisaPenuh = Boolean(document.fullscreenEnabled && document.documentElement.requestFullscreen);
  lbPenuh.hidden = !bisaPenuh;

  // Ukuran gambar pada zoom 1: sepenuh layar (muat utuh). Zoom lain adalah kelipatannya.
  function terapkanUkuran(fx, fy) {
    const nw = lbImg.naturalWidth, nh = lbImg.naturalHeight;
    if (!nw || !nh) return;
    const vw = panggung.clientWidth, vh = panggung.clientHeight;
    const pas = Math.min(vw / nw, vh / nh);
    const lamaW = lbImg.offsetWidth, lamaH = lbImg.offsetHeight;
    // Titik fokus (relatif terhadap gambar) dipertahankan saat zoom berubah.
    const fokusX = fx === undefined ? vw / 2 : fx;
    const fokusY = fy === undefined ? vh / 2 : fy;
    const rx = lamaW ? (panggung.scrollLeft + fokusX - Math.max(0, (vw - lamaW) / 2)) / lamaW : 0.5;
    const ry = lamaH ? (panggung.scrollTop + fokusY - Math.max(0, (vh - lamaH) / 2)) / lamaH : 0.5;
    const w = nw * pas * zoom, h = nh * pas * zoom;
    lbImg.style.width = w + "px";
    lbImg.style.height = h + "px";
    panggung.classList.toggle("diperbesar", zoom > 1.001);
    // Gambar yang lebih kecil dari layar berada di tengah (tidak bisa digulir); yang lebih besar mulai dari tepi.
    panggung.scrollLeft = Math.max(0, Math.max(0, (vw - w) / 2) + rx * w - fokusX);
    panggung.scrollTop = Math.max(0, Math.max(0, (vh - h) / 2) + ry * h - fokusY);
    lbPersen.textContent = Math.round(zoom * 100) + "%";
    lbKecil.disabled = zoom <= ZOOM_MIN + 0.001;
    lbBesar.disabled = zoom >= ZOOM_MAX - 0.001;
  }

  function setZoom(z, fx, fy) {
    zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
    terapkanUkuran(fx, fy);
  }

  function tampilLb(i) {
    sekarang = (i + daftar.length) % daftar.length;
    const item = daftar[sekarang];
    zoom = 1;
    lbGagal.hidden = true;
    lbImg.hidden = false;
    lbImg.style.width = ""; lbImg.style.height = "";
    lbImg.alt = item.judul;
    lbImg.onload = () => terapkanUkuran();
    lbImg.onerror = () => { lbImg.hidden = true; lbGagal.hidden = false; };
    lbImg.src = item.src;
    if (lbImg.complete && lbImg.naturalWidth) terapkanUkuran();
    lbHitung.textContent = (sekarang + 1) + " / " + daftar.length;
    lbCapJudul.textContent = item.judul;
    lbCapTgl.textContent = item.tanggal ? formatTanggal(item.tanggal) : "";
    const satu = daftar.length < 2;
    lbKiri.hidden = satu; lbKanan.hidden = satu;
    lbPersen.textContent = "100%";
    panggung.scrollLeft = 0; panggung.scrollTop = 0;
    praMuat(sekarang + 1); praMuat(sekarang - 1);
    tampilDetail(sekarang); // detail di belakang ikut berpindah, jadi setelah ditutup tetap sinkron
  }

  function bukaLb() {
    bukaModal(lb);
    tampilLb(sekarang);
    lbTutup.focus({ preventScroll: true });
  }

  const keluarPenuh = () => {
    if (masukPenuh && document.fullscreenElement) { try { document.exitFullscreen(); } catch (e) { /* abaikan */ } }
    masukPenuh = false;
  };

  dFotoBtn.addEventListener("click", () => { if (!dFotoWadah.dataset.gagal) bukaLb(); });
  lbTutup.addEventListener("click", () => lb.close());
  lb.addEventListener("close", () => { kunci(false); keluarPenuh(); lbImg.removeAttribute("src"); });
  lbKiri.addEventListener("click", () => tampilLb(sekarang - 1));
  lbKanan.addEventListener("click", () => tampilLb(sekarang + 1));
  lbKecil.addEventListener("click", () => setZoom(zoom / 1.4));
  lbBesar.addEventListener("click", () => setZoom(zoom * 1.4));
  lbPersen.addEventListener("click", () => setZoom(1));
  lbPenuh.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) { await document.exitFullscreen(); masukPenuh = false; }
      else { await document.documentElement.requestFullscreen(); masukPenuh = true; }
    } catch (e) { /* ditolak browser: abaikan */ }
  });
  document.addEventListener("fullscreenchange", () => {
    lbPenuh.textContent = document.fullscreenElement ? "⤫" : "⛶";
    lbPenuh.setAttribute("aria-label", document.fullscreenElement ? "Keluar layar penuh" : "Layar penuh");
    if (lb.open) window.setTimeout(() => terapkanUkuran(), 80);
  });
  window.addEventListener("resize", () => { if (lb.open) terapkanUkuran(); });

  // Klik dua kali: zoom ke titik yang diklik, atau kembali ke pas layar.
  panggung.addEventListener("dblclick", (e) => {
    const r = panggung.getBoundingClientRect();
    if (zoom > 1.001) setZoom(1); else setZoom(2.5, e.clientX - r.left, e.clientY - r.top);
  });
  // Roda mouse: zoom di titik kursor.
  panggung.addEventListener("wheel", (e) => {
    e.preventDefault();
    const r = panggung.getBoundingClientRect();
    setZoom(zoom * (e.deltaY < 0 ? 1.18 : 1 / 1.18), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // Geser dengan mouse saat diperbesar (di layar sentuh, geser memakai scroll bawaan).
  let seret = null;
  panggung.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || zoom <= 1.001) return;
    seret = { x: e.clientX, y: e.clientY, sl: panggung.scrollLeft, st: panggung.scrollTop };
    panggung.setPointerCapture(e.pointerId);
    panggung.classList.add("menggeser");
  });
  panggung.addEventListener("pointermove", (e) => {
    if (!seret) return;
    panggung.scrollLeft = seret.sl - (e.clientX - seret.x);
    panggung.scrollTop = seret.st - (e.clientY - seret.y);
  });
  const selesaiSeret = () => { seret = null; panggung.classList.remove("menggeser"); };
  panggung.addEventListener("pointerup", selesaiSeret);
  panggung.addEventListener("pointercancel", selesaiSeret);

  // Klik area gelap di luar gambar (saat belum diperbesar) menutup tampilan penuh.
  panggung.addEventListener("click", (e) => {
    if (e.target === panggung && zoom <= 1.001) lb.close();
  });

  lb.addEventListener("keydown", (e) => {
    if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); tampilLb(sekarang - 1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); tampilLb(sekarang + 1); }
    else if (e.key === "+" || e.key === "=") { e.preventDefault(); setZoom(zoom * 1.4); }
    else if (e.key === "-" || e.key === "_") { e.preventDefault(); setZoom(zoom / 1.4); }
    else if (e.key === "0") { e.preventDefault(); setZoom(1); }
    else if ((e.key === "f" || e.key === "F") && bisaPenuh) { e.preventDefault(); lbPenuh.click(); }
  });
})();
