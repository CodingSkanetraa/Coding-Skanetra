/* Ikon garis minimalis (SVG) untuk navbar bawah dan toolbar editor.
   Dipakai bersama: CodingSkanetraIkon.svg("jalankan") mengembalikan teks SVG. */
(() => {
  const BENTUK = {
    beranda: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
    materi: '<path d="M12 6.5C10.5 5 8 4.5 4 4.5v13c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-13c-4 0-6.5.5-8 2z"/><path d="M12 6.5v13"/>',
    editor: '<path d="m8 8-4.5 4L8 16"/><path d="m16 8 4.5 4L16 16"/><path d="m13.5 5-3 14"/>',
    peringkat: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H4.5A3.2 3.2 0 0 0 8 10.5"/><path d="M16 6h3.5A3.2 3.2 0 0 1 16 10.5"/><path d="M12 13v4"/><path d="M8.5 20h7"/><path d="M10 17h4"/>',
    lainnya: '<circle cx="5.5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
    games: '<rect x="2.5" y="7" width="19" height="11" rx="4"/><path d="M7.5 10.5v4M5.5 12.5h4"/><circle cx="15.5" cy="11.5" r="1" fill="currentColor" stroke="none"/><circle cx="18" cy="13.5" r="1" fill="currentColor" stroke="none"/>',
    struktur: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M17 14.2c2.4.3 4.3 2.3 4.3 4.8"/>',
    galeri: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10.2" r="1.6"/><path d="m4 17 4.8-4.4 3.4 2.9 3-2.6L20 17"/>',
    akun: '<circle cx="12" cy="8.5" r="3.6"/><path d="M4.5 20c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5"/>',
    tentang: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="7.8" r=".7" fill="currentColor" stroke="none"/>',
    pengaturan: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    jalankan: '<path d="M7 5v14l12-7z" fill="currentColor"/>',
    simpan: '<path d="M5 3.5h11l3.5 3.5v13.5H5z"/><path d="M8 3.5v5h7v-5"/><rect x="8" y="13" width="8" height="7.5"/>',
    bagikan: '<circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="6" r="2.4"/><circle cx="18" cy="18" r="2.4"/><path d="m8.2 10.9 7.6-3.8M8.2 13.1l7.6 3.8"/>',
    fokus: '<path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4"/>',
    reset: '<path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v5h5"/>',
    bersihkan: '<path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13"/>',
    unduh: '<path d="M12 4v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M5 20h14"/>',
    contoh: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>',
    kembali: '<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>',
    centang: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    tutup: '<path d="M6 6l12 12M18 6 6 18"/>'
  };

  const svg = (nama, ukuran) => {
    const isi = BENTUK[nama] || "";
    const u = ukuran || 20;
    return '<svg class="ik" viewBox="0 0 24 24" width="' + u + '" height="' + u + '" fill="none" stroke="currentColor" ' +
      'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + isi + "</svg>";
  };

  // Mengisi tombol: ikon + label (label disembunyikan lewat CSS di layar sempit bila perlu).
  const isiTombol = (tombol, nama, label, opsi) => {
    const o = opsi || {};
    tombol.innerHTML = svg(nama, o.ukuran) + '<span class="tb-label">' + label + "</span>";
    tombol.classList.add("tb-btn");
    if (o.ikonSaja) tombol.classList.add("tb-ikon-saja");
    if (!tombol.getAttribute("aria-label")) tombol.setAttribute("aria-label", label);
  };

  window.CodingSkanetraIkon = { svg, isiTombol };
})();
