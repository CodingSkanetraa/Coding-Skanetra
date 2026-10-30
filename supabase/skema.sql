-- ============================================================================
--  Coding Skanetra: skema database Supabase
--  Cara pakai: Supabase > SQL Editor > New query > tempel seluruh berkas ini > Run.
--  Aman dijalankan ulang (memakai "if not exists" / "create or replace" / "drop ... if exists").
--
--  Prinsip keamanan:
--   * Kunci "anon" bersifat publik (ada di kode situs), jadi SEMUA perlindungan ada di sini lewat RLS.
--   * Dari browser, tidak ada yang bisa mengubah profil, status anggota/admin, atau poin.
--     Itu hanya bisa lewat dashboard Supabase (Table Editor / SQL Editor).
--   * Pengguna biasa hanya bisa membaca dan menulis progres miliknya sendiri.
--   * Peringkat dan riwayat poin hanya untuk akun yang berstatus anggota.
-- ============================================================================


-- ---------- 1. Profil ----------------------------------------------------------
-- Satu baris per akun. Dibuat otomatis oleh trigger di bawah saat seseorang mendaftar.
create table if not exists public.profil (
  id        uuid primary key references auth.users(id) on delete cascade,
  username  text not null unique check (username ~ '^[a-z0-9_.]{3,20}$'),
  nama      text,                                 -- opsional, diisi pengelola (nama tampil di peringkat)
  kelas     text,                                 -- opsional, diisi pengelola
  anggota   boolean not null default false,       -- true = boleh melihat peringkat dan poin
  admin     boolean not null default false,       -- cadangan untuk fitur pengelola di masa depan
  dibuat    timestamptz not null default now()
);

alter table public.profil enable row level security;

drop policy if exists "profil: baca milik sendiri" on public.profil;
create policy "profil: baca milik sendiri"
  on public.profil for select to authenticated
  using (id = (select auth.uid()));
-- Sengaja TIDAK ada policy insert/update/delete: pengguna tidak bisa mengubah profilnya dari browser.

-- Username diambil dari bagian depan email buatan ("kaito@users...." menjadi "kaito"),
-- bukan dari metadata yang bisa dikarang pengguna.
create or replace function public.buat_profil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profil (id, username)
  values (new.id, lower(split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists saat_akun_dibuat on auth.users;
create trigger saat_akun_dibuat
  after insert on auth.users
  for each row execute function public.buat_profil();


-- ---------- 2. Fungsi bantu: apakah pemanggil admin / anggota? ------------------
create or replace function public.adalah_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (select 1 from public.profil where id = (select auth.uid()) and admin);
$$;

create or replace function public.adalah_anggota()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (select 1 from public.profil where id = (select auth.uid()) and anggota);
$$;

revoke all on function public.adalah_admin()   from public, anon;
revoke all on function public.adalah_anggota() from public, anon;
grant execute on function public.adalah_admin()   to authenticated;
grant execute on function public.adalah_anggota() to authenticated;


-- ---------- 3. Poin (CADANGAN, tidak dipakai situs lagi) --------------------------
-- Peringkat sekarang dibaca dari Google Sheets lewat folder api/ (lihat PANDUAN.md bagian C).
-- Tabel poin dan fungsi peringkat() di bawah dibiarkan sebagai cadangan bila suatu saat
-- poin ingin dipindah ke database; situs tidak membacanya.
-- Satu baris per pemberian poin. Total poin = jumlah semua baris milik seorang anggota.
-- Untuk saat ini poin diisi pengelola lewat Table Editor di dashboard Supabase.
create table if not exists public.poin (
  id       bigint generated always as identity primary key,
  user_id  uuid not null references public.profil(id) on delete cascade,
  jumlah   integer not null check (jumlah between -10000 and 10000),
  alasan   text,
  tanggal  date not null default ((now() at time zone 'Asia/Jakarta')::date),
  dibuat   timestamptz not null default now()
);

create index if not exists poin_user_id_idx on public.poin (user_id);

alter table public.poin enable row level security;

-- Riwayat: anggota hanya melihat catatan miliknya sendiri.
drop policy if exists "poin: baca milik sendiri" on public.poin;
create policy "poin: baca milik sendiri"
  on public.poin for select to authenticated
  using (user_id = (select auth.uid()) and public.adalah_anggota());

drop policy if exists "poin: admin baca semua" on public.poin;
create policy "poin: admin baca semua"
  on public.poin for select to authenticated
  using (public.adalah_admin());
-- Tidak ada policy tulis: poin tidak bisa diubah dari web.

-- Peringkat: total poin semua anggota. Dibuat sebagai fungsi (bukan view) supaya pengecekan
-- "pemanggil harus anggota" ada di dalamnya. Bukan anggota atau belum login = daftar kosong.
create or replace function public.peringkat()
returns table (id uuid, username text, nama text, kelas text, total integer)
language sql
security definer
stable
set search_path = ''
as $$
  select p.id, p.username, p.nama, p.kelas, coalesce(sum(o.jumlah), 0)::integer
  from public.profil p
  left join public.poin o on o.user_id = p.id
  where p.anggota and public.adalah_anggota()
  group by p.id
  order by coalesce(sum(o.jumlah), 0) desc, p.username;
$$;

revoke all on function public.peringkat() from public, anon;
grant execute on function public.peringkat() to authenticated;


-- ---------- 4. Progres belajar ----------------------------------------------------
-- Satu baris per item yang disimpan (mis. "kode:cpp", "skor:code-rush").
create table if not exists public.progres (
  user_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kunci    text not null check (kunci ~ '^[a-z0-9:_.-]{1,100}$'),
  data     jsonb not null check (octet_length(data::text) <= 65536),   -- maksimal sekitar 64 KB
  diubah   timestamptz not null default now(),
  primary key (user_id, kunci)
);

alter table public.progres enable row level security;

drop policy if exists "progres: kelola milik sendiri" on public.progres;
create policy "progres: kelola milik sendiri"
  on public.progres for all to authenticated
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Batas jumlah item per akun supaya penyimpanan gratis tidak habis oleh satu akun.
create or replace function public.batasi_progres()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Memperbarui item yang sudah ada (upsert) tetap boleh walaupun batas sudah tercapai.
  if exists (select 1 from public.progres where user_id = new.user_id and kunci = new.kunci) then
    return new;
  end if;
  if (select count(*) from public.progres where user_id = new.user_id) >= 60 then
    raise exception 'Batas jumlah progres per akun tercapai';
  end if;
  return new;
end;
$$;

drop trigger if exists batasi_progres_sebelum_tambah on public.progres;
create trigger batasi_progres_sebelum_tambah
  before insert on public.progres
  for each row execute function public.batasi_progres();


-- ---------- 4b. Proyek (daftar file di editor) -------------------------------------------
-- Satu baris per proyek buatan pengguna di editor Web, Python, atau C++. Hanya untuk akun yang login.
-- "isi" adalah JSON kode (Web: h/c/s, Python: m/c/v, C++: k); bentuknya diatur oleh editor.
create table if not exists public.proyek (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  jenis   text not null check (jenis in ('web', 'py', 'cpp')),
  nama    text not null check (char_length(btrim(nama)) between 1 and 60),
  isi     jsonb not null check (octet_length(isi::text) <= 102400),   -- maksimal sekitar 100 KB
  dibuat  timestamptz not null default now(),
  diubah  timestamptz not null default now()
);

create index if not exists proyek_per_akun on public.proyek (user_id, jenis, diubah desc);

alter table public.proyek enable row level security;

drop policy if exists "proyek: kelola milik sendiri" on public.proyek;
create policy "proyek: kelola milik sendiri"
  on public.proyek for all to authenticated
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Batas 40 proyek per akun; pemilik dan jenis tidak bisa diganti; waktu "diubah" diisi otomatis.
create or replace function public.jaga_proyek()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.proyek where user_id = new.user_id) >= 40 then
      raise exception 'Batas jumlah proyek per akun tercapai';
    end if;
    new.nama := btrim(new.nama);
    return new;
  end if;
  new.user_id := old.user_id;
  new.jenis := old.jenis;
  new.dibuat := old.dibuat;
  new.nama := btrim(new.nama);
  new.diubah := now();
  return new;
end;
$$;

drop trigger if exists jaga_proyek_sebelum_tulis on public.proyek;
create trigger jaga_proyek_sebelum_tulis
  before insert or update on public.proyek
  for each row execute function public.jaga_proyek();


-- ---------- 5. Hak akses tabel -------------------------------------------------------
-- Pengunjung yang belum login (anon) tidak boleh menyentuh tabel apa pun.
-- Akun yang sudah login (authenticated) diberi hak minimum; RLS di atas yang membatasi barisnya.
revoke all on public.profil, public.poin, public.progres, public.proyek from anon;
grant usage on schema public to anon, authenticated;
grant select on public.profil, public.poin to authenticated;
grant select, insert, update, delete on public.progres to authenticated;
grant select, insert, update, delete on public.proyek to authenticated;


-- ============================================================================
--  LANGKAH SETELAH ITU (jalankan TERPISAH, setelah akun "kaito" didaftarkan lewat situs):
--
--    update public.profil set admin = true, anggota = true where username = 'kaito';
--
--  Menyetujui anggota baru:
--    update public.profil set anggota = true where username = 'nama_pengguna';
--  (nama dan kelas tidak perlu diisi: di Peringkat, nama dan kelas datang dari Google Sheets.)
--
--  Poin diisi di Google Sheets (bukan di Supabase). Tabel poin di atas hanya cadangan.
-- ============================================================================
