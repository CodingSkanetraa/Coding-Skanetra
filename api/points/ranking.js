// Peringkat semua anggota untuk semester aktif, plus 5 besar semester sebelumnya (arsip).
// Dibaca dari database Supabase (fungsi poin_peringkat), memakai token login pemanggil.
const { json, ambilToken, periksaAnggota, rpcUser } = require('../_security');

// Ingatan singkat supaya database tidak dipanggil tiap kali halaman dibuka.
// Hanya berlaku selama instance fungsi masih hidup; nilai poin paling lambat 30 detik "basi".
const UMUR_INGATAN_MS = 30 * 1000;
let ingatan = null;

const BANYAK_ARSIP = 5;

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { sukses: false, pesan: 'Metode tidak diizinkan.' });

  const anggota = await periksaAnggota(req);
  if (!anggota.ok) return json(res, anggota.status, { sukses: false, kode: anggota.kode, pesan: anggota.pesan });

  if (ingatan && Date.now() - ingatan.waktu < UMUR_INGATAN_MS) return json(res, 200, ingatan.hasil);

  try {
    const token = ambilToken(req);
    const daftar = await rpcUser('poin_semester_daftar', {}, token);
    const semester = Array.isArray(daftar) ? daftar : [];   // terbaru di atas
    const aktif = semester.find((s) => s.aktif) || null;
    const lama = semester.find((s) => !s.aktif) || null;

    const [data, dataLama] = await Promise.all([
      rpcUser('poin_peringkat', { p_semester: aktif ? aktif.id : null }, token),
      lama ? rpcUser('poin_peringkat', { p_semester: lama.id }, token) : Promise.resolve(null)
    ]);
    if (!Array.isArray(data)) throw new Error('Balasan peringkat tidak berbentuk daftar.');

    const hasil = {
      sukses: true,
      data,
      semester: aktif ? { nama: aktif.nama, mulai: aktif.mulai } : null,
      // 5 besar semester lalu; yang belum punya poin tidak ikut ditampilkan.
      sebelumnya: lama && Array.isArray(dataLama)
        ? { nama: lama.nama, selesai: lama.selesai, data: dataLama.filter((a) => Number(a.total) > 0).slice(0, BANYAK_ARSIP) }
        : null
    };
    ingatan = { waktu: Date.now(), hasil };
    return json(res, 200, hasil);
  } catch (error) {
    console.error('Ranking error:', error.message);
    return json(res, 502, { sukses: false, pesan: 'Data peringkat belum dapat dimuat.' });
  }
};
