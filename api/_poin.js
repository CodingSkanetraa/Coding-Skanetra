// Mengirim poin Tantangan ke database poin (fungsi tambah_poin_tantangan, dijaga rahasia penilai).
// Idempoten: "kunci" yang sama tidak menambah poin dua kali (database memeriksanya), jadi
// aman diulang bila balasan sebelumnya hilang di jalan.
'use strict';
const { rpcServer } = require('./_security');

// Hasil: { terkirim: boolean, alasan?: 'id_sheet' | 'sheet' }
// ("sheet" = gagal masuk ke daftar poin; nama kode dipertahankan karena dipakai pemanggil.)
async function kirimPoinKeSheet({ userId, tantanganId, judul, poin, idSheet }) {
  if (!idSheet) return { terkirim: false, alasan: 'id_sheet' };
  try {
    const hasil = await rpcServer('tambah_poin_tantangan', {
      p_id_sheet: idSheet,
      p_poin: poin,
      p_alasan: 'Tantangan: ' + String(judul || '').slice(0, 80),
      p_kunci: 'tantangan:' + tantanganId + ':' + userId
    });
    if (!hasil || hasil.sukses !== true) {
      if (hasil && hasil.pesan) console.error('Poin tantangan ditolak:', hasil.pesan);
      return { terkirim: false, alasan: 'sheet' };
    }
  } catch (error) {
    console.error('Kirim poin error:', error.message);
    return { terkirim: false, alasan: 'sheet' };
  }
  try {
    await rpcServer('tandai_terkirim', { p_user: userId, p_tantangan: tantanganId });
  } catch (error) {
    // Poin sudah masuk; yang gagal hanya penandaan. Kirim ulang aman karena idempoten.
    console.error('Penandaan terkirim gagal:', error.message);
  }
  return { terkirim: true };
}

const PESAN_BELUM_MASUK = {
  id_sheet: 'Poinmu sudah tercatat, tetapi ID anggota akunmu belum diatur. Hubungi guru agar poin dikirim.',
  sheet: 'Poinmu sudah tercatat, tetapi belum masuk ke daftar poin karena gangguan sementara. Guru bisa mengirim ulang.'
};

module.exports = { kirimPoinKeSheet, PESAN_BELUM_MASUK };
