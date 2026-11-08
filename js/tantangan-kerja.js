// Halaman kerja satu Tantangan: baca soal, tulis jawaban, kirim ke server untuk dinilai.
// Semua teks dari database ditampilkan dengan textContent (bukan innerHTML).
(() => {
  "use strict";
  const BAHASA = { py: ["Python", "editor-python.html"], cpp: ["C++", "editor-cpp.html"], web: ["Web", "editor-html.html"] };
  const TINGKAT = { mudah: "Mudah", sedang: "Sedang", sulit: "Sulit" };
  const POLA_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const STATUS_TES = { benar: "benar", salah: "salah", galat: "galat", waktu: "terlalu lama" };

  const $ = (id) => document.getElementById(id);
  const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks !== undefined) e.textContent = teks; return e; };

  let soal = null;
  let selesai = false;
  let mengirim = false;
  const kunciDraf = () => "codingskanetra-tantangan:" + soal.id;

  function simpan(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* abaikan */ } }
  function baca(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  function pesan(teks, galat) { const p = $("tg-pesan"); p.textContent = teks || ""; p.classList.toggle("galat", Boolean(galat)); }

  function tamu(judul, teks, tombol) {
    pesan("");
    const t = $("tg-tamu");
    t.textContent = "";
    t.append(el("strong", "", judul), el("p", "", teks));
    if (tombol) { const a = el("a", "tg-btn utama", tombol[0]); a.href = tombol[1]; t.append(a); }
    t.hidden = false;
  }

  function status(jenis, teks) {
    const s = $("tg-status");
    if (!teks) { s.hidden = true; return; }
    s.className = "tg-status" + (jenis ? " " + jenis : "");
    s.textContent = teks;
    s.hidden = false;
  }

  function hasil(jenis, paragraf, tes, kompilasi) {
    const h = $("tg-hasil");
    h.textContent = "";
    h.className = "tg-hasil" + (jenis ? " " + jenis : "");
    h.append(el("p", "", paragraf));
    if (kompilasi) h.append(el("pre", "", kompilasi));
    if (Array.isArray(tes) && tes.length) {
      const ul = el("ul", "tg-tes");
      tes.forEach((t) => {
        const li = el("li", t.status === "benar" ? "benar" : "salah", "Tes " + t.no + ": " + (STATUS_TES[t.status] || "salah"));
        ul.append(li);
      });
      h.append(ul);
      const galat = tes.find((t) => t.pesan);
      if (galat) h.append(el("pre", "", galat.pesan));
    }
    h.hidden = false;
  }

  function aturTombol() {
    const b = $("tg-kirim");
    b.disabled = mengirim || selesai;
    b.textContent = mengirim ? "Menilai…" : selesai ? "Sudah selesai" : "Kirim jawaban";
    $("tg-petunjuk").hidden = selesai;
  }

  function tampilkan(milik) {
    $("tg-judul").textContent = soal.judul;
    document.title = soal.judul + " | CodingSkanetra";
    const l = $("tg-lencana");
    l.textContent = "";
    [BAHASA[soal.bahasa][0], TINGKAT[soal.tingkat], "+" + soal.poin + " poin", soal.penilaian === "manual" ? "Dinilai guru" : "Dinilai otomatis"]
      .forEach((t) => l.append(el("span", "tg-label", t)));
    $("tg-deskripsi").textContent = soal.deskripsi || "";
    const coba = $("tg-coba");
    coba.href = BAHASA[soal.bahasa][1] + "?bebas=1";

    const kode = $("tg-kode");
    const draf = baca(kunciDraf());
    kode.value = (milik && milik.kode) || draf || soal.kode_awal || "";
    kode.addEventListener("input", () => simpan(kunciDraf(), kode.value));
    kode.addEventListener("keydown", (e) => {
      if (e.key === "Tab" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const a = kode.selectionStart, z = kode.selectionEnd;
        kode.value = kode.value.slice(0, a) + "    " + kode.value.slice(z);
        kode.selectionStart = kode.selectionEnd = a + 4;
        simpan(kunciDraf(), kode.value);
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        kirim();
      }
    });

    if (milik && milik.status === "selesai") { selesai = true; status("", "Soal ini sudah selesai. +" + (milik.poin || soal.poin) + " poin."); }
    else if (milik && milik.status === "menunggu") status("menunggu", "Jawabanmu menunggu dinilai guru. Kamu boleh mengirim ulang.");
    else if (milik && milik.status === "ditolak") status("ditolak", "Jawabanmu belum diterima guru. Perbaiki lalu kirim lagi.");
    aturTombol();
    $("tg-kirim").addEventListener("click", kirim);
    $("tg-isi").hidden = false;
  }

  async function kirim() {
    if (mengirim || selesai) return;
    const akun = window.CodingSkanetraAkun;
    const kode = $("tg-kode").value;
    if (!kode.trim()) { hasil("gagal", "Jawabanmu masih kosong."); return; }
    mengirim = true;
    aturTombol();
    $("tg-hasil").hidden = true;
    try {
      const token = await akun.token();
      if (!token) { hasil("gagal", "Sesimu berakhir. Muat ulang halaman lalu masuk lagi."); return; }
      const r = await fetch("/api/tantangan/kirim", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ id: soal.id, kode })
      });
      let d = null;
      try { d = await r.json(); } catch (e) { /* bukan JSON */ }
      if (!r.ok || !d || d.sukses !== true) {
        hasil("gagal", (d && d.pesan) || "Jawaban belum bisa dikirim. Coba lagi sebentar lagi.");
        return;
      }
      if (d.status === "selesai") {
        selesai = true;
        status("", "Soal ini sudah selesai. +" + (d.poin || soal.poin) + " poin.");
        hasil("lulus", d.pesan, d.hasil);
      } else if (d.status === "menunggu") {
        status("menunggu", "Jawabanmu menunggu dinilai guru.");
        hasil("lulus", d.pesan);
      } else {
        hasil("gagal", d.pesan, d.hasil, d.kompilasi);
      }
    } catch (e) {
      hasil("gagal", "Tidak bisa menghubungi server. Periksa koneksimu lalu coba lagi.");
    } finally {
      mengirim = false;
      aturTombol();
    }
  }

  async function mulai() {
    const akun = window.CodingSkanetraAkun;
    if (!akun || !akun.tersedia) { tamu("Fitur akun belum aktif", "Tantangan butuh akun. Hubungi pengelola.", null); return; }
    const id = new URLSearchParams(location.search).get("id") || "";
    if (!POLA_ID.test(id)) { tamu("Soal tidak ditemukan", "Pilih soal dari daftar tantangan.", ["Daftar tantangan", "tantangan.html"]); return; }
    try { await akun.siap; } catch (e) { /* lanjut sebagai tamu */ }
    if (!akun.pengguna()) { tamu("Masuk untuk mengerjakan tantangan", "Poinmu tercatat di akunmu dan masuk ke peringkat.", ["Masuk", "login.html?next=tantangan"]); return; }

    try {
      const prof = await akun.minta("/rest/v1/profil?select=anggota&limit=1");
      const p = prof.ok && Array.isArray(prof.data) ? prof.data[0] : null;
      if (!p) { pesan("Akunmu belum bisa diperiksa. Muat ulang halaman ini.", true); return; }
      if (p.anggota !== true) { tamu("Akunmu menunggu persetujuan", "Tantangan hanya untuk anggota. Hubungi guru agar akunmu disetujui.", null); return; }

      const [rs, rm] = await Promise.all([
        akun.minta("/rest/v1/tantangan?select=id,judul,bahasa,tingkat,poin,penilaian,deskripsi,kode_awal&id=eq." + id),
        akun.minta("/rest/v1/tantangan_selesai?select=status,poin,kode&tantangan_id=eq." + id)
      ]);
      const s = rs.ok && Array.isArray(rs.data) ? rs.data[0] : null;
      if (!rs.ok) { pesan("Soal belum bisa dimuat. Coba lagi sebentar lagi.", true); return; }
      if (!s || !BAHASA[s.bahasa] || !TINGKAT[s.tingkat]) { tamu("Soal tidak ditemukan", "Soal ini mungkin sudah dinonaktifkan.", ["Daftar tantangan", "tantangan.html"]); return; }
      soal = s;
      pesan("");
      tampilkan(rm.ok && Array.isArray(rm.data) ? rm.data[0] : null);
    } catch (e) {
      pesan((e && e.message) || "Soal belum bisa dimuat.", true);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mulai);
  else mulai();
})();
