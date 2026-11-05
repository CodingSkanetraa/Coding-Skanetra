/* Editor (Web, Python, C++) tidak langsung dibuka: pengguna lewat halaman daftar proyek dulu.
   Dimuat di <head> (tanpa defer) supaya pengalihan terjadi sebelum editor tampil.
   Dilewati bila alamat membawa ?p= (buka proyek), ?baru= (proyek baru), ?bebas=1 (tanpa akun),
   atau tautan Bagikan (#b= / #bagikan=). */
(() => {
  const HALAMAN = { "editor-html.html": "web", "editor-python.html": "py", "editor-cpp.html": "cpp" };
  const j = HALAMAN[location.pathname.split("/").pop()];
  if (!j) return;
  const q = new URLSearchParams(location.search);
  if (q.has("p") || q.has("baru") || q.has("bebas") || /^#(bagikan|b)=/.test(location.hash)) return;
  location.replace("proyek-daftar.html?j=" + j);
})();
