
"use strict";

// ========================================
// 1. KONFIGURASI
// ========================================

const API_URL = "/api/points/ranking";
const RIWAYAT_API_URL = "/api/points/riwayat?id=";

const BATAS_PERINGKAT = 5;

// Data yang sudah berhasil diambil dari server.
let semuaData = [];
let sedangMemuat = false;
let idAnggotaLogin = null;


// ========================================
// 2. REFERENSI ELEMEN HTML
// ========================================

const el = {
  totalAnggota: document.getElementById("totalAnggota"),
  poinTertinggi: document.getElementById("poinTertinggi"),

  topRanking: document.getElementById("topRanking"),
  topEmpty: document.getElementById("topEmpty"),

  showAllButton: document.getElementById("showAllButton"),
  hideAllButton: document.getElementById("hideAllButton"),
  allRankingSection: document.getElementById("allRankingSection"),
  allRanking: document.getElementById("allRanking"),

  searchInput: document.getElementById("searchInput"),
  clearSearchButton: document.getElementById("clearSearchButton"),
  searchResultCount: document.getElementById("searchResultCount"),
  allEmpty: document.getElementById("allEmpty"),

  refreshButton: document.getElementById("refreshButton"),
  retryButton: document.getElementById("retryButton"),

  lastUpdated: document.getElementById("lastUpdated"),
  errorMessage: document.getElementById("errorMessage"),
  
  // Modal detail anggota
  memberModal: document.getElementById("memberModal"),
  closeMemberModal: document.getElementById("closeMemberModal"),
  memberModalTitle: document.getElementById("memberModalTitle"),
  memberIdentity: document.getElementById("memberIdentity"),
  memberId: document.getElementById("memberId"),
  memberClass: document.getElementById("memberClass"),
  memberRank: document.getElementById("memberRank"),
  memberTotal: document.getElementById("memberTotal"),
  historyStatus: document.getElementById("historyStatus"),
  memberHistory: document.getElementById("memberHistory")

};


// ========================================
// 3. FUNGSI BANTUAN
// ========================================

// Membuat elemen HTML tanpa memasukkan
// nama anggota sebagai kode HTML.
function buatElemen(tag, className, teks) {
  const elemen = document.createElement(tag);

  if (className) {
    elemen.className = className;
  }

  if (teks !== undefined && teks !== null) {
    elemen.textContent = String(teks);
  }

  return elemen;
}


// Format angka dengan pemisah ribuan Indonesia.
function formatAngka(nilai) {
  return Number(nilai || 0).toLocaleString("id-ID");
}


// Memastikan nilai poin berupa angka.
function ambilPoin(anggota) {
  const poin = Number(anggota.total);

  return Number.isFinite(poin) ? poin : 0;
}


// Menentukan nomor peringkat.
// Gunakan nomor dari server jika valid.
function ambilPeringkat(anggota, indeks) {
  const ranking = Number(anggota.ranking);

  return Number.isInteger(ranking) && ranking > 0
    ? ranking
    : indeks + 1;
}


// Membuat kartu anggota untuk daftar lima besar.

function kelasMedali(peringkat) {
  if (peringkat === 1) return "rank-gold";
  if (peringkat === 2) return "rank-silver";
  if (peringkat === 3) return "rank-bronze";
  return "";
}


function buatKartuPeringkat(anggota, indeks) {
  const peringkat = ambilPeringkat(anggota, indeks);
  const medali = kelasMedali(peringkat);

  const kartu = buatElemen(
    "article",
    ["ranking-item", medali].filter(Boolean).join(" ")
  );

  kartu.dataset.memberId = String(anggota.id);
  kartu.tabIndex = 0;
  kartu.setAttribute("role", "button");
  kartu.setAttribute(
    "aria-label",
    `Lihat detail ${anggota.nama || "anggota"}, peringkat ${peringkat}`
  );

  const nomor = buatElemen(
    "div",
    "rank-number rank-medal",
    peringkat <= 3
      ? ["🥇", "🥈", "🥉"][peringkat - 1]
      : String(peringkat).padStart(2, "0")
  );

  const info = buatElemen("div", "member-info");

  const nama = buatElemen(
    "h3",
    "member-name",
    anggota.nama || "Nama tidak tersedia"
  );

  const meta = buatElemen("div", "member-meta");

  meta.append(
    buatElemen("span", "member-id", anggota.id || "Tanpa ID"),
    buatElemen("span", "member-class", anggota.kelas || "Kelas tidak tersedia")
  );

  info.append(nama, meta);

  const poin = buatElemen("div", "member-points");

  poin.append(
    document.createTextNode(formatAngka(ambilPoin(anggota))),
    buatElemen("small", "", "poin")
  );

  kartu.append(nomor, info, poin);

  return kartu;
}



// ========================================
// 4. TAMPILAN LOADING DAN ERROR
// ========================================

function tampilkanLoading() {
  el.topRanking.replaceChildren();

  const loading = buatElemen("div", "loading-state");

  loading.append(
    buatElemen("span", "loading-spinner"),
    buatElemen("p", "", "Memuat peringkat...")
  );

  el.topRanking.append(loading);

  el.errorMessage.hidden = true;
  el.topEmpty.hidden = true;

  el.refreshButton.classList.add("is-loading");
  el.refreshButton.disabled = true;
}


function sembunyikanLoading() {
  el.refreshButton.classList.remove("is-loading");
  el.refreshButton.disabled = false;
}


function tampilkanError(pesan) {
  el.errorMessage.hidden = false;

  // Pesan error ditampilkan sebagai teks biasa.
  const paragraf = el.errorMessage.querySelector("p");

  if (paragraf) {
    paragraf.textContent = pesan;
  }
}


// ========================================
// 5. MENGAMBIL DATA DARI APPS SCRIPT
// ========================================

async function muatPeringkat() {
    // Jangan memuat ranking sebelum sesi terverifikasi.
  if (idAnggotaLogin === null) return;
  // Hindari beberapa permintaan bersamaan.
  if (sedangMemuat) return;

  sedangMemuat = true;
  tampilkanLoading();

  try {
    const respons = await fetch(API_URL, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store"
    });

    if (!respons.ok) {
      throw new Error(
        `Server mengembalikan status HTTP ${respons.status}.`
      );
    }

    const hasil = await respons.json();

    if (hasil.sukses !== true || !Array.isArray(hasil.data)) {
      throw new Error(
        "Format JSON tidak sesuai. Periksa respons Apps Script."
      );
    }

    // Simpan data dari server.
    // Urutkan berdasarkan total poin tertinggi.
    semuaData = hasil.data
      .filter(anggota =>
        anggota &&
        anggota.id != null &&
        anggota.nama != null &&
        anggota.total !== "" &&
        Number.isFinite(Number(anggota.total))
      )
      .slice()
      .sort((a, b) => ambilPoin(b) - ambilPoin(a))
      .map((anggota, indeks) => ({
        ...anggota,
        ranking: indeks + 1
      }));

    // Perbarui semua bagian halaman.
    tampilkanRingkasan();
    tampilkanLimaBesar();
    tampilkanDaftarLengkap();

    // Catat waktu pembaruan.
    el.lastUpdated.textContent =
      "Diperbarui " +
      new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit"
      });

    el.errorMessage.hidden = true;

  } catch (error) {
    console.error("Gagal memuat peringkat:", error);

    // Jangan menghapus data lama yang sudah berhasil dimuat.
    // Jika belum ada data, tampilkan pesan error.
    if (semuaData.length === 0) {
      el.topRanking.replaceChildren();
      el.topEmpty.hidden = true;

      tampilkanError(
        "Peringkat gagal dimuat. Periksa koneksi atau akses API."
      );
    } else {
      tampilkanError(
        "Pembaruan gagal. Data yang tampil masih data sebelumnya."
      );

      tampilkanLimaBesar();
      tampilkanDaftarLengkap();
    }

  } finally {
    sedangMemuat = false;
    sembunyikanLoading();
  }
}


// ========================================
// 6. RINGKASAN ANGGOTA
// ========================================

function tampilkanRingkasan() {
  el.totalAnggota.textContent = formatAngka(semuaData.length);

  const poinTertinggi = semuaData.length > 0
    ? ambilPoin(semuaData[0])
    : 0;

  el.poinTertinggi.textContent = formatAngka(poinTertinggi);
}


// ========================================
// 7. MENAMPILKAN LIMA BESAR
// ========================================

function tampilkanLimaBesar() {
  el.topRanking.replaceChildren();

  if (semuaData.length === 0) {
    el.topEmpty.hidden = false;
    el.showAllButton.hidden = true;
    return;
  }

  el.topEmpty.hidden = true;

  const limaBesar = semuaData.slice(0, BATAS_PERINGKAT);

  limaBesar.forEach((anggota, indeks) => {
    el.topRanking.append(
      buatKartuPeringkat(anggota, indeks)
    );
  });

  // Tombol hanya muncul jika ada anggota
  // di luar lima besar.
  el.showAllButton.hidden =
    semuaData.length <= BATAS_PERINGKAT;
}


// ========================================
// 8. MENAMPILKAN TABEL LENGKAP
// ========================================


function buatBarisTabel(anggota, indeks) {
  const baris = document.createElement("tr");
  const peringkat = ambilPeringkat(anggota, indeks);
  const medali = kelasMedali(peringkat);

  baris.dataset.memberId = String(anggota.id);
  baris.tabIndex = 0;
  baris.setAttribute("role", "button");
  baris.setAttribute(
    "aria-label",
    `Lihat detail ${anggota.nama || "anggota"}, peringkat ${peringkat}`
  );

  if (medali) {
    baris.classList.add(medali);
  }

  const nilai = [
    peringkat <= 3
      ? `${["🥇", "🥈", "🥉"][peringkat - 1]} ${peringkat}`
      : peringkat,
    anggota.nama || "Nama tidak tersedia",
    anggota.kelas || "—",
    formatAngka(ambilPoin(anggota))
  ];

  nilai.forEach((isi, kolom) => {
    const sel = buatElemen("td", "", isi);

    if (kolom === 1) {
      sel.title = String(anggota.id || "");
    }

    baris.append(sel);
  });

  return baris;
}



function tampilkanDaftarLengkap() {
  const kataKunci = el.searchInput.value
    .trim()
    .toLocaleLowerCase("id-ID");

  // Filter berdasarkan nama, ID, atau kelas.
  const hasilFilter = semuaData.filter(anggota => {
    const nama = String(anggota.nama || "")
      .toLocaleLowerCase("id-ID");

    const id = String(anggota.id || "")
      .toLocaleLowerCase("id-ID");

    const kelas = String(anggota.kelas || "")
      .toLocaleLowerCase("id-ID");

    return (
      nama.includes(kataKunci) ||
      id.includes(kataKunci) ||
      kelas.includes(kataKunci)
    );
  });

  el.allRanking.replaceChildren();

  hasilFilter.forEach((anggota, indeks) => {
    el.allRanking.append(
      buatBarisTabel(anggota, indeks)
    );
  });

  el.allEmpty.hidden = hasilFilter.length !== 0;

  if (hasilFilter.length === 0) {
    const baris = document.createElement("tr");
    const sel = buatElemen(
      "td",
      "table-message",
      kataKunci
        ? "Tidak ada anggota yang cocok dengan pencarian."
        : "Belum ada data peringkat."
    );

    sel.colSpan = 4;
    baris.append(sel);
    el.allRanking.append(baris);
  }

  el.searchResultCount.textContent =
    `${formatAngka(hasilFilter.length)} anggota ditemukan`;

  el.clearSearchButton.hidden = kataKunci.length === 0;
}

/* ========================================
   MODAL DETAIL ANGGOTA
======================================== */

// Mengisi identitas anggota pada modal.
function tampilkanIdentitasAnggota(anggota) {
  el.memberModalTitle.textContent =
    anggota.nama || "Nama tidak tersedia";

  el.memberIdentity.textContent =
    `${anggota.id || "Tanpa ID"} · ${anggota.kelas || "Kelas tidak tersedia"}`;

  el.memberId.textContent = anggota.id || "—";
  el.memberClass.textContent = anggota.kelas || "—";
  el.memberRank.textContent = `#${ambilPeringkat(anggota, 0)}`;
  el.memberTotal.textContent =
    `${formatAngka(ambilPoin(anggota))} poin`;
}


// Menampilkan riwayat poin sebagai elemen teks yang aman.
function tampilkanRiwayat(riwayat) {
  el.memberHistory.replaceChildren();

  if (!Array.isArray(riwayat) || riwayat.length === 0) {
    el.historyStatus.textContent =
      "Belum ada riwayat poin untuk anggota ini.";
    return;
  }

  el.historyStatus.textContent =
    `${formatAngka(riwayat.length)} catatan riwayat`;

  riwayat.forEach(item => {
    const baris = buatElemen("div", "member-history__item");

    const tanggal = buatElemen(
      "span",
      "member-history__date",
      item.tanggal || "Tanggal tidak tersedia"
    );

    const poin = Number(item.poin);
    const teksPoin = Number.isFinite(poin)
      ? `${formatAngka(poin)} poin`
      : `${item.poin ?? 0} poin`;

    const nilai = buatElemen(
      "span",
      "member-history__points",
      teksPoin
    );

    baris.append(tanggal, nilai);
    el.memberHistory.append(baris);
  });
}


// Mengambil detail dan riwayat berdasarkan ID anggota.

async function bukaDetailAnggota(id) {
  if (!id) return;

  const anggota = semuaData.find(
    item => String(item.id) === String(id)
  );

  if (!anggota) {
    console.warn("Anggota tidak ditemukan:", id);
    return;
  }

  tampilkanIdentitasAnggota(anggota);

  el.memberHistory.replaceChildren();

  if (!el.memberModal.open) {
    el.memberModal.showModal();
  }

  // Riwayat hanya boleh diminta untuk akun yang sedang login.
  if (idAnggotaLogin === null) {
    el.historyStatus.textContent =
      "Sesi belum terverifikasi. Muat ulang halaman.";
    return;
  }

  if (String(id) !== idAnggotaLogin) {
    el.historyStatus.textContent =
      "Riwayat poin hanya tersedia untuk akunmu sendiri.";
    return;
  }

  el.historyStatus.textContent = "Memuat riwayat poin...";

  try {
    const respons = await fetch(
      RIWAYAT_API_URL + encodeURIComponent(idAnggotaLogin),
      {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store"
      }
    );

    if (!respons.ok) {
      throw new Error(`HTTP ${respons.status}`);
    }

    const hasil = await respons.json();

    if (hasil.sukses !== true || !hasil.data) {
      throw new Error(
        hasil.pesan || "Respons riwayat tidak valid."
      );
    }

    const detail = hasil.data;

    tampilkanIdentitasAnggota({
      ...detail,
      ranking: detail.ranking ?? anggota.ranking
    });

    tampilkanRiwayat(detail.riwayat);
  } catch (error) {
    console.error("Gagal memuat riwayat anggota:", error);

    el.historyStatus.textContent =
      "Riwayat gagal dimuat. Periksa koneksi lalu coba lagi.";
  }
}



// Klik kartu anggota di lima besar.
el.topRanking.addEventListener("click", event => {
  const kartu = event.target.closest("[data-member-id]");

  if (!kartu || !el.topRanking.contains(kartu)) return;

  bukaDetailAnggota(kartu.dataset.memberId);
});


// Klik baris anggota di tabel.
el.allRanking.addEventListener("click", event => {
  const baris = event.target.closest("tr[data-member-id]");

  if (!baris || !el.allRanking.contains(baris)) return;

  bukaDetailAnggota(baris.dataset.memberId);
});


// Dukungan keyboard: Enter atau Spasi untuk membuka detail.
function aktifkanDenganKeyboard(event) {
  if (event.key !== "Enter" && event.key !== " ") return;

  const target = event.target.closest("[data-member-id]");
  if (!target) return;

  event.preventDefault();
  bukaDetailAnggota(target.dataset.memberId);
}

el.topRanking.addEventListener("keydown", aktifkanDenganKeyboard);
el.allRanking.addEventListener("keydown", aktifkanDenganKeyboard);


// Tutup melalui tombol X.
el.closeMemberModal.addEventListener("click", () => {
  el.memberModal.close();
});


// Tutup ketika pengguna mengeklik backdrop di luar panel.
el.memberModal.addEventListener("click", event => {
  if (event.target === el.memberModal) {
    el.memberModal.close();
  }
});


// ========================================
// 9. EVENT TOMBOL DAN PENCARIAN
// ========================================

// Buka daftar lengkap.
el.showAllButton.addEventListener("click", () => {
  el.allRankingSection.hidden = false;

  tampilkanDaftarLengkap();

  el.allRankingSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
});


// Tutup daftar lengkap.
el.hideAllButton.addEventListener("click", () => {
  el.allRankingSection.hidden = true;

  el.showAllButton.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
});


// Cari anggota saat pengguna mengetik.
el.searchInput.addEventListener("input", () => {
  tampilkanDaftarLengkap();
});


// Kosongkan pencarian.
el.clearSearchButton.addEventListener("click", () => {
  el.searchInput.value = "";
  tampilkanDaftarLengkap();
  el.searchInput.focus();
});


// Muat ulang dari Apps Script.
el.refreshButton.addEventListener("click", muatPeringkat);


// Coba lagi setelah error.
el.retryButton.addEventListener("click", muatPeringkat);


// ========================================
// 10. JALANKAN SAAT HALAMAN DIBUKA
// ========================================

// Pastikan sesi valid sebelum meminta data ranking.
(async function pastikanSesi() {
  try {
    const response = await fetch("/api/auth/me", {
      cache: "no-store",
      credentials: "same-origin"
    });

    if (!response.ok) {
      window.location.replace("/pages/login.html?next=peringkat");
      return;
    }

    const hasil = await response.json();

    if (
      hasil.sukses !== true ||
      !hasil.data ||
      !hasil.data.id
    ) {
      window.location.replace("/pages/login.html?next=peringkat");
      return;
    }

    // Simpan ID akun yang sedang login.
    idAnggotaLogin = String(hasil.data.id);

    // Ranking baru dimuat setelah sesi terverifikasi.
    muatPeringkat();
  } catch (error) {
    tampilkanError(
      "Tidak dapat memeriksa sesi. Periksa koneksi lalu muat ulang."
    );
  }
})();

const logoutButton = document.getElementById("logoutButton");

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    const yakin = window.confirm("Yakin ingin keluar dari akunmu?");
    if (!yakin) return;

    logoutButton.disabled = true;
    logoutButton.textContent = "Keluar...";

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Gagal keluar.");
      }

      window.location.replace("/pages/login.html");
    } catch (error) {
      window.alert("Gagal keluar. Periksa koneksi lalu coba lagi.");
      logoutButton.disabled = false;
      logoutButton.textContent = "Keluar";
    }
  });
}
