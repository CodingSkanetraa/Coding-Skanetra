/* Menandai kartu agar muncul halus saat digulir ke layar. Tanpa JS, semua tetap terlihat normal. */
(() => {
  const KARTU = [
    ".materi-card", ".editor-card", ".game-card", ".summary-card", ".settings-card",
    ".person-card", ".team-card", ".project-card", ".members-card", ".feature-card",
    ".py-example-card", ".daftar-isi li", ".catatan-isi p"
  ].join(",");
  const SENTUH = ".materi-card, .editor-card, .game-card, .summary-card, .person-card, .team-card, .project-card, .feature-card, .py-example-card";

  const semua = Array.from(document.querySelectorAll(KARTU));
  if (!semua.length) return;
  semua.forEach((el) => { if (el.matches(SENTUH)) el.classList.add("gerak-kartu"); });

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;

  // Nomor urut per induk supaya muncul bergiliran (maks 6 langkah)
  const hitung = new Map();
  semua.forEach((el) => {
    const n = hitung.get(el.parentElement) || 0;
    hitung.set(el.parentElement, n + 1);
    el.style.setProperty("--urut", Math.min(n, 5));
    el.classList.add("gerak-muncul");
  });

  const amat = new IntersectionObserver((daftar) => {
    daftar.forEach((d) => {
      if (!d.isIntersecting) return;
      d.target.classList.add("tampil");
      amat.unobserve(d.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

  semua.forEach((el) => amat.observe(el));

  // Pengaman: jika observer gagal, tampilkan semuanya.
  window.setTimeout(() => semua.forEach((el) => el.classList.add("tampil")), 6000);
})();
