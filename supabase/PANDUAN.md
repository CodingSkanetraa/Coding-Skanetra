# Panduan akun dan poin (Supabase)

Dokumen ini untuk pengelola. Isinya: memasang database sekali jalan, mengangkat admin, menyetujui anggota, dan mengisi poin.

## Cara kerjanya (singkat)

- Siapa pun bisa memakai seluruh situs tanpa login.
- Pengunjung boleh **daftar** dengan username dan password. Setelah login, kode editor, skor game, dan pengaturan editor ikut tersimpan di akunnya dan muncul di perangkat lain.
- Halaman **Peringkat** hanya terbuka untuk akun yang `anggota = true`. Akun baru belum anggota sampai pengelola menyetujuinya.
- **Poin dibaca dari Google Sheets** (lewat Google Apps Script), bukan dari database. Akun Supabase hanya dipakai untuk login dan sebagai "gerbang": fungsi di folder `api/` memeriksa token login dan status anggota dulu sebelum membuka spreadsheet.
- Anak-anak hanya bisa **melihat** poin. Poin diubah di Google Sheets; menyetujui anggota dan menjadikan admin hanya bisa lewat dashboard Supabase.
- Username diubah diam-diam menjadi email buatan `username@users.codingskanetra.vercel.app`. Tidak ada email yang dikirim.

Keamanan ada di database (RLS), bukan di JavaScript situs. Kunci `anon` di `js/akun-config.js` memang publik dan aman. Kunci `service_role` / `secret` **tidak boleh** masuk ke kode atau repositori.

## A. Pemasangan pertama (sekali saja)

1. Buka proyek Supabase, lalu **SQL Editor > New query**.
2. Tempel seluruh isi `supabase/skema.sql`, lalu **Run**. Aman dijalankan ulang.
3. **Authentication > Sign In / Providers > Email**: matikan **Confirm email**. Tanpa ini pendaftaran dengan username tidak bisa dipakai.
4. (Disarankan) **Authentication > Rate Limits**: biarkan bawaan; ini yang menahan percobaan masuk berulang.
5. Buka situs, halaman **Masuk > Daftar**, daftarkan akun `kaito`.
6. Kembali ke SQL Editor dan jalankan:

   ```sql
   update public.profil set admin = true, anggota = true, nama = 'Kaito Sora'
   where username = 'kaito';
   ```

## B. Pekerjaan rutin

**Menyetujui anggota** (setelah anak mendaftar lewat situs):

```sql
update public.profil set anggota = true where username = 'username_anak';
```

Atau lewat **Table Editor > profil**: cari barisnya, lalu centang `anggota`. Hanya itu. Nama, kelas, dan poin di Peringkat datang dari Google Sheets, jadi `nama` dan `kelas` di tabel `profil` tidak perlu diisi.

Sesama anggota yang sudah disetujui boleh melihat peringkat semua orang dan riwayat poin (tanggal dan jumlah poin) anggota mana pun. Akun yang belum disetujui tidak melihat apa-apa.

**Menambah atau mengubah poin**: lakukan di **Google Sheets** seperti biasa. Perubahan muncul di Peringkat dalam sekitar 30 detik (ada ingatan singkat supaya Apps Script tidak terlalu sering dipanggil).

**Lupa password**: belum ada reset otomatis. Di **Authentication > Users**, pilih akunnya (email `username@users.codingskanetra.vercel.app`), lalu atur password baru atau hapus akunnya.

**Menghapus akun**: hapus di **Authentication > Users**. Profil, poin, dan progres akun itu ikut terhapus.

## Proyek di editor

Akun yang login melihat daftar **Proyek saya** di editor Web, Python, dan C++. Datanya ada di tabel `proyek`.

- **Pemasangan:** tempel ulang seluruh `supabase/skema.sql` di SQL Editor lalu **Run** (aman diulang, data lama tidak berubah). Tanpa langkah ini, daftar proyek menampilkan pesan gagal memuat.
- **Batas:** 40 proyek per akun, sekitar 100 KB per proyek. Teks kode sangat kecil, jadi jatah gratis 500 MB sangat aman. Anak yang belum login tidak memakai tabel ini.
- **Melihat atau membersihkan:** Table Editor > `proyek` (kolom `user_id` cocok dengan **Authentication > Users**). Menghapus akun di Authentication ikut menghapus proyeknya.
- **Keamanan:** RLS membuat tiap akun hanya bisa membaca, mengubah, dan menghapus proyeknya sendiri.

## Tautan Bagikan dan foto profil

- **Pemasangan:** tempel ulang seluruh `supabase/skema.sql` di SQL Editor lalu **Run** (aman diulang). Ini membuat tabel `bagikan` dan `foto_profil`.
- **Tautan Bagikan (7 hari):** dibuat lewat fungsi `buat_bagikan()` (harus login, maksimal 20 aktif per akun, sekitar 100 KB per tautan). Yang membuka tautan tidak perlu login, tetapi hanya bisa membuka satu kode yang tepat lewat `ambil_bagikan()`; tabel `bagikan` tidak bisa dibaca langsung oleh pengunjung. Baris yang sudah kedaluwarsa tidak bisa dibuka lagi dan dihapus otomatis saat ada yang membuat tautan baru. Untuk melihat atau membersihkan manual: Table Editor > `bagikan` (hapus baris yang `kedaluwarsa`-nya sudah lewat bila perlu).
- **Foto profil:** satu baris per akun di tabel `foto_profil`. Browser memotong dan mengecilkan fotonya (sekitar 256 px, 10 sampai 30 KB) sebelum dikirim, dan database menolak data di atas sekitar 45 KB atau yang bukan gambar WebP/JPEG. 100 akun memakai paling banyak beberapa MB dari jatah 500 MB. Foto hanya terbaca oleh pemiliknya. Untuk menghapus foto seseorang: Table Editor > `foto_profil` > hapus barisnya (avatar kembali berupa huruf).
- **Kapasitas:** semua tabel buatan pengguna (progres, proyek, tautan, foto) bersifat teks kecil, jadi jatah gratis sangat aman untuk satu eskul.

## C. Menghubungkan Peringkat ke Google Sheets

Peringkat dan riwayat poin dibaca dari spreadsheet lewat Google Apps Script, melalui fungsi di folder `api/` (`api/points/ranking.js`, `api/points/riwayat.js`, `api/auth/me.js`). Alurnya:

```
browser (login Supabase)  --token-->  api/ di Vercel  --rahasia-->  Apps Script  -->  Google Sheets
```

Rahasia Apps Script hanya ada di server Vercel dan tidak pernah dikirim ke browser. Sebelum membuka spreadsheet, fungsi `api/` memeriksa token login ke Supabase dan memastikan akunnya `anggota = true`.

**Pemasangan (sekali):**

1. Di Vercel: **Project > Settings > Environment Variables**, isi `APPS_SCRIPT_URL` dan `APPS_SCRIPT_SECRET` (nilainya sama dengan yang dipakai sebelumnya), lalu **Redeploy** (variabel baru hanya berlaku di deploy berikutnya). `SESSION_SECRET` tidak diperlukan lagi.
2. Pastikan akun yang boleh melihat Peringkat sudah `anggota = true` (bagian B).

**Apps Script** harus mendukung dua aksi (sama seperti sebelumnya):

| Aksi yang dikirim | Isi permintaan | Respons yang diharapkan |
| --- | --- | --- |
| `ranking` | `{ "action": "ranking", "secret": "..." }` | `{ "sukses": true, "data": [ { "id", "nama", "kelas", "total" }, ... ] }` |
| `riwayat` | `{ "action": "riwayat", "id": "ID_ANGGOTA", "secret": "..." }` | `{ "sukses": true, "data": { "id", "nama", "kelas", "total", "ranking", "riwayat": [ { "tanggal", "poin" }, ... ] } }` |

`id` pada `riwayat` adalah ID anggota yang tampil di daftar peringkat (kolom `id` dari aksi `ranking`).

Aksi `login` pada Apps Script lama tidak dipakai lagi (login sekarang lewat Supabase).

**Kalau Peringkat tidak tampil:** buka **Vercel > Deployments > Functions/Logs** dan lihat pesan `Ranking error:`. Penyebab paling umum: variabel lingkungan belum diisi, atau Apps Script belum di-deploy ulang sebagai *Web app* dengan akses "Anyone".

## D. Pengujian keamanan (disarankan setelah pemasangan)

Dengan tiga akun: admin, anggota, dan akun biasa (belum disetujui):

| Uji | Hasil yang benar |
| --- | --- |
| Buka Peringkat tanpa login | Diarahkan ke halaman Masuk |
| Buka Peringkat dengan akun biasa | Muncul "Akunmu menunggu persetujuan", tanpa data poin |
| Buka Peringkat dengan akun anggota | Daftar peringkat dari spreadsheet tampil; klik kartu anggota mana pun membuka riwayat poinnya |
| Akun biasa membuka `/api/points/ranking` atau `/api/points/riwayat?id=...` lewat konsol (`fetch` dengan tokennya) | Status 403, tanpa data poin |
| `fetch("/api/points/ranking")` atau `riwayat` tanpa login | Status 401 |

Tidak ada cara dari browser untuk menulis ke `profil`; percobaan menulis akan ditolak database. Poin hanya berubah lewat Google Sheets.

## E. Hal yang perlu diingat

- **Project Free dijeda otomatis** setelah sekitar satu minggu tanpa aktivitas. Kalau login mendadak gagal, buka dashboard dan tekan **Restore**. Situs tetap bisa dipakai tanpa login selama itu.
- Batas gratis: 500 MB database dan 50.000 pengguna aktif per bulan. Setiap akun dibatasi 60 item progres (maksimal sekitar 64 KB per item), jadi penyimpanan aman.
- Data pribadi seminimal mungkin: hanya username, progres belajar, dan (di spreadsheet) nama, kelas, dan poin. Riwayat poin berisi tanggal dan jumlah poin saja, dan terbuka bagi sesama anggota. Beri tahu pembina dan anggota apa saja yang disimpan.
- Di komputer bersama (lab), data akun dibersihkan dari browser saat **Keluar**.
