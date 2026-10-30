# Coding Skanetra

Website komunitas belajar pemrograman **Coding SMK Negeri Situraja**. Isinya materi, editor kode online, peringkat poin anggota, dan game kecil. Semuanya berbahasa Indonesia dan dibuat supaya teman-teman bisa belajar ngoding dengan nyaman, tanpa perlu memasang aplikasi apa pun.

Situs: https://codingskanetra.vercel.app

## Kepemilikan dan Pengelolaan

Website ini merupakan proyek resmi **CodingSkanetra**, komunitas belajar pemrograman SMK Negeri Situraja.

- **Pemilik proyek:** Organisasi CodingSkanetra
- **Pengembang utama:** Kaito Sora (@sorakaito)
- **Pengelola teknis utama:** Kaito Sora (@sorakaito)
- **Hosting dan deployment:** Vercel

Website ini dikembangkan untuk mendukung kegiatan pembelajaran, pengembangan keterampilan pemrograman, dan aktivitas komunitas CodingSkanetra.

Kaito Sora bertanggung jawab atas pengembangan dan pemeliharaan teknis website sesuai dengan mandat dan pengaturan akses yang berlaku.

Nama, logo, dan identitas resmi CodingSkanetra dikelola oleh organisasi.

## Isi website

| Bagian | Keterangan |
| --- | --- |
| **Materi** | HTML, CSS, JavaScript, Python, dan C++ dasar, ditambah Proyek Mini (kalkulator, tebak angka, buku nilai), lengkap dengan kuis di akhir materi |
| **Editor Web** | HTML + CSS + JS dengan pratinjau langsung, console, dan petunjuk kode (autocomplete) |
| **Editor Python** | Python berjalan di browser (Pyodide), mendukung `input()`. Ada mode **Console** dan mode **Visual** (kanvas gambar, kura-kura, animasi, mouse, dan keyboard) |
| **Editor C++** | Kompilasi dan jalankan C++ lewat layanan compiler online, mendukung `cin` |
| **Akun** | Opsional. Daftar dengan username dan password; kode editor, skor game, dan pengaturan editor tersimpan di akun dan ikut ke perangkat lain |
| **Dokumentasi** | Galeri foto kegiatan eskul. Kartu dibuat otomatis dari satu daftar array (`js/dokumentasi-data.js`) dengan foto lokal di `assets/dokumentasi/`. Klik kartu untuk detail (tanggal, lokasi, deskripsi), klik foto untuk tampilan penuh dengan zoom |
| **Proyek** | Khusus akun yang login. Di editor Web, Python, dan C++ ada daftar "Proyek saya": buat, buka, ganti nama, hapus. Perubahan disimpan otomatis, dan ada peringatan bila halaman ditutup sebelum tersimpan |
| **Peringkat** | Poin anggota dari **Google Sheets** (hanya dilihat), khusus akun yang sudah disetujui pengelola. Login tetap lewat akun Supabase; sesama anggota bisa melihat riwayat poin satu sama lain |
| **Games** | Code Rush: Robot Escape |
| **Struktur Organisasi / Tentang** | Pengurus, anggota, dan profil komunitas |
| **Pengaturan** | Mode terang/gelap, warna tema, pengaturan editor (ukuran font, nomor baris, dll.), dan sakelar maskot |

Fitur pendukung belajar:

- **Skani**, maskot yang menyapa di beranda, ikut bereaksi saat program berhasil, error, atau kuis dijawab.
- **Penjelasan error ramah**: error Python, C++, dan JavaScript diterjemahkan ke bahasa sederhana lengkap dengan saran.
- **Bagikan lewat tautan**: kode dikemas ke dalam link sehingga bisa dikirim ke guru atau admin untuk diperiksa.
- **Mode fokus** di editor, nyaman dipakai di HP.
- **Simpan kode** (Ctrl + S), terpisah untuk tiap editor. Tanpa login tersimpan di browser; setelah login juga tersimpan di akun.

## Teknologi

Situs ini sengaja dibuat sederhana: **HTML, CSS, dan JavaScript murni** tanpa framework dan tanpa langkah build.

- **Hosting**: [Vercel](https://vercel.com) (situs statis)
- **Editor kode**: [CodeMirror 5](https://codemirror.net) (dimuat dari CDN)
- **Python di browser**: [Pyodide](https://pyodide.org) (dimuat dari CDN saat editor Python dibuka)
- **Compiler C++**: [Wandbox](https://wandbox.org) dengan cadangan [Compiler Explorer](https://godbolt.org)
- **Akun dan progres**: [Supabase](https://supabase.com) (Auth + Postgres), dipanggil langsung dari browser lewat REST tanpa library tambahan. Keamanan data lewat Row Level Security di `supabase/skema.sql`
- **Poin peringkat**: Google Sheets, dibaca lewat Google Apps Script. Fungsi di folder `api/` (Vercel) memeriksa token login Supabase lebih dulu, lalu memanggil Apps Script dengan rahasia yang hanya ada di server
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
├── supabase/             skema.sql (tabel + RLS) dan PANDUAN.md untuk pengelola
├── api/                  Fungsi serverless Vercel: peringkat dan riwayat poin dari Google Sheets (lewat Apps Script)
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
| `js/editor-hint.js` | Petunjuk kode (autocomplete) di Editor Web; daftar tag, atribut, properti, dan fungsi ada di bagian atas berkas |
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

Halaman, editor Web, dan editor Python dapat dicoba seperti itu (Python dan CodeMirror butuh internet untuk memuat CDN). Login dan penyimpanan kode ke akun juga jalan dari server statis ini karena memanggil Supabase langsung. **Halaman Peringkat tidak**: datanya lewat fungsi di `api/`, jadi jalankan dengan `npx vercel dev` (butuh variabel lingkungan di bawah) atau buka situs yang sudah di-deploy. Live Server / `http.server` hanya menyajikan berkas statis sehingga `/api/...` memberi 404.

## Deploy

1. Hubungkan repositori ke Vercel (atau unggah folder proyek).
2. Isi *Environment Variables* di Vercel (hanya dua, untuk halaman Peringkat):
   - `APPS_SCRIPT_URL`: alamat web app Google Apps Script yang membaca spreadsheet poin
   - `APPS_SCRIPT_SECRET`: kunci rahasia yang sama dengan yang ada di Apps Script

   URL project dan kunci `anon` Supabase ada di `js/akun-config.js` (kunci `anon` memang publik). `SESSION_SECRET` tidak diperlukan lagi.
3. Pasang database sekali: ikuti `supabase/PANDUAN.md` (jalankan `supabase/skema.sql`, matikan *Confirm email*, jadikan akun pertama sebagai admin, lalu setujui anggota).
4. Deploy. Tidak ada langkah build.

> Jangan pernah menaruh kunci `service_role` / `secret` Supabase di dalam kode atau di repositori GitHub.
> Project Supabase gratis dijeda otomatis bila seminggu tanpa aktivitas; situs tetap bisa dipakai tanpa login (lihat PANDUAN.md).

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

Kode sumber proyek ini dirilis di bawah lisensi [MIT](LICENSE).

Lihat berkas `LICENSE` untuk ketentuan penggunaan, penyalinan, modifikasi, dan distribusi kode.
