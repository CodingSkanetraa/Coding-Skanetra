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
    sukses: $("sandi-sukses"), sinkron: $("profil-sinkron"), keluar: $("profil-keluar")
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

  function render() {
    const p = akun.pengguna();
    el.tamu.hidden = Boolean(p);
    el.isi.hidden = !p;
    if (!p) { tutupForm(); return; }
    el.username.textContent = "@" + p.username;
    el.baris.textContent = "@" + p.username;
    el.avatar.textContent = "";
    if (window.CodingSkanetraAvatar) el.avatar.appendChild(window.CodingSkanetraAvatar.buat(p.username, "besar"));
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
    try {
      const pr = await akun.profil();
      data = { nama: (pr && pr.nama) || "", kelas: (pr && pr.kelas) || "", anggota: Boolean(pr && pr.anggota) };
    } catch (e) { data = null; }
    render();
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
