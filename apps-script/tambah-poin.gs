/**
 * Aksi "tambahPoin" untuk Apps Script spreadsheet poin Coding Skanetra.
 *
 * CARA PAKAI
 *  1. Tempel seluruh isi berkas ini ke proyek Apps Script kamu (berkas baru, mis. tambah-poin.gs).
 *  2. Sesuaikan 4 nilai di KONFIGURASI sesuai spreadsheet-mu.
 *  3. Di doPost(e) yang sudah ada, setelah rahasia (secret) diperiksa, tambahkan:
 *        if (data.action === 'tambahPoin') return jsonKeluar_(tambahPoin_(data));
 *     ("data" = hasil JSON.parse(e.postData.contents); sesuaikan dengan nama variabel di kodemu.
 *      jsonKeluar_ ada di bawah; pakai pembantu milikmu sendiri bila sudah ada.)
 *  4. Deploy > Kelola deployment > Edit > Versi baru > Deploy (URL tetap sama).
 *
 * Penjaga ganda: kunci unik dicatat di sheet "LogTantangan", jadi pengiriman ulang
 * (karena jaringan putus, dsb.) tidak menambah poin dua kali.
 */

var KONFIGURASI = {
  SHEET_POIN: 'Poin',        // nama sheet yang berisi poin per anggota
  KOLOM_ID: 1,               // nomor kolom ID anggota (A = 1)
  KOLOM_POIN: 3,             // nomor kolom total poin (C = 3)
  BARIS_AWAL: 2              // baris pertama data (baris 1 = judul kolom)
};
var SHEET_LOG = 'LogTantangan';   // dibuat otomatis

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
    var log = ss.getSheetByName(SHEET_LOG);
    if (!log) {
      log = ss.insertSheet(SHEET_LOG);
      log.appendRow(['Waktu', 'Kunci', 'ID', 'Poin', 'Alasan']);
    }
    // Sudah pernah masuk? Anggap berhasil (idempoten).
    var jumlah = log.getLastRow();
    if (jumlah > 1) {
      var kunciAda = log.getRange(2, 2, jumlah - 1, 1).getValues();
      for (var i = 0; i < kunciAda.length; i++) {
        if (String(kunciAda[i][0]) === kunci) return { sukses: true, duplikat: true };
      }
    }

    var sheet = ss.getSheetByName(KONFIGURASI.SHEET_POIN);
    if (!sheet) return { sukses: false, pesan: 'Sheet poin tidak ditemukan.' };
    var baris = sheet.getLastRow();
    if (baris < KONFIGURASI.BARIS_AWAL) return { sukses: false, pesan: 'Anggota tidak ditemukan.' };
    var ids = sheet.getRange(KONFIGURASI.BARIS_AWAL, KONFIGURASI.KOLOM_ID, baris - KONFIGURASI.BARIS_AWAL + 1, 1).getValues();
    var target = -1;
    for (var j = 0; j < ids.length; j++) {
      if (String(ids[j][0]).trim() === id) { target = KONFIGURASI.BARIS_AWAL + j; break; }
    }
    if (target < 0) return { sukses: false, pesan: 'ID anggota tidak ada di spreadsheet.' };

    var sel = sheet.getRange(target, KONFIGURASI.KOLOM_POIN);
    sel.setValue((Number(sel.getValue()) || 0) + poin);
    log.appendRow([new Date(), kunci, id, poin, alasan]);
    SpreadsheetApp.flush();
    return { sukses: true };
  } finally {
    kunciSkrip.releaseLock();
  }
}

function jsonKeluar_(objek) {
  return ContentService.createTextOutput(JSON.stringify(objek)).setMimeType(ContentService.MimeType.JSON);
}
