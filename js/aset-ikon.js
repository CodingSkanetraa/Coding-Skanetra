// Daftar aset ikon di halaman Tentang: gambar ikon + nama + pembuatnya.
// Data diisi di assets/data/aset-ikon.json (tanpa menyentuh kode). Gambar diambil dari assets/icon/<berkas>.
(() => {
  "use strict";
  const wadah = document.getElementById("aset-ikon-daftar");
  if (!wadah) return;

  const el = (tag, kelas, teks) => {
    const e = document.createElement(tag);
    if (kelas) e.className = kelas;
    if (teks != null) e.textContent = teks;
    return e;
  };
  const POLA_BERKAS = /^[a-z0-9][a-z0-9._-]{0,60}\.(png|jpe?g|webp|svg|gif)$/i;
  const POLA_TAUTAN = /^https:\/\/[^\s"'<>]+$/;

  function kartu(d) {
    const nama = String(d.nama || d.id || "Ikon");
    const pembuat = String(d.pembuat || "").trim();
    const kelas = String(d.kelas || "").trim();
    const a = el("article", "aset-kartu");

    const gambar = el("div", "aset-gambar");
    gambar.setAttribute("aria-hidden", "true");
    if (POLA_BERKAS.test(String(d.berkas || ""))) {
      const img = new Image();
      img.alt = "";
      img.decoding = "async";
      img.src = "../assets/icon/" + d.berkas;
      img.addEventListener("error", () => { img.remove(); gambar.textContent = nama.charAt(0).toUpperCase(); gambar.classList.add("kosong"); });
      gambar.appendChild(img);
    } else {
      gambar.textContent = nama.charAt(0).toUpperCase();
      gambar.classList.add("kosong");
    }
    a.appendChild(gambar);

    const isi = el("div", "aset-isi");
    isi.appendChild(el("h3", "", "Ikon " + nama));
    const baris = el("p", pembuat ? "aset-pembuat" : "aset-pembuat belum");
    baris.appendChild(el("span", "aset-label", "Dibuat oleh "));
    const nilai = el("strong", "", pembuat || "Belum diisi");
    baris.appendChild(nilai);
    isi.appendChild(baris);
    if (kelas) isi.appendChild(el("p", "aset-kelas", kelas));
    if (POLA_TAUTAN.test(String(d.tautan || ""))) {
      const t = el("a", "aset-tautan", "Lihat sumber");
      t.href = d.tautan;
      t.target = "_blank";
      t.rel = "noopener noreferrer";
      isi.appendChild(t);
    }
    a.appendChild(isi);
    return a;
  }

  fetch("../assets/data/aset-ikon.json", { cache: "no-cache" })
    .then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then((data) => {
      const daftar = Array.isArray(data && data.ikon) ? data.ikon : [];
      wadah.textContent = "";
      if (!daftar.length) { wadah.appendChild(el("p", "aset-kosong", "Daftar aset belum diisi.")); return; }
      daftar.forEach((d) => wadah.appendChild(kartu(d || {})));
    })
    .catch(() => { wadah.textContent = ""; wadah.appendChild(el("p", "aset-kosong", "Daftar aset belum bisa dimuat. Coba muat ulang halaman.")); });
})();
