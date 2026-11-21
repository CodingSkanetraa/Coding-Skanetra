-- ============================================================================
-- CodingSkanetra - Aset gambar untuk KELOMPOK
-- Jalankan di Supabase > SQL Editor SESUDAH supabase/aset.sql dan supabase/kelompok.sql.
-- Aman dijalankan ulang.
-- ============================================================================
-- Rancangan:
--   * Memakai bucket "aset" yang sama. Gambar kelompok disimpan di jalur
--     k-<id-kelompok>/<nama-file>.<ekstensi> (aset pribadi tetap <id-akun>/<nama-file>).
--   * Semua anggota kelompok boleh melihat, mengunggah, dan menghapus gambar kelompoknya.
--     Admin boleh semuanya. Kelompok yang diarsipkan: anggota hanya boleh melihat.
--   * Batas: 30 file per KELOMPOK (angka sama dengan aset pribadi); ukuran dan jenis file
--     dipaksa oleh pengaturan bucket.
--   * Gambar TIDAK ikut dibekukan pada kiriman: kiriman hanya menyimpan kode.
-- ============================================================================

-- 1. Bolehkah akun ini memakai folder ini? p_tulis = true untuk unggah/hapus.
create or replace function public.aset_kelompok_boleh(p_folder text, p_tulis boolean)
returns boolean
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_kel uuid;
begin
  if p_folder is null or p_folder !~ '^k-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  v_kel := substr(p_folder, 3)::uuid;
  if public.adalah_admin() then
    return true;
  end if;
  return exists (
    select 1
      from public.kelompok_anggota a
      join public.kelompok k on k.id = a.kelompok_id
     where a.kelompok_id = v_kel
       and a.user_id = (select auth.uid())
       and (not p_tulis or not k.diarsipkan)
  );
end;
$$;

-- 2. Jumlah file satu folder kelompok (untuk batas unggah).
create or replace function public.aset_kelompok_jumlah(p_folder text)
returns int
language sql
security definer
stable
set search_path = ''
as $$
  select count(*)::int
    from storage.objects
   where bucket_id = 'aset' and (storage.foldername(name))[1] = p_folder;
$$;

-- 3. Pemakaian untuk panel di editor kelompok.
create or replace function public.aset_kelompok_pemakaian(p_kelompok uuid)
returns table (jumlah int, byte bigint, batas_jumlah int, batas_byte int)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_folder text := 'k-' || p_kelompok::text;
begin
  if not public.aset_kelompok_boleh(v_folder, false) then
    raise exception 'Bukan anggota kelompok ini' using errcode = '42501';
  end if;
  return query
    select count(*)::int,
           coalesce(sum((metadata ->> 'size')::bigint), 0)::bigint,
           public.aset_batas_jumlah(),
           public.aset_batas_byte()
      from storage.objects
     where bucket_id = 'aset' and (storage.foldername(name))[1] = v_folder;
end;
$$;

revoke all on function public.aset_kelompok_boleh(text, boolean), public.aset_kelompok_jumlah(text),
  public.aset_kelompok_pemakaian(uuid) from public, anon;
grant execute on function public.aset_kelompok_boleh(text, boolean), public.aset_kelompok_jumlah(text),
  public.aset_kelompok_pemakaian(uuid) to authenticated;

-- 4. Kebijakan pada storage.objects (ditambahkan di samping kebijakan aset pribadi; keduanya berlaku).
drop policy if exists "aset: kelompok unggah" on storage.objects;
create policy "aset: kelompok unggah"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'aset'
    and name ~ '^k-[0-9a-f-]{36}/[a-z0-9][a-z0-9._-]{0,48}\.(png|jpe?g|webp|gif)$'
    and public.aset_kelompok_boleh((storage.foldername(name))[1], true)
    and public.aset_kelompok_jumlah((storage.foldername(name))[1]) < public.aset_batas_jumlah()
  );

drop policy if exists "aset: kelompok baca" on storage.objects;
create policy "aset: kelompok baca"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'aset'
    and public.aset_kelompok_boleh((storage.foldername(name))[1], false)
  );

drop policy if exists "aset: kelompok hapus" on storage.objects;
create policy "aset: kelompok hapus"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'aset'
    and public.aset_kelompok_boleh((storage.foldername(name))[1], true)
  );
