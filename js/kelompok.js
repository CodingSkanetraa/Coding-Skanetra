// Halaman Tugas Kelompok: daftar kelompok milik akun dan tugas yang sedang dikerjakan.
(() => {
  "use strict";
  const K = window.CSKelompok;
  const $ = (id) => document.getElementById(id);
  const { el, rpc, waktu, lencana } = K;

  function pesan(teks, galat) {
    const p = $("tg-pesan");
    p.textContent = teks || "";
    p.classList.toggle("galat", Boolean(galat));
  }

  function tenggatTeks(iso) {
    if (!iso) return "Tanpa tenggat";
    const lewat = new Date(iso).getTime() < Date.now();
    return "Tenggat " + waktu(iso) + (lewat ? " (sudah lewat)" : "");
  }

  function gambar(baris, adaAdmin) {
    const isi = $("kg-daftar");
    isi.textContent = "";
    if (!baris.length) {
      const k = el("div", "kg-kosong");
      k.appendChild(el("p", "", "Kamu belum masuk kelompok mana pun. Kelompok dibentuk oleh pengelola; hubungi pengelola bila seharusnya kamu sudah ada di dalamnya."));
      isi.appendChild(k);
    }
    const peta = new Map();
    baris.forEach((b) => {
      if (!peta.has(b.kelompok_id)) peta.set(b.kelompok_id, { info: b, tugas: [] });
      if (b.penugasan_id) peta.get(b.kelompok_id).tugas.push(b);
    });
    peta.forEach(({ info, tugas }) => {
      const bagian = el("section", "kg-kelompok");
      const kepala = el("div", "kg-kelompok-kepala");
      kepala.appendChild(el("h2", "", info.kelompok));
      kepala.appendChild(el("span", "tg-label" + (info.peran === "ketua" ? " kg-ketua" : ""), info.peran === "ketua" ? "Ketua" : "Anggota"));
      kepala.appendChild(el("span", "tg-meta", info.jumlah_anggota + " anggota"));
      if (info.diarsipkan) kepala.appendChild(el("span", "tg-label ditolak", "Diarsipkan (hanya baca)"));
      bagian.appendChild(kepala);

      if (!tugas.length) {
        bagian.appendChild(el("div", "kg-kosong", "Belum ada tugas untuk kelompok ini."));
      } else {
        const ul = el("ul", "kg-tugas");
        tugas.forEach((t) => {
          const li = el("li");
          const a = el("a");
          a.href = "kelompok-tugas.html?id=" + encodeURIComponent(t.penugasan_id);
          const info2 = el("span", "tg-info");
          info2.append(el("strong", "", t.judul), el("small", "", tenggatTeks(t.tenggat)));
          a.append(info2, lencana(t.status));
          li.appendChild(a);
          ul.appendChild(li);
        });
        bagian.appendChild(ul);
      }
      isi.appendChild(bagian);
    });

  }

  async function mulai() {
    const u = await K.wajibMasuk("kelompok");
    if (!u) return;
    try {
      const [baris, profil] = await Promise.all([
        rpc("kelompok_saya"),
        K.akun().profil().catch(() => null)
      ]);
      pesan("");
      $("tg-isi").hidden = false;
      gambar(Array.isArray(baris) ? baris : [], Boolean(profil && profil.admin === true));
    } catch (e) {
      pesan(e.message, true);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mulai); else mulai();
})();
