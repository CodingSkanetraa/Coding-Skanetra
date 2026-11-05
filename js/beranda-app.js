/* Beranda: ikon menu, sapaan akun, dan daftar tautan Bagikan yang masih aktif. */
(() => {
  const ikon = window.CodingSkanetraIkon;
  document.querySelectorAll(".ab-grid [data-ikon-cadangan]").forEach((el) => {
    if (ikon && !el.firstChild) el.innerHTML = ikon.svg(el.dataset.ikonCadangan, 26);
  });

  const avatar = document.getElementById("ab-avatar");
  const halo = document.getElementById("ab-halo");
  const sub = document.getElementById("ab-sub");
  const tautan = document.getElementById("ab-akun");
  if (!avatar || !halo || !sub || !tautan) return;
  if (ikon) avatar.innerHTML = ikon.svg("akun", 22);

  const POLA_FOTO = /^data:image\/(webp|jpeg);base64,[A-Za-z0-9+/]+=*$/;
  const POLA_KODE = /^[0-9a-f]{12}$/;
  const EDITOR = { web: ["Editor Web", "pages/editor-html.html"], py: ["Editor Python", "pages/editor-python.html"], cpp: ["Editor C++", "pages/editor-cpp.html"] };

  const fotoLokal = (uid) => {
    try {
      const f = JSON.parse(localStorage.getItem("codingskanetra-foto") || "null");
      return f && f.uid === uid && POLA_FOTO.test(f.data || "") ? f.data : null;
    } catch (e) { return null; }
  };

  const sesiLokal = () => {
    try {
      const s = JSON.parse(localStorage.getItem("codingskanetra-sesi"));
      if (s && s.access_token && /^[a-z0-9_.]{3,20}$/.test(s.username || "")) return { id: s.user && s.user.id, username: s.username };
    } catch (e) { /* belum masuk */ }
    return null;
  };

  const tampil = () => {
    const p = sesiLokal();
    if (!p) return;
    halo.textContent = "Halo, @" + p.username;
    sub.textContent = "Lihat profil dan proyekmu";
    tautan.setAttribute("href", "pages/profil.html");
    const foto = fotoLokal(p.id);
    if (foto) {
      const img = new Image();
      img.alt = "";
      img.src = foto;
      avatar.replaceChildren(img);
    } else {
      avatar.textContent = p.username.charAt(0).toUpperCase();
    }
  };

  // ---------- Editor aktif (tautan Bagikan yang belum kedaluwarsa) ----------
  const kartu = {
    pesan: document.getElementById("hm-aktif-pesan"),
    daftar: document.getElementById("hm-aktif-daftar"),
    masuk: document.getElementById("hm-aktif-masuk"),
    kelola: document.getElementById("hm-kelola")
  };
  let nomor = 0;

  const tampilAktif = (baris) => {
    kartu.daftar.textContent = "";
    baris.slice(0, 3).forEach((b) => {
      const li = document.createElement("li");
      const teks = document.createElement("div");
      teks.className = "hm-aktif-teks";
      const judul = document.createElement("strong");
      judul.textContent = EDITOR[b.jenis][0] + (b.nama ? " · " + b.nama : "");
      const sisa = Math.max(0, Math.ceil((new Date(b.kedaluwarsa).getTime() - Date.now()) / 86400000));
      const info = document.createElement("small");
      info.textContent = "Sisa " + sisa + " hari";
      teks.append(judul, info);
      const buka = document.createElement("a");
      buka.textContent = "Buka";
      buka.href = EDITOR[b.jenis][1] + "#b=" + b.kode;
      li.append(teks, buka);
      kartu.daftar.appendChild(li);
    });
  };

  const muatAktif = async () => {
    if (!kartu.pesan || !kartu.daftar) return;
    const akun = window.CodingSkanetraAkun;
    const masuk = Boolean(sesiLokal());
    kartu.masuk.hidden = masuk;
    kartu.kelola.hidden = !masuk;
    kartu.daftar.textContent = "";
    if (!masuk) {
      kartu.pesan.hidden = false;
      kartu.pesan.textContent = "Masuk untuk melihat tautan berbagi yang masih aktif.";
      return;
    }
    if (!akun || !akun.ambil) {
      kartu.pesan.hidden = false;
      kartu.pesan.textContent = "Akunmu belum siap. Muat ulang halaman ini.";
      return;
    }
    const ini = ++nomor;
    kartu.pesan.hidden = false;
    kartu.pesan.textContent = "Memuat…";
    try {
      const baris = await akun.ambil("bagikan?select=kode,jenis,nama,dibuat,kedaluwarsa&order=dibuat.desc&limit=10");
      if (ini !== nomor) return;
      const aktif = (Array.isArray(baris) ? baris : []).filter((b) => b && POLA_KODE.test(String(b.kode)) && EDITOR[b.jenis] && new Date(b.kedaluwarsa).getTime() > Date.now());
      if (aktif.length) { kartu.pesan.hidden = true; tampilAktif(aktif); }
      else kartu.pesan.textContent = "Belum ada tautan aktif. Buat dari tombol Bagikan di editor.";
    } catch (e) {
      if (ini === nomor) kartu.pesan.textContent = "Daftar belum bisa dimuat. Muat ulang halaman ini.";
    }
  };

  // ---------- Proyek terakhir dibuka ----------
  const TERAKHIR = {
    web: ["Editor Web", "pages/editor-html.html", ["html-playground"]],
    py: ["Editor Python", "pages/editor-python.html", ["python-console", "python-visual"]],
    cpp: ["Editor C++", "pages/editor-cpp.html", ["cpp"]]
  };
  const bacaTersimpan = (nama) => {
    try {
      const o = JSON.parse(localStorage.getItem("codingskanetra-code:" + nama) || "null");
      return o && typeof o.savedAt === "number" ? o.savedAt : 0;
    } catch (e) { return 0; }
  };
  const lalu = (ms) => {
    const m = Math.floor((Date.now() - ms) / 60000);
    if (m < 1) return "baru saja";
    if (m < 60) return m + " menit lalu";
    if (m < 1440) return Math.floor(m / 60) + " jam lalu";
    return Math.floor(m / 1440) + " hari lalu";
  };
  const tampilTerakhir = () => {
    const pesan = document.getElementById("hm-terakhir-pesan");
    const kotak = document.getElementById("hm-terakhir");
    if (!pesan || !kotak) return;
    let jenis = null, waktu = 0;
    try {
      const t = JSON.parse(localStorage.getItem("codingskanetra-terakhir") || "null");
      if (t && TERAKHIR[t.jenis] && typeof t.waktu === "number") { jenis = t.jenis; waktu = t.waktu; }
    } catch (e) { /* tidak ada catatan */ }
    if (!jenis) {
      // Belum ada catatan: pakai editor dengan kode tersimpan paling baru
      Object.keys(TERAKHIR).forEach((j) => {
        const w = Math.max(...TERAKHIR[j][2].map(bacaTersimpan));
        if (w > waktu) { jenis = j; waktu = w; }
      });
    }
    if (!jenis) { pesan.hidden = false; kotak.hidden = true; return; }
    const simpan = Math.max(...TERAKHIR[jenis][2].map(bacaTersimpan));
    document.getElementById("hm-terakhir-nama").textContent = TERAKHIR[jenis][0];
    document.getElementById("hm-terakhir-info").textContent = "Dibuka " + lalu(waktu) + (simpan ? " · ada kode tersimpan" : "");
    document.getElementById("hm-terakhir-buka").setAttribute("href", TERAKHIR[jenis][1]);
    pesan.hidden = true;
    kotak.hidden = false;
  };

  const segarkan = () => { tampil(); muatAktif(); tampilTerakhir(); };
  segarkan();
  const akun = window.CodingSkanetraAkun;
  if (akun && akun.siap && akun.siap.then) akun.siap.then(segarkan, () => {});
  window.addEventListener("cs:foto", tampil);
  window.addEventListener("cs:akun", segarkan);
})();
