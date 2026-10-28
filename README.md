# Coding Skanetra

Website komunitas belajar pemrograman **Coding SMK Negeri Situraja**. Isinya materi, editor kode online, peringkat poin anggota, dan game kecil. Semuanya berbahasa Indonesia dan dibuat supaya teman-teman bisa belajar ngoding dengan nyaman, tanpa perlu memasang aplikasi apa pun.

Situs: https://codingskanetra.vercel.app

## Kepemilikan dan Pengelolaan

Website Coding Skanetra dikembangkan sebagai bagian dari komunitas belajar pemrograman **Coding SMK Negeri Situraja** dan dikelola melalui organisasi GitHub **CodingSkanetra**.

- **Pemilik repositori:** Organisasi CodingSkanetra
- **Pengembang awal:** Kaito Sora Wakil Ketua 2026 (`@SoraKaito`)
- **Pengelolaan teknis:** Pengembangan, pemeliharaan, perbaikan bug, dan pengembangan fitur dilakukan oleh pengelola teknis sesuai akses dan tanggung jawab yang diberikan.
- **Hosting:** Proyek Vercel saat ini dikelola melalui akun pengembang.

Repositori ini ditujukan untuk mendukung kegiatan belajar pemrograman komunitas Coding Skanetra. Pengembangan selanjutnya dapat diteruskan bersama oleh pengurus dan kontributor komunitas.

## Isi website

| Bagian | Keterangan |
| --- | --- |
| **Materi** | HTML, CSS, JavaScript, dan Python dasar, lengkap dengan kuis di akhir materi |
| **Editor Web** | HTML + CSS + JS dengan pratinjau langsung dan console |
| **Editor Python** | Python berjalan di browser (Pyodide), mendukung `input()`. Ada mode **Console** dan mode **Visual** (kanvas gambar, kura-kura, animasi, mouse, dan keyboard) |
| **Editor C++** | Kompilasi dan jalankan C++ lewat layanan compiler online, mendukung `cin` |
| **Peringkat** | Poin anggota, perlu masuk dengan ID dan PIN |
| **Games** | Code Rush: Robot Escape |
| **Struktur Organisasi / Tentang** | Pengurus, anggota, dan profil komunitas |
| **Pengaturan** | Mode terang/gelap, warna tema, pengaturan editor (ukuran font, nomor baris, dll.), dan sakelar maskot |

Fitur pendukung belajar:

- **Skani**, maskot yang menyapa di beranda, ikut bereaksi saat program berhasil, error, atau kuis dijawab.
- **Penjelasan error ramah**: error Python, C++, dan JavaScript diterjemahkan ke bahasa sederhana lengkap dengan saran.
- **Bagikan lewat tautan**: kode dikemas ke dalam link sehingga bisa dikirim ke guru atau admin untuk diperiksa.
- **Mode fokus** di editor, nyaman dipakai di HP.
- **Simpan kode** di browser (Ctrl + S), terpisah untuk tiap editor.

## Teknologi

Situs ini sengaja dibuat sederhana: **HTML, CSS, dan JavaScript murni** tanpa framework dan tanpa langkah build.

- **Hosting**: [Vercel](https://vercel.com) (situs statis + fungsi serverless di folder `api/`)
- **Editor kode**: [CodeMirror 5](https://codemirror.net) (dimuat dari CDN)
- **Python di browser**: [Pyodide](https://pyodide.org) (dimuat dari CDN saat editor Python dibuka)
- **Compiler C++**: [Wandbox](https://wandbox.org) dengan cadangan [Compiler Explorer](https://godbolt.org)
- **Login dan poin**: fungsi serverless Vercel yang terhubung ke Google Apps Script (data poin tersimpan di Google Sheets), memakai sesi cookie `HttpOnly`
- **Font**: Plus Jakarta Sans dan Fraunces, dihosting sendiri di `assets/fonts`
- **SEO**: JSON-LD, `sitemap.xml`, `robots.txt`, dan `llms.txt`

## Struktur folder

```
.
├── index.html            Beranda
├── pages/                Halaman lain (materi, editor, peringkat, dll.)
├── css/                  Gaya. style.css = gaya dasar, sisanya per halaman/fitur
├── js/                   Skrip. main.js = umum, sisanya per halaman/fitur
├── assets/               Gambar dan font
├── api/                  Fungsi serverless Vercel (login dan poin)
│   ├── _security.js      Sesi, cookie, dan pemanggilan Apps Script
│   ├── auth/             login, logout, me
│   └── points/           ranking, riwayat
├── sitemap.xml  robots.txt  llms.txt   Berkas untuk mesin pencari
└── favicon*.png, logo-512.png, og-image.png
```

Berkas JavaScript yang paling sering disentuh:

| Berkas | Fungsi |
| --- | --- |
| `js/theme.js` | Mode terang/gelap dan warna tema |
| `js/editor-python.js` | Editor Python dan mode Console/Visual |
| `js/python-visual.js` | Semua fungsi gambar, kura-kura, dan animasi untuk mode Visual |
| `js/editor-cpp.js`, `js/cpp-runner.js` | Editor C++ dan penghubung ke compiler online |
| `js/playground.js` | Editor Web (HTML, CSS, JS) dan pratinjaunya |
| `js/editor-alat.js` | Tombol Bagikan dan Mode fokus |
| `js/error-ramah.js` | Daftar aturan penjelasan error |
| `js/maskot.js`, `js/gerak.js` | Maskot Skani dan animasi kartu |
| `js/code-storage.js` | Penyimpanan kode di browser |

## Menjalankan di komputer

Tidak perlu memasang apa pun selain server statis sederhana.

```bash
# di dalam folder proyek
python3 -m http.server 8000
# lalu buka http://localhost:8000
```

Halaman, editor Web, dan editor Python dapat dicoba seperti itu (Python dan CodeMirror butuh internet untuk memuat CDN). Fitur **login dan peringkat** hanya berjalan di Vercel (atau lewat `vercel dev`) karena memakai fungsi di `api/`.

## Deploy

1. Hubungkan repositori ke Vercel (atau unggah folder proyek).
2. Isi *Environment Variables* di pengaturan proyek Vercel:

   | Nama | Fungsi |
   | --- | --- |
   | `SESSION_SECRET` | Kunci rahasia penanda sesi login (isi dengan teks acak yang panjang) |
   | `APPS_SCRIPT_URL` | Alamat web app Google Apps Script |
   | `APPS_SCRIPT_SECRET` | Kunci rahasia yang sama dengan yang dicek oleh Apps Script |

3. Deploy. Tidak ada langkah build.

> Jangan pernah menaruh nilai rahasia di dalam kode atau di repositori GitHub.

## Cara mengembangkan

**Menambah materi baru**
1. Salin salah satu halaman materi (misalnya `pages/python-dasar.html`) menjadi halaman baru.
2. Tambahkan kartunya di `pages/materi.html`.
3. Tambahkan alamatnya di `sitemap.xml` dan `llms.txt`.

**Menambah penjelasan error baru**
Buka `js/error-ramah.js`, lalu tambahkan satu baris ke daftar `PY`, `CPP`, atau `JS`: pola pesan error dan teks `judul`, `isi`, `saran`, `singkat`.

**Menambah fungsi gambar di editor Python (mode Visual)**
Fungsi yang dipakai anak-anak ditulis dalam teks Python di `js/python-visual.js`. Fungsi itu memanggil jembatan JavaScript di bagian bawah berkas yang sama. Tambahkan juga ringkasannya di bagian "Daftar fungsi" pada `pages/editor-python.html`.

**Mengubah maskot atau animasi**
Gambar Skani ada di `js/maskot.js` (SVG), gayanya di `css/maskot.css`. Animasi kartu ada di `css/gerak.css`. Semua animasi otomatis mati bila pengguna memilih "kurangi gerakan" di perangkatnya.

**Setelah mengubah CSS atau JS**
Naikkan angka `?v=` pada tag `<link>` atau `<script>` di HTML yang memakainya supaya browser memuat versi terbaru.

**Prinsip yang dipegang**
- Tetap sederhana: tanpa framework dan tanpa build.
- Semua teks berbahasa Indonesia yang ramah untuk pemula.
- Menghormati `prefers-reduced-motion` dan nyaman di HP.
- Editor kode selalu berlatar gelap agar terbaca di semua tema.

## Catatan teknis

- Editor Python memakai Pyodide di thread utama. Program `while True:` tanpa jeda akan membuat halaman macet, jadi untuk animasi pakai `animasi()`.
- Program Python yang memakai `input()` dijalankan ulang dari awal tiap jawaban (replay) dan hasilnya sama selama programnya tidak bergantung pada waktu.
- Pratinjau Editor Web berjalan di `iframe` ber-sandbox tanpa `allow-same-origin`, sehingga kode pengguna tidak dapat menyentuh situs utama.
- Kode yang dibagikan lewat tautan disimpan di bagian setelah `#`, yang tidak dikirim ke server. Kode tidak otomatis dijalankan saat tautan dibuka.

## Kontribusi

Ada ide fitur atau menemukan bug? Hubungi pengurus Coding Skanetra atau buka *issue* di repositori ini.

## Lisensi

LICENSE.MD
