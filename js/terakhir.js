/* Mencatat editor yang terakhir dibuka di browser ini, untuk kartu "Proyek terakhir" di beranda. */
(() => {
  const JENIS = { "editor-html.html": "web", "editor-python.html": "py", "editor-cpp.html": "cpp" };
  const jenis = JENIS[location.pathname.split("/").pop()];
  if (!jenis) return;
  try { localStorage.setItem("codingskanetra-terakhir", JSON.stringify({ jenis, waktu: Date.now() })); } catch (e) { /* penyimpanan diblokir */ }
})();
