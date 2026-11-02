/* Ikon dari assets/icon/. Elemen dengan data-ikon-lokal="nama" tetap menampilkan isi cadangannya
   (ikon garis atau teks) sampai gambar assets/icon/nama.(png|svg|webp) ada dan selesai dimuat. */
(() => {
  const skrip = document.currentScript;
  const dasar = skrip ? new URL("../assets/icon/", skrip.src).href : "assets/icon/";
  const EKSTENSI = ["png", "svg", "webp"];
  const POLA_NAMA = /^[a-z0-9-]{1,30}$/;

  function coba(nama, i, selesai) {
    if (i >= EKSTENSI.length) return;
    const img = new Image();
    img.onload = () => selesai(img);
    img.onerror = () => coba(nama, i + 1, selesai);
    img.src = dasar + nama + "." + EKSTENSI[i];
  }

  function pasang(el) {
    const nama = el.dataset.ikonLokal;
    if (!POLA_NAMA.test(nama || "")) return;
    const ikon = window.CodingSkanetraIkon;
    const cadangan = el.dataset.ikonCadangan;
    if (cadangan && ikon && !el.firstChild) el.innerHTML = ikon.svg(cadangan, 26);
    coba(nama, 0, (img) => {
      img.alt = "";
      img.decoding = "async";
      img.className = "ik-lokal";
      el.replaceChildren(img);
      el.classList.add("punya-gambar");
    });
  }

  const jalan = () => document.querySelectorAll("[data-ikon-lokal]").forEach(pasang);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", jalan);
  else jalan();
})();
