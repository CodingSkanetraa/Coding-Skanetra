-- ============================================================================
-- CodingSkanetra - Proyek Kelompok (satu website dikerjakan bersama)
-- Jalankan sekali di Supabase > SQL Editor > New query > Run. Aman dijalankan ulang.
-- Syarat: skema.sql sudah dijalankan (butuh tabel profil, adalah_admin()).
-- ============================================================================
-- Rancangan (sesuai rencana/assets-dan-kelompok.md, Bagian B):
--   * Admin membentuk kelompok (maks 10 anggota, tepat 1 ketua) dan memberi tugas.
--   * Tiap tugas punya syarat wajib/opsional dan (opsional) template bagian.
--   * Tiap kelompok punya satu proyek kerja per tugas, terbagi per BAGIAN
--     (header, hero, footer, ...) ditambah satu bagian bersama "Umum".
--     Tiap bagian menyimpan HTML, CSS, dan JS sendiri. Pratinjau menggabungkan semuanya.
--   * Ketua membagi bagian dan pemiliknya. Hanya pemilik (atau siapa saja untuk bagian
--     bersama / bagian tanpa pemilik) yang boleh menyimpan bagian itu.
--   * Simpan berversi: simpan ditolak bila versi dasar sudah berubah (bentrok).
--   * Submit membuat SNAPSHOT yang tidak bisa diubah. Alur status:
--       dikirim -> diterima | perlu_revisi (| ditarik oleh anggota)
--   * Tidak ada INSERT/UPDATE/DELETE langsung dari browser: semua lewat fungsi di bawah.
--     Tabel dikunci (RLS aktif tanpa policy, hak tabel dicabut).
-- ============================================================================

-- ---------- 1. Tabel -------------------------------------------------------

create table if not exists public.kelompok (
  id          uuid primary key default gen_random_uuid(),
  nama        text not null check (char_length(btrim(nama)) between 1 and 60),
  diarsipkan  boolean not null default false,
  dibuat_oleh uuid references auth.users(id) on delete set null,
  dibuat      timestamptz not null default now()
);

create table if not exists public.kelompok_anggota (
  kelompok_id uuid not null references public.kelompok(id) on delete cascade,
  user_id     uuid not null references public.profil(id) on delete cascade,
  peran       text not null default 'anggota' check (peran in ('ketua', 'anggota')),
  primary key (kelompok_id, user_id)
);
create index if not exists kelompok_anggota_user on public.kelompok_anggota (user_id);

create table if not exists public.tugas_kelompok (
  id          uuid primary key default gen_random_uuid(),
  judul       text not null check (char_length(btrim(judul)) between 1 and 100),
  penjelasan  text not null default '' check (char_length(penjelasan) <= 5000),
  tenggat     timestamptz,
  dibuat_oleh uuid references auth.users(id) on delete set null,
  dibuat      timestamptz not null default now()
);

create table if not exists public.tugas_syarat (
  id       uuid primary key default gen_random_uuid(),
  tugas_id uuid not null references public.tugas_kelompok(id) on delete cascade,
  urutan   integer not null default 0,
  teks     text not null check (char_length(btrim(teks)) between 1 and 200),
  wajib    boolean not null default true
);
create index if not exists tugas_syarat_tugas on public.tugas_syarat (tugas_id);

create table if not exists public.tugas_templat (
  id       uuid primary key default gen_random_uuid(),
  tugas_id uuid not null references public.tugas_kelompok(id) on delete cascade,
  urutan   integer not null default 0,
  nama     text not null check (char_length(btrim(nama)) between 1 and 40),
  petunjuk text not null default '' check (char_length(petunjuk) <= 500),
  html     text not null default '' check (char_length(html) <= 20000),
  css      text not null default '' check (char_length(css) <= 20000),
  js       text not null default '' check (char_length(js) <= 20000)
);
create index if not exists tugas_templat_tugas on public.tugas_templat (tugas_id);

create table if not exists public.tugas_penugasan (
  id          uuid primary key default gen_random_uuid(),
  tugas_id    uuid not null references public.tugas_kelompok(id) on delete cascade,
  kelompok_id uuid not null references public.kelompok(id) on delete cascade,
  dibuat      timestamptz not null default now(),
  unique (tugas_id, kelompok_id)
);
create index if not exists tugas_penugasan_kelompok on public.tugas_penugasan (kelompok_id);

create table if not exists public.kerja_bagian (
  id           uuid primary key default gen_random_uuid(),
  penugasan_id uuid not null references public.tugas_penugasan(id) on delete cascade,
  urutan       integer not null default 0,
  nama         text not null check (char_length(btrim(nama)) between 1 and 40),
  petunjuk     text not null default '' check (char_length(petunjuk) <= 500),
  umum         boolean not null default false,
  pemilik      uuid references public.profil(id) on delete set null,
  html         text not null default '',
  css          text not null default '',
  js           text not null default '',
  versi        integer not null default 1,
  diubah       timestamptz not null default now(),
  diubah_oleh  uuid references public.profil(id) on delete set null,
  check (char_length(html) + char_length(css) + char_length(js) <= 60000)
);
create index if not exists kerja_bagian_penugasan on public.kerja_bagian (penugasan_id);
create unique index if not exists kerja_bagian_satu_umum on public.kerja_bagian (penugasan_id) where umum;

create table if not exists public.kerja_riwayat (
  id        bigint generated always as identity primary key,
  bagian_id uuid not null references public.kerja_bagian(id) on delete cascade,
  versi     integer not null,
  html      text not null,
  css       text not null,
  js        text not null,
  oleh      uuid references public.profil(id) on delete set null,
  waktu     timestamptz not null default now()
);
create index if not exists kerja_riwayat_bagian on public.kerja_riwayat (bagian_id, versi desc);

create table if not exists public.pengumpulan (
  id           uuid primary key default gen_random_uuid(),
  penugasan_id uuid not null references public.tugas_penugasan(id) on delete cascade,
  nomor        integer not null,
  snapshot     jsonb not null,
  dikirim_oleh uuid references public.profil(id) on delete set null,
  dikirim      timestamptz not null default now(),
  terlambat    boolean not null default false,
  status       text not null default 'dikirim' check (status in ('dikirim', 'diterima', 'perlu_revisi', 'ditarik')),
  ditinjau     timestamptz,
  unique (penugasan_id, nomor)
);

create table if not exists public.pengumpulan_catatan (
  id             uuid primary key default gen_random_uuid(),
  pengumpulan_id uuid not null references public.pengumpulan(id) on delete cascade,
  penulis        uuid references public.profil(id) on delete set null,
  isi            text not null check (char_length(btrim(isi)) between 1 and 2000),
  waktu          timestamptz not null default now()
);
create index if not exists pengumpulan_catatan_pg on public.pengumpulan_catatan (pengumpulan_id);

create table if not exists public.pengumpulan_cek (
  pengumpulan_id uuid not null references public.pengumpulan(id) on delete cascade,
  syarat_id      uuid not null references public.tugas_syarat(id) on delete cascade,
  terpenuhi      boolean not null default false,
  primary key (pengumpulan_id, syarat_id)
);

-- Kunci semua tabel: tidak ada akses langsung dari browser.
alter table public.kelompok            enable row level security;
alter table public.kelompok_anggota    enable row level security;
alter table public.tugas_kelompok      enable row level security;
alter table public.tugas_syarat        enable row level security;
alter table public.tugas_templat       enable row level security;
alter table public.tugas_penugasan     enable row level security;
alter table public.kerja_bagian        enable row level security;
alter table public.kerja_riwayat       enable row level security;
alter table public.pengumpulan         enable row level security;
alter table public.pengumpulan_catatan enable row level security;
alter table public.pengumpulan_cek     enable row level security;

revoke all on public.kelompok, public.kelompok_anggota, public.tugas_kelompok, public.tugas_syarat,
  public.tugas_templat, public.tugas_penugasan, public.kerja_bagian, public.kerja_riwayat,
  public.pengumpulan, public.pengumpulan_catatan, public.pengumpulan_cek from anon, authenticated;

-- ---------- 2. Fungsi bantu (internal, tidak bisa dipanggil dari browser) ---

create or replace function public.kg_anggota(p_kelompok uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.kelompok_anggota a
    where a.kelompok_id = p_kelompok and a.user_id = (select auth.uid())
  );
$$;

-- Status satu tugas di satu kelompok: belum | dikerjakan | dikirim | perlu_revisi | diterima
create or replace function public.kg_status(p_penugasan uuid)
returns text
language sql
security definer
stable
set search_path = ''
as $$
  select coalesce(
    (select case g.status when 'ditarik' then 'dikerjakan' else g.status end
       from public.pengumpulan g
      where g.penugasan_id = p_penugasan
      order by g.nomor desc
      limit 1),
    case when exists (select 1 from public.kerja_bagian b where b.penugasan_id = p_penugasan and b.versi > 1)
         then 'dikerjakan' else 'belum' end
  );
$$;

-- Boleh menyimpan bagian ini? Anggota kelompok, kelompok belum diarsipkan, dan
-- bagian bersama / tanpa pemilik / milik sendiri.
create or replace function public.kg_boleh_edit(p_bagian uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.kerja_bagian b
    join public.tugas_penugasan tp on tp.id = b.penugasan_id
    join public.kelompok k on k.id = tp.kelompok_id
    join public.kelompok_anggota a on a.kelompok_id = k.id and a.user_id = (select auth.uid())
    where b.id = p_bagian
      and not k.diarsipkan
      and (b.umum or b.pemilik is null or b.pemilik = a.user_id)
  );
$$;

-- Penyimpanan bagian berversi (dipakai bagian_simpan dan bagian_pulihkan).
create or replace function public.kg_simpan_bagian(
  p_bagian uuid, p_versi_dasar integer, p_html text, p_css text, p_js text, p_paksa_riwayat boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_versi integer;
  v_html  text;
  v_css   text;
  v_js    text;
  v_oleh  uuid;
  v_baru  integer;
  v_waktu timestamptz;
  n_html  text := coalesce(p_html, '');
  n_css   text := coalesce(p_css, '');
  n_js    text := coalesce(p_js, '');
begin
  if v_uid is null then
    raise exception 'Belum masuk' using errcode = '28000';
  end if;
  if not public.kg_boleh_edit(p_bagian) then
    raise exception 'Kamu tidak bisa mengubah bagian ini' using errcode = '42501';
  end if;
  if char_length(n_html) + char_length(n_css) + char_length(n_js) > 60000 then
    raise exception 'Bagian terlalu besar (maksimal 60.000 karakter)';
  end if;

  select b.versi, b.html, b.css, b.js, b.diubah_oleh
    into v_versi, v_html, v_css, v_js, v_oleh
    from public.kerja_bagian b
   where b.id = p_bagian
   for update;

  if v_versi <> p_versi_dasar then
    raise exception 'Bentrok: bagian ini sudah diubah orang lain sejak kamu membukanya';
  end if;

  -- Tidak ada perubahan: jangan membuat versi baru.
  if v_html = n_html and v_css = n_css and v_js = n_js then
    return jsonb_build_object('versi', v_versi, 'diubah', now());
  end if;

  -- Riwayat: simpan versi lama bila penyimpan berbeda dari penyimpan terakhir,
  -- atau sudah lewat 5 menit dari catatan riwayat terakhir, atau dipaksa (pemulihan).
  if p_paksa_riwayat
     or v_oleh is distinct from v_uid
     or not exists (
       select 1 from public.kerja_riwayat r
        where r.bagian_id = p_bagian and r.waktu > now() - interval '5 minutes'
     ) then
    insert into public.kerja_riwayat (bagian_id, versi, html, css, js, oleh)
    values (p_bagian, v_versi, v_html, v_css, v_js, v_oleh);

    delete from public.kerja_riwayat
     where bagian_id = p_bagian
       and id not in (
         select r.id from public.kerja_riwayat r
          where r.bagian_id = p_bagian
          order by r.versi desc, r.id desc
          limit 20
       );
  end if;

  update public.kerja_bagian
     set html = n_html, css = n_css, js = n_js,
         versi = versi + 1, diubah = now(), diubah_oleh = v_uid
   where id = p_bagian
  returning versi, diubah into v_baru, v_waktu;

  return jsonb_build_object('versi', v_baru, 'diubah', v_waktu);
end;
$$;

-- ---------- 3. Fungsi untuk ADMIN -------------------------------------------

create or replace function public.admin_akun_daftar()
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if not public.adalah_admin() then
    raise exception 'Khusus pengelola' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', p.id, 'username', p.username, 'nama', p.nama, 'kelas', p.kelas)
                     order by p.username)
      from public.profil p
     where p.anggota
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_kelompok_daftar()
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if not public.adalah_admin() then
    raise exception 'Khusus pengelola' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', k.id,
        'nama', k.nama,
        'diarsipkan', k.diarsipkan,
        'jumlah_tugas', (select count(*) from public.tugas_penugasan tp where tp.kelompok_id = k.id),
        'anggota', coalesce((
          select jsonb_agg(
                   jsonb_build_object('user_id', a.user_id, 'username', p.username, 'nama', p.nama, 'peran', a.peran)
                   order by (a.peran = 'ketua') desc, p.username)
            from public.kelompok_anggota a
            join public.profil p on p.id = a.user_id
           where a.kelompok_id = k.id
        ), '[]'::jsonb)
      )
      order by k.diarsipkan, k.nama
    )
    from public.kelompok k
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_kelompok_simpan(p_id uuid, p_nama text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nama text := btrim(coalesce(p_nama, ''));
  v_id   uuid;
begin
  if not public.adalah_admin() then
    raise exception 'Khusus pengelola' using errcode = '42501';
  end if;
  if char_length(v_nama) not between 1 and 60 then
    raise exception 'Nama kelompok 1 sampai 60 huruf';
  end if;
  if p_id is null then
    insert into public.kelompok (nama, dibuat_oleh) values (v_nama, auth.uid()) returning id into v_id;
  else
    update public.kelompok set nama = v_nama where id = p_id returning id into v_id;
    if v_id is null then
      raise exception 'Kelompok tidak ditemukan';
    end if;
  end if;
  return v_id;
end;
$$;

-- Mengganti seluruh daftar anggota: p_anggota = [{"user_id": "...", "peran": "ketua"|"anggota"}, ...]
create or replace function public.admin_kelompok_anggota(p_kelompok uuid, p_anggota jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n        integer;
  v_ketua    integer;
  v_unik     integer;
  v_valid    integer;
begin
  if not public.adalah_admin() then
    raise exception 'Khusus pengelola' using errcode = '42501';
  end if;
  if not exists (select 1 from public.kelompok where id = p_kelompok) then
    raise exception 'Kelompok tidak ditemukan';
  end if;
  if jsonb_typeof(p_anggota) is distinct from 'array' then
    raise exception 'Daftar anggota tidak valid';
  end if;

  select count(*),
         count(*) filter (where e.value ->> 'peran' = 'ketua'),
         count(distinct e.value ->> 'user_id')
    into v_n, v_ketua, v_unik
    from jsonb_array_elements(p_anggota) as e;

  if v_n > 10 then
    raise exception 'Anggota kelompok maksimal 10 orang';
  end if;
  if v_n <> v_unik then
    raise exception 'Ada anggota yang dipilih dua kali';
  end if;
  if v_n > 0 and v_ketua <> 1 then
    raise exception 'Pilih tepat satu ketua';
  end if;

  select count(*) into v_valid
    from public.profil p
   where p.id in (select (e.value ->> 'user_id')::uuid from jsonb_array_elements(p_anggota) as e);
  if v_valid <> v_n then
    raise exception 'Ada akun yang tidak ditemukan';
  end if;

  -- Bagian milik anggota yang dikeluarkan menjadi tanpa pemilik.
  update public.kerja_bagian b
     set pemilik = null
    from public.tugas_penugasan tp
   where b.penugasan_id = tp.id
     and tp.kelompok_id = p_kelompok
     and b.pemilik is not null
     and b.pemilik not in (select (e.value ->> 'user_id')::uuid from jsonb_array_elements(p_anggota) as e);

  delete from public.kelompok_anggota
   where kelompok_id = p_kelompok
     and user_id not in (select (e.value ->> 'user_id')::uuid from jsonb_array_elements(p_anggota) as e);

  insert into public.kelompok_anggota (kelompok_id, user_id, peran)
  select p_kelompok,
         (e.value ->> 'user_id')::uuid,
         case when e.value ->> 'peran' = 'ketua' then 'ketua' else 'anggota' end
    from jsonb_array_elements(p_anggota) as e
  on conflict (kelompok_id, user_id) do update set peran = excluded.peran;
end;
$$;

create or replace function public.admin_kelompok_arsip(p_id uuid, p_arsip boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.adalah_admin() then
    raise exception 'Khusus pengelola' using errcode = '42501';
  end if;
  update public.kelompok set diarsipkan = coalesce(p_arsip, false) where id = p_id;
  if not found then
    raise exception 'Kelompok tidak ditemukan';
  end if;
end;
$$;

create or replace function public.admin_kelompok_hapus(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.adalah_admin() then
    raise exception 'Khusus pengelola' using errcode = '42501';
  end if;
  delete from public.kelompok where id = p_id;
  if not found then
    raise exception 'Kelompok tidak ditemukan';
  end if;
end;
$$;

-- Membuat atau memperbarui tugas.
--   p_syarat = [{"id": "(opsional)", "teks": "...", "wajib": true}, ...]
--   p_templat = [{"nama": "...", "petunjuk": "...", "html": "...", "css": "...", "js": "..."}, ...]
-- Template hanya dipakai saat tugas DIBERIKAN ke kelompok; mengubahnya tidak mengubah kerja yang sudah ada.
create or replace function public.admin_tugas_simpan(
  p_id uuid, p_judul text, p_penjelasan text, p_tenggat timestamptz, p_syarat jsonb, p_templat jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id    uuid := p_id;
  v_judul text := btrim(coalesce(p_judul, ''));
  v_syarat jsonb := coalesce(p_syarat, '[]'::jsonb);
  s       jsonb;
  i       integer := 0;
  v_ids   uuid[] := '{}';
  v_sid   uuid;
  v_teks  text;
begin
  if not public.adalah_admin() then
    raise exception 'Khusus pengelola' using errcode = '42501';
  end if;
  if char_length(v_judul) not between 1 and 100 then
    raise exception 'Judul tugas 1 sampai 100 huruf';
  end if;
  if char_length(coalesce(p_penjelasan, '')) > 5000 then
    raise exception 'Penjelasan terlalu panjang (maksimal 5000 huruf)';
  end if;
  if jsonb_typeof(v_syarat) is distinct from 'array' or jsonb_array_length(v_syarat) > 30 then
    raise exception 'Syarat tidak valid (maksimal 30)';
  end if;
  if p_templat is not null and (jsonb_typeof(p_templat) is distinct from 'array' or jsonb_array_length(p_templat) > 14) then
    raise exception 'Template bagian tidak valid (maksimal 14)';
  end if;

  if v_id is null then
    insert into public.tugas_kelompok (judul, penjelasan, tenggat, dibuat_oleh)
    values (v_judul, coalesce(p_penjelasan, ''), p_tenggat, auth.uid())
    returning id into v_id;
  else
    update public.tugas_kelompok
       set judul = v_judul, penjelasan = coalesce(p_penjelasan, ''), tenggat = p_tenggat
     where id = v_id;
    if not found then
      raise exception 'Tugas tidak ditemukan';
    end if;
  end if;

  for s in select e.value from jsonb_array_elements(v_syarat) as e loop
    i := i + 1;
    v_teks := btrim(coalesce(s ->> 'teks', ''));
    if char_length(v_teks) not between 1 and 200 then
      raise exception 'Setiap syarat harus diisi (maksimal 200 huruf)';
    end if;
    v_sid := null;
    if nullif(s ->> 'id', '') is not null then
      update public.tugas_syarat
         set urutan = i, teks = v_teks, wajib = coalesce((s ->> 'wajib')::boolean, true)
       where id = (s ->> 'id')::uuid and tugas_id = v_id
      returning id into v_sid;
    end if;
    if v_sid is null then
      insert into public.tugas_syarat (tugas_id, urutan, teks, wajib)
      values (v_id, i, v_teks, coalesce((s ->> 'wajib')::boolean, true))
      returning id into v_sid;
    end if;
    v_ids := v_ids || v_sid;
  end loop;
  delete from public.tugas_syarat where tugas_id = v_id and id <> all (v_ids);

  if p_templat is not null then
    delete from public.tugas_templat where tugas_id = v_id;
    i := 0;
    for s in select e.value from jsonb_array_elements(p_templat) as e loop
      i := i + 1;
      v_teks := btrim(coalesce(s ->> 'nama', ''));
      if char_length(v_teks) not between 1 and 40 then
        raise exception 'Nama bagian template 1 sampai 40 huruf';
      end if;
      insert into public.tugas_templat (tugas_id, urutan, nama, petunjuk, html, css, js)
      values (v_id, i, v_teks,
              left(coalesce(s ->> 'petunjuk', ''), 500),
              left(coalesce(s ->> 'html', ''), 20000),
              left(coalesce(s ->> 'css', ''), 20000),
              left(coalesce(s ->> 'js', ''), 20000));
    end loop;
  end if;

  return v_id;
end;
$$;

create or replace function public.admin_tugas_daftar()
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if not public.adalah_admin() then
    raise exception 'Khusus pengelola' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'judul', t.judul,
        'penjelasan', t.penjelasan,
        'tenggat', t.tenggat,
        'syarat', coalesce((
          select jsonb_agg(jsonb_build_object('id', s.id, 'teks', s.teks, 'wajib', s.wajib) order by s.urutan)
            from public.tugas_syarat s where s.tugas_id = t.id
        ), '[]'::jsonb),
        'templat', coalesce((
          select jsonb_agg(jsonb_build_object('nama', m.nama, 'petunjuk', m.petunjuk, 'html', m.html, 'css', m.css, 'js', m.js) order by m.urutan)
            from public.tugas_templat m where m.tugas_id = t.id
        ), '[]'::jsonb),
        'penugasan', coalesce((
          select jsonb_agg(
                   jsonb_build_object('id', tp.id, 'kelompok_id', k.id, 'kelompok', k.nama, 'status', public.kg_status(tp.id))
                   order by k.nama)
            from public.tugas_penugasan tp
            join public.kelompok k on k.id = tp.kelompok_id
           where tp.tugas_id = t.id
        ), '[]'::jsonb)
      )
      order by t.dibuat desc
    )
    from public.tugas_kelompok t
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_tugas_hapus(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.adalah_admin() then
    raise exception 'Khusus pengelola' using errcode = '42501';
  end if;
  delete from public.tugas_kelompok where id = p_id;
  if not found then
    raise exception 'Tugas tidak ditemukan';
  end if;
end;
$$;

-- Memberikan tugas ke kelompok: membuat proyek kerja (bagian "Umum" + bagian dari template).
create or replace function public.admin_tugas_beri(p_tugas uuid, p_kelompok uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_arsip boolean;
  v_n     integer;
  v_id    uuid;
begin
  if not public.adalah_admin() then
    raise exception 'Khusus pengelola' using errcode = '42501';
  end if;
  select k.diarsipkan into v_arsip from public.kelompok k where k.id = p_kelompok;
  if not found then
    raise exception 'Kelompok tidak ditemukan';
  end if;
  if v_arsip then
    raise exception 'Kelompok ini sudah diarsipkan';
  end if;
  if not exists (select 1 from public.tugas_kelompok where id = p_tugas) then
    raise exception 'Tugas tidak ditemukan';
  end if;

  select count(*) into v_n
    from public.tugas_penugasan tp
   where tp.kelompok_id = p_kelompok and public.kg_status(tp.id) <> 'diterima';
  if v_n >= 8 then
    raise exception 'Kelompok ini sudah punya 8 tugas yang belum diterima';
  end if;

  insert into public.tugas_penugasan (tugas_id, kelompok_id)
  values (p_tugas, p_kelompok)
  on conflict (tugas_id, kelompok_id) do nothing
  returning id into v_id;
  if v_id is null then
    raise exception 'Tugas ini sudah diberikan ke kelompok tersebut';
  end if;

  insert into public.kerja_bagian (penugasan_id, urutan, nama, petunjuk, umum)
  values (v_id, 0, 'Umum', 'CSS dan JavaScript bersama untuk seluruh halaman.', true);

  insert into public.kerja_bagian (penugasan_id, urutan, nama, petunjuk, html, css, js)
  select v_id, m.urutan, m.nama, m.petunjuk, m.html, m.css, m.js
    from public.tugas_templat m
   where m.tugas_id = p_tugas
   order by m.urutan;

  return v_id;
end;
$$;

create or replace function public.admin_tugas_cabut(p_penugasan uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.adalah_admin() then
    raise exception 'Khusus pengelola' using errcode = '42501';
  end if;
  delete from public.tugas_penugasan where id = p_penugasan;
  if not found then
    raise exception 'Penugasan tidak ditemukan';
  end if;
end;
$$;

create or replace function public.admin_pengumpulan_daftar()
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if not public.adalah_admin() then
    raise exception 'Khusus pengelola' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', g.id, 'nomor', g.nomor, 'status', g.status, 'terlambat', g.terlambat,
        'dikirim', g.dikirim, 'tugas', t.judul, 'kelompok', k.nama, 'oleh', p.username
      )
      order by g.dikirim desc
    )
    from (select pg2.id, pg2.penugasan_id, pg2.nomor, pg2.status, pg2.terlambat, pg2.dikirim, pg2.dikirim_oleh
            from public.pengumpulan pg2 order by pg2.dikirim desc limit 200) g
    join public.tugas_penugasan tp on tp.id = g.penugasan_id
    join public.tugas_kelompok t on t.id = tp.tugas_id
    join public.kelompok k on k.id = tp.kelompok_id
    left join public.profil p on p.id = g.dikirim_oleh
  ), '[]'::jsonb);
end;
$$;

-- Meninjau kiriman TERBARU suatu tugas: centang syarat, catatan, lalu diterima / perlu revisi.
--   p_cek = [{"syarat_id": "...", "terpenuhi": true}, ...]
create or replace function public.admin_pengumpulan_tinjau(p_id uuid, p_status text, p_cek jsonb, p_catatan text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pen    uuid;
  v_nomor  integer;
  v_status text;
  v_tugas  uuid;
  v_catat  text := btrim(coalesce(p_catatan, ''));
begin
  if not public.adalah_admin() then
    raise exception 'Khusus pengelola' using errcode = '42501';
  end if;
  if p_status not in ('diterima', 'perlu_revisi') then
    raise exception 'Status harus diterima atau perlu_revisi';
  end if;
  if char_length(v_catat) > 2000 then
    raise exception 'Catatan terlalu panjang (maksimal 2000 huruf)';
  end if;

  select g.penugasan_id, g.nomor, g.status into v_pen, v_nomor, v_status
    from public.pengumpulan g where g.id = p_id for update;
  if not found then
    raise exception 'Kiriman tidak ditemukan';
  end if;
  if v_status = 'ditarik' then
    raise exception 'Kiriman ini sudah ditarik oleh kelompok';
  end if;
  if exists (select 1 from public.pengumpulan g2 where g2.penugasan_id = v_pen and g2.nomor > v_nomor) then
    raise exception 'Sudah ada kiriman yang lebih baru; tinjau yang terbaru';
  end if;

  select tp.tugas_id into v_tugas from public.tugas_penugasan tp where tp.id = v_pen;

  delete from public.pengumpulan_cek where pengumpulan_id = p_id;
  insert into public.pengumpulan_cek (pengumpulan_id, syarat_id, terpenuhi)
  select p_id, s.id, coalesce((e.value ->> 'terpenuhi')::boolean, false)
    from jsonb_array_elements(coalesce(p_cek, '[]'::jsonb)) as e
    join public.tugas_syarat s on s.id = (e.value ->> 'syarat_id')::uuid and s.tugas_id = v_tugas
  on conflict do nothing;

  if v_catat <> '' then
    insert into public.pengumpulan_catatan (pengumpulan_id, penulis, isi) values (p_id, auth.uid(), v_catat);
  end if;

  update public.pengumpulan set status = p_status, ditinjau = now() where id = p_id;
end;
$$;

-- ---------- 4. Fungsi untuk ANGGOTA (admin boleh membaca) -------------------

-- Kelompok dan tugas milik akun yang sedang masuk.
create or replace function public.kelompok_saya()
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Belum masuk' using errcode = '28000';
  end if;
  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'kelompok_id', k.id,
        'kelompok', k.nama,
        'diarsipkan', k.diarsipkan,
        'peran', a.peran,
        'jumlah_anggota', (select count(*) from public.kelompok_anggota x where x.kelompok_id = k.id),
        'penugasan_id', tp.id,
        'tugas_id', t.id,
        'judul', t.judul,
        'tenggat', t.tenggat,
        'status', case when tp.id is null then null else public.kg_status(tp.id) end
      )
      order by k.diarsipkan, k.nama, t.tenggat nulls last, t.judul
    )
    from public.kelompok_anggota a
    join public.kelompok k on k.id = a.kelompok_id
    left join public.tugas_penugasan tp on tp.kelompok_id = k.id
    left join public.tugas_kelompok t on t.id = tp.tugas_id
    where a.user_id = auth.uid()
  ), '[]'::jsonb);
end;
$$;

create or replace function public.tugas_detail(p_penugasan uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_kel    uuid;
  v_tugas  uuid;
  v_peran  text;
  v_admin  boolean := public.adalah_admin();
  v_arsip  boolean;
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'Belum masuk' using errcode = '28000';
  end if;
  select tp.kelompok_id, tp.tugas_id into v_kel, v_tugas
    from public.tugas_penugasan tp where tp.id = p_penugasan;
  if not found then
    raise exception 'Tugas tidak ditemukan';
  end if;
  select a.peran into v_peran
    from public.kelompok_anggota a where a.kelompok_id = v_kel and a.user_id = auth.uid();
  if v_peran is null and not v_admin then
    raise exception 'Kamu bukan anggota kelompok ini' using errcode = '42501';
  end if;
  select k.diarsipkan into v_arsip from public.kelompok k where k.id = v_kel;
  v_status := public.kg_status(p_penugasan);

  return jsonb_build_object(
    'penugasan_id', p_penugasan,
    'peran', coalesce(v_peran, 'admin'),
    'status', v_status,
    'boleh_kirim', (v_peran is not null and not v_arsip and v_status in ('belum', 'dikerjakan', 'perlu_revisi')),
    'tugas', (select jsonb_build_object('id', t.id, 'judul', t.judul, 'penjelasan', t.penjelasan, 'tenggat', t.tenggat)
                from public.tugas_kelompok t where t.id = v_tugas),
    'kelompok', jsonb_build_object('id', v_kel, 'nama', (select k.nama from public.kelompok k where k.id = v_kel), 'diarsipkan', v_arsip),
    'anggota', coalesce((
      select jsonb_agg(jsonb_build_object('user_id', a.user_id, 'username', p.username, 'nama', p.nama, 'peran', a.peran)
                       order by (a.peran = 'ketua') desc, p.username)
        from public.kelompok_anggota a join public.profil p on p.id = a.user_id
       where a.kelompok_id = v_kel
    ), '[]'::jsonb),
    'syarat', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'teks', s.teks, 'wajib', s.wajib) order by s.urutan)
        from public.tugas_syarat s where s.tugas_id = v_tugas
    ), '[]'::jsonb),
    'bagian', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'id', b.id, 'nama', b.nama, 'petunjuk', b.petunjuk, 'umum', b.umum,
                 'pemilik', b.pemilik, 'pemilik_nama', coalesce(pp.nama, pp.username),
                 'versi', b.versi, 'diubah', b.diubah,
                 'ukuran', char_length(b.html) + char_length(b.css) + char_length(b.js))
               order by b.umum desc, b.urutan, b.nama)
        from public.kerja_bagian b left join public.profil pp on pp.id = b.pemilik
       where b.penugasan_id = p_penugasan
    ), '[]'::jsonb),
    'kiriman', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'id', g.id, 'nomor', g.nomor, 'status', g.status, 'terlambat', g.terlambat,
                 'dikirim', g.dikirim, 'oleh', pg.username,
                 'catatan', coalesce((
                   select jsonb_agg(jsonb_build_object('isi', c.isi, 'waktu', c.waktu) order by c.waktu)
                     from public.pengumpulan_catatan c where c.pengumpulan_id = g.id
                 ), '[]'::jsonb))
               order by g.nomor desc)
        from public.pengumpulan g left join public.profil pg on pg.id = g.dikirim_oleh
       where g.penugasan_id = p_penugasan
    ), '[]'::jsonb),
    'ada_perubahan', coalesce(
      (select max(b.diubah) from public.kerja_bagian b where b.penugasan_id = p_penugasan)
      > (select max(g.dikirim) from public.pengumpulan g where g.penugasan_id = p_penugasan and g.status <> 'ditarik'),
      false)
  );
end;
$$;

-- Isi lengkap semua bagian (untuk editor dan pratinjau).
create or replace function public.bagian_ambil(p_penugasan uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_kel   uuid;
  v_peran text;
begin
  if auth.uid() is null then
    raise exception 'Belum masuk' using errcode = '28000';
  end if;
  select tp.kelompok_id into v_kel from public.tugas_penugasan tp where tp.id = p_penugasan;
  if not found then
    raise exception 'Tugas tidak ditemukan';
  end if;
  select a.peran into v_peran from public.kelompok_anggota a where a.kelompok_id = v_kel and a.user_id = auth.uid();
  if v_peran is null and not public.adalah_admin() then
    raise exception 'Kamu bukan anggota kelompok ini' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(
             jsonb_build_object(
               'id', b.id, 'nama', b.nama, 'petunjuk', b.petunjuk, 'umum', b.umum,
               'pemilik', b.pemilik, 'pemilik_nama', coalesce(pp.nama, pp.username),
               'versi', b.versi, 'diubah', b.diubah,
               'html', b.html, 'css', b.css, 'js', b.js,
               'boleh_edit', public.kg_boleh_edit(b.id))
             order by b.umum desc, b.urutan, b.nama)
      from public.kerja_bagian b left join public.profil pp on pp.id = b.pemilik
     where b.penugasan_id = p_penugasan
  ), '[]'::jsonb);
end;
$$;

create or replace function public.bagian_simpan(p_bagian uuid, p_versi_dasar integer, p_html text, p_css text, p_js text)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select public.kg_simpan_bagian(p_bagian, p_versi_dasar, p_html, p_css, p_js, false);
$$;

create or replace function public.bagian_riwayat(p_bagian uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_kel uuid;
begin
  select tp.kelompok_id into v_kel
    from public.kerja_bagian b join public.tugas_penugasan tp on tp.id = b.penugasan_id
   where b.id = p_bagian;
  if not found then
    raise exception 'Bagian tidak ditemukan';
  end if;
  if not (public.kg_anggota(v_kel) or public.adalah_admin()) then
    raise exception 'Kamu bukan anggota kelompok ini' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(
             jsonb_build_object('id', r.id, 'versi', r.versi, 'waktu', r.waktu, 'oleh', p.username,
                                'ukuran', char_length(r.html) + char_length(r.css) + char_length(r.js))
             order by r.versi desc, r.id desc)
      from public.kerja_riwayat r left join public.profil p on p.id = r.oleh
     where r.bagian_id = p_bagian
  ), '[]'::jsonb);
end;
$$;

-- Memulihkan satu versi lama sebagai versi baru (versi sekarang tetap masuk riwayat).
create or replace function public.bagian_pulihkan(p_bagian uuid, p_riwayat bigint, p_versi_dasar integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_html text;
  v_css  text;
  v_js   text;
begin
  select r.html, r.css, r.js into v_html, v_css, v_js
    from public.kerja_riwayat r where r.id = p_riwayat and r.bagian_id = p_bagian;
  if not found then
    raise exception 'Versi lama tidak ditemukan';
  end if;
  return public.kg_simpan_bagian(p_bagian, p_versi_dasar, v_html, v_css, v_js, true);
end;
$$;

-- ---------- 5. Pengelolaan bagian oleh KETUA ---------------------------------

create or replace function public.bagian_tambah(p_penugasan uuid, p_nama text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kel   uuid;
  v_arsip boolean;
  v_nama  text := btrim(coalesce(p_nama, ''));
  v_id    uuid;
  v_n     integer;
  v_urut  integer;
begin
  select tp.kelompok_id, k.diarsipkan into v_kel, v_arsip
    from public.tugas_penugasan tp join public.kelompok k on k.id = tp.kelompok_id
   where tp.id = p_penugasan;
  if not found then
    raise exception 'Tugas tidak ditemukan';
  end if;
  if not exists (select 1 from public.kelompok_anggota a
                  where a.kelompok_id = v_kel and a.user_id = auth.uid() and a.peran = 'ketua') then
    raise exception 'Hanya ketua kelompok yang bisa mengatur bagian' using errcode = '42501';
  end if;
  if v_arsip then
    raise exception 'Kelompok ini sudah diarsipkan';
  end if;
  if char_length(v_nama) not between 1 and 40 then
    raise exception 'Nama bagian 1 sampai 40 huruf';
  end if;
  select count(*), coalesce(max(b.urutan), 0) + 1 into v_n, v_urut
    from public.kerja_bagian b where b.penugasan_id = p_penugasan;
  if v_n >= 15 then
    raise exception 'Maksimal 15 bagian per tugas';
  end if;
  insert into public.kerja_bagian (penugasan_id, urutan, nama) values (p_penugasan, v_urut, v_nama) returning id into v_id;
  return v_id;
end;
$$;

-- Mengubah nama dan pemilik bagian. p_pemilik null = tanpa pemilik. Bagian "Umum" tidak bisa diubah.
create or replace function public.bagian_ubah(p_bagian uuid, p_nama text, p_pemilik uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kel   uuid;
  v_arsip boolean;
  v_umum  boolean;
  v_nama  text := btrim(coalesce(p_nama, ''));
begin
  select tp.kelompok_id, k.diarsipkan, b.umum into v_kel, v_arsip, v_umum
    from public.kerja_bagian b
    join public.tugas_penugasan tp on tp.id = b.penugasan_id
    join public.kelompok k on k.id = tp.kelompok_id
   where b.id = p_bagian;
  if not found then
    raise exception 'Bagian tidak ditemukan';
  end if;
  if not exists (select 1 from public.kelompok_anggota a
                  where a.kelompok_id = v_kel and a.user_id = auth.uid() and a.peran = 'ketua') then
    raise exception 'Hanya ketua kelompok yang bisa mengatur bagian' using errcode = '42501';
  end if;
  if v_arsip then
    raise exception 'Kelompok ini sudah diarsipkan';
  end if;
  if v_umum then
    raise exception 'Bagian Umum dipakai bersama dan tidak bisa diubah';
  end if;
  if char_length(v_nama) not between 1 and 40 then
    raise exception 'Nama bagian 1 sampai 40 huruf';
  end if;
  if p_pemilik is not null and not exists (
       select 1 from public.kelompok_anggota a where a.kelompok_id = v_kel and a.user_id = p_pemilik) then
    raise exception 'Pemilik harus anggota kelompok ini';
  end if;
  update public.kerja_bagian set nama = v_nama, pemilik = p_pemilik where id = p_bagian;
end;
$$;

create or replace function public.bagian_hapus(p_bagian uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kel   uuid;
  v_arsip boolean;
  v_umum  boolean;
begin
  select tp.kelompok_id, k.diarsipkan, b.umum into v_kel, v_arsip, v_umum
    from public.kerja_bagian b
    join public.tugas_penugasan tp on tp.id = b.penugasan_id
    join public.kelompok k on k.id = tp.kelompok_id
   where b.id = p_bagian;
  if not found then
    raise exception 'Bagian tidak ditemukan';
  end if;
  if not exists (select 1 from public.kelompok_anggota a
                  where a.kelompok_id = v_kel and a.user_id = auth.uid() and a.peran = 'ketua') then
    raise exception 'Hanya ketua kelompok yang bisa mengatur bagian' using errcode = '42501';
  end if;
  if v_arsip then
    raise exception 'Kelompok ini sudah diarsipkan';
  end if;
  if v_umum then
    raise exception 'Bagian Umum tidak bisa dihapus';
  end if;
  delete from public.kerja_bagian where id = p_bagian;
end;
$$;

-- Menggeser urutan bagian: p_arah = -1 (naik) atau 1 (turun).
create or replace function public.bagian_pindah(p_bagian uuid, p_arah integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kel   uuid;
  v_arsip boolean;
  v_pen   uuid;
  v_umum  boolean;
  v_ids   uuid[];
  v_i     integer;
  v_j     integer;
  k       integer;
begin
  select tp.kelompok_id, k2.diarsipkan, b.penugasan_id, b.umum into v_kel, v_arsip, v_pen, v_umum
    from public.kerja_bagian b
    join public.tugas_penugasan tp on tp.id = b.penugasan_id
    join public.kelompok k2 on k2.id = tp.kelompok_id
   where b.id = p_bagian;
  if not found then
    raise exception 'Bagian tidak ditemukan';
  end if;
  if not exists (select 1 from public.kelompok_anggota a
                  where a.kelompok_id = v_kel and a.user_id = auth.uid() and a.peran = 'ketua') then
    raise exception 'Hanya ketua kelompok yang bisa mengatur bagian' using errcode = '42501';
  end if;
  if v_arsip or v_umum then
    return;
  end if;

  select array_agg(b.id order by b.urutan, b.nama, b.id) into v_ids
    from public.kerja_bagian b where b.penugasan_id = v_pen and not b.umum;
  v_i := array_position(v_ids, p_bagian);
  if v_i is null then
    return;
  end if;
  v_j := v_i + case when p_arah < 0 then -1 else 1 end;
  if v_j < 1 or v_j > array_length(v_ids, 1) then
    return;
  end if;
  v_ids[v_i] := v_ids[v_j];
  v_ids[v_j] := p_bagian;
  for k in 1 .. array_length(v_ids, 1) loop
    update public.kerja_bagian set urutan = k where id = v_ids[k];
  end loop;
end;
$$;

-- ---------- 6. Submit, tarik kembali, detail kiriman -------------------------

create or replace function public.pengumpulan_kirim(p_penugasan uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kel     uuid;
  v_tenggat timestamptz;
  v_arsip   boolean;
  v_status  text;
  v_nomor   integer;
  v_snap    jsonb;
  v_id      uuid;
begin
  select tp.kelompok_id, t.tenggat, k.diarsipkan into v_kel, v_tenggat, v_arsip
    from public.tugas_penugasan tp
    join public.tugas_kelompok t on t.id = tp.tugas_id
    join public.kelompok k on k.id = tp.kelompok_id
   where tp.id = p_penugasan
   for update of tp;
  if not found then
    raise exception 'Tugas tidak ditemukan';
  end if;
  if not public.kg_anggota(v_kel) then
    raise exception 'Hanya anggota kelompok yang bisa mengirim' using errcode = '42501';
  end if;
  if v_arsip then
    raise exception 'Kelompok ini sudah diarsipkan';
  end if;

  v_status := public.kg_status(p_penugasan);
  if v_status = 'dikirim' then
    raise exception 'Kiriman sebelumnya masih menunggu ditinjau. Tarik kembali dulu bila ingin memperbaiki';
  end if;
  if v_status = 'diterima' then
    raise exception 'Tugas ini sudah diterima';
  end if;

  select jsonb_build_object('bagian', coalesce(
           jsonb_agg(jsonb_build_object('nama', b.nama, 'umum', b.umum, 'html', b.html, 'css', b.css, 'js', b.js)
                     order by b.umum desc, b.urutan, b.nama),
           '[]'::jsonb))
    into v_snap
    from public.kerja_bagian b where b.penugasan_id = p_penugasan;

  select coalesce(max(g.nomor), 0) + 1 into v_nomor from public.pengumpulan g where g.penugasan_id = p_penugasan;

  insert into public.pengumpulan (penugasan_id, nomor, snapshot, dikirim_oleh, terlambat)
  values (p_penugasan, v_nomor, v_snap, auth.uid(), (v_tenggat is not null and now() > v_tenggat))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.pengumpulan_tarik(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kel    uuid;
  v_status text;
begin
  select tp.kelompok_id, g.status into v_kel, v_status
    from public.pengumpulan g join public.tugas_penugasan tp on tp.id = g.penugasan_id
   where g.id = p_id
   for update of g;
  if not found then
    raise exception 'Kiriman tidak ditemukan';
  end if;
  if not public.kg_anggota(v_kel) then
    raise exception 'Hanya anggota kelompok yang bisa menarik kiriman' using errcode = '42501';
  end if;
  if v_status <> 'dikirim' then
    raise exception 'Kiriman ini sudah ditinjau atau ditarik';
  end if;
  update public.pengumpulan set status = 'ditarik' where id = p_id;
end;
$$;

-- Detail satu kiriman (snapshot, syarat dan centangnya, catatan). Admin atau anggota kelompok.
create or replace function public.pengumpulan_detail(p_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_pg  public.pengumpulan;
  v_kel uuid;
  v_tug uuid;
begin
  if auth.uid() is null then
    raise exception 'Belum masuk' using errcode = '28000';
  end if;
  select * into v_pg from public.pengumpulan g where g.id = p_id;
  if not found then
    raise exception 'Kiriman tidak ditemukan';
  end if;
  select tp.kelompok_id, tp.tugas_id into v_kel, v_tug from public.tugas_penugasan tp where tp.id = v_pg.penugasan_id;
  if not (public.adalah_admin() or public.kg_anggota(v_kel)) then
    raise exception 'Kamu tidak punya akses ke kiriman ini' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'id', v_pg.id,
    'penugasan_id', v_pg.penugasan_id,
    'nomor', v_pg.nomor,
    'status', v_pg.status,
    'terlambat', v_pg.terlambat,
    'dikirim', v_pg.dikirim,
    'snapshot', v_pg.snapshot,
    'tugas', (select t.judul from public.tugas_kelompok t where t.id = v_tug),
    'kelompok', (select k.nama from public.kelompok k where k.id = v_kel),
    'terbaru', not exists (select 1 from public.pengumpulan g2 where g2.penugasan_id = v_pg.penugasan_id and g2.nomor > v_pg.nomor),
    'syarat', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'teks', s.teks, 'wajib', s.wajib, 'terpenuhi', coalesce(c.terpenuhi, false))
                       order by s.urutan)
        from public.tugas_syarat s
        left join public.pengumpulan_cek c on c.syarat_id = s.id and c.pengumpulan_id = v_pg.id
       where s.tugas_id = v_tug
    ), '[]'::jsonb),
    'catatan', coalesce((
      select jsonb_agg(jsonb_build_object('isi', c.isi, 'waktu', c.waktu, 'penulis', p.username) order by c.waktu)
        from public.pengumpulan_catatan c left join public.profil p on p.id = c.penulis
       where c.pengumpulan_id = v_pg.id
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------- 7. Hak akses fungsi ---------------------------------------------

revoke all on function public.kg_anggota(uuid) from public, anon, authenticated;
revoke all on function public.kg_status(uuid) from public, anon, authenticated;
revoke all on function public.kg_boleh_edit(uuid) from public, anon, authenticated;
revoke all on function public.kg_simpan_bagian(uuid, integer, text, text, text, boolean) from public, anon, authenticated;

revoke all on function
  public.admin_akun_daftar(),
  public.admin_kelompok_daftar(),
  public.admin_kelompok_simpan(uuid, text),
  public.admin_kelompok_anggota(uuid, jsonb),
  public.admin_kelompok_arsip(uuid, boolean),
  public.admin_kelompok_hapus(uuid),
  public.admin_tugas_simpan(uuid, text, text, timestamptz, jsonb, jsonb),
  public.admin_tugas_daftar(),
  public.admin_tugas_hapus(uuid),
  public.admin_tugas_beri(uuid, uuid),
  public.admin_tugas_cabut(uuid),
  public.admin_pengumpulan_daftar(),
  public.admin_pengumpulan_tinjau(uuid, text, jsonb, text),
  public.kelompok_saya(),
  public.tugas_detail(uuid),
  public.bagian_ambil(uuid),
  public.bagian_simpan(uuid, integer, text, text, text),
  public.bagian_riwayat(uuid),
  public.bagian_pulihkan(uuid, bigint, integer),
  public.bagian_tambah(uuid, text),
  public.bagian_ubah(uuid, text, uuid),
  public.bagian_hapus(uuid),
  public.bagian_pindah(uuid, integer),
  public.pengumpulan_kirim(uuid),
  public.pengumpulan_tarik(uuid),
  public.pengumpulan_detail(uuid)
from public, anon;

grant execute on function
  public.admin_akun_daftar(),
  public.admin_kelompok_daftar(),
  public.admin_kelompok_simpan(uuid, text),
  public.admin_kelompok_anggota(uuid, jsonb),
  public.admin_kelompok_arsip(uuid, boolean),
  public.admin_kelompok_hapus(uuid),
  public.admin_tugas_simpan(uuid, text, text, timestamptz, jsonb, jsonb),
  public.admin_tugas_daftar(),
  public.admin_tugas_hapus(uuid),
  public.admin_tugas_beri(uuid, uuid),
  public.admin_tugas_cabut(uuid),
  public.admin_pengumpulan_daftar(),
  public.admin_pengumpulan_tinjau(uuid, text, jsonb, text),
  public.kelompok_saya(),
  public.tugas_detail(uuid),
  public.bagian_ambil(uuid),
  public.bagian_simpan(uuid, integer, text, text, text),
  public.bagian_riwayat(uuid),
  public.bagian_pulihkan(uuid, bigint, integer),
  public.bagian_tambah(uuid, text),
  public.bagian_ubah(uuid, text, uuid),
  public.bagian_hapus(uuid),
  public.bagian_pindah(uuid, integer),
  public.pengumpulan_kirim(uuid),
  public.pengumpulan_tarik(uuid),
  public.pengumpulan_detail(uuid)
to authenticated;
