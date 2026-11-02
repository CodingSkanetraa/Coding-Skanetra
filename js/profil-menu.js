/* Profil dan pengaturan: daftar menu ala aplikasi. HP: daftar lalu satu panel penuh dengan tombol kembali.
   Desktop: daftar di kiri, panel di kanan. Panel dipilih lewat hash (#akun, #tautan, #tampilan, #editor, #tentang). */
(() => {
  "use strict";
  const pf = document.getElementById("pf");
  if (!pf) return;
  const ikon = window.CodingSkanetraIkon;
  const panel = Array.from(pf.querySelectorAll(".pf-panel"));
  const baris = Array.from(pf.querySelectorAll(".pf-menu .pf-baris"));
  const PERLU_MASUK = new Set(["akun", "tautan"]);
  const lebar = window.matchMedia("(min-width: 721px)");
  let dalam = false; // true bila panel dibuka dari daftar di halaman ini (tombol kembali = history.back)

  if (ikon) {
    pf.querySelectorAll("[data-ikon]").forEach((el) => {
      const ukuran = el.dataset.ikon === "panah" ? 18 : el.dataset.ikon === "kamera" ? 18 : el.classList.contains("pf-avatar-tamu") ? 28 : 21;
      el.innerHTML = ikon.svg(el.dataset.ikon, ukuran);
    });
  }

  const masuk = () => document.body.classList.contains("pf-masuk");

  function tampil() {
    let k = decodeURIComponent(location.hash.slice(1));
    if (!panel.some((p) => p.dataset.panel === k) || (PERLU_MASUK.has(k) && !masuk())) k = "";
    if (!k && lebar.matches) k = masuk() ? "akun" : "tampilan";
    if (!k) dalam = false;
    pf.dataset.lihat = k ? "panel" : "daftar";
    panel.forEach((p) => { p.hidden = p.dataset.panel !== k; });
    baris.forEach((b) => b.classList.toggle("aktif", b.dataset.panel === k));
  }

  baris.forEach((b) => b.addEventListener("click", () => { dalam = true; window.scrollTo(0, 0); }));
  pf.querySelectorAll(".pf-kembali").forEach((t) => t.addEventListener("click", () => {
    if (dalam) { history.back(); return; }
    history.replaceState(null, "", location.pathname + location.search);
    tampil();
  }));

  window.addEventListener("hashchange", tampil);
  window.addEventListener("pf:render", tampil);
  lebar.addEventListener("change", tampil);
  tampil();
})();
