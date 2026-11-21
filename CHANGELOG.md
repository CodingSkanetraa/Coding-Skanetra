# Changelog

Semua perubahan penting pada website Coding Skanetra dicatat di sini.
Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/) dan penomoran versi mengikuti [Semantic Versioning](https://semver.org/lang/id/).

## [5.26.0] - 2026-11-21

### Diubah
- **Editor kelompok kini satu berkas bersama, seperti Editor Web.** Tidak ada lagi pembagian bagian dan pemilik bagian: semua anggota mengerjakan satu berkas HTML, CSS, dan JS yang sama. Halaman tugas menampilkan satu kartu **Berkas bersama** (menggantikan daftar bagian dan tombol ketua). Template tugas di halaman pengelola menjadi **kerangka awal** yang digabung menjadi isi awal berkas.
- **Simpan otomatis tanpa dialog bentrok.** Simpan 1,5 detik setelah berhenti mengetik. Bila temanmu menyimpan lebih dulu, perubahan kalian digabung otomatis per baris (`js/kelompok-gabung.js`) dan disimpan lagi. Bila dua orang mengubah baris yang sama, yang dipakai adalah versi yang menyimpan belakangan, dan versi lainnya tetap ada di Riwayat. Riwayat kini dicatat tiap 3 menit, 30 versi.
- **Hasil tampil penuh seperti editor web.** Pratinjau merakit halaman dari tab HTML, CSS, JS (HTML boleh berupa dokumen lengkap atau potongan), dengan panel **Console** (log dan error, nomor baris error sesuai tab JS), tombol **Perbesar** dan **Tab lain**, `localStorage` yang tidak error di pratinjau, dan posisi gulir yang tetap saat hasil menyegarkan diri. **Kode utuh** menampilkan satu berkas HTML lengkap yang siap disalin.

### Ditambahkan
- **Penanda siapa mengerjakan apa.** Baris anggota di atas editor menunjukkan siapa yang aktif beserta tab dan barisnya; titik berwarna di tab HTML/CSS/JS dan kursor berlabel nama di editor menunjukkan posisi teman. Fungsi database `berkas_sinkron` (selaras tiap 3 detik) dan tabel `kerja_kehadiran`.

### Diperbaiki
- Hasil dan Kode utuh kosong ("belum ada HTML") padahal kode sudah ditulis: HTML yang ditulis di bagian Umum tidak ikut digabung ke pratinjau. Dengan satu berkas, penyebabnya hilang; kiriman lama (beberapa bagian) tetap tampil dan kini ikut menyertakan HTML bagian Umum.

### Perlu dijalankan
- `supabase/kelompok.sql` di SQL Editor (aman diulang). Bagian lama otomatis dilipat ke satu berkas (versi sebelumnya masuk Riwayat); fungsi `bagian_tambah`, `bagian_ubah`, `bagian_hapus`, `bagian_pindah` dihapus.

## [5.25.0] - 2026-11-19

### Ditambahkan
- **Proyek Kelompok (satu website dikerjakan bersama).** Pengelola membentuk kelompok (maksimal 10 anggota, tepat 1 ketua), membuat tugas (penjelasan, tenggat, syarat wajib/opsional, template bagian), lalu memberikannya ke kelompok. Halaman baru: `pages/kelompok.html` (daftar tugas), `kelompok-tugas.html` (detail, bagian, kiriman), `kelompok-editor.html` (editor), `kelompok-kiriman.html` (pratinjau dan tinjauan), `admin-kelompok.html` (pengelola, tautan "Kelola kelompok" di Peringkat). Menu **Tugas Kelompok** ada di Lainnya.
- **Editor kelompok.** Website dibagi per **bagian** (Header, Footer, dan seterusnya) ditambah bagian **Umum** (CSS dan JS bersama). Tiap bagian punya tab HTML, CSS, JS. Ketua membagi pemilik bagian; bagian orang lain bisa dibaca tetapi tidak bisa diubah (dijaga di database, bukan hanya di tampilan). Pratinjau menggabungkan semua bagian, dan tab **Kode utuh** menampilkan seluruh kode berpenanda bagian.
- **Simpan berversi.** Simpan otomatis 4 detik setelah berhenti mengetik. Bila bagian sudah diubah orang lain, muncul pilihan: muat versi terbaru, timpa (versi orang lain tetap di Riwayat), atau salin kodemu. Riwayat 20 versi per bagian dengan tombol Pulihkan. Bagian orang lain disegarkan tiap 20 detik.
- **Submit.** Anggota mengirim ke pengelola dengan konfirmasi syarat wajib; kiriman berupa **snapshot** yang tidak berubah walau kode terus diedit. Kiriman bisa **ditarik kembali** selama belum ditinjau. Pengelola mencentang syarat, memberi catatan, lalu memilih **Diterima** atau **Perlu revisi**; setelah revisi kelompok **kirim ulang**. Kiriman setelah tenggat diberi tanda terlambat. Maksimal 8 tugas yang belum diterima per kelompok.

### Perlu dijalankan
- `supabase/kelompok.sql` di SQL Editor (sekali; aman diulang). Semua tabel dikunci (RLS tanpa policy), akses hanya lewat fungsi database.

### Catatan
- Gambar Aset belum ikut tampil di pratinjau kelompok.

## [5.24.0] - 2026-11-19

### Ditambahkan
- **Aset gambar di editor Web.** Tombol **Aset** di editor: unggah PNG, JPG, WebP, atau GIF, lalu pakai namanya di kode (`<img src="kucing.png">`, `background: url(kucing.png)`, `img.src = "kucing.png"`). Gambar tampil di pratinjau (termasuk "Lihat di tab sendiri") selama kamu masuk. Panel menampilkan daftar bergambar kecil, kuota ("12 dari 30 gambar"), salin nama atau tag `<img>`, dan hapus (dua langkah).
- **Dikecilkan otomatis di browser:** sisi terpanjang maksimal 1280 px dan di bawah 500 KB. PNG besar diubah ke WebP bila perlu (transparansi tetap). GIF tidak dikecilkan: maksimal 500 KB. Nama file dirapikan (huruf kecil, spasi jadi strip) dan diberi akhiran -2, -3 bila bentrok.
- **Batas per akun:** 30 gambar, 500 KB per file, hanya anggota yang disetujui. Dijaga di database dan Storage (`supabase/aset.sql`), bukan hanya di browser. Bucket privat: gambar hanya terbuka lewat tautan bertanda tangan berumur 1 jam.
- **Halaman pengelola Kelola aset** (`pages/admin-aset.html`, tautan di halaman Peringkat untuk admin): ringkasan per anggota, lihat gambar, hapus gambar bermasalah.
- Batasan: gambar hanya tampil di pratinjau akun pemilik. Tautan Bagikan, unduhan HTML, dan tamu (tanpa login) tidak membawa gambar (rencana update berikutnya).

### Perlu dijalankan
- `supabase/aset.sql` di SQL Editor (sudah dijalankan saat Tahap 0; aman diulang).

## [5.23.0] - 2026-11-19

### Ditambahkan
- **Daftar aset ikon di halaman Tentang** (bagian "Ikon dibuat oleh anggota"): kartu per ikon berisi gambar ikon, nama halaman, pembuat, kelas, dan tautan sumber (opsional). Datanya ada di satu berkas, `assets/data/aset-ikon.json`, sudah berisi template kosong untuk 14 ikon (Profil, Struktur, Dokumentasi, Games, Peringkat, Playground, Proyek Mini, JavaScript, CSS, C++, Python, HTML, Materi, Pengaturan). Pembuat yang kosong tampil "Belum diisi". Gambar diambil dari `assets/icon/<berkas>` (nama file sama dengan yang dipakai situs); bila file belum ada tampil huruf awal. Teks dari data selalu ditampilkan sebagai teks biasa dan tautan hanya https.

## [5.22.2] - 2026-11-18

### Diperbaiki
- **Admin ditolak di halaman admin** ("Khusus pengelola, akunmu tidak punya akses") walau akunnya admin. Penyebab: pemeriksaan membaca "profil pertama" tanpa menyaring id, padahal admin boleh membaca semua profil (aturan dari `tantangan.sql`), sehingga yang terbaca bisa profil orang lain. Kini profil selalu dicari dengan id akun sendiri di Kelola poin, Kelola tantangan, Peringkat (tautan Kelola poin), Tantangan, dan `api/_security.js` (pemeriksaan anggota untuk Peringkat dan Riwayat; id diambil dari Supabase `/auth/v1/user`). Tidak ada SQL yang perlu dijalankan.

## [5.22.1] - 2026-11-18

### Diubah
- **Admin boleh menempel kode** di editor. Status admin dibaca dari profil akun yang sedang masuk (`admin = true`); anggota biasa dan tamu tetap tidak bisa menempel kode dari luar. Ini pengaturan tampilan di browser, bukan pengaman server.

## [5.22.0] - 2026-11-17

### Ditambahkan
- **Ganti nama tampilan** di Profil > Akun (tombol Ubah di baris Nama). Hanya kolom `nama` milik akun sendiri yang berubah, lewat fungsi database `ubah_nama_saya` (`supabase/nama.sql`, jalankan sekali di SQL Editor). Username tetap tidak bisa diganti. Nama dirapikan (spasi ganda dibuang), maksimal 40 huruf, dan bila dikosongkan kembali memakai username. Nama juga tampil sebagai judul di kepala Profil.
- **Foto profil bisa diperbesar**: ketuk atau klik foto di Profil untuk melihatnya besar; tutup dengan tombol silang, klik di luar, atau Esc.
- **Tempel kode dari luar dimatikan di editor** (Web, Python, C++; `js/tanpa-tempel.js`). Saat dicoba muncul pemberitahuan ramah, bukan peringatan menakutkan. Mengetik, menyalin dan menempel kode dari editor itu sendiri, dan menyeret teks di dalam editor tetap boleh. Ini penghalang belajar, bukan pengaman mutlak: orang yang bertekad masih bisa mengakalinya (misalnya lewat alat pengembang browser).

## [5.21.0] - 2026-11-17

### Ditambahkan
- **Urutan kelas** (`js/urutan-kelas.js`): angkatan dulu (X, XI, XII), lalu di dalamnya PPLG, TJKT, TKL, dan TO, lalu nomor kelas. Nama lama ikut satu kelompok (RPL = PPLG, TKJ = TJKT, OTOTRONIK = TO); jurusan yang belum dikenal (misalnya TPTL) ditaruh setelahnya.
- Halaman Peringkat: pilihan **Urutkan** (Poin tertinggi atau Kelas) di daftar "Semua Peringkat". Di urutan Kelas, anggota satu kelas diurut dari poin tertinggi, dan nomor peringkat yang tampil tetap peringkat keseluruhan.
- Kelola poin: daftar anggota (tab Tambah dan Anggota) dan pilihan filter kelas kini berurutan menurut kelas; tab Tambah punya pilihan **Urut: Kelas / Nama A-Z**.

## [5.20.0] - 2026-11-17

### Diubah
- **Poin pindah dari Google Sheets ke database Supabase** (`supabase/poin.sql`). Satu sumber data: poin ditambah dan dibatalkan lewat situs, tidak ada lagi kode Apps Script yang tabrakan. Peringkat dan riwayat (`api/points/*`) membaca fungsi database `poin_peringkat` dan `poin_riwayat` dengan token login pemanggil, tanpa Apps Script. Bentuk data ke halaman Peringkat tetap sama.
- **Pembatalan hanya menandai catatan** (`dibatalkan`), angkanya tidak pernah ditimpa, jadi total tidak bisa lagi salah hitung. Poin lama hasil impor tidak bisa dibatalkan dari web.
- **Poin Tantangan** masuk ke database lewat `tambah_poin_tantangan` (dijaga rahasia penilai, idempoten lewat kunci unik), bukan lagi lewat Apps Script. Teks "spreadsheet" di Tantangan diganti "daftar poin".

### Ditambahkan
- **Semester**: peringkat hanya menghitung semester aktif. Tombol **Mulai semester baru** di Kelola poin memulai peringkat dari 0; poin semester lama tetap tersimpan, 5 besarnya tampil di halaman Peringkat ("5 Besar Semester Lalu"), dan tiap semester bisa diunduh sebagai CSV.
- **Halaman Kelola poin** (`pages/admin-poin.html`, khusus admin, tautannya di halaman Peringkat): tambah poin banyak anggota sekaligus (cari, filter kelas, pilih yang tampil), riwayat input dengan pembatalan utuh atau per anggota, kelola anggota (tambah, ubah, nonaktif), dan semester.
- **Skrip impor sekali jalan** dari spreadsheet lama: satu transaksi yang memeriksa total tiap anggota terhadap kolom TOTAL dan membatalkan semuanya bila ada selisih. Poin yang hanya ada sebagai angka manual di sel (10 Agu sampai 7 Sep, 2.145 poin) ikut diimpor sebagai "saldo awal", bukan hanya dari sheet Riwayat.

### Diperbaiki
- Anggota di baris terakhir spreadsheet (S132) tidak ikut peringkat karena kode membaca sampai baris 137 saja.
- Riwayat anggota di web membaca total dari kolom Q (yang sudah menjadi kolom tanggal), dan pembatalan batch untuk tanggal 16 Nov ke atas gagal atau menulis ke kolom yang salah. Penyebab: sebagian fungsi Apps Script masih memakai asumsi lama 12 kolom tanggal (E:P); kini tidak relevan karena poin tidak lagi dihitung dari sel.

### Tidak dipakai lagi
- `APPS_SCRIPT_URL` dan `APPS_SCRIPT_SECRET` untuk poin. `apps-script/tambah-poin.gs` tinggal arsip.

## [5.19.1] - 2026-11-16

### Dihapus
- **Mode fokus** di ketiga editor (Python, C++, Web): tombol, tombol keluar, pintasan Esc, panel output geser, dan semua CSS/JS terkait. Editor sekarang sudah memenuhi layar, jadi fitur ini tidak diperlukan lagi dan sempat menimbulkan bug.
- Ikon `fokus` di `js/ikon.js`.

## [5.19.0] - 2026-11-15

### Ditambahkan
- **Lihat di tab lain (Editor Web)**: item baru di menu ⋯ dan tombol **↗ Tab baru** di panel Live Preview membuka hasil kodemu di tab browser sendiri, memenuhi seluruh layar seperti web sungguhan. Klik lagi untuk menyegarkan tab yang sama. Judul tab diambil dari `<title>`. `console.log` dari tab itu tetap muncul di panel Console editor, dan `localStorage` bekerja seperti di pratinjau biasa.
- **Aman**: kode tetap berjalan di iframe terisolasi di dalam halaman pembungkus (tanpa `allow-same-origin`), jadi kode dari tautan Bagikan orang lain tidak bisa menyentuh akun atau data situs. Bila pop-up diblokir browser, muncul pesan di status.
- **Tautan jangkar** (`<a href="#bagian">`) kini menggulir ke bagian tujuan, di pratinjau biasa maupun tab baru (sebelumnya tidak berfungsi di iframe).
- Ikon `tabbaru` di `js/ikon.js`.

## [5.18.2] - 2026-11-15

### Diperbaiki
- **Menu Unduh di menu ⋯ editor**: tombol Unduh dan daftar pilihannya tidak lagi berdampingan (tombol jadi tinggi, daftar menyempit di kanan). Kini daftar turun di bawah tombol dan ukuran hurufnya dirapikan.
- Item **Pengaturan** di menu ⋯ memakai gaya yang sama dengan item lain (tinggi dan perataan ikon seragam).

### Dihapus
- `padding` pada `.editor-tabs` di `css/style.css` (menyebabkan tampilan tab editor bergeser).
- Bayangan saat hover pada kartu di `css/poles.css` (terlihat kotak).

## [5.18.1] - 2026-11-15

### Diperbaiki
- **Editor Web, tag blok tidak lagi dipecah jadi tiga baris**: mengetik `<p class="hai">` kini menghasilkan `<p class="hai"></p>` dengan kursor di tengah, bukan `</p>` turun ke baris bawah. Penutup tag bawaan CodeMirror dimatikan dan diganti `js/editor-ketik.js`, supaya perilakunya sama di komputer dan HP.
- **Tutup tag otomatis di HP**: pelengkap kini membaca karakter terakhir yang masuk (bukan hanya satu karakter) dan punya jalur cadangan lewat peristiwa `input`, jadi tetap jalan walau keyboard HP mengirim beberapa karakter sekaligus.

## [5.18.0] - 2026-11-15

### Ditambahkan
- **Pengaturan cepat di editor**: menu ⋯ pada Editor Web, Python, dan C++ punya item **Pengaturan**. Isinya ukuran huruf (A− / A+), lebar tab, bungkus baris, nomor baris, petunjuk kode (Editor Web), dan tema Gelap/Terang. Perubahan langsung berlaku dan memakai penyimpanan yang sama dengan halaman Pengaturan (ikut tersinkron ke akun). Ada tombol "Kembalikan bawaan" dan tautan "Semua pengaturan". Di HP tampil sebagai lembar dari bawah. Berkas baru: `js/editor-setelan.js`, `css/editor-setelan.css`; `js/editor-prefs.js` kini punya `nilai()` dan `ubah()`.
- `css/poles.css`: polesan visual bersama (token gerak, fokus seragam, scrollbar tipis, tombol terangkat/tertekan, menu dan dialog muncul halus, garis bawah menu navbar bergeser, bayangan navbar saat digulir, halaman masuk halus). Hanya mengubah transisi dan bayangan, bukan tata letak, dan mati otomatis bila memilih "kurangi gerakan".

### Diubah
- **Maskot Skani lebih luwes**: gerak kini memakai mesin pegas, bukan keyframe kaku. Badan jongkok lalu melompat dan memipih saat mendarat, kemiringan mengikuti arah kursor, antena dan telinga bergoyang tertinggal, lengan melambai dengan ayunan halus, mata berkedip alami (kadang dua kali) dan melirik sendiri saat kursor diam, bayangan mengecil saat melompat, dan lesu halus saat error. Gerak berhenti saat tab tersembunyi atau Skani di luar layar.

## [5.17.2] - 2026-11-14

### Diperbaiki
- **Editor di HP**: teks prediktif tidak lagi macet di daftar "a…" saat mengetik (misalnya "button"). Editor memakai mode input `textarea` sehingga isi kode ikut berubah selagi keyboard HP menyusun kata.
- **Tutup tag otomatis di HP**: mengetik `<div>` kini otomatis menambah `</div>`, mengetik `</` melengkapi tag yang masih terbuka, dan pasangan `( [ { " '` ikut bekerja. Berkas baru `js/editor-ketik.js` dipakai di Editor Web, Python, dan C++. Di komputer tetap memakai addon bawaan CodeMirror.

## [5.17.1] - 2026-11-12

### Diubah
- **Favicon baru**: hanya roda gigi `</>` dari logo, diperbesar dan memenuhi lingkaran (Google memotong favicon menjadi lingkaran). Dibuat ulang dari `favicon.png` beresolusi tinggi: `favicon.ico`, `favicon-48.png`, `favicon-96.png`, `favicon-192.png`, dan `apple-touch-icon.png`. Tautan ikon diberi `?v=2` agar browser dan Google mengambil yang baru.

## [5.17.0] - 2026-11-09

### Ditambahkan
- **Poin khusus saat menyetujui jawaban Web**: di admin Tantangan, tab Menunggu, kolom Poin (1 sampai 100) bisa diubah sebelum Setujui. Jalankan ulang `supabase/tantangan.sql` (fungsi `nilai_manual` kini punya `p_poin`).

## [5.16.0] - 2026-11-08

### Diubah
- **Navbar dikelompokkan**: Beranda, Materi, Playground, **Game** (Games, Tantangan), **Lainnya** (Peringkat, Struktur Organisasi, Dokumentasi, Tentang, Pengaturan). Di HP, Tantangan masuk ke menu Lainnya; bar bawah tidak berubah.

## [5.15.1] - 2026-11-08

### Diperbaiki
- Kartu **Total Poin** di detail anggota Peringkat tidak lagi berubah menjadi 0 setelah riwayat dimuat (memakai total dari papan peringkat).

## [5.15.0] - 2026-11-08

### Ditambahkan
- **Tantangan**: soal Python, C++, dan Web untuk anggota. Python dan C++ dinilai otomatis di server (Wandbox) dengan tes tersembunyi di database; Web dinilai guru. Poin langsung masuk spreadsheet lewat Apps Script (`apps-script/tambah-poin.gs`, dicatat di sheet `LogTantangan`, tidak menulis ke sheet Poin).
- **Halaman admin Tantangan** (`pages/admin-tantangan.html`): kelola soal dan tes, setujui atau tolak jawaban Web, kirim ulang poin, atur ID spreadsheet anggota.
- Skema `supabase/tantangan.sql`, fungsi `api/tantangan/kirim.js` dan `setujui.js`. Variabel lingkungan baru: `PENILAI_RAHASIA`.

## [5.14.0] - 2026-11-05

### Ditambahkan
- **Halaman daftar proyek sebelum editor** (Web, Python, C++): kartu proyek, tombol proyek baru, menu titik tiga (ubah nama, duplikat, bagikan, hapus).

## [5.13.1] - 2026-11-04

### Diubah
- Beranda: logo sejajar nama, judul "Tautan berbagi aktif", kartu "Proyek terakhir dibuka".

## [5.13.0] - 2026-11-04

### Diubah
- **Beranda dirombak** ala aplikasi: header logo dan profil, pintasan editor, daftar materi, tautan berbagi aktif, dan info web.

## [5.12.0] - 2026-11-02

### Diubah
- **Header atas di HP menghilang saat menggulir ke bawah** dan muncul lagi saat menggulir ke atas (semua halaman; bar bawah tetap).
- **Ikon dari folder `assets/icon/`**: beranda HP, Playground, dan Materi memakai gambar lokal bila filenya ada (`html.png`, `python.png`, `cpp.png`, `css.png`, `javascript.png`, `proyek-mini.png`, `materi.png`, `playground.png`, `peringkat.png`, `games.png`, `dokumentasi.png`, `struktur.png`, `profil.png`; daftar lengkap di `assets/icon/README.txt`). Bila belum ada, tampil ikon garis bawaan.
- **Pilih editor (Playground) di HP** diringkas menjadi tiga kartu besar berisi ikon, nama, satu baris keterangan; seluruh kartu bisa disentuh.
- **Materi di HP** menjadi kisi dua kolom berisi ikon, judul, dan tingkat. Deskripsi panjang disembunyikan di HP; pencarian dan filter tetap ada.
- **Profil dan Pengaturan digabung** menjadi satu halaman bergaya daftar menu (HP: daftar lalu panel penuh dengan tombol kembali; desktop: daftar di kiri, panel di kanan). Menu: Akun, Tautan Bagikan, Tampilan, Editor dan progres, Tentang. Tamu (belum masuk) tetap bisa memakai Tampilan, Editor, dan Tentang. Foto diganti lewat tombol kamera di foto profil.
- `pages/setting.html` kini hanya mengalihkan ke `profil.html#tampilan`; menu "Pengaturan" mengarah ke sana.

## [5.11.0] - 2026-11-02

### Diubah
- **Beranda di HP kini seperti beranda aplikasi**: sapaan akun (foto dan @username, atau ajakan masuk), tiga pintasan editor (HTML, Python, C++), dan kisi menu ikon ke Materi, Playground, Peringkat, Games, Dokumentasi, Struktur, Profil, Pengaturan. Teks panjang disembunyikan di HP. Tampilan desktop tidak berubah, dan bar bawah HP tetap sama.

## [5.10.0] - 2026-10-31

### Ditambahkan
- **Tautan Bagikan pendek dari database, berlaku 7 hari.** Untuk akun yang login, tombol Bagikan membuat tautan seperti `editor-html.html#b=5bab41319` (bukan lagi tautan panjang berisi seluruh kode). Setelah 7 hari tautan otomatis kedaluwarsa dan kodenya tidak bisa dibuka lagi; yang membuka melihat pesan jelas. Kode dibuka tanpa login, dan tautan untuk editor lain otomatis memindahkan ke editor yang benar. Maksimal 20 tautan aktif per akun, tiap tautan sampai sekitar 100 KB. Tautan yang kedaluwarsa dihapus otomatis saat ada yang membuat tautan baru, tanpa jadwal tambahan.
- Tautan panjang lama (`#bagikan=`) tetap berfungsi dan tetap tersedia untuk pengunjung tanpa akun (tidak kedaluwarsa).
- **Tautan Bagikan aktif di halaman Profil**: lihat sisa waktu, salin, atau hapus tautan lebih awal.
- **Foto profil.** Di Profil, **Ganti foto** memotong foto menjadi persegi dari tengah dan mengecilkannya menjadi sekitar 256 px (WebP, sekitar 10 sampai 30 KB) di perangkatmu sebelum disimpan, jadi penyimpanan gratis tidak terbebani. Foto tampil di navbar (desktop), menu Lainnya (HP), dan Profil; hanya terlihat oleh pemiliknya. **Hapus foto** mengembalikan avatar huruf.
- Tabel `bagikan` dan `foto_profil` beserta fungsi `buat_bagikan()` dan `ambil_bagikan()` di `supabase/skema.sql`, dengan RLS (tiap akun hanya melihat miliknya; tabel `bagikan` tidak bisa dibaca langsung tanpa login, hanya lewat kode yang tepat) dan batas ukuran di database.

### Diubah
- Dialog Bagikan: tombol sekunder kini bergaya sama di semua editor.

### Perlu dilakukan pengelola
- Jalankan ulang `supabase/skema.sql` di SQL Editor (aman diulang) untuk membuat tabel `bagikan` dan `foto_profil`.

## [5.9.0] - 2026-10-30

### Ditambahkan
- **Halaman Dokumentasi** (`pages/dokumentasi.html`). Kartu dibuat otomatis untuk setiap foto dari daftar array di `js/dokumentasi-data.js`; foto lokal di `assets/dokumentasi/`. Menambah foto cukup menaruh berkasnya lalu menulis satu blok `{ foto, judul, tanggal, deskripsi, lokasi }`, tanpa mengubah HTML.
- Daftar diurutkan otomatis dari tanggal terbaru (yang tanpa tanggal di akhir). Data yang salah (nama foto tidak valid, tanggal tidak ada) dilewati dengan peringatan di konsol; foto yang berkasnya belum ada tampil sebagai "Foto belum tersedia".
- **Detail**: klik kartu membuka jendela berisi foto, judul, tanggal, lokasi, dan deskripsi (baris baru dipertahankan), dengan tombol sebelumnya/berikutnya dan panah keyboard.
- **Tampilan penuh**: klik foto di detail untuk memperbesar sampai memenuhi layar. Zoom 100 sampai 600% lewat tombol, roda mouse, klik dua kali, atau tombol +/-/0; geser dengan mouse atau sentuhan; tombol layar penuh (bila didukung browser); panah untuk pindah foto; Esc menutup.
- Menu **Dokumentasi** di dropdown Lainnya (desktop) dan menu Lainnya (HP), sitemap, dan `llms.txt`.

## [5.8.0] - 2026-10-30

### Ditambahkan
- **Halaman Profil** (`pages/profil.html`): avatar, `@username`, nama dan kelas (bila diisi pengelola), status akun, status sinkron, dan tombol **Keluar**. Password selalu tampil tersembunyi (`••••••••`): situs memang tidak pernah menyimpan atau mengetahui password aslinya. Tombol **Ubah password** membuka form (ketik dua kali, ada opsi tampilkan); sesi tetap berlaku setelah diganti.
- **Navbar desktop dirampingkan**: menu utama Beranda, Materi, Playground, Peringkat, Games, lalu dropdown **Lainnya** (Struktur Organisasi, Tentang, Pengaturan) dan tombol **Masuk** atau avatar + `@username` yang membuka Profil. Dropdown bisa ditutup dengan Esc atau klik di luar.
- **Avatar** bulat berisi huruf pertama username, warnanya tetap untuk username yang sama (tanpa unggah foto, jadi tidak memakai penyimpanan).
- **HP**: bar bawah tidak berubah. Di menu **Lainnya** ada baris pertama berisi avatar dan `@username` (atau **Masuk**) yang membuka Profil.

### Diubah
- Kartu Akun di Pengaturan dipindah ke halaman Profil; Pengaturan hanya menyisakan tautan ke Profil.
- Di layar 721 sampai 1024 px (menu hamburger) semua tautan tetap tampil berurutan tanpa dropdown.

## [5.7.0] - 2026-10-30

### Ditambahkan
- **Proyek di editor Web, Python, dan C++** (`js/proyek.js`, `css/proyek.css`). Akun yang login melihat daftar **Proyek saya** saat editor dibuka: buat proyek baru, buka, ganti nama (dari bar atau daftar), dan hapus (dengan konfirmasi). Tiap editor punya daftarnya sendiri.
- **Simpan otomatis** sekitar 2 detik setelah berhenti mengetik, ditambah tombol Simpan dan Ctrl + S untuk menyimpan seketika. Status di bar: "Belum tersimpan", "Menyimpan…", "Tersimpan 14.02", atau pesan gagal yang mencoba lagi sendiri.
- **Peringatan sebelum keluar**: bila masih ada perubahan yang belum tersimpan, browser meminta konfirmasi saat halaman akan ditutup atau ditinggalkan. Perubahan juga dikirim saat tab disembunyikan.
- Editor Python menyimpan kode mode Console dan Visual dalam satu proyek.
- Kode yang dulu disimpan di browser dapat dijadikan proyek "Kode lama" dengan satu klik (sekali).
- Tabel `proyek` di `supabase/skema.sql` dengan RLS: tiap akun hanya mengakses proyeknya sendiri; maksimal 40 proyek per akun dan sekitar 100 KB per proyek.

### Diubah
- Pengunjung yang belum login tidak mendapat proyek (supaya database tidak penuh); editor bekerja seperti sebelumnya dengan penyimpanan di browser. Bar kecil mengajak masuk dan bisa disembunyikan.
- Selama sebuah proyek terbuka, tombol Simpan dan Ctrl + S menyimpan ke proyek, bukan ke salinan di browser. Dari dialog, "Lanjut tanpa proyek" mengembalikan perilaku lama.
- Halaman yang dibuka dari tautan **Bagikan** tidak menampilkan daftar proyek otomatis, agar kode kiriman tidak tertimpa.
- `js/akun.js` mengekspor `minta()`.

### Perlu dilakukan pengelola
- Jalankan ulang `supabase/skema.sql` di SQL Editor (aman diulang) untuk membuat tabel `proyek`.

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
