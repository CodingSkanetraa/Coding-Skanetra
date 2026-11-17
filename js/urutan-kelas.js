// Urutan kelas yang umum di sekolah ini, dipakai di halaman Peringkat dan Kelola poin.
// Angkatan dulu (X, XI, XII); di dalam angkatan: PPLG, TJKT, TKL, lalu TO; di dalam jurusan: nomor kelas.
// Nama lama ikut satu kelompok: RPL = PPLG, TKJ = TJKT, OTOTRONIK = TO.
// Jurusan yang belum dikenal (misalnya TPTL) ditaruh setelah yang dikenal, urut abjad.
(() => {
  "use strict";
  const ANGKATAN = { X: 10, XI: 11, XII: 12 };
  const JURUSAN = [["PPLG", "RPL"], ["TJKT", "TKJ"], ["TKL"], ["TO", "OTOTRONIK"]];

  function kunci(kelas) {
    const teks = String(kelas || "").trim().toUpperCase().replace(/\s+/g, " ");
    const m = /^(XII|XI|X)\s+([A-Z]+)(?:\s*(\d+))?/.exec(teks);
    if (!m) return { kosong: teks === "", angkatan: 99, jurusan: 99, nama: teks, nomor: 0, teks };
    const urut = JURUSAN.findIndex((kelompok) => kelompok.includes(m[2]));
    return { kosong: false, angkatan: ANGKATAN[m[1]], jurusan: urut < 0 ? 99 : urut, nama: m[2], nomor: m[3] ? Number(m[3]) : 0, teks };
  }

  // Pembanding untuk Array.sort. Kelas kosong selalu di paling akhir.
  function banding(a, b) {
    const ka = kunci(a), kb = kunci(b);
    if (ka.kosong !== kb.kosong) return ka.kosong ? 1 : -1;
    return ka.angkatan - kb.angkatan
      || ka.jurusan - kb.jurusan
      || (ka.jurusan === 99 ? ka.nama.localeCompare(kb.nama, "id") : 0)
      || ka.nomor - kb.nomor
      || ka.teks.localeCompare(kb.teks, "id");
  }

  window.CodingSkanetraKelas = { kunci, banding };
})();
