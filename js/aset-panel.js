// Panel "Aset": unggah gambar, lihat daftar, salin nama, hapus.
// Dipakai di editor Web (aset akun) dan editor kelompok (aset kelompok) lewat window.CodingSkanetraAsetPanel.pasang.
(() => {
  "use strict";

  function pasang(M, buka, opsi) {
  opsi = opsi || {};
  const kelompok = Boolean(opsi.kelompok);
  const bisaUbah = () => (typeof opsi.bisaUbah === "function" ? opsi.bisaUbah() : true);

  const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; };
  const KB = (b) => b >= 1048576 ? (b / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";

  const dlg = el("dialog", (kelompok ? "tg-dialog" : "alat-dialog") + " aset-dialog");
  dlg.setAttribute("aria-labelledby", "aset-judul");
  const judul = el("h2", "", kelompok ? "Aset gambar kelompok" : "Aset gambar"); judul.id = "aset-judul";
  const ket = el("p", "aset-ket");
  ket.append(kelompok ? "Gambar ini dipakai bersama seluruh anggota kelompok. Pakai namanya di kode: " : "Simpan gambar di akunmu, lalu pakai namanya di kode: ");
  const k1 = el("code", "", '<img src="kucing.png">'); ket.append(k1, " atau ", el("code", "", "background: url(kucing.png)"), kelompok ? ". Gambar tampil di Hasil utuh. Siapa pun di kelompok bisa menghapusnya, dan gambar tidak ikut terkirim bersama kode saat Submit." : ". Gambar tampil di pratinjau editor saat kamu masuk.");
  const kuota = el("p", "aset-kuota"); kuota.setAttribute("aria-live", "polite");
  const pilih = el("input"); pilih.type = "file"; pilih.multiple = true; pilih.accept = "image/png,image/jpeg,image/webp,image/gif"; pilih.hidden = true;
  const tombolUnggah = el("button", (kelompok ? "tg-btn utama" : "btn btn-primary") + " aset-unggah", "+ Unggah gambar"); tombolUnggah.type = "button";
  const status = el("p", "aset-status"); status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
  const daftarEl = el("ul", "aset-daftar");
  const tutup = el("button", kelompok ? "tg-btn" : "playground-reset", "Tutup"); tutup.type = "button";
  const aksi = el("div", "aset-aksi"); aksi.append(tombolUnggah, tutup);
  dlg.append(judul, ket, kuota, aksi, pilih, status, daftarEl);
  document.body.appendChild(dlg);

  let sibuk = false;
  const pesan = (t, galat) => { status.textContent = t || ""; status.classList.toggle("galat", Boolean(galat)); };

  async function salin(teks, label) {
    try { await navigator.clipboard.writeText(teks); pesan("Tersalin: " + label); }
    catch (e) { pesan("Tidak bisa menyalin otomatis. Salin manual: " + teks, true); }
  }

  function baris(a, tautan) {
    const li = el("li", "aset-baris");
    const gambar = el("div", "aset-mini");
    if (tautan) { const img = new Image(); img.alt = ""; img.src = tautan; gambar.appendChild(img); }
    const info = el("div", "aset-info");
    info.append(el("code", "aset-nama", a.nama), el("span", "aset-ukuran", KB(a.ukuran)));
    const tombol = el("div", "aset-tombol");
    const b1 = el("button", "aset-kecil", "Salin nama"); b1.type = "button";
    b1.addEventListener("click", () => salin(a.nama, a.nama));
    const b2 = el("button", "aset-kecil", "Salin <img>"); b2.type = "button";
    b2.addEventListener("click", () => salin('<img src="' + a.nama + '" alt="">', "tag img"));
    const b3 = el("button", "aset-kecil bahaya", "Hapus"); b3.type = "button";
    b3.hidden = !bisaUbah();
    b3.addEventListener("click", () => {
      if (b3.dataset.yakin !== "1") { b3.dataset.yakin = "1"; b3.textContent = "Yakin hapus?"; setTimeout(() => { b3.dataset.yakin = ""; b3.textContent = "Hapus"; }, 4000); return; }
      hapusAset(a.nama);
    });
    tombol.append(b1, b2, b3);
    li.append(gambar, info, tombol);
    return li;
  }

  async function muat() {
    const a = window.CodingSkanetraAkun;
    daftarEl.textContent = "";
    if (!a || !a.pengguna()) {
      kuota.textContent = "";
      tombolUnggah.disabled = true;
      const p = el("p", "aset-kosong");
      p.append(kelompok ? "Aset kelompok hanya bisa dipakai setelah masuk. " : "Aset gambar tersimpan di akunmu. ");
      const l = el("a", "", "Masuk dulu"); l.href = "login.html"; p.append(l, " untuk memakainya.");
      daftarEl.appendChild(p);
      return;
    }
    tombolUnggah.disabled = !bisaUbah();
    tombolUnggah.hidden = !bisaUbah();
    pesan("Memuat…");
    try {
      const [d, pem] = await Promise.all([M.segarkan(), M.pemakaian()]);
      const peta = M.peta();
      kuota.textContent = pem.jumlah + " dari " + pem.batasJumlah + " gambar · " + KB(pem.byte) + " terpakai";
      tombolUnggah.disabled = !bisaUbah() || pem.jumlah >= pem.batasJumlah;
      daftarEl.textContent = "";
      if (!d.length) daftarEl.appendChild(el("p", "aset-kosong", "Belum ada gambar. Klik Unggah gambar untuk mulai."));
      d.forEach((x) => daftarEl.appendChild(baris(x, peta[x.nama])));
      pesan(pem.jumlah >= pem.batasJumlah ? "Jumlah gambar sudah penuh. Hapus yang tidak dipakai dulu." : "", pem.jumlah >= pem.batasJumlah);
    } catch (e) { pesan(e.message, true); }
  }

  async function hapusAset(nama) {
    if (sibuk) return; sibuk = true;
    try { await M.hapus(nama); pesan("Dihapus: " + nama); await muat(); pesan("Dihapus: " + nama); if (opsi.saatBerubah) opsi.saatBerubah(); }
    catch (e) { pesan(e.message, true); }
    sibuk = false;
  }

  async function unggahBerkas(berkas) {
    if (sibuk) return; sibuk = true; tombolUnggah.disabled = true;
    const hasil = [];
    for (const f of berkas) {
      pesan("Mengunggah " + f.name + "…");
      try {
        const r = await M.unggah(f);
        hasil.push(r.nama + (r.dikecilkan ? " (dikecilkan " + KB(r.ukuranAsal) + " → " + KB(r.ukuran) + ")" : ""));
      } catch (e) { pesan(f.name + ": " + e.message, true); sibuk = false; await muat(); pesan(f.name + ": " + e.message, true); return; }
    }
    sibuk = false;
    await muat();
    pesan("Tersimpan: " + hasil.join(", ") + ". Pakai namanya di kode.");
    if (opsi.saatBerubah) opsi.saatBerubah();
  }

  // Muat daftar + tautan di latar belakang supaya pratinjau langsung bisa menampilkan gambar.
  const praMuat = () => { try { M.siapkan(); } catch (e) { /* abaikan */ } };
  if (!kelompok) {
    window.addEventListener("load", () => setTimeout(praMuat, 600));
    window.addEventListener("cs:akun", praMuat);
  }

  tombolUnggah.addEventListener("click", () => pilih.click());
  pilih.addEventListener("change", () => { const b = Array.from(pilih.files || []); pilih.value = ""; if (b.length) unggahBerkas(b); });
  tutup.addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  buka.addEventListener("click", () => { pesan(""); if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", ""); muat(); });
  }

  window.CodingSkanetraAsetPanel = { pasang };
  const bukaWeb = document.getElementById("aset-buka");
  if (window.CodingSkanetraAset && bukaWeb) pasang(window.CodingSkanetraAset, bukaWeb);
})();
