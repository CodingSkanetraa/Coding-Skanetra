// Kartu "Akun" di halaman Pengaturan: status masuk, status sinkron, dan tombol keluar.
(() => {
  "use strict";
  const akun = window.CodingSkanetraAkun;
  const $ = (id) => document.getElementById(id);
  const el = {
    status: $("akun-status"), detail: $("akun-detail"), masuk: $("akun-masuk"),
    keluar: $("akun-keluar"), sinkron: $("akun-sinkron")
  };
  if (!el.status || !akun) return;

  let anggota = null;

  function tampilSinkron() {
    const s = akun.sinkron.status();
    if (!akun.pengguna()) { el.sinkron.hidden = true; return; }
    el.sinkron.hidden = false;
    if (s.galat) el.sinkron.textContent = "Sinkronisasi bermasalah: " + s.galat + " Akan dicoba lagi.";
    else if (s.besar) el.sinkron.textContent = "Ada kode yang terlalu besar untuk disimpan di akun. Kode itu tetap aman di perangkat ini.";
    else if (s.menunggu) el.sinkron.textContent = "Menyimpan perubahan ke akun…";
    else if (s.terakhir) el.sinkron.textContent = "Tersimpan di akun pada " + new Date(s.terakhir).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + ".";
    else el.sinkron.textContent = "Belum ada progres yang disimpan ke akun.";
  }

  async function render() {
    const p = akun.pengguna();
    el.masuk.hidden = Boolean(p);
    el.keluar.hidden = !p;
    if (!p) {
      el.status.textContent = "Belum masuk";
      el.detail.textContent = "Tanpa akun pun semua materi dan editor tetap bisa dipakai.";
      tampilSinkron();
      return;
    }
    el.status.textContent = "Masuk sebagai @" + p.username;
    el.detail.textContent = anggota === null ? "Kodemu tersimpan di akun ini."
      : anggota ? "Anggota: halaman Peringkat terbuka untukmu." : "Halaman Peringkat terbuka setelah pengelola menyetujui akunmu.";
    tampilSinkron();
  }

  async function muatProfil() {
    anggota = null;
    if (!akun.pengguna()) return;
    try { const pr = await akun.profil(); anggota = Boolean(pr && pr.anggota); } catch (e) { anggota = null; }
    render();
  }

  el.keluar.addEventListener("click", async () => {
    if (!window.confirm("Keluar dari akun? Kode di perangkat ini akan dihapus dari browser (tetap aman di akunmu).")) return;
    el.keluar.disabled = true;
    try { await akun.keluar(); }
    catch (e) {
      if (window.confirm(e.message + "\nKeluar tetap? Perubahan terakhir yang belum terkirim akan hilang dari perangkat ini.")) await akun.keluar({ paksa: true });
    }
    el.keluar.disabled = false;
    render();
  });

  window.addEventListener("cs:akun", () => { muatProfil(); render(); });
  window.addEventListener("cs:sinkron-status", tampilSinkron);
  akun.siap.then(() => { render(); muatProfil(); });
})();
