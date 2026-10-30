// DAFTAR DOKUMENTASI: satu-satunya berkas yang perlu kamu ubah untuk menambah foto.
//
// Cara menambah foto baru:
//   1. Taruh berkas fotonya di folder  assets/dokumentasi/
//   2. Tambahkan satu blok { ... } di bawah ini, lalu simpan.
//   Kartu di halaman Dokumentasi dibuat otomatis, tidak perlu mengubah HTML.
//
// Isi tiap blok:
//   foto       WAJIB. Nama berkas di assets/dokumentasi/ (contoh: "latihan-html.jpg").
//              Boleh memakai subfolder, contoh: "2026/latihan-html.jpg".
//              Format: jpg, jpeg, png, webp, avif, gif. Tanpa spasi lebih aman.
//   judul      WAJIB. Judul singkat kegiatan.
//   tanggal    Disarankan. Tulis "TAHUN-BULAN-TANGGAL", contoh "2026-10-12".
//              Daftar diurutkan otomatis dari yang terbaru, jadi urutan menulis di sini bebas.
//   deskripsi  Penjelasan apa yang dilakukan. Enter di dalam teks dipertahankan (pakai tanda kutip `...`).
//   lokasi     Opsional. Contoh: "Lab Komputer 2".
//
// Tips supaya halaman cepat dibuka: ukuran foto sekitar 200 sampai 500 KB, lebar maksimal sekitar 1600 px.
// Format WebP biasanya paling kecil. Foto yang lebih besar tetap bisa dipakai, hanya lebih lambat.
//
// Etika: pastikan orang yang ada di foto setuju fotonya dipasang di situs publik.
//
// CONTOH (hapus tanda // di depan tiap baris untuk memakainya):
//
//   {
//     foto: "latihan-html.webp",
//     judul: "",
//     tanggal: "yyyy-mm-dd",
//     lokasi: "",
//     deskripsi: "."
//   },

window.DOKUMENTASI = [
  // Tulis blok dokumentasi di sini, dipisahkan koma.
  {
    foto: "img1.webp",
    judul: "Foto bersama",
    tanggal: "2026-08-12",
    lokasi: "Lapangan",
    deskripsi: "Foto pertama kita."
  },
];
