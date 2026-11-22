-- ============================================================================
-- CodingSkanetra - Assets (simpan gambar) - Tahap 0 / prototipe
-- Jalankan sekali di Supabase > SQL Editor. Aman dijalankan ulang.
-- ============================================================================
-- Rancangan:
--   * Bucket privat "aset". Gambar tidak bisa dibuka tanpa tautan bertanda tangan berumur pendek.
--   * Jalur file: <id-akun>/<nama-file>.<ekstensi>. Nama file inilah yang dipakai di kode
--     (<img src="kucing.png">), jadi tidak perlu tabel tambahan: storage.objects adalah satu-satunya
--     sumber data.
--   * Batas dijaga di database dan oleh Storage, bukan di browser:
--       - ukuran per file dan jenis file: pengaturan bucket (dipaksa oleh Storage API),
--       - nama file, folder pemilik, dan jumlah file per akun: kebijakan di bawah.
--   * Hanya anggota (atau admin) yang boleh mengunggah. Admin boleh melihat dan menghapus semua.
--   * Tidak ada kebijakan UPDATE: mengganti gambar = hapus lalu unggah ulang.
-- Catatan: penghitungan jumlah file dan unggahan bisa berlomba pada permintaan yang benar-benar
-- bersamaan, sehingga batas bisa terlampaui beberapa file saja, tidak lebih.
-- ============================================================================

-- 1. Batas per akun (ubah angka di sini bila perlu).
create or replace function public.aset_batas_jumlah()
returns int language sql immutable set search_path = '' as $$ select 30 $$;

create or replace function public.aset_batas_byte()
returns int language sql immutable set search_path = '' as $$ select 512000 $$;

-- 2. Bucket privat.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('aset', 'aset', false, 512000, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 3. Fungsi bantu (security definer supaya penghitungan tidak terkena RLS berulang).
create or replace function public.aset_jumlah_saya()
returns int
language sql
security definer
stable
set search_path = ''
as $$
  select count(*)::int
  from storage.objects
  where bucket_id = 'aset' and (storage.foldername(name))[1] = (select auth.uid())::text;
$$;

create or replace function public.aset_pemakaian()
returns table (jumlah int, byte bigint, batas_jumlah int, batas_byte int)
language sql
security definer
stable
set search_path = ''
as $$
  select count(*)::int,
         coalesce(sum((metadata ->> 'size')::bigint), 0)::bigint,
         public.aset_batas_jumlah(),
         public.aset_batas_byte()
  from storage.objects
  where bucket_id = 'aset' and (storage.foldername(name))[1] = (select auth.uid())::text;
$$;

-- Ringkasan semua akun untuk halaman admin.
drop function if exists public.aset_ringkasan_admin(); -- tipe hasil berubah (kolom nama ditambah)
create or replace function public.aset_ringkasan_admin()
returns table (user_id uuid, username text, nama text, jumlah int, byte bigint)
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if not public.adalah_admin() then
    raise exception 'Khusus pengelola' using errcode = '42501';
  end if;
  return query
    select p.id, p.username, p.nama, count(o.id)::int, coalesce(sum((o.metadata ->> 'size')::bigint), 0)::bigint
    from storage.objects o
    join public.profil p on p.id::text = (storage.foldername(o.name))[1]
    where o.bucket_id = 'aset'
    group by p.id, p.username, p.nama
    order by 5 desc;
end;
$$;

revoke all on function public.aset_jumlah_saya(), public.aset_pemakaian(), public.aset_ringkasan_admin() from public, anon;
grant execute on function public.aset_jumlah_saya(), public.aset_pemakaian(), public.aset_ringkasan_admin() to authenticated;

-- 4. Kebijakan pada storage.objects (khusus bucket "aset").
drop policy if exists "aset: unggah milik sendiri" on storage.objects;
create policy "aset: unggah milik sendiri"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'aset'
    and (public.adalah_anggota() or public.adalah_admin())
    and name ~ ('^' || (select auth.uid())::text || '/[a-z0-9][a-z0-9._-]{0,48}\.(png|jpe?g|webp|gif)$')
    and public.aset_jumlah_saya() < public.aset_batas_jumlah()
  );

drop policy if exists "aset: baca milik sendiri" on storage.objects;
create policy "aset: baca milik sendiri"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'aset'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.adalah_admin())
  );

drop policy if exists "aset: hapus milik sendiri" on storage.objects;
create policy "aset: hapus milik sendiri"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'aset'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.adalah_admin())
  );
