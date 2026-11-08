// Mengirim poin Tantangan ke spreadsheet lewat Apps Script (aksi "tambahPoin").
// Idempoten: "kunci" yang sama tidak menambah poin dua kali (Apps Script wajib memeriksanya),
// jadi aman diulang bila balasan sebelumnya hilang di jalan.
'use strict';
const { gasPost, rpcServer } = require('./_security');

// Hasil: { terkirim: boolean, alasan?: 'id_sheet' | 'sheet' }
async function kirimPoinKeSheet({ userId, tantanganId, judul, poin, idSheet }) {
  if (!idSheet) return { terkirim: false, alasan: 'id_sheet' };
  try {
    const hasil = await gasPost({
      action: 'tambahPoin',
      id: idSheet,
      poin,
      alasan: 'Tantangan: ' + String(judul || '').slice(0, 80),
      kunci: 'tantangan:' + tantanganId + ':' + userId
    });
    if (!hasil || hasil.sukses !== true) return { terkirim: false, alasan: 'sheet' };
  } catch (error) {
    console.error('Kirim poin error:', error.message);
    return { terkirim: false, alasan: 'sheet' };
  }
  try {
    await rpcServer('tandai_terkirim', { p_user: userId, p_tantangan: tantanganId });
  } catch (error) {
    // Poin sudah masuk spreadsheet; yang gagal hanya penandaan. Kirim ulang aman karena idempoten.
    console.error('Penandaan terkirim gagal:', error.message);
  }
  return { terkirim: true };
}

const PESAN_BELUM_MASUK = {
  id_sheet: 'Poinmu sudah tercatat, tetapi ID spreadsheet akunmu belum diatur. Hubungi guru agar poin dikirim.',
  sheet: 'Poinmu sudah tercatat, tetapi belum masuk spreadsheet karena gangguan sementara. Guru bisa mengirim ulang.'
};

module.exports = { kirimPoinKeSheet, PESAN_BELUM_MASUK };
