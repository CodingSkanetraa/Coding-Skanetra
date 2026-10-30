// Pengaturan koneksi ke Supabase (layanan akun dan penyimpanan progres).
//
// Kedua nilai ini BOLEH publik: "anon key" memang dirancang untuk ada di kode situs.
// Yang melindungi data adalah aturan RLS di database (lihat supabase/skema.sql).
// JANGAN PERNAH menaruh kunci "service_role" atau "secret" di sini atau di repositori.
window.CS_SUPABASE = {
  url: "https://rlwvcnnezroumlyijznq.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsd3Zjbm5lenJvdW1seWlqem5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyNDgzMzQsImV4cCI6MjEwODgyNDMzNH0.sXANcmTEhr5XR7TzQkieKHaJlu-NzsC5VHz37YqIXV4",
  // Pengguna login dengan username. Di Supabase, username diubah menjadi email buatan
  // "<username>@<domain ini>". Tidak ada email yang dikirim ke alamat ini.
  domainEmail: "users.codingskanetra.vercel.app"
};
