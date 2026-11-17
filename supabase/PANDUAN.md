# Panduan akun dan poin (Supabase)

Dokumen ini untuk pengelola. Isinya: memasang database sekali jalan, mengangkat admin, menyetujui anggota, dan mengisi poin.

## Cara kerjanya (singkat)

- Siapa pun bisa memakai seluruh situs tanpa login.
- Pengunjung boleh **daftar** dengan username dan password. Setelah login, kode editor, skor game, dan pengaturan editor ikut tersimpan di akunnya dan muncul di perangkat lain.
- Halaman **Peringkat** hanya terbuka untuk akun yang `anggota = true`. Akun baru belum anggota sampai pengelola menyetujuinya.
- **Poin disimpan di database Supabase** (tabel `poin_*`, lihat bagian C). Fungsi di folder `api/` memeriksa token login dan status anggota dulu sebelum membaca poin.
- Anak-anak hanya bisa **melihat** poin. Poin ditambah dan dibatalkan admin lewat halaman **Kelola poin** di situs; menyetujui anggota dan menjadikan admin hanya bisa lewat dashboard Supabase.
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

Atau lewat **Table Editor > profil**: cari barisnya, lalu centang `anggota`. Hanya itu. Nama, kelas, dan poin di Peringkat datang dari tabel `poin_anggota` (bukan dari `profil`), jadi `nama` dan `kelas` di tabel `profil` tidak perlu diisi.

Sesama anggota yang sudah disetujui boleh melihat peringkat semua orang dan riwayat poin (tanggal dan jumlah poin) anggota mana pun. Akun yang belum disetujui tidak melihat apa-apa.

**Menambah atau membatalkan poin**: buka **Peringkat > Kelola poin** (khusus admin). Perubahan muncul di Peringkat dalam sekitar 30 detik (ada ingatan singkat supaya database tidak terlalu sering dipanggil).

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

## C. Poin dan Peringkat (database)

Poin anggota disimpan di database, bukan di Google Sheets. Satu pemberian poin = satu baris catatan. Total = jumlah catatan yang belum dibatalkan pada **semester aktif**. Membatalkan hanya menandai baris (angkanya tidak dihapus), jadi tidak ada lagi total yang salah hitung dan semuanya bisa diaudit.

```
browser (login Supabase)  --token-->  api/ di Vercel  --token yang sama-->  fungsi database poin_*
admin (halaman Kelola poin)  ------------------------------------------>  fungsi database admin_poin_*
```

Tabel: `poin_semester`, `poin_anggota` (kunci ID siswa seperti `S001`, tidak bergantung akun web), `poin_batch` (satu kali input), `poin_catatan` (poin per anggota). Tidak ada policy tulis dari browser; poin hanya berubah lewat fungsi `admin_poin_*` (dijaga `adalah_admin`) dan `tambah_poin_tantangan` (dijaga rahasia penilai). Tidak memakai kunci `service_role`.

**Pemasangan (sekali saja, urut):**

1. Cadangkan dulu: di Google Sheets pilih **File > Buat salinan**. Spreadsheet lama tidak dihapus dan jadi arsip.
2. Supabase > SQL Editor: jalankan seluruh `supabase/poin.sql` (setelah `skema.sql` dan `tantangan.sql`). Aman diulang.
3. Jalankan **berkas impor** yang dibuat dari spreadsheet (`impor_poin.sql`, diberikan terpisah, BUKAN bagian repositori karena berisi nama dan kelas anggota). Berkas ini berjalan dalam satu transaksi dan memeriksa total tiap anggota terhadap kolom TOTAL di spreadsheet. Bila ada yang tidak cocok, seluruh impor dibatalkan dan tidak ada yang berubah. Bila berhasil, muncul pesan `IMPOR BERHASIL: 132 anggota, total 4594 poin.` Berkas ini menolak dijalankan dua kali. Setelah berhasil, hapus berkasnya dari komputer.
4. Deploy situs versi ini. Variabel `APPS_SCRIPT_URL` dan `APPS_SCRIPT_SECRET` di Vercel tidak dipakai lagi (boleh dihapus setelah semua berjalan baik). `PENILAI_RAHASIA` tetap dipakai untuk poin Tantangan.
5. Buka **Peringkat**: daftar harus tampil dan totalnya sama dengan spreadsheet. Admin melihat tautan **Kelola poin** di bawah judul.

**Kelola poin (khusus admin)**
- **Tambah**: pilih tanggal, isi poin dan keterangan, centang anggota (ada pencarian, filter kelas, dan "Pilih yang tampil"), lalu Simpan. Satu input mendapat kode `B040`, `B041`, dan seterusnya.
- **Riwayat**: semua input semester aktif. Bisa membatalkan satu input utuh atau satu anggota saja. Poin lama hasil impor tidak bisa dibatalkan dari sini.
- **Anggota**: tambah anggota baru, ubah nama atau kelas, nonaktifkan. Anggota nonaktif tidak muncul di input poin dan di peringkat hanya muncul bila punya poin pada semester itu.
- **Semester**: tombol **Mulai semester baru** menutup semester sekarang dan memulai peringkat dari 0. Poin semester lama tetap tersimpan, dan 5 besarnya tampil di halaman Peringkat. Tiap semester bisa diunduh sebagai CSV. Lakukan ini di awal semester (Juli dan Januari).

**Poin Tantangan** masuk otomatis ke semester aktif lewat `tambah_poin_tantangan` dan tidak pernah ganda (kunci unik).

**Kalau Peringkat tidak tampil:** buka **Vercel > Deployments > Functions/Logs** dan lihat pesan `Ranking error:`. Penyebab paling umum: `supabase/poin.sql` belum dijalankan. Kalau muncul daftar tapi semua poin 0, berarti belum ada semester aktif atau impor belum dijalankan: buka **Kelola poin > Semester**.

**Apps Script dan spreadsheet lama** tidak dipakai lagi untuk poin. Jangan menjalankan fungsi lamanya (misalnya rekap atau batalkan) karena tidak lagi tersambung ke data yang dipakai situs. File `apps-script/tambah-poin.gs` dibiarkan di repositori hanya sebagai arsip.

## D. Pengujian keamanan (disarankan setelah pemasangan)

Dengan tiga akun: admin, anggota, dan akun biasa (belum disetujui):

| Uji | Hasil yang benar |
| --- | --- |
| Buka Peringkat tanpa login | Diarahkan ke halaman Masuk |
| Buka Peringkat dengan akun biasa | Muncul "Akunmu menunggu persetujuan", tanpa data poin |
| Buka Peringkat dengan akun anggota | Daftar peringkat tampil; klik kartu anggota mana pun membuka riwayat poinnya |
| Akun biasa membuka `/api/points/ranking` atau `/api/points/riwayat?id=...` lewat konsol (`fetch` dengan tokennya) | Status 403, tanpa data poin |
| `fetch("/api/points/ranking")` atau `riwayat` tanpa login | Status 401 |

Tidak ada cara dari browser untuk menulis ke `profil`; percobaan menulis akan ditolak database. Poin hanya berubah lewat fungsi admin di database (halaman Kelola poin) dan poin Tantangan dari server.

## E. Hal yang perlu diingat

- **Project Free dijeda otomatis** setelah sekitar satu minggu tanpa aktivitas. Kalau login mendadak gagal, buka dashboard dan tekan **Restore**. Situs tetap bisa dipakai tanpa login selama itu.
- Batas gratis: 500 MB database dan 50.000 pengguna aktif per bulan. Setiap akun dibatasi 60 item progres (maksimal sekitar 64 KB per item), jadi penyimpanan aman.
- Data pribadi seminimal mungkin: hanya username, progres belajar, dan (di tabel poin) nama, kelas, dan poin. Riwayat poin berisi tanggal dan jumlah poin saja, dan terbuka bagi sesama anggota. Beri tahu pembina dan anggota apa saja yang disimpan.
- Di komputer bersama (lab), data akun dibersihkan dari browser saat **Keluar**.


## F. Fitur Tantangan (soal, penilaian otomatis, poin)

Anggota membuka **Tantangan**, mengerjakan soal Python, C++, atau Web, lalu mengirim jawaban. Soal Python dan C++ dinilai otomatis oleh server (tes tersembunyi disimpan di database dan tidak pernah terkirim ke browser). Soal Web dinilai guru. Yang selesai langsung menambah poin di semester aktif.

**Pemasangan (sekali saja)**
1. Supabase > SQL Editor: jalankan seluruh `supabase/tantangan.sql` (setelah `skema.sql`).
2. Buat **rahasia penilai**: kata sandi acak minimal 32 karakter (buatan sendiri, BUKAN service_role). Simpan di database, jalankan di SQL Editor (ganti isinya):
   `insert into public.pengaturan_server (kunci, nilai) values ('penilai', 'ISI-KATA-SANDI-ACAK-PANJANG') on conflict (kunci) do update set nilai = excluded.nilai;`
3. Vercel > Settings > Environment Variables: tambah `PENILAI_RAHASIA` dengan isi yang sama persis, lalu **Redeploy**.
4. Pastikan `supabase/poin.sql` sudah dijalankan (bagian C). Apps Script tidak diperlukan lagi.
5. Jadikan dirimu admin: Table Editor > `profil` > kolom `admin` = true pada barismu.
6. Buka **Tantangan > Kelola tantangan**: tab **Anggota** untuk mengisi ID anggota tiap anak, misalnya `S001` (wajib agar poin bisa masuk), tab **Soal** untuk menambah soal dan tes.

**Pekerjaan rutin**: soal baru dan tes ditambah lewat halaman admin, tanpa commit. Jawaban Web muncul di tab **Menunggu** (Setujui / Tolak). Poin yang gagal masuk muncul di bagian "Poin belum masuk daftar poin" dengan tombol **Kirim ulang**.

**Batas yang perlu diketahui**
- Penilaian memakai layanan publik Wandbox (sama seperti editor C++). Bila sedang sibuk, anak diminta mencoba lagi; jawabannya tidak dihitung salah.
- Jeda kirim 5 detik per anak bersifat per instance fungsi Vercel, bukan jaminan mutlak.
- Satu anak hanya bisa mendapat poin satu kali per soal (dijaga database lewat kunci unik).

**Poin khusus untuk jawaban Web yang bagus**: di tab Menunggu, kolom **Poin** sudah terisi poin standar soal. Ubah (1 sampai 100) sebelum menekan **Setujui** untuk memberi poin lebih. Setelah memperbarui ke versi ini, jalankan ulang `supabase/tantangan.sql` di SQL Editor (aman diulang).
