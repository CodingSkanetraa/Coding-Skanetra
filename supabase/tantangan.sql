-- ============================================================================
--  Coding Skanetra: skema fitur Tantangan (soal, penilaian, poin)
--  Cara pakai: Supabase > SQL Editor > New query > tempel seluruh berkas ini > Run.
--  Jalankan SETELAH supabase/skema.sql (memakai tabel profil dan fungsi adalah_admin/adalah_anggota).
--  Aman dijalankan ulang.
--
--  Prinsip keamanan:
--   * Soal (tanpa tes) hanya terbaca anggota dan admin. TES TERSEMBUNYI hanya terbaca admin.
--   * Anggota tidak bisa menulis ke tabel penyelesaian dari browser. Yang menulis adalah fungsi
--     di server Vercel (api/tantangan/*) lewat fungsi database yang dijaga RAHASIA PENILAI,
--     yaitu kata sandi buatan sendiri yang disimpan di tabel pengaturan_server dan di Vercel.
--     Ini BUKAN kunci service_role Supabase.
--   * Satu anak hanya bisa menyelesaikan satu soal satu kali (kunci unik), jadi poin tidak ganda.
-- ============================================================================


-- ---------- 1. Hubungan akun dengan ID anggota di spreadsheet --------------------------
-- Peringkat memakai ID dari spreadsheet. Akun Supabase belum punya hubungan ke ID itu,
-- jadi pengelola mengisinya (halaman Admin Tantangan, atau Table Editor > profil > id_sheet).
alter table public.profil add column if not exists id_sheet text;

alter table public.profil drop constraint if exists profil_id_sheet_cek;
alter table public.profil add constraint profil_id_sheet_cek
  check (id_sheet is null or char_length(id_sheet) between 1 and 64);

-- Admin boleh melihat semua profil (untuk daftar anggota di halaman admin).
drop policy if exists "profil: admin baca semua" on public.profil;
create policy "profil: admin baca semua"
  on public.profil for select to authenticated
  using (public.adalah_admin());


-- ---------- 2. Rahasia penilai ---------------------------------------------------------
-- Tabel ini TIDAK punya policy dan hak aksesnya dicabut, jadi tidak terbaca lewat API sama sekali.
-- Isi lewat SQL Editor (lihat PANDUAN.md bagian F), jangan lewat web.
create table if not exists public.pengaturan_server (
  kunci text primary key,
  nilai text not null
);
alter table public.pengaturan_server enable row level security;
revoke all on public.pengaturan_server from public, anon, authenticated;

create or replace function public.penilai_sah(p_rahasia text)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select p_rahasia is not null
     and exists (
       select 1 from public.pengaturan_server
       where kunci = 'penilai' and char_length(nilai) >= 32 and nilai = p_rahasia
     );
$$;
revoke all on function public.penilai_sah(text) from public, anon, authenticated;


-- ---------- 3. Soal dan tes ------------------------------------------------------------
create table if not exists public.tantangan (
  id         uuid primary key default gen_random_uuid(),
  judul      text not null check (char_length(judul) between 3 and 80),
  bahasa     text not null check (bahasa in ('py', 'cpp', 'web')),
  tingkat    text not null default 'mudah' check (tingkat in ('mudah', 'sedang', 'sulit')),
  poin       integer not null default 10 check (poin between 1 and 100),
  -- otomatis = dinilai server lewat tes (hanya Python dan C++); manual = dinilai guru
  penilaian  text not null default 'otomatis' check (penilaian in ('otomatis', 'manual')),
  deskripsi  text not null default '' check (char_length(deskripsi) <= 4000),
  kode_awal  text not null default '' check (char_length(kode_awal) <= 5000),
  aktif      boolean not null default true,
  dibuat     timestamptz not null default now(),
  diubah     timestamptz not null default now(),
  check (bahasa <> 'web' or penilaian = 'manual')
);

create index if not exists tantangan_aktif_idx on public.tantangan (aktif, bahasa);

alter table public.tantangan enable row level security;

drop policy if exists "tantangan: anggota baca yang aktif" on public.tantangan;
create policy "tantangan: anggota baca yang aktif"
  on public.tantangan for select to authenticated
  using (aktif and public.adalah_anggota());

drop policy if exists "tantangan: admin kelola" on public.tantangan;
create policy "tantangan: admin kelola"
  on public.tantangan for all to authenticated
  using (public.adalah_admin())
  with check (public.adalah_admin());

-- Tes tersembunyi: hanya admin yang bisa membaca atau mengubah dari browser.
create table if not exists public.tantangan_tes (
  id            bigint generated always as identity primary key,
  tantangan_id  uuid not null references public.tantangan(id) on delete cascade,
  urutan        integer not null default 1,
  masukan       text not null default '' check (char_length(masukan) <= 2000),
  keluaran      text not null check (char_length(keluaran) <= 2000)
);

create index if not exists tantangan_tes_tantangan_idx on public.tantangan_tes (tantangan_id, urutan);

alter table public.tantangan_tes enable row level security;

drop policy if exists "tantangan_tes: admin kelola" on public.tantangan_tes;
create policy "tantangan_tes: admin kelola"
  on public.tantangan_tes for all to authenticated
  using (public.adalah_admin())
  with check (public.adalah_admin());


-- ---------- 4. Penyelesaian ------------------------------------------------------------
create table if not exists public.tantangan_selesai (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references public.profil(id) on delete cascade,
  tantangan_id    uuid not null references public.tantangan(id) on delete cascade,
  status          text not null check (status in ('menunggu', 'selesai', 'ditolak')),
  poin            integer not null default 0 check (poin between 0 and 100),
  kode            text not null default '' check (char_length(kode) <= 20000),
  terkirim_sheet  boolean not null default false,   -- sudah ditulis ke spreadsheet poin?
  dikirim         timestamptz not null default now(),
  dinilai         timestamptz,
  unique (user_id, tantangan_id)
);

create index if not exists tantangan_selesai_status_idx on public.tantangan_selesai (status, terkirim_sheet);

alter table public.tantangan_selesai enable row level security;

drop policy if exists "tantangan_selesai: baca milik sendiri" on public.tantangan_selesai;
create policy "tantangan_selesai: baca milik sendiri"
  on public.tantangan_selesai for select to authenticated
  using (user_id = (select auth.uid()) and public.adalah_anggota());

drop policy if exists "tantangan_selesai: admin baca semua" on public.tantangan_selesai;
create policy "tantangan_selesai: admin baca semua"
  on public.tantangan_selesai for select to authenticated
  using (public.adalah_admin());
-- Tidak ada policy tulis: hanya fungsi server di bawah yang boleh menulis.


-- ---------- 5. Fungsi untuk server (dijaga rahasia penilai) ----------------------------

-- Soal beserta tesnya, untuk dinilai di server.
create or replace function public.ambil_tes_nilai(p_rahasia text, p_tantangan uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_soal public.tantangan;
begin
  if not public.penilai_sah(p_rahasia) then
    raise exception 'Tidak diizinkan.' using errcode = '42501';
  end if;
  select * into v_soal from public.tantangan where id = p_tantangan;
  if not found then return null; end if;
  return jsonb_build_object(
    'id', v_soal.id,
    'judul', v_soal.judul,
    'bahasa', v_soal.bahasa,
    'poin', v_soal.poin,
    'penilaian', v_soal.penilaian,
    'aktif', v_soal.aktif,
    'tes', coalesce((
      select jsonb_agg(jsonb_build_object('masukan', t.masukan, 'keluaran', t.keluaran) order by t.urutan, t.id)
      from public.tantangan_tes t where t.tantangan_id = v_soal.id
    ), '[]'::jsonb)
  );
end;
$$;

-- Mencatat hasil. Poin hanya dihitung SEKALI: jika sudah 'selesai', baris tidak diubah lagi.
-- Hasil: baru = true bila inilah saat pertama soal itu selesai (poin harus ditambahkan ke spreadsheet).
create or replace function public.catat_penyelesaian(
  p_rahasia text, p_user uuid, p_tantangan uuid, p_status text, p_kode text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_poin integer;
  v_baris public.tantangan_selesai;
begin
  if not public.penilai_sah(p_rahasia) then
    raise exception 'Tidak diizinkan.' using errcode = '42501';
  end if;
  if p_status not in ('menunggu', 'selesai') then
    raise exception 'Status tidak valid.' using errcode = '22023';
  end if;
  select poin into v_poin from public.tantangan where id = p_tantangan and aktif;
  if v_poin is null then
    raise exception 'Soal tidak ditemukan.' using errcode = 'P0002';
  end if;

  insert into public.tantangan_selesai as s (user_id, tantangan_id, status, poin, kode, dinilai)
  values (p_user, p_tantangan, p_status,
          case when p_status = 'selesai' then v_poin else 0 end,
          left(coalesce(p_kode, ''), 20000),
          case when p_status = 'selesai' then now() end)
  on conflict (user_id, tantangan_id) do update
    set status = excluded.status,
        poin = excluded.poin,
        kode = excluded.kode,
        dikirim = now(),
        dinilai = excluded.dinilai
    where s.status <> 'selesai'
  returning * into v_baris;

  if v_baris.id is null then
    -- Sudah selesai sebelumnya: tidak diubah.
    select * into v_baris from public.tantangan_selesai where user_id = p_user and tantangan_id = p_tantangan;
    return jsonb_build_object('baru', false, 'status', v_baris.status, 'poin', v_baris.poin,
                              'terkirim_sheet', v_baris.terkirim_sheet);
  end if;
  return jsonb_build_object('baru', p_status = 'selesai', 'status', v_baris.status, 'poin', v_baris.poin,
                            'terkirim_sheet', v_baris.terkirim_sheet);
end;
$$;

-- Penilaian manual oleh guru (dipanggil server setelah memastikan pemanggil admin).
create or replace function public.nilai_manual(p_rahasia text, p_id bigint, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_baris public.tantangan_selesai;
  v_judul text;
  v_poin integer;
begin
  if not public.penilai_sah(p_rahasia) then
    raise exception 'Tidak diizinkan.' using errcode = '42501';
  end if;
  if p_status not in ('selesai', 'ditolak') then
    raise exception 'Status tidak valid.' using errcode = '22023';
  end if;

  update public.tantangan_selesai s
     set status = p_status,
         poin = case when p_status = 'selesai' then (select t.poin from public.tantangan t where t.id = s.tantangan_id) else 0 end,
         dinilai = now()
   where s.id = p_id and s.status = 'menunggu'
  returning * into v_baris;

  if v_baris.id is null then
    return jsonb_build_object('baru', false);
  end if;
  select judul into v_judul from public.tantangan where id = v_baris.tantangan_id;
  return jsonb_build_object('baru', p_status = 'selesai', 'status', v_baris.status, 'poin', v_baris.poin,
                            'user_id', v_baris.user_id, 'tantangan_id', v_baris.tantangan_id, 'judul', v_judul);
end;
$$;

-- Data satu penyelesaian untuk dikirim (ulang) ke spreadsheet.
create or replace function public.ambil_untuk_kirim(p_rahasia text, p_id bigint)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_baris public.tantangan_selesai;
begin
  if not public.penilai_sah(p_rahasia) then
    raise exception 'Tidak diizinkan.' using errcode = '42501';
  end if;
  select * into v_baris from public.tantangan_selesai where id = p_id and status = 'selesai';
  if not found then return null; end if;
  return jsonb_build_object(
    'id', v_baris.id, 'user_id', v_baris.user_id, 'tantangan_id', v_baris.tantangan_id,
    'poin', v_baris.poin, 'terkirim_sheet', v_baris.terkirim_sheet,
    'judul', (select judul from public.tantangan where id = v_baris.tantangan_id),
    'id_sheet', (select id_sheet from public.profil where id = v_baris.user_id)
  );
end;
$$;

create or replace function public.tandai_terkirim(p_rahasia text, p_user uuid, p_tantangan uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.penilai_sah(p_rahasia) then
    raise exception 'Tidak diizinkan.' using errcode = '42501';
  end if;
  update public.tantangan_selesai set terkirim_sheet = true
   where user_id = p_user and tantangan_id = p_tantangan and status = 'selesai';
end;
$$;

revoke all on function public.ambil_tes_nilai(text, uuid) from public;
revoke all on function public.catat_penyelesaian(text, uuid, uuid, text, text) from public;
revoke all on function public.nilai_manual(text, bigint, text) from public;
revoke all on function public.ambil_untuk_kirim(text, bigint) from public;
revoke all on function public.tandai_terkirim(text, uuid, uuid) from public;
-- Server memanggilnya dengan kunci anon; yang menjaga adalah rahasia penilai di dalam fungsi.
grant execute on function public.ambil_tes_nilai(text, uuid) to anon, authenticated;
grant execute on function public.catat_penyelesaian(text, uuid, uuid, text, text) to anon, authenticated;
grant execute on function public.nilai_manual(text, bigint, text) to anon, authenticated;
grant execute on function public.ambil_untuk_kirim(text, bigint) to anon, authenticated;
grant execute on function public.tandai_terkirim(text, uuid, uuid) to anon, authenticated;


-- ---------- 6. Fungsi untuk halaman admin (dijaga adalah_admin) -------------------------

-- Menyimpan soal beserta tes dalam satu transaksi. p memuat: id (opsional), judul, bahasa, tingkat,
-- poin, penilaian, deskripsi, kode_awal, aktif, tes: [{masukan, keluaran}, ...] (maksimal 10).
create or replace function public.admin_simpan_tantangan(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_t jsonb;
  v_i integer := 0;
begin
  if not public.adalah_admin() then
    raise exception 'Khusus pengelola.' using errcode = '42501';
  end if;
  if jsonb_array_length(coalesce(p -> 'tes', '[]'::jsonb)) > 10 then
    raise exception 'Maksimal 10 tes per soal.' using errcode = '22023';
  end if;

  if nullif(p ->> 'id', '') is null then
    insert into public.tantangan (judul, bahasa, tingkat, poin, penilaian, deskripsi, kode_awal, aktif)
    values (p ->> 'judul', p ->> 'bahasa', coalesce(p ->> 'tingkat', 'mudah'),
            coalesce((p ->> 'poin')::integer, 10), coalesce(p ->> 'penilaian', 'otomatis'),
            coalesce(p ->> 'deskripsi', ''), coalesce(p ->> 'kode_awal', ''),
            coalesce((p ->> 'aktif')::boolean, true))
    returning id into v_id;
  else
    v_id := (p ->> 'id')::uuid;
    update public.tantangan set
      judul = p ->> 'judul', bahasa = p ->> 'bahasa', tingkat = coalesce(p ->> 'tingkat', 'mudah'),
      poin = coalesce((p ->> 'poin')::integer, 10), penilaian = coalesce(p ->> 'penilaian', 'otomatis'),
      deskripsi = coalesce(p ->> 'deskripsi', ''), kode_awal = coalesce(p ->> 'kode_awal', ''),
      aktif = coalesce((p ->> 'aktif')::boolean, true), diubah = now()
    where id = v_id;
    if not found then
      raise exception 'Soal tidak ditemukan.' using errcode = 'P0002';
    end if;
    delete from public.tantangan_tes where tantangan_id = v_id;
  end if;

  for v_t in select * from jsonb_array_elements(coalesce(p -> 'tes', '[]'::jsonb)) loop
    v_i := v_i + 1;
    insert into public.tantangan_tes (tantangan_id, urutan, masukan, keluaran)
    values (v_id, v_i, coalesce(v_t ->> 'masukan', ''), v_t ->> 'keluaran');
  end loop;
  return v_id;
end;
$$;

create or replace function public.admin_atur_id_sheet(p_user uuid, p_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.adalah_admin() then
    raise exception 'Khusus pengelola.' using errcode = '42501';
  end if;
  update public.profil set id_sheet = nullif(btrim(p_id), '') where id = p_user;
end;
$$;

revoke all on function public.admin_simpan_tantangan(jsonb) from public, anon;
revoke all on function public.admin_atur_id_sheet(uuid, text) from public, anon;
grant execute on function public.admin_simpan_tantangan(jsonb) to authenticated;
grant execute on function public.admin_atur_id_sheet(uuid, text) to authenticated;
