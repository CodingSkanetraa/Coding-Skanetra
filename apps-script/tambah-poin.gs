/**
 * Aksi "tambahPoin" untuk Apps Script Coding Skanetra (versi aman: TIDAK menulis ke sheet "Poin").
 *
 * Poin tantangan hanya dicatat di sheet "LogTantangan" (dibuat otomatis). Peringkat menjumlahkannya
 * lewat poinTantanganPerId_() (lihat PANDUAN: ubah getSemuaRanking satu kali).
 *
 * Pasang:
 *  1. GANTI seluruh isi berkas ini (tambah-poin.gs) dengan kode di bawah.
 *  2. Di doPost, sebelum "Aksi tidak dikenal":
 *       if (action === 'tambahPoin') return jsonOutputCS_(tambahPoin_(body));
 *  3. Deploy > Kelola deployment > pensil > Versi baru > Deploy.
 *
 * Kunci unik dicatat di LogTantangan, jadi kiriman ulang tidak menambah poin dua kali.
 */

var SHEET_LOG = 'LogTantangan';
var SHEET_POIN_ = 'Poin';
var BARIS_AWAL_ = 7;      // baris pertama data di sheet Poin
var KOLOM_ID_ = 1;        // kolom A = ID siswa

function tambahPoin_(data) {
  var id = String(data.id || '').trim();
  var poin = Number(data.poin);
  var kunci = String(data.kunci || '');
  var alasan = String(data.alasan || '');
  if (!id || !kunci || !isFinite(poin) || poin <= 0 || poin > 100) {
    return { sukses: false, pesan: 'Data tidak valid.' };
  }

  var kunciSkrip = LockService.getScriptLock();
  if (!kunciSkrip.tryLock(20000)) return { sukses: false, pesan: 'Sedang sibuk.' };
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // ID harus ada di sheet Poin (hanya dibaca, tidak diubah).
    var sheet = ss.getSheetByName(SHEET_POIN_);
    if (!sheet) return { sukses: false, pesan: 'Sheet Poin tidak ditemukan.' };
    var baris = sheet.getLastRow();
    var ada = false;
    if (baris >= BARIS_AWAL_) {
      var ids = sheet.getRange(BARIS_AWAL_, KOLOM_ID_, baris - BARIS_AWAL_ + 1, 1).getValues();
      for (var j = 0; j < ids.length; j++) {
        if (String(ids[j][0]).trim() === id) { ada = true; break; }
      }
    }
    if (!ada) return { sukses: false, pesan: 'ID anggota tidak ada di spreadsheet.' };

    var log = ss.getSheetByName(SHEET_LOG);
    if (!log) {
      log = ss.insertSheet(SHEET_LOG);
      log.appendRow(['Waktu', 'Kunci', 'ID', 'Poin', 'Alasan']);
    }
    var jumlah = log.getLastRow();
    if (jumlah > 1) {
      var kunciAda = log.getRange(2, 2, jumlah - 1, 1).getValues();
      for (var i = 0; i < kunciAda.length; i++) {
        if (String(kunciAda[i][0]) === kunci) return { sukses: true, duplikat: true };
      }
    }
    log.appendRow([new Date(), kunci, id, poin, alasan]);
    SpreadsheetApp.flush();
    return { sukses: true };
  } finally {
    kunciSkrip.releaseLock();
  }
}

// Jumlah poin tantangan per ID siswa: { 'S001': 3, ... }
function poinTantanganPerId_() {
  var log = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_LOG);
  var hasil = {};
  if (!log || log.getLastRow() < 2) return hasil;
  log.getRange(2, 3, log.getLastRow() - 1, 2).getValues().forEach(function (b) {
    var id = String(b[0]).trim();
    if (id) hasil[id] = (hasil[id] || 0) + (Number(b[1]) || 0);
  });
  return hasil;
}
