// Penggabungan 3 arah per baris untuk editor kelompok.
//   gabung3(dasar, milikku, punyaTeman) -> { teks, tumpang }
//
// Dasar = versi terakhir yang browser ini ambil dari server. Milikku = isi editor sekarang.
// PunyaTeman = versi terbaru di server. Perubahan di baris yang berbeda digabung otomatis.
// Bila dua orang mengubah baris yang sama dengan isi berbeda, yang dipakai adalah MILIKKU
// (tumpang = true); versi teman tetap ada di Riwayat. Dua orang menambah baris baru di titik
// yang sama: keduanya dipertahankan (punya teman dulu).
(function (akar) {
  "use strict";

  const BATAS_SEL = 25000000; // batas ukuran tabel LCS; di atasnya satu blok dianggap berubah seluruhnya

  // Daftar blok yang berubah antara a dan b: { aMulai, aPanjang, bMulai, bPanjang }.
  function bedaBaris(a, b) {
    let awal = 0;
    const maks = Math.min(a.length, b.length);
    while (awal < maks && a[awal] === b[awal]) awal++;
    let akhirA = a.length;
    let akhirB = b.length;
    while (akhirA > awal && akhirB > awal && a[akhirA - 1] === b[akhirB - 1]) { akhirA--; akhirB--; }

    const n = akhirA - awal;
    const m = akhirB - awal;
    if (n === 0 && m === 0) return [];
    if (n === 0 || m === 0 || n * m > BATAS_SEL) {
      return [{ aMulai: awal, aPanjang: n, bMulai: awal, bPanjang: m }];
    }

    // LCS pada bagian tengah saja. t[i][j] = panjang LCS a[awal+i..] dan b[awal+j..].
    const lebar = m + 1;
    const t = new Uint32Array((n + 1) * lebar);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        t[i * lebar + j] = a[awal + i] === b[awal + j]
          ? t[(i + 1) * lebar + j + 1] + 1
          : Math.max(t[(i + 1) * lebar + j], t[i * lebar + j + 1]);
      }
    }

    const hasil = [];
    let i = 0;
    let j = 0;
    let buka = null;
    const tutup = () => { if (buka) { hasil.push(buka); buka = null; } };
    while (i < n || j < m) {
      if (i < n && j < m && a[awal + i] === b[awal + j]) {
        tutup();
        i++; j++;
      } else {
        if (!buka) buka = { aMulai: awal + i, aPanjang: 0, bMulai: awal + j, bPanjang: 0 };
        if (j < m && (i >= n || t[i * lebar + j + 1] >= t[(i + 1) * lebar + j])) { buka.bPanjang++; j++; }
        else { buka.aPanjang++; i++; }
      }
    }
    tutup();
    return hasil;
  }

  function gabung3(dasarTeks, milikkuTeks, temanTeks) {
    dasarTeks = String(dasarTeks == null ? "" : dasarTeks);
    milikkuTeks = String(milikkuTeks == null ? "" : milikkuTeks);
    temanTeks = String(temanTeks == null ? "" : temanTeks);
    if (milikkuTeks === temanTeks) return { teks: milikkuTeks, tumpang: false };
    if (milikkuTeks === dasarTeks) return { teks: temanTeks, tumpang: false };
    if (temanTeks === dasarTeks) return { teks: milikkuTeks, tumpang: false };

    const dasar = dasarTeks.split("\n");
    const milikku = milikkuTeks.split("\n");
    const teman = temanTeks.split("\n");

    const blok = [];
    bedaBaris(dasar, milikku).forEach((h) => blok.push(Object.assign({ sisi: 0 }, h)));
    bedaBaris(dasar, teman).forEach((h) => blok.push(Object.assign({ sisi: 1 }, h)));
    // Urut menurut letak di dasar; penyisipan (panjang 0) lebih dulu daripada penggantian di titik yang sama.
    blok.sort((x, y) => (x.aMulai - y.aMulai) || (x.aPanjang - y.aPanjang) || (x.sisi - y.sisi));

    const sumber = [milikku, teman];
    const keluar = [];
    let tumpang = false;
    let kursor = 0; // baris dasar yang sudah dipindahkan ke keluar

    // Teks sisi s untuk rentang dasar [dari, sampai), dengan semua blok sisi itu dalam kelompok.
    const teksSisi = (kelompok, s, dari, sampai) => {
      const hasil = [];
      let k = dari;
      kelompok.filter((h) => h.sisi === s).forEach((h) => {
        for (; k < h.aMulai; k++) hasil.push(dasar[k]);
        for (let x = 0; x < h.bPanjang; x++) hasil.push(sumber[s][h.bMulai + x]);
        k = h.aMulai + h.aPanjang;
      });
      for (; k < sampai; k++) hasil.push(dasar[k]);
      return hasil;
    };

    let i = 0;
    while (i < blok.length) {
      const kelompok = [blok[i]];
      let sampai = blok[i].aMulai + blok[i].aPanjang;
      const dari = blok[i].aMulai;
      let j = i + 1;
      while (j < blok.length) {
        const h = blok[j];
        const bertabrakan = h.aMulai < sampai ||
          (h.aMulai === sampai && h.aPanjang === 0 && kelompok[kelompok.length - 1].aPanjang === 0 && h.aMulai === dari);
        if (!bertabrakan) break;
        kelompok.push(h);
        sampai = Math.max(sampai, h.aMulai + h.aPanjang);
        j++;
      }
      i = j;

      for (; kursor < dari; kursor++) keluar.push(dasar[kursor]);

      const adaMilikku = kelompok.some((h) => h.sisi === 0);
      const adaTeman = kelompok.some((h) => h.sisi === 1);
      let isi;
      if (adaMilikku && !adaTeman) isi = teksSisi(kelompok, 0, dari, sampai);
      else if (adaTeman && !adaMilikku) isi = teksSisi(kelompok, 1, dari, sampai);
      else {
        const a = teksSisi(kelompok, 0, dari, sampai);
        const b = teksSisi(kelompok, 1, dari, sampai);
        if (a.join("\n") === b.join("\n")) isi = a;
        else if (kelompok.every((h) => h.aPanjang === 0)) isi = b.concat(a); // sama-sama menyisipkan baris baru di titik yang sama
        else { isi = a; tumpang = true; }
      }
      for (let x = 0; x < isi.length; x++) keluar.push(isi[x]);
      kursor = sampai;
    }
    for (; kursor < dasar.length; kursor++) keluar.push(dasar[kursor]);

    return { teks: keluar.join("\n"), tumpang };
  }

  const api = { gabung3, bedaBaris };
  if (typeof module === "object" && module.exports) module.exports = api;
  else akar.CSGabung = api;
})(typeof window !== "undefined" ? window : globalThis);
