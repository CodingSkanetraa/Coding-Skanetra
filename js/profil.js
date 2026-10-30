// Halaman Profil: akun yang sedang aktif, ubah password, status sinkron, dan keluar.
(() => {
  "use strict";
  const akun = window.CodingSkanetraAkun;
  const $ = (id) => document.getElementById(id);
  const el = {
    tamu: $("profil-tamu"), isi: $("profil-isi"), avatar: $("profil-avatar"), username: $("profil-username"),
    status: $("profil-status"), baris: $("profil-username-baris"),
    barisNama: $("baris-nama"), nama: $("profil-nama"), barisKelas: $("baris-kelas"), kelas: $("profil-kelas"),
    buka: $("ubah-sandi-buka"), form: $("form-sandi"), baru: $("sandi-baru"), ulang: $("sandi-ulang"),
    lihat: $("sandi-lihat"), pesan: $("sandi-pesan"), simpan: $("sandi-simpan"), batal: $("sandi-batal"),
    sukses: $("sandi-sukses"), sinkron: $("profil-sinkron"), keluar: $("profil-keluar"),
    fotoFile: $("foto-file"), fotoGanti: $("foto-ganti"), fotoHapus: $("foto-hapus"), fotoPesan: $("foto-pesan"),
    tautan: $("profil-tautan"), tautanPesan: $("tautan-pesan"), tautanDaftar: $("tautan-daftar")
  };
  if (!el.tamu || !el.isi || !akun) return;

  let data = null; // { nama, kelas, anggota } dari server; null = belum dimuat

  function tampilSinkron() {
    if (!akun.pengguna()) { el.sinkron.hidden = true; return; }
    const s = akun.sinkron.status();
    el.sinkron.hidden = false;
    if (s.galat) el.sinkron.textContent = "Sinkronisasi bermasalah: " + s.galat + " Akan dicoba lagi.";
    else if (s.besar) el.sinkron.textContent = "Ada kode yang terlalu besar untuk disimpan di akun. Kode itu tetap aman di perangkat ini.";
    else if (s.menunggu) el.sinkron.textContent = "Menyimpan perubahan ke akun…";
    else if (s.terakhir) el.sinkron.textContent = "Progres tersimpan di akun pada " + new Date(s.terakhir).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + ".";
    else el.sinkron.textContent = "Belum ada progres yang disimpan ke akun.";
  }

  function tutupForm() {
    el.form.hidden = true;
    el.buka.setAttribute("aria-expanded", "false");
    el.baru.value = ""; el.ulang.value = ""; el.lihat.checked = false;
    el.baru.type = "password"; el.ulang.type = "password";
    pesan("");
  }

  function pesan(teks, galat) {
    el.pesan.textContent = teks || "";
    el.pesan.classList.toggle("galat", Boolean(galat));
  }

  function gambarAvatar() {
    const p = akun.pengguna();
    if (!p) return;
    el.avatar.textContent = "";
    if (window.CodingSkanetraAvatar) el.avatar.appendChild(window.CodingSkanetraAvatar.buat(p.username, "besar"));
    el.fotoHapus.hidden = !akun.foto();
  }

  function render() {
    const p = akun.pengguna();
    el.tamu.hidden = Boolean(p);
    el.isi.hidden = !p;
    if (!p) { tutupForm(); el.tautan.hidden = true; return; }
    el.username.textContent = "@" + p.username;
    el.baris.textContent = "@" + p.username;
    gambarAvatar();
    el.barisNama.hidden = !(data && data.nama);
    el.barisKelas.hidden = !(data && data.kelas);
    if (data && data.nama) el.nama.textContent = data.nama;
    if (data && data.kelas) el.kelas.textContent = data.kelas;
    el.status.textContent = data === null ? "Akunmu aktif di perangkat ini."
      : data.anggota ? "Anggota: halaman Peringkat terbuka untukmu."
      : "Halaman Peringkat terbuka setelah pengelola menyetujui akunmu.";
    tampilSinkron();
  }

  async function muat() {
    data = null;
    if (!akun.pengguna()) { render(); return; }
    render();
    muatTautan();
    akun.muatFoto().catch(() => {});
    try {
      const pr = await akun.profil();
      data = { nama: (pr && pr.nama) || "", kelas: (pr && pr.kelas) || "", anggota: Boolean(pr && pr.anggota) };
    } catch (e) { data = null; }
    render();
  }

  // ---------- Foto profil ----------
  const POLA_FOTO = /^data:image\/(webp|jpeg);base64,[A-Za-z0-9+/]+=*$/;
  const TARGET_FOTO = 45000; // karakter; batas di database 60000

  function pesanFoto(teks, galat) {
    el.fotoPesan.textContent = teks || "";
    el.fotoPesan.classList.toggle("galat", Boolean(galat));
  }

  function bacaGambar(file) {
    return new Promise((ok, gagal) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); ok(img); };
      img.onerror = () => { URL.revokeObjectURL(url); gagal(new Error("tidak bisa dibuka")); };
      img.src = url;
    });
  }

  // Memotong persegi dari tengah, mengecilkan ke 256 px (lalu lebih kecil bila perlu), dan memilih WebP (cadangan JPEG).
  async function jadikanFoto(file) {
    if (!/^image\//.test(file.type)) throw new Error("Pilih berkas gambar (JPG, PNG, atau WebP).");
    if (file.size > 12 * 1024 * 1024) throw new Error("Foto terlalu besar (maksimal 12 MB). Pilih foto yang lebih kecil.");
    let gambar;
    try { gambar = await createImageBitmap(file, { imageOrientation: "from-image" }); }
    catch (e) {
      try { gambar = await bacaGambar(file); }
      catch (e2) { throw new Error("Format foto ini tidak bisa dibuka browser. Coba JPG atau PNG."); }
    }
    const w = gambar.width || gambar.naturalWidth;
    const h = gambar.height || gambar.naturalHeight;
    if (!w || !h) throw new Error("Foto tidak terbaca. Coba foto lain.");
    const sisi = Math.min(w, h);
    for (const ukuran of [256, 192, 128]) {
      const kanvas = document.createElement("canvas");
      kanvas.width = ukuran; kanvas.height = ukuran;
      const x = kanvas.getContext("2d");
      x.imageSmoothingEnabled = true;
      x.imageSmoothingQuality = "high";
      x.drawImage(gambar, (w - sisi) / 2, (h - sisi) / 2, sisi, sisi, 0, 0, ukuran, ukuran);
      for (const mutu of [0.85, 0.75, 0.6, 0.45]) {
        let d = kanvas.toDataURL("image/webp", mutu);
        if (!d.startsWith("data:image/webp")) {
          // Browser tanpa dukungan WebP: pakai JPEG di atas latar putih (JPEG tidak punya transparansi).
          const k2 = document.createElement("canvas");
          k2.width = ukuran; k2.height = ukuran;
          const x2 = k2.getContext("2d");
          x2.fillStyle = "#ffffff"; x2.fillRect(0, 0, ukuran, ukuran);
          x2.drawImage(kanvas, 0, 0);
          d = k2.toDataURL("image/jpeg", mutu);
        }
        if (d.length <= TARGET_FOTO && POLA_FOTO.test(d)) {
          if (gambar.close) gambar.close();
          return d;
        }
      }
    }
    if (gambar.close) gambar.close();
    throw new Error("Foto tidak bisa dikecilkan cukup kecil. Coba foto lain.");
  }

  el.fotoGanti.addEventListener("click", () => { pesanFoto(""); el.fotoFile.click(); });
  el.fotoFile.addEventListener("change", async () => {
    const file = el.fotoFile.files && el.fotoFile.files[0];
    el.fotoFile.value = "";
    if (!file) return;
    el.fotoGanti.disabled = true; el.fotoHapus.disabled = true;
    pesanFoto("Memproses foto…");
    try {
      const d = await jadikanFoto(file);
      await akun.ubahFoto(d);
      pesanFoto("Foto profil diperbarui.");
    } catch (e) { pesanFoto((e && e.message) || "Foto belum bisa diganti. Coba lagi.", true); }
    el.fotoGanti.disabled = false; el.fotoHapus.disabled = false;
  });
  el.fotoHapus.addEventListener("click", async () => {
    if (!window.confirm("Hapus foto profil? Tampilan kembali ke huruf username.")) return;
    el.fotoGanti.disabled = true; el.fotoHapus.disabled = true;
    pesanFoto("Menghapus…");
    try { await akun.hapusFoto(); pesanFoto("Foto profil dihapus."); }
    catch (e) { pesanFoto((e && e.message) || "Foto belum terhapus. Coba lagi.", true); }
    el.fotoGanti.disabled = false; el.fotoHapus.disabled = false;
  });
  window.addEventListener("cs:foto", gambarAvatar);

  // ---------- Tautan Bagikan aktif ----------
  const EDITOR = { web: ["Editor Web", "editor-html.html"], py: ["Editor Python", "editor-python.html"], cpp: ["Editor C++", "editor-cpp.html"] };
  const POLA_KODE = /^[0-9a-f]{12}$/;

  function pesanTautan(teks, galat) {
    el.tautanPesan.textContent = teks || "";
    el.tautanPesan.classList.toggle("galat", Boolean(galat));
  }

  function waktu(iso) {
    try { return new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
    catch (e) { return ""; }
  }

  async function salinTeks(teks) {
    try { await navigator.clipboard.writeText(teks); return true; }
    catch (e) { window.prompt("Salin tautan ini (Ctrl + C):", teks); return false; }
  }

  async function muatTautan() {
    if (!akun.pengguna()) { el.tautan.hidden = true; return; }
    el.tautan.hidden = false;
    pesanTautan("Memuat…");
    let baris;
    try { baris = await akun.ambil("bagikan?select=kode,jenis,nama,dibuat,kedaluwarsa&order=dibuat.desc"); }
    catch (e) { pesanTautan("Daftar tautan belum bisa dimuat. Muat ulang halaman ini.", true); return; }
    el.tautanDaftar.textContent = "";
    const aktif = (Array.isArray(baris) ? baris : []).filter((b) => b && POLA_KODE.test(String(b.kode)) && EDITOR[b.jenis]);
    pesanTautan(aktif.length ? "" : "Belum ada tautan aktif. Buat dari tombol Bagikan di editor.");
    aktif.forEach((b) => {
      const li = document.createElement("li");
      li.className = "profil-tautan-baris";
      const teks = document.createElement("div");
      teks.className = "profil-tautan-teks";
      const judul = document.createElement("strong");
      judul.textContent = EDITOR[b.jenis][0] + (b.nama ? " · " + b.nama : "");
      const sisa = Math.max(0, Math.ceil((new Date(b.kedaluwarsa).getTime() - Date.now()) / 86400000));
      const info = document.createElement("span");
      info.textContent = "Berlaku sampai " + waktu(b.kedaluwarsa) + " (sisa " + sisa + " hari)";
      teks.append(judul, info);
      const salin = document.createElement("button");
      salin.type = "button"; salin.className = "profil-tombol"; salin.textContent = "Salin";
      const hapus = document.createElement("button");
      hapus.type = "button"; hapus.className = "profil-tombol bahaya"; hapus.textContent = "Hapus";
      salin.addEventListener("click", async () => {
        const url = new URL(EDITOR[b.jenis][1], location.href).href + "#b=" + b.kode;
        const ok = await salinTeks(url);
        if (ok) { salin.textContent = "Tersalin"; setTimeout(() => { salin.textContent = "Salin"; }, 1600); }
      });
      hapus.addEventListener("click", async () => {
        if (!window.confirm("Hapus tautan ini? Orang yang punya tautannya tidak bisa membukanya lagi.")) return;
        hapus.disabled = true;
        try {
          const res = await akun.minta("/rest/v1/bagikan?kode=eq." + b.kode, { metode: "DELETE" });
          if (!res.ok) throw new Error("gagal");
          await muatTautan();
        } catch (e) { hapus.disabled = false; pesanTautan("Tautan belum terhapus. Coba lagi.", true); }
      });
      li.append(teks, salin, hapus);
      el.tautanDaftar.appendChild(li);
    });
  }

  el.buka.addEventListener("click", () => {
    el.sukses.hidden = true;
    if (!el.form.hidden) { tutupForm(); return; }
    el.form.hidden = false;
    el.buka.setAttribute("aria-expanded", "true");
    el.baru.focus();
  });
  el.batal.addEventListener("click", () => { tutupForm(); el.buka.focus(); });
  el.lihat.addEventListener("change", () => {
    const tipe = el.lihat.checked ? "text" : "password";
    el.baru.type = tipe; el.ulang.type = tipe;
  });

  el.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const baru = el.baru.value;
    if (baru.length < 6) { pesan("Password minimal 6 karakter.", true); el.baru.focus(); return; }
    if (baru !== el.ulang.value) { pesan("Kedua password belum sama. Ketik ulang dengan teliti.", true); el.ulang.focus(); return; }
    el.simpan.disabled = true;
    pesan("Menyimpan…");
    try {
      await akun.ubahPassword(baru);
      tutupForm();
      el.sukses.hidden = false;
      el.buka.focus();
    } catch (err) {
      pesan((err && err.message) || "Password belum bisa diubah. Coba lagi.", true);
    }
    el.simpan.disabled = false;
  });

  el.keluar.addEventListener("click", async () => {
    if (!window.confirm("Keluar dari akun? Kode di perangkat ini akan dihapus dari browser (tetap aman di akunmu).")) return;
    el.keluar.disabled = true;
    try { await akun.keluar(); }
    catch (err) {
      if (window.confirm(err.message + "\nKeluar tetap? Perubahan terakhir yang belum terkirim akan hilang dari perangkat ini.")) await akun.keluar({ paksa: true });
    }
    el.keluar.disabled = false;
    render();
  });

  window.addEventListener("cs:akun", muat);
  window.addEventListener("cs:sinkron-status", tampilSinkron);
  akun.siap.then(muat);
})();
