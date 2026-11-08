// Daftar tantangan untuk anggota. Soal dibaca langsung dari Supabase (RLS: hanya anggota yang melihat soal aktif,
// dan tes tersembunyi tidak pernah terbaca dari browser). Pengiriman jawaban ada di tantangan-kerja.js.
(() => {
  "use strict";
  const BAHASA = { py: ["Py", "Python"], cpp: ["C++", "C++"], web: ["Web", "Web"] };
  const TINGKAT = { mudah: "Mudah", sedang: "Sedang", sulit: "Sulit" };
  const POLA_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const $ = (id) => document.getElementById(id);
  const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks !== undefined) e.textContent = teks; return e; };

  let soal = [];
  let status = new Map();
  let bahasa = "semua";

  function pesan(teks, galat) { const p = $("tg-pesan"); p.textContent = teks || ""; p.classList.toggle("galat", Boolean(galat)); }

  function tamu(judul, teks, tombol) {
    pesan("");
    const t = $("tg-tamu");
    t.textContent = "";
    t.append(el("strong", "", judul), el("p", "", teks));
    if (tombol) { const a = el("a", "tg-btn utama", tombol[0]); a.href = tombol[1]; t.append(a); }
    t.hidden = false;
  }

  function label(s) {
    if (!s) return null;
    if (s.status === "selesai") return el("span", "tg-label", "Selesai");
    if (s.status === "menunggu") return el("span", "tg-label menunggu", "Menunggu guru");
    if (s.status === "ditolak") return el("span", "tg-label ditolak", "Perlu diperbaiki");
    return null;
  }

  function ringkasan() {
    const r = $("tg-ringkas");
    r.textContent = "";
    const selesai = soal.filter((s) => (status.get(s.id) || {}).status === "selesai");
    const total = selesai.reduce((n, s) => n + (status.get(s.id).poin || 0), 0);
    [[total, "poin dari tantangan"], [selesai.length + " / " + soal.length, "soal selesai"]].forEach(([n, t]) => {
      const d = el("div");
      d.append(el("strong", "", String(n)), el("span", "", t));
      r.append(d);
    });
  }

  function gambar() {
    const ul = $("tg-daftar");
    ul.textContent = "";
    const tampil = soal.filter((s) => bahasa === "semua" || s.bahasa === bahasa);
    if (!tampil.length) { ul.append(el("li", "tg-pesan", soal.length ? "Belum ada soal untuk bahasa ini." : "Belum ada tantangan. Tunggu guru menambahkannya.")); return; }
    tampil.forEach((s) => {
      const st = status.get(s.id);
      const li = el("li", "tg-kartu" + (st && st.status === "selesai" ? " selesai" : ""));
      const a = el("a");
      a.href = "tantangan-kerja.html?id=" + encodeURIComponent(s.id);
      const info = el("span", "tg-info");
      const sub = el("small", "", TINGKAT[s.tingkat] + " · " + BAHASA[s.bahasa][1] + (s.penilaian === "manual" ? " · dinilai guru" : ""));
      info.append(el("strong", "", s.judul), sub);
      const l = label(st);
      if (l) info.append(l);
      const poin = el("span", "tg-poin");
      poin.append(el("b", "", "+" + s.poin), "poin");
      const tile = el("span", "tg-tile", BAHASA[s.bahasa][0]);
      tile.setAttribute("aria-hidden", "true");
      a.append(tile, info, poin);
      li.append(a);
      ul.append(li);
    });
  }

  async function mulai() {
    const akun = window.CodingSkanetraAkun;
    if (!akun || !akun.tersedia) { tamu("Fitur akun belum aktif", "Tantangan butuh akun. Hubungi pengelola.", null); return; }
    try { await akun.siap; } catch (e) { /* lanjut sebagai tamu */ }
    const pengguna = akun.pengguna();
    if (!pengguna) { tamu("Masuk untuk mengerjakan tantangan", "Poinmu tercatat di akunmu dan masuk ke peringkat.", ["Masuk", "login.html?next=tantangan"]); return; }

    try {
      const prof = await akun.minta("/rest/v1/profil?select=anggota,admin&limit=1");
      const p = prof.ok && Array.isArray(prof.data) ? prof.data[0] : null;
      if (!p) { pesan("Akunmu belum bisa diperiksa. Muat ulang halaman ini.", true); return; }
      if (p.admin === true) $("tg-admin").hidden = false;
      if (p.anggota !== true) { tamu("Akunmu menunggu persetujuan", "Tantangan hanya untuk anggota. Hubungi guru agar akunmu disetujui.", null); return; }

      const [rs, rt] = await Promise.all([
        akun.minta("/rest/v1/tantangan?select=id,judul,bahasa,tingkat,poin,penilaian&order=dibuat.desc"),
        akun.minta("/rest/v1/tantangan_selesai?select=tantangan_id,status,poin")
      ]);
      if (!rs.ok || !Array.isArray(rs.data)) { pesan("Tantangan belum bisa dimuat. Coba lagi sebentar lagi.", true); return; }
      soal = rs.data.filter((s) => s && POLA_ID.test(String(s.id)) && BAHASA[s.bahasa] && TINGKAT[s.tingkat]);
      status = new Map((rt.ok && Array.isArray(rt.data) ? rt.data : []).map((r) => [r.tantangan_id, r]));
    } catch (e) {
      pesan((e && e.message) || "Tantangan belum bisa dimuat.", true);
      return;
    }

    pesan("");
    ringkasan();
    gambar();
    $("tg-isi").hidden = false;
    $("tg-filter").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-b]");
      if (!b) return;
      bahasa = b.dataset.b;
      $("tg-filter").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      gambar();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mulai);
  else mulai();
})();
