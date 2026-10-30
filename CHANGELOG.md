# Changelog

Semua perubahan penting pada website Coding Skanetra dicatat di sini.
Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/) dan penomoran versi mengikuti [Semantic Versioning](https://semver.org/lang/id/).

## [5.6.1] - 2026-10-30

### Diperbaiki
- **Peringkat kembali memakai data dari Google Sheets.** Sejak 5.6.0 peringkat dibaca dari tabel poin di Supabase, sehingga hanya akun yang terdaftar (satu orang) yang tampil. Sekarang seluruh anggota di spreadsheet muncul lagi.

### Diubah
- Login tetap memakai akun Supabase (username + password) dan tetap menyimpan kode, skor, dan pengaturan editor ke akun. Yang berubah hanya sumber poin.
- Fungsi `api/` diaktifkan kembali dan diubah: `api/auth/me`, `api/points/ranking`, dan `api/points/riwayat` kini memeriksa **token login Supabase** dan status anggota (`profil.anggota`) sebelum memanggil Apps Script. Rahasia Apps Script tetap hanya ada di server Vercel.
- **Riwayat poin terbuka untuk sesama anggota**: akun yang sudah login dan disetujui boleh membuka riwayat (tanggal dan jumlah poin) anggota mana pun lewat kartunya di Peringkat. Tidak perlu menghubungkan akun ke ID spreadsheet.
- Hasil peringkat disimpan singkat (30 detik) di server agar Apps Script tidak dipanggil di setiap kunjungan.
- Halaman Peringkat kini menjelaskan bila dibuka lewat Live Server / server statis (fungsi `api/` tidak ada, balasan 404) dan menyarankan `npx vercel dev` atau situs yang sudah di-deploy, bukan lagi pesan "periksa koneksi".
- `js/akun.js` mengekspor `token()` untuk dipakai halaman Peringkat. Tabel `poin` dan fungsi `peringkat()` di Supabase menjadi cadangan (tidak dibaca situs).

### Dihapus
- `api/auth/login.js` dan `api/auth/logout.js` (login ID/PIN lama). Variabel `SESSION_SECRET` tidak diperlukan lagi.

### Perlu dilakukan pengelola
- Isi `APPS_SCRIPT_URL` dan `APPS_SCRIPT_SECRET` di Vercel lalu redeploy (lihat `supabase/PANDUAN.md` bagian C).

## [5.6.0] - 2026-10-29

### Ditambahkan
- **Akun opsional (Supabase)**: daftar dan masuk dengan username + password (`pages/login.html`, `js/akun.js`). Situs tetap bisa dipakai penuh tanpa login.
- **Progres tersimpan di akun**: kode Editor Web/Python/C++, skor Code Rush, dan pengaturan editor ikut tersimpan ke akun dan dipulihkan di perangkat lain (kode: yang terbaru menang; skor: yang tertinggi menang). Saat keluar, data akun dihapus dari browser supaya aman di komputer bersama.
- Kartu **Akun** di halaman Pengaturan: status masuk, status sinkron, dan tombol keluar.
- **Peringkat dengan gerbang login**: belum login diarahkan ke halaman Masuk; akun yang belum disetujui melihat "menunggu persetujuan"; anggota melihat peringkat dan riwayat poinnya sendiri (hanya baca).
- `supabase/skema.sql` (tabel `profil`, `poin`, `progres` + aturan RLS) dan `supabase/PANDUAN.md` (cara memasang, menyetujui anggota, dan menambah poin lewat dashboard).
- Berkas baru: `js/akun.js`, `js/akun-config.js`, `js/akun-setting.js`.

### Diubah
- Halaman Peringkat memakai Supabase, bukan lagi fungsi `api/` + Google Apps Script. Folder `api/` lama masih ada tetapi tidak dipakai situs lagi.
- Login lama (ID + PIN) diganti login username + password.

## [5.5.0] - 2026-10-29

### Ditambahkan
- **Petunjuk kode (autocomplete) di Editor Web** untuk HTML, CSS, dan JavaScript. Daftar saran muncul otomatis saat mengetik, lengkap dengan jenisnya (tag, atribut, properti, nilai, metode, dan nama yang sudah kamu tulis sendiri / local).
  - Navigasi: ↑ ↓ memilih, **Enter** atau **Tab** menerima, **Esc** menutup; di HP cukup ketuk saran.
  - HTML: nama tag, atribut sesuai tag (mis. `href` untuk `<a>`), dan nilai atribut (mis. `type`, `target`). Memilih atribut langsung menaruh kursor di dalam tanda kutip.
  - CSS: properti, nilai, pseudo-class (`:hover`), dan at-rule. Memilih properti otomatis menulis `: ` lalu menampilkan nilainya.
  - JavaScript: keyword, objek bawaan (`document`, `console`, `Math`, ...), anggota objek setelah titik, dan nama variabel/fungsi buatanmu sendiri.
  - Tidak muncul di dalam string atau komentar, di dalam `<script>`/`<style>` pada editor HTML, saat memberi nama baru (`const`, `let`, `function`), dan pada angka desimal.
  - Dapat dimatikan di Pengaturan > Pengaturan editor > Petunjuk kode.
- Berkas baru: `js/editor-hint.js`, `css/editor-hint.css`.

## [5.4.0] - 2026-10-28

### Ditambahkan
- **Materi C++ Dasar** (`pages/cpp-dasar.html`): struktur program, tipe data, input-output, kondisi, perulangan, fungsi, array, dan vector, lengkap dengan kuis dan tautan ke Editor C++.
- **Materi Proyek Mini** (`pages/proyek-mini.html`): tiga proyek Python (Kalkulator Mini, Tebak Angka, Buku Nilai) dengan tantangan lanjutan.
- Keterangan kepemilikan (Kaito Sora dan organisasi CodingSkanetra) di README.

### Diubah
- Kartu C++ Dasar dan Proyek Mini di halaman Materi tidak lagi "Segera hadir"; keduanya kini bisa dibuka.
- README: bagian Lisensi diperbarui sesuai berkas `LICENSE` (MIT).
- `sitemap.xml` dan `llms.txt` memuat dua halaman baru.

## [5.3.0] - 2026-10-27

### Ditambahkan
- **Navbar HP berupa bar ikon di bawah layar** (Beranda, Materi, Editor, Peringkat, Lainnya) menggantikan hamburger. Isi menu Lainnya: Games, Struktur Organisasi, Tentang, dan Pengaturan. Bar ikut menyembunyikan diri saat mengetik di editor.
- **Editor yang ringkas di HP** (Python, C++, dan Web):
  - Toolbar satu baris berisi ikon (Jalankan, Simpan, Contoh, Lainnya); Atur ulang, Bersihkan, Unduh, Bagikan, dan Mode fokus masuk ke menu ⋯.
  - Tab **Kode | Output** supaya masing-masing mengisi satu layar. Menjalankan program otomatis pindah ke Output.
  - Status berupa toast kecil, bukan baris tetap.
  - Contoh dan referensi masuk ke laci "Contoh & referensi" yang dibuka dari satu ikon.
  - Barisan simbol (`( ) [ ] { } " : Tab` dan lainnya) di atas keyboard.
- Ikon garis SVG menggantikan emoji pada tombol, jadi tidak lagi tampil sebagai kotak kosong di beberapa HP Android.
- Berkas baru: `js/ikon.js`, `js/nav-mobile.js`, `js/editor-mobile.js`, `css/nav-mobile.css`, `css/editor-mobile.css`.

- **Editor desktop bergaya VS Code** (Python, C++, Web; layar lebar 721 px ke atas, tampilan HP tidak berubah):
  - Editor memenuhi layar dari kiri ke kanan; navbar, judul, dan footer disembunyikan.
  - Tombol **← Playground** di toolbar untuk kembali.
  - Toolbar kecil: hanya Jalankan, Simpan, dan Mode fokus yang terlihat; sisanya (Bagikan, Contoh & referensi, Atur ulang, Bersihkan, Unduh) ada di menu ⋯.
  - Contoh & referensi berupa laci dari sisi kanan.
  - Mode fokus: satu panel kode penuh, output meluncur masuk dari kanan saat program dijalankan.

### Diubah
- **Desktop dan laptop:** toolbar editor pindah ke atas panel kode dan judul halaman dibuat ringkas, sehingga tombol Jalankan selalu terlihat tanpa menggulir (diuji di layar 1024, 1366, dan 1920 px).
- Penjelasan error ramah kini tampil **di atas** pesan error asli, sehingga langsung terlihat di HP.
- Tombol keluar Mode fokus di HP dipindah ke kiri bawah supaya tidak menutupi toolbar.

### Diperbaiki
- Halaman sempat membeku saat keluar dari Mode fokus di desktop (perulangan tanpa henti pada pengamat kelas); sudah diperbaiki.
- Tombol Unduh di Editor Web memakai ikon SVG, bukan glyph teks yang bisa jadi kotak kosong di Android.
- Editor Web di HP: judul dan tombol pratinjau layar penuh terpotong; kini satu baris ringkas (Kembali ke editor, Sembunyikan).
- Editor Web: tombol ⋯ tampil abu-abu dengan garis putih karena memakai gaya tombol editor Python.
- Titik kuning "belum disimpan" pada tombol Simpan terpotong di toolbar HP.

## [5.2.0] - 2026-10-27

### Ditambahkan
- **Skani**, maskot Coding Skanetra: tampil besar di beranda dan kecil di halaman editor serta kuis. Mata mengikuti kursor, berkedip, melambai, dan bereaksi saat program berhasil, error, atau kuis dijawab. Bisa dimatikan lewat Pengaturan.
- **Penjelasan error ramah** di editor Python, C++, dan Web (JavaScript): pesan error diterjemahkan ke bahasa sederhana beserta saran dan nomor baris. Skani ikut memberi komentar singkat.
- **Tombol Bagikan** di editor Python (Console dan Visual), C++, dan Web: kode dikemas ke dalam tautan untuk dikirim ke guru atau admin. Ada kolom nama atau kelas pengirim, banner saat tautan dibuka, dan pesan yang jelas bila tautan rusak atau terlalu panjang. Kode tidak otomatis dijalankan atau disimpan di browser penerima.
- **Mode fokus** di ketiga editor: menyembunyikan navbar, judul, dan panduan supaya editor lebih lega. Keluar dengan tombol atau Esc.
- **Animasi halus**: kartu muncul perlahan saat digulir, kartu naik sedikit saat disentuh, tombol terasa tertekan, dan transisi antarhalaman (di browser yang mendukung).
- Sakelar "Maskot Skani" di halaman Pengaturan.
- Berkas `LICENSE` (Lisensi MIT untuk kode) beserta penjelasan pengecualian logo, maskot, dan foto anggota di README.
- Berkas baru: `js/maskot.js`, `js/gerak.js`, `js/error-ramah.js`, `js/editor-alat.js`, `css/maskot.css`, `css/gerak.css`, `css/editor-alat.css`.

### Diubah
- `index.html`, halaman editor, `js/editor-python.js`, `js/editor-cpp.js`, dan `js/playground.js` menyesuaikan dengan fitur di atas.
- Seluruh animasi mengikuti pengaturan "kurangi gerakan" milik perangkat pengguna.

## [5.1.0] - 2026-10-26

### Ditambahkan
- **Editor Python mode Visual** jauh lebih lengkap:
  - Bentuk: `lingkaran`, `persegi`, `elips`, `segitiga`, `poligon`, `garis`, `busur`, `teks`, `bersihkan`, dengan warna isi, warna garis, dan ketebalan.
  - Warna: `rgb()`, `hsl()`, `warna_acak()`.
  - Kura-kura: `maju`, `mundur`, `kiri`, `kanan`, `pergi_ke`, `angkat_pena`, `turunkan_pena`, `warna_pena`, `tebal_pena`, `mulai_isi`, `selesai_isi`, dan lainnya.
  - Animasi dan interaksi: `animasi()`, `berhenti_animasi()`, `waktu()`, `mouse_x()`, `mouse_y()`, `mouse_ditekan()`, `mouse_klik()`, `tombol()`.
  - Tombol "Hentikan animasi", ringkasan semua fungsi di bawah kanvas, dan galeri 7 contoh sekali klik (wajah, spiral, bunga, bintang, bola memantul, ikut mouse, game).
- Tombol layar penuh untuk kanvas Visual.
- Berkas baru: `js/python-visual.js`.

### Diperbaiki
- Editor kode selalu berlatar gelap dengan teks terang di semua tema (terang maupun gelap), sehingga kode tetap terbaca.

## [5.0.0] - Sebelum 26 Oktober 2026

### Diubah
- **Tampilan dirombak** agar lebih sederhana dan tidak terkesan seperti buatan AI: beranda berupa daftar isi, ornamen dekoratif dihapus, dan bahasa dirapikan menjadi lebih natural.
- Logo resmi eskul dipakai di navbar dan favicon.
- Pengaturan editor (ukuran font, ukuran tab, line wrapping, nomor baris) kini benar-benar berfungsi dan diterapkan ke semua editor.
- Font dihosting sendiri di `assets/fonts` (tanpa Google Fonts).

### Ditambahkan
- **SEO dan indeks pencarian**: data terstruktur JSON-LD, `sitemap.xml`, `robots.txt`, `llms.txt`, gambar `og-image.png`, dan set ikon (favicon, apple-touch-icon, logo 512).
- Penyimpanan kode di browser (tombol Simpan atau Ctrl + S) untuk editor Web, Python, dan C++.
- Input interaktif pada editor Python dan C++ (`input()` dan `cin` meminta jawaban langsung di kotak output).

### Diperbaiki
- Editor Web: penyimpanan di pratinjau (`localStorage`) tidak lagi menimbulkan `SecurityError` di dalam `iframe` ber-sandbox, dan formulir di pratinjau dapat dikirim.
- Halaman Peringkat kembali menampilkan fitur login dengan benar.
