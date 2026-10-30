/* Alat bersama untuk editor Python, C++, dan HTML:
   - Bagikan: kode dikemas ke dalam tautan, jadi cukup kirim linknya ke guru/admin/teman.
   - Mode fokus: sembunyikan semua selain editor dan output (nyaman di HP).
   Isi tautan ada di bagian setelah "#", yang tidak pernah dikirim ke server. */
(() => {
  const AWAL = "#bagikan=";
  const BATAS_PERINGATAN = 3500;   // panjang tautan yang mulai berisiko terpotong di aplikasi chat
  const BATAS_MAKS = 16000;
  const NAMA_KUNCI = "cs-nama-bagikan";

  /* ---------- Pengemasan ---------- */
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  const keB64 = (bytes) => {
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  const dariB64 = (teks) => {
    const b = atob(teks.replace(/-/g, "+").replace(/_/g, "/"));
    const out = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
    return out;
  };
  const alir = async (bytes, Kelas, format) => {
    const s = new Kelas(format);
    const w = s.writable.getWriter();
    w.write(bytes).catch(() => {});
    w.close().catch(() => {});
    return new Uint8Array(await new Response(s.readable).arrayBuffer());
  };

  async function kemas(objek) {
    const mentah = enc.encode(JSON.stringify(objek));
    if (typeof CompressionStream === "function") {
      try { return "z" + keB64(await alir(mentah, CompressionStream, "deflate-raw")); } catch (e) { /* lanjut tanpa kompresi */ }
    }
    return "p" + keB64(mentah);
  }

  async function bongkar(teks) {
    const jenis = teks[0];
    const bytes = dariB64(teks.slice(1));
    let mentah = bytes;
    if (jenis === "z") {
      if (typeof DecompressionStream !== "function") throw new Error("browser-lama");
      mentah = await alir(bytes, DecompressionStream, "deflate-raw");
    } else if (jenis !== "p") {
      throw new Error("format");
    }
    const objek = JSON.parse(dec.decode(mentah));
    if (!objek || typeof objek !== "object") throw new Error("format");
    return objek;
  }

  /* ---------- Membaca tautan masuk ---------- */
  let masuk = null; // Promise hasil bongkar, bila halaman dibuka dari tautan bagikan
  if (location.hash.startsWith(AWAL)) {
    const isi = location.hash.slice(AWAL.length);
    masuk = isi.length > 400000 ? Promise.reject(new Error("besar")) : bongkar(isi);
    masuk.catch(() => {});
  }

  /* ---------- Antarmuka ---------- */
  const el = (tag, kelas, teks) => {
    const e = document.createElement(tag);
    if (kelas) e.className = kelas;
    if (teks !== undefined) e.textContent = teks;
    return e;
  };

  function tampilBanner(adapter, pesan, jenis) {
    const lama = document.querySelector(".alat-banner");
    if (lama) lama.remove();
    const b = el("div", "alat-banner" + (jenis ? " " + jenis : ""));
    b.setAttribute("role", "status");
    b.appendChild(el("span", "", pesan));
    const tutup = el("button", "alat-banner-tutup", "Tutup");
    tutup.type = "button";
    tutup.addEventListener("click", () => b.remove());
    b.appendChild(tutup);
    const target = document.querySelector(".py-editor-layout, .playground-workspace");
    if (target) target.insertAdjacentElement("beforebegin", b); else document.body.prepend(b);
  }

  function bacaNama() { try { return localStorage.getItem(NAMA_KUNCI) || ""; } catch (e) { return ""; } }
  function simpanNama(n) { try { localStorage.setItem(NAMA_KUNCI, n); } catch (e) { /* abaikan */ } }

  // Tautan pendek (database, berlaku 7 hari): kode 12 karakter hex di bagian setelah "#b=".
  const AWAL_DB = "#b=";
  const POLA_KODE_DB = /^[0-9a-f]{12}$/;
  const HALAMAN_EDITOR = { web: "editor-html.html", py: "editor-python.html", cpp: "editor-cpp.html" };

  const waktuSingkat = (iso) => {
    try {
      return new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch (e) { return ""; }
  };

  function pesanBuat(res) {
    const d = res && res.data && typeof res.data === "object" ? res.data : {};
    const teks = String(d.message || "");
    if (res.status === 401 || res.status === 403) return "Sesi berakhir. Masuk lagi, lalu coba lagi.";
    if (teks.includes("Batas 20")) return "Batas 20 tautan aktif tercapai. Hapus tautan lama di halaman Profil.";
    if (d.code === "23514") return "Kodemu terlalu besar untuk tautan pendek (maksimal sekitar 100 KB). Pakai tautan panjang atau tombol Unduh.";
    return "Tautan belum bisa dibuat. Periksa internet lalu coba lagi.";
  }

  async function bagikanDialog(adapter, tombolAsal) {
    let dialog = document.querySelector("#alat-dialog");
    if (dialog) dialog.remove();
    dialog = el("dialog", "alat-dialog");
    dialog.id = "alat-dialog";
    const akun = window.CodingSkanetraAkun;
    const login = Boolean(akun && akun.tersedia && akun.pengguna());

    dialog.appendChild(el("h2", "", "Bagikan kode"));
    const info = el("p", "alat-info");
    dialog.appendChild(info);
    if (!login && akun && akun.tersedia) {
      const halaman = (location.pathname.split("/").pop() || "").replace(/\.html$/, "");
      const ajak = el("p", "alat-info");
      const a = el("a", "", "Masuk");
      a.href = "login.html" + (/^[a-z0-9-]{1,40}$/.test(halaman) ? "?next=" + halaman : "");
      ajak.append(a, document.createTextNode(" untuk membuat tautan pendek yang berlaku 7 hari."));
      dialog.appendChild(ajak);
    }

    const labelNama = el("label", "", "Nama / kelas (boleh dikosongkan)");
    labelNama.htmlFor = "alat-nama";
    const nama = el("input"); nama.id = "alat-nama"; nama.type = "text"; nama.maxLength = 40;
    nama.placeholder = "Contoh: Kaito, XI RPL 1"; nama.value = bacaNama(); nama.autocomplete = "name";
    const labelLink = el("label", "", "Tautan");
    labelLink.htmlFor = "alat-link";
    const link = el("textarea"); link.id = "alat-link"; link.readOnly = true; link.rows = 3;
    const catatan = el("p", "alat-catatan");
    catatan.setAttribute("role", "status");
    const aksi = el("div", "alat-aksi");
    const buat = el("button", "btn btn-primary", "Buat tautan pendek"); buat.type = "button";
    const salin = el("button", "btn btn-primary", "📋 Salin tautan"); salin.type = "button";
    const beralih = el("button", "py-btn-secondary", ""); beralih.type = "button";
    const tutup = el("button", "py-btn-secondary", "Tutup"); tutup.type = "button";
    aksi.append(buat, salin, beralih, tutup);
    dialog.append(labelNama, nama, labelLink, link, catatan, aksi);
    document.body.appendChild(dialog);

    let mode = login ? "pendek" : "panjang";
    let pendek = null; // { tautan, sampai } setelah tautan pendek dibuat
    let membuat = false;
    let versi = 0;

    const susunPanjang = async (ini) => {
      const data = adapter.ambil();
      const objek = { j: adapter.jenis, d: data };
      const n = nama.value.trim();
      if (n) objek.n = n;
      const tautan = location.origin + location.pathname + AWAL + (await kemas(objek));
      if (ini !== versi) return;
      link.value = tautan;
      const terlalu = tautan.length > BATAS_MAKS;
      salin.disabled = terlalu;
      catatan.className = "alat-catatan" + (terlalu || tautan.length > BATAS_PERINGATAN ? " peringatan" : "");
      catatan.textContent = terlalu
        ? "Kodemu terlalu panjang untuk dikirim lewat tautan. Pakai tombol Unduh lalu kirim filenya."
        : tautan.length > BATAS_PERINGATAN
          ? "Tautannya cukup panjang. Kalau terpotong di aplikasi chat, kirim lewat file (tombol Unduh)."
          : "Tautan siap dikirim. Kodemu belum berubah, ini hanya salinan.";
    };

    const tampil = async () => {
      const ini = ++versi;
      const pendekAktif = mode === "pendek";
      buat.hidden = !pendekAktif;
      beralih.hidden = !login;
      beralih.textContent = pendekAktif ? "Pakai tautan panjang" : "Pakai tautan pendek (7 hari)";
      if (pendekAktif) {
        info.textContent = "Tautan pendek berlaku 7 hari, lalu kedaluwarsa otomatis. Salinan kodemu disimpan di server selama itu dan bisa dibuka siapa pun yang punya tautannya.";
        nama.disabled = Boolean(pendek);
        link.value = pendek ? pendek.tautan : "";
        link.placeholder = "Tekan “Buat tautan pendek”.";
        salin.disabled = !pendek;
        buat.textContent = pendek ? "Buat tautan lain" : "Buat tautan pendek";
        catatan.className = "alat-catatan";
        catatan.textContent = pendek
          ? "Berlaku sampai " + waktuSingkat(pendek.sampai) + ". Kodemu belum berubah, ini salinan. Tautan bisa dihapus lebih awal di halaman Profil."
          : "";
      } else {
        info.textContent = "Tautan ini berisi kodemu langsung (tidak lewat server), jadi tidak kedaluwarsa tetapi panjang. Kirim ke guru, admin, atau teman. Saat dibuka, kodemu langsung muncul di editor.";
        nama.disabled = false;
        link.placeholder = "";
        await susunPanjang(ini);
      }
    };

    nama.addEventListener("input", () => { simpanNama(nama.value.trim()); if (mode === "panjang") tampil(); });
    beralih.addEventListener("click", () => { mode = mode === "pendek" ? "panjang" : "pendek"; tampil(); });

    buat.addEventListener("click", async () => {
      if (pendek) { pendek = null; tampil(); nama.focus(); return; }
      if (membuat) return;
      membuat = true; buat.disabled = true;
      catatan.className = "alat-catatan";
      catatan.textContent = "Membuat tautan…";
      try {
        const res = await akun.minta("/rest/v1/rpc/buat_bagikan", {
          metode: "POST",
          body: { p_jenis: adapter.jenis, p_isi: adapter.ambil(), p_nama: nama.value.trim() || null }
        });
        if (!res.ok) throw new Error(pesanBuat(res));
        const baris = Array.isArray(res.data) ? res.data[0] : res.data;
        if (!baris || !POLA_KODE_DB.test(String(baris.kode))) throw new Error("Tautan belum bisa dibuat. Coba lagi.");
        pendek = { tautan: location.origin + location.pathname + AWAL_DB + baris.kode, sampai: baris.kedaluwarsa };
        adapter.beritahu("Tautan pendek dibuat. Berlaku 7 hari.");
      } catch (e) {
        pendek = null;
        await tampil();
        catatan.className = "alat-catatan peringatan";
        catatan.textContent = (e && e.message) || "Tautan belum bisa dibuat. Coba lagi.";
        membuat = false; buat.disabled = false;
        return;
      }
      membuat = false; buat.disabled = false;
      await tampil();
      salin.focus();
    });

    salin.addEventListener("click", async () => {
      let berhasil = false;
      try { await navigator.clipboard.writeText(link.value); berhasil = true; } catch (e) {
        link.focus(); link.select();
        try { berhasil = document.execCommand("copy"); } catch (e2) { berhasil = false; }
      }
      salin.textContent = berhasil ? "✓ Tersalin" : "Tekan Ctrl + C untuk menyalin";
      if (berhasil) adapter.beritahu("Tautan disalin. Tinggal kirim ke admin!");
      window.setTimeout(() => { salin.textContent = "📋 Salin tautan"; }, 2200);
    });
    link.addEventListener("focus", () => link.select());
    tutup.addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => { dialog.remove(); if (tombolAsal) tombolAsal.focus(); });
    dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
    await tampil();
    if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", "");
    (login && !pendek ? buat : nama).focus();
  }

  /* ---------- Mode fokus ---------- */
  let keluarFokus = null;
  function setFokus(aktif, tombol) {
    const root = document.documentElement;
    root.classList.toggle("mode-fokus", aktif);
    if (tombol) {
      tombol.setAttribute("aria-pressed", String(aktif));
      if (window.CodingSkanetraIkon) window.CodingSkanetraIkon.isiTombol(tombol, aktif ? "tutup" : "fokus", aktif ? "Keluar fokus" : "Mode fokus");
      else tombol.textContent = aktif ? "✕ Keluar fokus" : "🎯 Mode fokus";
    }
    if (aktif && !keluarFokus) {
      keluarFokus = el("button", "alat-keluar-fokus", "✕ Keluar mode fokus");
      keluarFokus.type = "button";
      keluarFokus.addEventListener("click", () => setFokus(false, tombol));
      document.body.appendChild(keluarFokus);
    } else if (!aktif && keluarFokus) {
      keluarFokus.remove(); keluarFokus = null;
    }
    window.scrollTo(0, 0);
    window.setTimeout(() => {
      document.querySelectorAll(".CodeMirror").forEach((cm) => { if (cm.CodeMirror) cm.CodeMirror.refresh(); });
      window.dispatchEvent(new Event("resize"));
    }, 60);
  }

  /* ---------- Pendaftaran editor ---------- */
  // adapter: { jenis, ambil(), terapkan(data), beritahu(teks), tombolSimpan }
  async function daftar(adapter) {
    const simpan = adapter.tombolSimpan;
    if (!simpan) return;

    const I = window.CodingSkanetraIkon;
    const dasar = simpan.className.replace(/\b(is-dirty|is-saved|tb-ikon-saja|tb-btn)\b/g, "").replace(/\s+/g, " ").trim();
    const bagikan = el("button", dasar);
    bagikan.type = "button";
    bagikan.title = "Buat tautan berisi kodemu untuk dikirim ke admin atau teman";
    if (I) I.isiTombol(bagikan, "bagikan", "Bagikan"); else bagikan.textContent = "🔗 Bagikan";
    bagikan.addEventListener("click", () => bagikanDialog(adapter, bagikan));

    const fokus = el("button", dasar);
    fokus.type = "button";
    fokus.setAttribute("aria-pressed", "false");
    fokus.title = "Sembunyikan semua selain editor dan output (Esc untuk keluar)";
    if (I) I.isiTombol(fokus, "fokus", "Mode fokus"); else fokus.textContent = "🎯 Mode fokus";
    fokus.addEventListener("click", () => setFokus(!document.documentElement.classList.contains("mode-fokus"), fokus));

    fokus.dataset.alat = "fokus";
    const grup = document.querySelector("#tb-more-group");
    if (grup) grup.prepend(bagikan, fokus);
    else { simpan.insertAdjacentElement("afterend", bagikan); bagikan.insertAdjacentElement("afterend", fokus); }
    window.dispatchEvent(new Event("alat:siap"));
    // Daftar proyek di akun (js/proyek.js), bila dimuat oleh halaman ini.
    if (window.CodingSkanetraProyek) window.CodingSkanetraProyek.pasang(adapter);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && document.documentElement.classList.contains("mode-fokus") && !document.querySelector("dialog[open]")) {
        setFokus(false, fokus);
      }
    });

    // Tautan pendek dari database: #b=kode
    const cocokDb = /^#b=([0-9a-f]{12})$/.exec(location.hash || "");
    const kodeDb = cocokDb ? cocokDb[1] : null;
    if (kodeDb) {
      const akun = window.CodingSkanetraAkun;
      try {
        if (!akun || !akun.tersedia) throw new Error("tanpa-akun");
        const hasil = await akun.rpc("ambil_bagikan", { p_kode: kodeDb });
        if (!hasil || hasil.status === "tidak-ada") throw new Error("tidak-ada");
        if (hasil.status === "kedaluwarsa") throw new Error("kedaluwarsa");
        if (hasil.status !== "ok" || !HALAMAN_EDITOR[hasil.jenis]) throw new Error("gagal");
        if (hasil.jenis !== adapter.jenis) {
          // Tautan untuk editor lain: pindah otomatis ke editor yang benar.
          location.replace(new URL(HALAMAN_EDITOR[hasil.jenis], location.href).href + location.hash);
          return;
        }
        adapter.terapkan(hasil.isi);
        const dari = typeof hasil.nama === "string" && hasil.nama.trim() ? " dari " + hasil.nama.trim().slice(0, 40) : "";
        tampilBanner(adapter, "📎 Kode ini dibuka dari tautan" + dari + ". Belum dijalankan dan belum disimpan di akunmu. Tautan berlaku sampai " + waktuSingkat(hasil.kedaluwarsa) + ".");
        adapter.beritahu("Kode dari tautan dimuat.");
      } catch (e) {
        const k = e && e.message;
        tampilBanner(adapter, k === "kedaluwarsa"
          ? "Tautan ini sudah kedaluwarsa (tautan pendek berlaku 7 hari). Minta pengirimnya membagikan lagi."
          : k === "tidak-ada"
            ? "Tautan ini tidak ditemukan atau sudah dihapus pengirimnya. Periksa apakah tautannya lengkap."
            : "Tautan belum bisa dibuka. Periksa internet lalu muat ulang halaman ini.", "galat");
      }
    }

    if (masuk) {
      try {
        const paket = await masuk;
        if (paket.j !== adapter.jenis) {
          tampilBanner(adapter, "Tautan ini untuk editor lain. Buka dari halaman editor yang sesuai.", "galat");
        } else {
          adapter.terapkan(paket.d);
          const dari = typeof paket.n === "string" && paket.n.trim() ? " dari " + paket.n.trim().slice(0, 40) : "";
          tampilBanner(adapter, "📎 Kode ini dibuka dari tautan" + dari + ". Belum dijalankan dan belum disimpan di browsermu. Tekan Jalankan untuk mencoba.");
          adapter.beritahu("Kode dari tautan dimuat.");
        }
      } catch (e) {
        const lama = e && e.message === "browser-lama";
        tampilBanner(adapter, lama
          ? "Browsermu terlalu lama untuk membuka tautan ini. Perbarui browsernya atau minta file kodenya."
          : "Tautan ini rusak atau terpotong, jadi kodenya tidak bisa dibuka. Minta pengirimnya mengirim ulang tautannya.", "galat");
      }
    }
  }

  window.CodingSkanetraAlat = { daftar, kemas, bongkar };
})();
