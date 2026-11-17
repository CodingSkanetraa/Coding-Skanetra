-- ============================================================================
--  Coding Skanetra: poin anggota di database (menggantikan spreadsheet Poin)
--  Cara pakai: Supabase > SQL Editor > New query > tempel seluruh berkas ini > Run.
--  Jalankan SETELAH supabase/skema.sql dan supabase/tantangan.sql. Aman dijalankan ulang.
--
--  Cara kerjanya:
--   * Satu catatan poin = satu baris di poin_catatan (anggota, jumlah). Total = jumlah catatan
--     yang BELUM dibatalkan, di semester yang dipilih.
--   * Pembatalan hanya menandai baris (dibatalkan), angkanya tidak pernah ditimpa. Jadi tidak ada
--     lagi "total salah hitung" dan semua riwayat tetap bisa diaudit.
--   * Reset semester = membuat semester baru. Peringkat hanya menghitung semester aktif; poin
--     semester lama tetap tersimpan sebagai arsip.
--   * Poin diubah HANYA lewat fungsi admin_poin_* (dijaga adalah_admin) dan fungsi tantangan
--     (dijaga rahasia penilai). Tidak ada policy tulis langsung dari browser.
--   * Tidak memakai kunci service_role.
-- ============================================================================


-- ---------- 1. Semester -------------------------------------------------------------------
create table if not exists public.poin_semester (
  id       integer generated always as identity primary key,
  nama     text not null unique check (char_length(btrim(nama)) between 3 and 60),
  mulai    date not null,
  selesai  date,
  aktif    boolean not null default false,
  dibuat   timestamptz not null default now(),
  check (selesai is null or selesai >= mulai)
);
-- Paling banyak satu semester aktif.
create unique index if not exists poin_semester_satu_aktif on public.poin_semester ((true)) where aktif;


-- ---------- 2. Anggota (daftar peringkat), kunci = ID siswa seperti "S001" -----------------
-- Tidak bergantung pada akun web, jadi anggota yang belum punya akun tetap tampil di peringkat.
create table if not exists public.poin_anggota (
  id_siswa  text primary key check (id_siswa ~ '^[A-Za-z0-9_-]{1,20}$'),
  nama      text not null check (char_length(btrim(nama)) between 1 and 80),
  kelas     text not null default '' check (char_length(kelas) <= 40),
  aktif     boolean not null default true,
  dibuat    timestamptz not null default now()
);


-- ---------- 3. Batch input dan catatan poin -------------------------------------------------
-- Satu batch = satu kali input (satu tanggal, satu keterangan, banyak anggota).
-- sumber: 'input' (halaman admin), 'saldo_awal' (poin lama hasil impor spreadsheet), 'tantangan'.
create sequence if not exists public.poin_kode_seq;      -- B001, B002, ... (input admin)
create sequence if not exists public.poin_kode_tg_seq;   -- T001, T002, ... (poin tantangan)

create table if not exists public.poin_batch (
  id           bigint generated always as identity primary key,
  kode         text not null unique,
  semester_id  integer not null references public.poin_semester(id),
  tanggal      date not null,
  keterangan   text not null default '' check (char_length(keterangan) <= 200),
  sumber       text not null default 'input' check (sumber in ('input', 'saldo_awal', 'tantangan')),
  kunci        text unique,                     -- hanya untuk poin tantangan (mencegah poin ganda)
  dibuat       timestamptz not null default now(),
  dibuat_oleh  uuid references public.profil(id) on delete set null
);
create index if not exists poin_batch_semester_idx on public.poin_batch (semester_id, tanggal);

create table if not exists public.poin_catatan (
  id            bigint generated always as identity primary key,
  batch_id      bigint not null references public.poin_batch(id) on delete cascade,
  id_siswa      text not null references public.poin_anggota(id_siswa) on update cascade,
  jumlah        integer not null check (jumlah between -10000 and 10000 and jumlah <> 0),
  dibatalkan    timestamptz,
  dibatalkan_oleh uuid references public.profil(id) on delete set null,
  alasan_batal  text check (alasan_batal is null or char_length(alasan_batal) <= 200)
);
create index if not exists poin_catatan_batch_idx on public.poin_catatan (batch_id);
create index if not exists poin_catatan_siswa_idx on public.poin_catatan (id_siswa);


-- ---------- 4. Hak akses (RLS) -----------------------------------------------------------------
-- Admin boleh MEMBACA semua tabel. Menulis hanya lewat fungsi di bawah.
alter table public.poin_semester enable row level security;
alter table public.poin_anggota  enable row level security;
alter table public.poin_batch    enable row level security;
alter table public.poin_catatan  enable row level security;

drop policy if exists "poin_semester: admin baca" on public.poin_semester;
create policy "poin_semester: admin baca" on public.poin_semester for select to authenticated using (public.adalah_admin());
drop policy if exists "poin_anggota: admin baca" on public.poin_anggota;
create policy "poin_anggota: admin baca" on public.poin_anggota for select to authenticated using (public.adalah_admin());
drop policy if exists "poin_batch: admin baca" on public.poin_batch;
create policy "poin_batch: admin baca" on public.poin_batch for select to authenticated using (public.adalah_admin());
drop policy if exists "poin_catatan: admin baca" on public.poin_catatan;
create policy "poin_catatan: admin baca" on public.poin_catatan for select to authenticated using (public.adalah_admin());

revoke all on public.poin_semester, public.poin_anggota, public.poin_batch, public.poin_catatan from anon;
revoke insert, update, delete, truncate on public.poin_semester, public.poin_anggota, public.poin_batch, public.poin_catatan from authenticated;


-- ---------- 5. Fungsi bantu (internal) ------------------------------------------------------------
create or replace function public.poin_boleh_lihat()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select public.adalah_anggota() or public.adalah_admin();
$$;
revoke all on function public.poin_boleh_lihat() from public, anon;
grant execute on function public.poin_boleh_lihat() to authenticated;

create or replace function public.poin_semester_aktif_id()
returns integer
language sql
security definer
stable
set search_path = ''
as $$
  select id from public.poin_semester where aktif limit 1;
$$;
revoke all on function public.poin_semester_aktif_id() from public, anon, authenticated;


-- ---------- 6. Fungsi baca (anggota yang disetujui dan admin) ---------------------------------------

-- Daftar semester, terbaru di atas.
create or replace function public.poin_semester_daftar()
returns jsonb
language sql
security definer
stable
set search_path = ''
as $$
  select case when public.poin_boleh_lihat() then
    coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'nama', s.nama, 'mulai', s.mulai, 'selesai', s.selesai, 'aktif', s.aktif)
                       order by s.mulai desc, s.id desc)
        from public.poin_semester s
    ), '[]'::jsonb)
  else '[]'::jsonb end;
$$;

-- Peringkat satu semester (kosong = semester aktif). Anggota aktif ikut semua (yang belum punya poin bernilai 0);
-- anggota nonaktif hanya muncul bila punya poin pada semester itu.
create or replace function public.poin_peringkat(p_semester integer default null)
returns table (ranking integer, id text, nama text, kelas text, total integer)
language sql
security definer
stable
set search_path = ''
as $$
  with pilih as (select coalesce(p_semester, public.poin_semester_aktif_id()) as sid),
  jumlah as (
    select c.id_siswa, sum(c.jumlah)::integer as total
      from public.poin_catatan c
      join public.poin_batch b on b.id = c.batch_id
      join pilih on b.semester_id = pilih.sid
     where c.dibatalkan is null
     group by c.id_siswa
  )
  select (row_number() over (order by coalesce(j.total, 0) desc, a.nama, a.id_siswa))::integer,
         a.id_siswa, a.nama, a.kelas, coalesce(j.total, 0)
    from public.poin_anggota a
    left join jumlah j on j.id_siswa = a.id_siswa
   where public.poin_boleh_lihat()
     and (a.aktif or coalesce(j.total, 0) <> 0)   -- anggota nonaktif tanpa poin tidak ikut daftar
   order by 1;
$$;

-- Riwayat satu anggota: poin per tanggal (catatan yang belum dibatalkan), terbaru di atas.
create or replace function public.poin_riwayat(p_id text, p_semester integer default null)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_sid integer := coalesce(p_semester, public.poin_semester_aktif_id());
  v_a public.poin_anggota;
begin
  if not public.poin_boleh_lihat() then
    return null;
  end if;
  select * into v_a from public.poin_anggota where id_siswa = btrim(p_id);
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'id', v_a.id_siswa, 'nama', v_a.nama, 'kelas', v_a.kelas,
    'riwayat', coalesce((
      select jsonb_agg(x order by x.tanggal desc)
        from (
          select b.tanggal as tanggal,
                 sum(c.jumlah)::integer as poin,
                 nullif(string_agg(distinct nullif(b.keterangan, ''), ', '), '') as alasan
            from public.poin_catatan c
            join public.poin_batch b on b.id = c.batch_id
           where c.id_siswa = v_a.id_siswa and b.semester_id = v_sid and c.dibatalkan is null
           group by b.tanggal
        ) x
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.poin_semester_daftar() from public, anon;
revoke all on function public.poin_peringkat(integer) from public, anon;
revoke all on function public.poin_riwayat(text, integer) from public, anon;
grant execute on function public.poin_semester_daftar() to authenticated;
grant execute on function public.poin_peringkat(integer) to authenticated;
grant execute on function public.poin_riwayat(text, integer) to authenticated;


-- ---------- 7. Fungsi admin (dijaga adalah_admin) -----------------------------------------------------

-- Tambah poin untuk banyak anggota sekaligus (satu batch). Hasil: { kode, jumlah, poin }.
create or replace function public.admin_poin_tambah(p_tanggal date, p_jumlah integer, p_keterangan text, p_ids text[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sid integer := public.poin_semester_aktif_id();
  v_ids text[];
  v_hilang text[];
  v_batch bigint;
  v_kode text;
begin
  if not public.adalah_admin() then
    raise exception 'Khusus pengelola.' using errcode = '42501';
  end if;
  if v_sid is null then
    raise exception 'Belum ada semester aktif. Buat semester dulu.' using errcode = 'P0001';
  end if;
  if p_tanggal is null or p_tanggal not between current_date - 400 and current_date + 400 then
    raise exception 'Tanggal tidak masuk akal.' using errcode = '22023';
  end if;
  if p_jumlah is null or p_jumlah < 1 or p_jumlah > 1000 then
    raise exception 'Poin harus bilangan bulat 1 sampai 1000.' using errcode = '22023';
  end if;
  select coalesce(array_agg(distinct btrim(x)), '{}') into v_ids from unnest(coalesce(p_ids, '{}')) x where btrim(x) <> '';
  if cardinality(v_ids) = 0 then
    raise exception 'Belum ada anggota yang dipilih.' using errcode = '22023';
  end if;
  if cardinality(v_ids) > 300 then
    raise exception 'Terlalu banyak anggota dalam satu input.' using errcode = '22023';
  end if;
  select array_agg(x) into v_hilang from unnest(v_ids) x
   where not exists (select 1 from public.poin_anggota a where a.id_siswa = x);
  if v_hilang is not null then
    raise exception 'ID tidak dikenal: %', array_to_string(v_hilang[1:5], ', ') using errcode = '22023';
  end if;

  v_kode := 'B' || lpad(nextval('public.poin_kode_seq')::text, 3, '0');
  insert into public.poin_batch (kode, semester_id, tanggal, keterangan, sumber, dibuat_oleh)
  values (v_kode, v_sid, p_tanggal, left(btrim(coalesce(p_keterangan, '')), 200), 'input', (select auth.uid()))
  returning id into v_batch;
  insert into public.poin_catatan (batch_id, id_siswa, jumlah)
  select v_batch, x, p_jumlah from unnest(v_ids) x;

  return jsonb_build_object('kode', v_kode, 'jumlah', cardinality(v_ids), 'poin', p_jumlah);
end;
$$;

-- Batalkan satu batch (semua anggota di dalamnya). Poin lama hasil impor (saldo_awal) tidak bisa dibatalkan.
create or replace function public.admin_poin_batal_batch(p_kode text, p_alasan text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_b public.poin_batch;
  v_n integer;
begin
  if not public.adalah_admin() then
    raise exception 'Khusus pengelola.' using errcode = '42501';
  end if;
  select * into v_b from public.poin_batch where kode = btrim(p_kode);
  if not found then
    raise exception 'Batch % tidak ditemukan.', p_kode using errcode = 'P0002';
  end if;
  if v_b.sumber = 'saldo_awal' then
    raise exception 'Poin lama hasil impor tidak bisa dibatalkan dari sini.' using errcode = '22023';
  end if;
  update public.poin_catatan
     set dibatalkan = now(), dibatalkan_oleh = (select auth.uid()), alasan_batal = left(nullif(btrim(coalesce(p_alasan, '')), ''), 200)
   where batch_id = v_b.id and dibatalkan is null;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'Batch % sudah dibatalkan.', v_b.kode using errcode = 'P0002';
  end if;
  return jsonb_build_object('kode', v_b.kode, 'jumlah', v_n);
end;
$$;

-- Batalkan poin satu anggota di dalam sebuah batch (salah pilih anggota).
create or replace function public.admin_poin_batal_anggota(p_kode text, p_id_siswa text, p_alasan text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_b public.poin_batch;
  v_n integer;
begin
  if not public.adalah_admin() then
    raise exception 'Khusus pengelola.' using errcode = '42501';
  end if;
  select * into v_b from public.poin_batch where kode = btrim(p_kode);
  if not found then
    raise exception 'Batch % tidak ditemukan.', p_kode using errcode = 'P0002';
  end if;
  if v_b.sumber = 'saldo_awal' then
    raise exception 'Poin lama hasil impor tidak bisa dibatalkan dari sini.' using errcode = '22023';
  end if;
  update public.poin_catatan
     set dibatalkan = now(), dibatalkan_oleh = (select auth.uid()), alasan_batal = left(nullif(btrim(coalesce(p_alasan, '')), ''), 200)
   where batch_id = v_b.id and id_siswa = btrim(p_id_siswa) and dibatalkan is null;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'Catatan tidak ditemukan atau sudah dibatalkan.' using errcode = 'P0002';
  end if;
  return jsonb_build_object('kode', v_b.kode, 'jumlah', v_n);
end;
$$;

-- Daftar input terbaru (satu baris per batch). p_semester kosong = semester aktif.
create or replace function public.admin_poin_riwayat_input(p_semester integer default null, p_batas integer default 100)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_sid integer := coalesce(p_semester, public.poin_semester_aktif_id());
begin
  if not public.adalah_admin() then
    raise exception 'Khusus pengelola.' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(r) order by r.dibuat desc, r.id desc)
      from (
        select b.id, b.kode, b.tanggal, b.keterangan, b.sumber, b.dibuat,
               count(c.id) filter (where c.dibatalkan is null)::integer as jumlah_aktif,
               count(c.id) filter (where c.dibatalkan is not null)::integer as jumlah_batal,
               coalesce(sum(c.jumlah) filter (where c.dibatalkan is null), 0)::integer as total_poin,
               case when min(c.jumlah) = max(c.jumlah) then min(c.jumlah) else null end as poin_per_anggota,
               case when count(c.id) filter (where c.dibatalkan is null) = 0 then 'dibatalkan'
                    when count(c.id) filter (where c.dibatalkan is not null) > 0 then 'sebagian'
                    else 'aktif' end as status
          from public.poin_batch b
          left join public.poin_catatan c on c.batch_id = b.id
         where b.semester_id = v_sid
         group by b.id
         order by b.dibuat desc, b.id desc
         limit greatest(1, least(coalesce(p_batas, 100), 500))
      ) r
  ), '[]'::jsonb);
end;
$$;

-- Isi satu batch (untuk melihat siapa saja yang kena).
create or replace function public.admin_poin_isi_batch(p_kode text)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if not public.adalah_admin() then
    raise exception 'Khusus pengelola.' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', a.id_siswa, 'nama', a.nama, 'kelas', a.kelas, 'poin', c.jumlah, 'dibatalkan', c.dibatalkan is not null)
                     order by a.nama)
      from public.poin_batch b
      join public.poin_catatan c on c.batch_id = b.id
      join public.poin_anggota a on a.id_siswa = c.id_siswa
     where b.kode = btrim(p_kode)
  ), '[]'::jsonb);
end;
$$;

-- Mulai semester baru: semester aktif ditutup, yang baru menjadi aktif. Poin lama tetap tersimpan.
create or replace function public.admin_poin_semester_baru(p_nama text, p_mulai date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nama text := btrim(coalesce(p_nama, ''));
  v_id integer;
begin
  if not public.adalah_admin() then
    raise exception 'Khusus pengelola.' using errcode = '42501';
  end if;
  if char_length(v_nama) < 3 or char_length(v_nama) > 60 then
    raise exception 'Nama semester 3 sampai 60 huruf.' using errcode = '22023';
  end if;
  if p_mulai is null then
    raise exception 'Tanggal mulai wajib diisi.' using errcode = '22023';
  end if;
  if exists (select 1 from public.poin_semester where lower(nama) = lower(v_nama)) then
    raise exception 'Nama semester sudah dipakai.' using errcode = '23505';
  end if;
  update public.poin_semester
     set aktif = false, selesai = greatest(mulai, least(coalesce(selesai, p_mulai - 1), p_mulai - 1))
   where aktif;
  insert into public.poin_semester (nama, mulai, aktif) values (v_nama, p_mulai, true) returning id into v_id;
  return jsonb_build_object('id', v_id, 'nama', v_nama, 'mulai', p_mulai);
end;
$$;

-- Tambah atau ubah anggota di daftar peringkat (anggota baru, pindah kelas, nonaktif).
create or replace function public.admin_poin_anggota_simpan(p_id text, p_nama text, p_kelas text, p_aktif boolean default true)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.adalah_admin() then
    raise exception 'Khusus pengelola.' using errcode = '42501';
  end if;
  insert into public.poin_anggota (id_siswa, nama, kelas, aktif)
  values (btrim(p_id), btrim(p_nama), btrim(coalesce(p_kelas, '')), coalesce(p_aktif, true))
  on conflict (id_siswa) do update
    set nama = excluded.nama, kelas = excluded.kelas, aktif = excluded.aktif;
end;
$$;

revoke all on function public.admin_poin_tambah(date, integer, text, text[]) from public, anon;
revoke all on function public.admin_poin_batal_batch(text, text) from public, anon;
revoke all on function public.admin_poin_batal_anggota(text, text, text) from public, anon;
revoke all on function public.admin_poin_riwayat_input(integer, integer) from public, anon;
revoke all on function public.admin_poin_isi_batch(text) from public, anon;
revoke all on function public.admin_poin_semester_baru(text, date) from public, anon;
revoke all on function public.admin_poin_anggota_simpan(text, text, text, boolean) from public, anon;
grant execute on function public.admin_poin_tambah(date, integer, text, text[]) to authenticated;
grant execute on function public.admin_poin_batal_batch(text, text) to authenticated;
grant execute on function public.admin_poin_batal_anggota(text, text, text) to authenticated;
grant execute on function public.admin_poin_riwayat_input(integer, integer) to authenticated;
grant execute on function public.admin_poin_isi_batch(text) to authenticated;
grant execute on function public.admin_poin_semester_baru(text, date) to authenticated;
grant execute on function public.admin_poin_anggota_simpan(text, text, text, boolean) to authenticated;


-- ---------- 8. Poin Tantangan (dipanggil server Vercel, dijaga rahasia penilai) ---------------------------
-- Idempoten: kunci yang sama tidak menambah poin dua kali, jadi aman diulang.
create or replace function public.tambah_poin_tantangan(p_rahasia text, p_id_sheet text, p_poin integer, p_alasan text, p_kunci text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sid integer := public.poin_semester_aktif_id();
  v_id text := btrim(coalesce(p_id_sheet, ''));
  v_batch bigint;
begin
  if not public.penilai_sah(p_rahasia) then
    raise exception 'Tidak diizinkan.' using errcode = '42501';
  end if;
  if v_id = '' or p_kunci is null or btrim(p_kunci) = '' or p_poin is null or p_poin < 1 or p_poin > 100 then
    return jsonb_build_object('sukses', false, 'pesan', 'Data tidak valid.');
  end if;
  if not exists (select 1 from public.poin_anggota where id_siswa = v_id) then
    return jsonb_build_object('sukses', false, 'pesan', 'ID anggota tidak ada di daftar poin.');
  end if;
  if v_sid is null then
    return jsonb_build_object('sukses', false, 'pesan', 'Belum ada semester aktif.');
  end if;

  insert into public.poin_batch (kode, semester_id, tanggal, keterangan, sumber, kunci)
  values ('T' || lpad(nextval('public.poin_kode_tg_seq')::text, 3, '0'), v_sid,
          (now() at time zone 'Asia/Jakarta')::date, left(coalesce(p_alasan, ''), 200), 'tantangan', btrim(p_kunci))
  on conflict (kunci) do nothing
  returning id into v_batch;

  if v_batch is null then
    return jsonb_build_object('sukses', true, 'duplikat', true);
  end if;
  insert into public.poin_catatan (batch_id, id_siswa, jumlah) values (v_batch, v_id, p_poin);
  return jsonb_build_object('sukses', true);
end;
$$;

revoke all on function public.tambah_poin_tantangan(text, text, integer, text, text) from public;
grant execute on function public.tambah_poin_tantangan(text, text, integer, text, text) to anon, authenticated;
