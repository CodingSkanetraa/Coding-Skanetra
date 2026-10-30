// Akun Coding Skanetra (login username + password lewat Supabase) dan sinkronisasi progres.
//
// Situs tetap bisa dipakai penuh tanpa login. Setelah login:
//   * kode di editor (HTML/CSS/JS, Python, C++), skor game, dan pengaturan editor
//     ikut tersimpan di akun dan dipulihkan di perangkat lain;
//   * halaman Peringkat bisa dibuka (khusus akun yang sudah disetujui sebagai anggota).
//
// Tanpa library tambahan: hanya memanggil REST Supabase lewat fetch (lihat js/akun-config.js).
// Dokumentasi: README.md dan supabase/PANDUAN.md.
(() => {
  "use strict";

  const CFG = window.CS_SUPABASE || {};
  const URL_DASAR = String(CFG.url || "").replace(/\/+$/, "");
  const KUNCI_ANON = String(CFG.anonKey || "");
  const DOMAIN_EMAIL = String(CFG.domainEmail || "users.codingskanetra.vercel.app");
  const SIAP_DIPAKAI = Boolean(URL_DASAR && KUNCI_ANON);

  const KUNCI_SESI = "codingskanetra-sesi";
  const KUNCI_PEMILIK = "codingskanetra-pemilik";           // id akun pemilik data lokal yang disinkronkan
  const KUNCI_SINKRON_TERAKHIR = "codingskanetra-sinkron-terakhir";
  const POLA_USERNAME = /^[a-z0-9_.]{3,20}$/;
  const POLA_KUNCI_REMOTE = /^[a-z0-9:_.-]{1,100}$/;
  const BATAS_DATA = 60000;                                 // karakter; batas di database 64 KB
  const JEDA_DORONG = 1500;                                 // ms: tunggu perubahan berhenti sebelum mengirim

  // Data lokal yang ikut disinkronkan.
  const AWALAN_KODE = "codingskanetra-code:";
  const KUNCI_SKOR = "codingskanetra-code-rush-high-score";
  const KUNCI_PREF = "codingskanetra-editor-preferences";
  const KUNCI_FOTO = "codingskanetra-foto";                  // foto profil akun yang sedang masuk: { uid, data }
  const POLA_FOTO = /^data:image\/(webp|jpeg);base64,[A-Za-z0-9+/]+=*$/;
  const BATAS_FOTO = 60000;                                 // karakter data URL; batas yang sama di database

  // ---------- Penyimpanan lokal yang aman ----------

  const baca = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const tulis = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
  const hapusLokal = (k) => { try { localStorage.removeItem(k); } catch (e) { /* abaikan */ } };

  function galat(pesan, kode) {
    const e = new Error(pesan);
    e.kode = kode || "galat";
    return e;
  }

  // ---------- Sesi ----------

  function bacaSesi() {
    try {
      const s = JSON.parse(baca(KUNCI_SESI));
      if (s && typeof s.access_token === "string" && typeof s.refresh_token === "string" &&
          s.user && typeof s.user.id === "string" && typeof s.username === "string") return s;
    } catch (e) { /* sesi rusak: anggap belum login */ }
    return null;
  }

  let sesi = bacaSesi();

  function umumkan() {
    window.dispatchEvent(new CustomEvent("cs:akun", { detail: { pengguna: pengguna() } }));
  }

  function simpanSesi(baru) {
    sesi = baru;
    if (baru) tulis(KUNCI_SESI, JSON.stringify(baru));
    else hapusLokal(KUNCI_SESI);
    umumkan();
  }

  function pengguna() {
    return sesi ? { id: sesi.user.id, username: sesi.username } : null;
  }

  // Mengubah respons token Supabase menjadi sesi yang kita simpan.
  function dariToken(d) {
    const email = String((d.user && d.user.email) || "");
    return {
      access_token: d.access_token,
      refresh_token: d.refresh_token,
      expires_at: Number(d.expires_at) || Math.floor(Date.now() / 1000) + (Number(d.expires_in) || 3600),
      user: { id: String(d.user && d.user.id) },
      username: email.split("@")[0].toLowerCase()
    };
  }

  const kedaluwarsa = (margin) => !sesi || sesi.expires_at * 1000 - Date.now() < (margin || 0);

  let sedangSegar = null;
  function segarkan() {
    if (!sesi) return Promise.resolve(false);
    if (sedangSegar) return sedangSegar;
    const tokenLama = sesi.refresh_token;
    sedangSegar = (async () => {
      try {
        const res = await fetch(URL_DASAR + "/auth/v1/token?grant_type=refresh_token", {
          method: "POST",
          headers: { apikey: KUNCI_ANON, "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: tokenLama })
        });
        if (res.ok) {
          simpanSesi(dariToken(await res.json()));
          return true;
        }
        if (res.status === 400 || res.status === 401 || res.status === 403) {
          // Mungkin tab lain sudah memperbarui lebih dulu.
          const baru = bacaSesi();
          if (baru && baru.refresh_token !== tokenLama) { sesi = baru; umumkan(); return true; }
          simpanSesi(null); // token ditolak: sesi sudah tidak berlaku
        }
        return false;
      } catch (e) {
        return false; // jaringan bermasalah: pertahankan sesi, coba lagi nanti
      } finally {
        sedangSegar = null;
      }
    })();
    return sedangSegar;
  }

  async function tokenAktif() {
    if (!sesi) return null;
    if (kedaluwarsa(60000)) await segarkan();
    return sesi ? sesi.access_token : null;
  }

  // ---------- Permintaan ke Supabase ----------

  async function minta(path, opsi) {
    opsi = opsi || {};
    if (!SIAP_DIPAKAI) throw galat("Fitur akun belum dikonfigurasi (js/akun-config.js).", "konfigurasi");
    const token = opsi.anon ? null : await tokenAktif();
    const header = Object.assign({ apikey: KUNCI_ANON, Authorization: "Bearer " + (token || KUNCI_ANON) }, opsi.header);
    if (opsi.body !== undefined) header["Content-Type"] = "application/json";
    let res;
    try {
      res = await fetch(URL_DASAR + path, {
        method: opsi.metode || "GET",
        headers: header,
        body: opsi.body !== undefined ? JSON.stringify(opsi.body) : undefined,
        cache: "no-store",
        keepalive: Boolean(opsi.keepalive)
      });
    } catch (e) {
      throw galat("Tidak bisa terhubung ke server. Periksa internet lalu coba lagi.", "jaringan");
    }
    let data = null;
    const teks = await res.text();
    if (teks) { try { data = JSON.parse(teks); } catch (e) { data = teks; } }
    return { ok: res.ok, status: res.status, data };
  }

  function pesanGalat(res) {
    const d = (res && res.data && typeof res.data === "object") ? res.data : {};
    const kode = String(d.error_code || d.code || "");
    const teks = String(d.msg || d.message || d.error_description || d.error || "").toLowerCase();
    if (res.status === 429 || kode === "over_request_rate_limit" || kode === "over_email_send_rate_limit") {
      return "Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.";
    }
    if (kode === "invalid_credentials" || teks.includes("invalid login credentials")) return "Username atau password salah.";
    if (kode === "user_already_exists" || kode === "email_exists" || teks.includes("already registered")) {
      return "Username sudah dipakai. Coba username lain.";
    }
    if (kode === "weak_password" || teks.includes("password should")) return "Password terlalu lemah. Gunakan minimal 6 karakter.";
    if (kode === "signup_disabled" || teks.includes("signups not allowed")) return "Pendaftaran sedang ditutup.";
    if (teks.includes("database error saving new user")) return "Username ini tidak bisa dipakai. Coba username lain.";
    if (res.status >= 500) return "Server sedang bermasalah. Coba lagi sebentar lagi.";
    return "Terjadi kesalahan. Coba lagi.";
  }

  // ---------- Daftar, masuk, keluar ----------

  function emailDari(username) {
    const u = String(username || "").trim().toLowerCase();
    if (!POLA_USERNAME.test(u)) {
      throw galat("Username 3 sampai 20 karakter: huruf kecil, angka, titik, atau garis bawah (_).", "username");
    }
    return u + "@" + DOMAIN_EMAIL;
  }

  async function masuk(username, password) {
    const email = emailDari(username);
    if (!password) throw galat("Isi password.", "password");
    const res = await minta("/auth/v1/token?grant_type=password", { metode: "POST", anon: true, body: { email, password } });
    if (!res.ok || !res.data || !res.data.access_token) throw galat(pesanGalat(res), "masuk");
    simpanSesi(dariToken(res.data));
    sinkronAwalDiam();
    // Foto profil ikut diambil (paling lama 1,5 detik) supaya navbar di halaman berikutnya langsung menampilkannya.
    await Promise.race([muatFoto().catch(() => {}), new Promise((r) => setTimeout(r, 1500))]);
    return pengguna();
  }

  async function daftar(username, password) {
    const email = emailDari(username);
    if (String(password || "").length < 6) throw galat("Password minimal 6 karakter.", "password");
    const res = await minta("/auth/v1/signup", { metode: "POST", anon: true, body: { email, password } });
    if (!res.ok) throw galat(pesanGalat(res), "daftar");
    if (!res.data || !res.data.access_token) {
      throw galat("Akun dibuat, tetapi belum bisa dipakai karena 'Confirm email' di Supabase masih aktif. Hubungi pengelola.", "konfirmasi");
    }
    simpanSesi(dariToken(res.data));
    sinkronAwalDiam();
    return pengguna();
  }

  // Keluar. Perubahan yang belum terkirim dikirim dulu; lalu data akun dibersihkan dari perangkat ini
  // supaya tidak terbaca orang berikutnya (komputer lab). Gagal mengirim = lempar galat, kecuali { paksa: true }.
  async function keluar(opsi) {
    opsi = opsi || {};
    if (sesi) {
      try { await dorong(); } catch (e) { if (!opsi.paksa) throw e; }
      if (!opsi.paksa && menunggu.size) throw galat("Perubahan terakhir belum terkirim ke akunmu.", "belum-terkirim");
      try { await minta("/auth/v1/logout?scope=local", { metode: "POST" }); } catch (e) { /* tetap keluar di sisi ini */ }
    }
    if (opsi.bersihkan !== false) { bersihkanLokal(); hapusLokal(KUNCI_FOTO); }
    menunggu.clear();
    clearTimeout(pewaktu);
    simpanSesi(null);
  }

  window.addEventListener("storage", (e) => {
    if (e.key !== KUNCI_SESI) return;
    sesi = bacaSesi();
    umumkan();
  });

  // Mengganti password akun yang sedang masuk. Sesi tetap berlaku (tidak perlu masuk lagi).
  async function ubahPassword(baru) {
    if (!sesi) throw galat("Masuk dulu untuk mengubah password.", "sesi");
    if (String(baru || "").length < 6) throw galat("Password minimal 6 karakter.", "password");
    const res = await minta("/auth/v1/user", { metode: "PUT", body: { password: String(baru) } });
    if (res.ok) return true;
    const d = (res.data && typeof res.data === "object") ? res.data : {};
    const kode = String(d.error_code || d.code || "");
    const teks = String(d.msg || d.message || "").toLowerCase();
    if (res.status === 401 || (res.status === 403 && kode !== "reauthentication_needed")) throw galat("Sesi berakhir. Masuk lagi, lalu ulangi.", "sesi");
    if (kode === "same_password" || teks.includes("different from the old")) throw galat("Password baru harus berbeda dari yang lama.", "sama");
    if (kode === "weak_password" || teks.includes("password should")) throw galat("Password terlalu lemah. Gunakan minimal 6 karakter.", "password");
    if (kode === "reauthentication_needed" || teks.includes("reauthentication")) throw galat("Demi keamanan, keluar lalu masuk lagi, kemudian ulangi mengubah password.", "ulang-masuk");
    throw galat(pesanGalat(res), "password");
  }

  // ---------- Profil dan data ----------

  async function ambil(path) {
    const res = await minta("/rest/v1/" + path);
    if (res.status === 401) throw galat("Sesi berakhir. Masuk lagi.", "sesi");
    if (!res.ok) throw galat("Data belum bisa dimuat.", "data");
    return res.data;
  }

  async function rpc(nama, isi) {
    const res = await minta("/rest/v1/rpc/" + encodeURIComponent(nama), { metode: "POST", body: isi || {} });
    if (res.status === 401) throw galat("Sesi berakhir. Masuk lagi.", "sesi");
    if (!res.ok) throw galat("Data belum bisa dimuat.", "data");
    return res.data;
  }

  async function profil() {
    if (!sesi) return null;
    const baris = await ambil("profil?select=username,nama,kelas,anggota&id=eq." + encodeURIComponent(sesi.user.id));
    return Array.isArray(baris) && baris[0] ? baris[0] : null;
  }

  // ---------- Sinkronisasi progres ----------

  // Nama di penyimpanan lokal <-> nama di tabel progres.
  function kunciRemoteDari(lokal) {
    if (lokal.startsWith(AWALAN_KODE)) {
      const r = "kode:" + lokal.slice(AWALAN_KODE.length).toLowerCase();
      return POLA_KUNCI_REMOTE.test(r) ? r : null;
    }
    if (lokal === KUNCI_SKOR) return "skor:code-rush";
    if (lokal === KUNCI_PREF) return "pref:editor";
    return null;
  }

  function kunciLokalDari(remote) {
    if (remote.startsWith("kode:")) {
      const n = remote.slice(5);
      return /^[a-z0-9_.-]{1,60}$/.test(n) ? AWALAN_KODE + n : null;
    }
    if (remote === "skor:code-rush") return KUNCI_SKOR;
    if (remote === "pref:editor") return KUNCI_PREF;
    return null;
  }

  function semuaKunciLokal() {
    const hasil = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && kunciRemoteDari(k)) hasil.push(k);
      }
    } catch (e) { /* abaikan */ }
    return hasil;
  }

  function waktuKode(mentah) {
    try { return Number(JSON.parse(mentah).savedAt) || 0; } catch (e) { return 0; }
  }

  function barisDari(lokal) {
    const mentah = baca(lokal);
    const remote = kunciRemoteDari(lokal);
    if (mentah === null || !remote) return null;
    if (mentah.length > BATAS_DATA) return { terlalu: true };
    const t = lokal.startsWith(AWALAN_KODE) ? waktuKode(mentah) : Date.now();
    return { kunci: remote, data: { nilai: mentah, t }, diubah: new Date().toISOString() };
  }

  const menunggu = new Set();       // kunci lokal yang belum terkirim
  let pewaktu = null;
  const status = { terakhir: Number(baca(KUNCI_SINKRON_TERAKHIR)) || null, galat: null, besar: false };

  function catatBerhasil() {
    status.terakhir = Date.now();
    status.galat = null;
    tulis(KUNCI_SINKRON_TERAKHIR, String(status.terakhir));
    window.dispatchEvent(new CustomEvent("cs:sinkron-status"));
  }

  function catatGalat(e) {
    status.galat = (e && e.message) || "Sinkronisasi gagal.";
    window.dispatchEvent(new CustomEvent("cs:sinkron-status"));
  }

  // Dipanggil dari code-storage.js, games.js, setting.js setiap kali data lokal berubah.
  function catat(lokal) {
    if (!sesi || !kunciRemoteDari(lokal)) return;
    menunggu.add(lokal);
    clearTimeout(pewaktu);
    pewaktu = setTimeout(() => { dorong().catch(() => {}); }, JEDA_DORONG);
  }

  function catatHapus(lokal) { catat(lokal); } // kunci yang sudah tidak ada di lokal akan dihapus di akun

  let sedangDorong = null;
  function dorong(opsi) {
    if (!sesi || !menunggu.size) return Promise.resolve();
    if (sedangDorong) return sedangDorong.then(() => dorong(opsi));
    opsi = opsi || {};
    const kunci = Array.from(menunggu);
    menunggu.clear();
    sedangDorong = (async () => {
      await Promise.resolve(); // pastikan 'sedangDorong' terisi sebelum blok finally berjalan
      const simpan = [];
      const buang = [];
      status.besar = false;
      kunci.forEach((k) => {
        const baris = barisDari(k);
        const remote = kunciRemoteDari(k);
        if (baris && baris.terlalu) { status.besar = true; return; }
        if (baris) simpan.push(baris);
        else if (remote) buang.push(remote);
      });
      try {
        if (simpan.length) {
          const res = await minta("/rest/v1/progres?on_conflict=user_id,kunci", {
            metode: "POST", body: simpan, keepalive: opsi.keepalive,
            header: { Prefer: "resolution=merge-duplicates,return=minimal" }
          });
          if (!res.ok) throw galat("Progres belum tersimpan ke akun.", "dorong");
        }
        for (const r of buang) {
          const res = await minta("/rest/v1/progres?kunci=eq." + encodeURIComponent(r), { metode: "DELETE", keepalive: opsi.keepalive });
          if (!res.ok) throw galat("Progres belum tersimpan ke akun.", "dorong");
        }
        catatBerhasil();
      } catch (e) {
        kunci.forEach((k) => menunggu.add(k)); // coba lagi nanti
        catatGalat(e);
        throw e;
      } finally {
        sedangDorong = null;
      }
    })();
    return sedangDorong;
  }

  // Gabungkan data akun dengan data di perangkat ini. Aturan:
  //   kode   : yang lebih baru (waktu simpan) menang
  //   skor   : yang lebih tinggi menang
  //   pengaturan: akun menang
  // Data lokal milik akun LAIN (mis. sesi sebelumnya berakhir di komputer bersama) tidak pernah dikirim:
  // dibuang dan diganti data akun ini.
  async function sinkronAwal() {
    if (!sesi) return { berubah: false };
    const uid = sesi.user.id;
    const res = await minta("/rest/v1/progres?select=kunci,data");
    if (!res.ok || !Array.isArray(res.data)) {
      const e = galat("Progres belum bisa dimuat dari akun.", "tarik");
      catatGalat(e);
      throw e;
    }
    let berubah = false;
    const pemilik = baca(KUNCI_PEMILIK);
    const lokalMilikAkunLain = Boolean(pemilik && pemilik !== uid);
    if (lokalMilikAkunLain) { bersihkanLokal(); berubah = true; }

    const remote = new Map();
    res.data.forEach((r) => { if (r && typeof r.kunci === "string" && r.data && typeof r.data.nilai === "string") remote.set(r.kunci, r); });

    const naik = new Set();
    remote.forEach((r, kr) => {
      const lokal = kunciLokalDari(kr);
      if (!lokal) return;
      const sekarang = baca(lokal);
      const nilai = r.data.nilai;
      if (sekarang === null) { if (tulis(lokal, nilai)) berubah = true; return; }
      if (sekarang === nilai) return;
      if (lokal.startsWith(AWALAN_KODE)) {
        const tl = waktuKode(sekarang);
        const tr = Number(r.data.t) || 0;
        if (tr > tl) { if (tulis(lokal, nilai)) berubah = true; }
        else if (tl > tr) naik.add(lokal);
      } else if (lokal === KUNCI_SKOR) {
        const ls = Number(sekarang) || 0;
        const rs = Number(nilai) || 0;
        if (rs > ls) { if (tulis(lokal, nilai)) berubah = true; }
        else if (ls > rs) naik.add(lokal);
      } else if (tulis(lokal, nilai)) {
        berubah = true; // pengaturan: akun menang
      }
    });
    semuaKunciLokal().forEach((k) => { if (!remote.has(kunciRemoteDari(k))) naik.add(k); });

    tulis(KUNCI_PEMILIK, uid);
    naik.forEach((k) => menunggu.add(k));
    if (menunggu.size) await dorong(); else catatBerhasil();
    if (berubah) window.dispatchEvent(new CustomEvent("cs:progres-dimuat"));
    return { berubah };
  }

  let sinkronAwalBerjalan = null;
  function sinkronAwalDiam() {
    if (sinkronAwalBerjalan) return sinkronAwalBerjalan;
    sinkronAwalBerjalan = sinkronAwal().catch(() => ({ berubah: false })).finally(() => { sinkronAwalBerjalan = null; });
    return sinkronAwalBerjalan;
  }

  function bersihkanLokal() {
    semuaKunciLokal().forEach(hapusLokal);
    hapusLokal(KUNCI_PEMILIK);
    hapusLokal(KUNCI_SINKRON_TERAKHIR);
    status.terakhir = null;
  }

  // ---------- Foto profil ----------
  // Foto kecil (sekitar 256 px) disimpan di tabel foto_profil dan hanya terlihat oleh pemiliknya.
  // Salinannya disimpan di browser ini supaya navbar bisa menampilkannya tanpa memanggil server.

  const fotoValid = (d) => typeof d === "string" && d.length <= BATAS_FOTO && POLA_FOTO.test(d);

  function foto() {
    if (!sesi) return null;
    try {
      const o = JSON.parse(baca(KUNCI_FOTO));
      if (o && o.uid === sesi.user.id && fotoValid(o.data)) return o.data;
    } catch (e) { /* tidak ada atau rusak */ }
    return null;
  }

  function simpanFotoLokal(data) {
    if (sesi && fotoValid(data)) tulis(KUNCI_FOTO, JSON.stringify({ uid: sesi.user.id, data }));
    else hapusLokal(KUNCI_FOTO);
    window.dispatchEvent(new CustomEvent("cs:foto"));
  }

  async function muatFoto() {
    if (!sesi) return null;
    const res = await minta("/rest/v1/foto_profil?select=data");
    if (!res.ok || !Array.isArray(res.data)) throw galat("Foto profil belum bisa dimuat.", "foto");
    const d = res.data[0] && res.data[0].data;
    simpanFotoLokal(fotoValid(d) ? d : null);
    return foto();
  }

  async function ubahFoto(data) {
    if (!sesi) throw galat("Masuk dulu untuk mengganti foto.", "sesi");
    if (!fotoValid(data)) throw galat("Foto tidak valid atau terlalu besar.", "foto");
    const res = await minta("/rest/v1/foto_profil?on_conflict=user_id", {
      metode: "POST", body: { data, diubah: new Date().toISOString() },
      header: { Prefer: "resolution=merge-duplicates,return=minimal" }
    });
    if (res.status === 401 || res.status === 403) throw galat("Sesi berakhir. Masuk lagi, lalu ulangi.", "sesi");
    if (!res.ok) throw galat("Foto belum tersimpan. Coba lagi.", "foto");
    simpanFotoLokal(data);
  }

  async function hapusFoto() {
    if (!sesi) return;
    const res = await minta("/rest/v1/foto_profil?user_id=eq." + encodeURIComponent(sesi.user.id), { metode: "DELETE" });
    if (res.status === 401 || res.status === 403) throw galat("Sesi berakhir. Masuk lagi, lalu ulangi.", "sesi");
    if (!res.ok) throw galat("Foto belum terhapus. Coba lagi.", "foto");
    simpanFotoLokal(null);
  }

  // ---------- Pemberitahuan kecil ----------

  function tampilkanPemberitahuan(teks, tombol, aksi) {
    const lama = document.getElementById("cs-akun-toast");
    if (lama) lama.remove();
    const gaya = document.getElementById("cs-akun-toast-gaya") || (() => {
      const s = document.createElement("style");
      s.id = "cs-akun-toast-gaya";
      s.textContent =
        "#cs-akun-toast{position:fixed;z-index:4000;top:14px;left:50%;transform:translateX(-50%);width:min(92vw,420px);" +
        "display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:10px;font:600 .9rem/1.4 inherit;" +
        "background:var(--card-background,#121a15);color:var(--text,#edf4ef);border:1px solid var(--accent,#70d99a);" +
        "box-shadow:0 14px 40px rgb(0 0 0/40%)}#cs-akun-toast span{flex:1}" +
        "#cs-akun-toast button{font:inherit;padding:6px 12px;border-radius:8px;border:0;cursor:pointer;" +
        "background:var(--accent,#70d99a);color:var(--button-text,#07120b)}";
      document.head.appendChild(s);
      return s;
    })();
    void gaya;
    const kotak = document.createElement("div");
    kotak.id = "cs-akun-toast";
    kotak.setAttribute("role", "status");
    const isi = document.createElement("span");
    isi.textContent = teks;
    kotak.appendChild(isi);
    if (tombol) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = tombol;
      b.addEventListener("click", aksi);
      kotak.appendChild(b);
    }
    document.body.appendChild(kotak);
    setTimeout(() => kotak.remove(), 12000);
  }

  window.addEventListener("cs:progres-dimuat", () => {
    // Editor sudah membaca data lama saat halaman dibuka, jadi tawarkan muat ulang.
    if (document.body) {
      tampilkanPemberitahuan("Progres dari akunmu dimuat.", "Muat ulang", () => location.reload());
    }
  });

  // ---------- Pemicu otomatis ----------

  const siap = (async () => {
    if (sesi && kedaluwarsa(60000)) await segarkan();
  })();

  siap.then(() => { if (sesi) { sinkronAwalDiam(); muatFoto().catch(() => {}); } });

  window.addEventListener("online", () => { if (sesi && menunggu.size) dorong().catch(() => {}); });
  window.addEventListener("pagehide", () => {
    if (sesi && menunggu.size && !kedaluwarsa(5000)) dorong({ keepalive: true }).catch(() => {});
  });

  window.CodingSkanetraAkun = {
    siap, tersedia: SIAP_DIPAKAI, pengguna, masuk, daftar, keluar, ubahPassword, profil, ambil, rpc, minta,
    foto, muatFoto, ubahFoto, hapusFoto,
    token: tokenAktif, // token login terbaru (untuk memanggil fungsi api/ di Vercel)
    sinkron: { catat, catatHapus, sekarang: sinkronAwalDiam, dorong, status: () => Object.assign({ menunggu: menunggu.size }, status) }
  };
})();
