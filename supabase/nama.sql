-- ============================================================================
-- CodingSkanetra - Ganti nama tampilan (jalankan sekali di SQL Editor Supabase)
-- ============================================================================
-- Username tetap tidak bisa diubah. Yang bisa diubah hanya kolom "nama",
-- dan hanya milik akun yang sedang masuk (auth.uid()). Kolom lain
-- (username, kelas, anggota, admin) tidak tersentuh. Aman dijalankan ulang.
-- ============================================================================

create or replace function public.ubah_nama_saya(p_nama text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_nama text;
begin
  if v_uid is null then
    raise exception 'Belum masuk' using errcode = '28000';
  end if;

  -- Rapikan: buang karakter kontrol, ratakan spasi ganda, pangkas ujung.
  v_nama := btrim(regexp_replace(regexp_replace(coalesce(p_nama, ''), '[[:cntrl:]]', ' ', 'g'), '\s+', ' ', 'g'));

  if char_length(v_nama) > 40 then
    raise exception 'Nama terlalu panjang (maksimal 40 huruf)' using errcode = '22023';
  end if;

  -- Nama kosong = hapus nama (kembali memakai username).
  update public.profil set nama = nullif(v_nama, '') where id = v_uid;
  return nullif(v_nama, '');
end;
$$;

revoke all on function public.ubah_nama_saya(text) from public, anon;
grant execute on function public.ubah_nama_saya(text) to authenticated;
