// Halaman kiriman kelompok: pratinjau snapshot (tidak berubah), syarat, catatan, dan tinjauan pengelola.
(() => {
  "use strict";
  const K = window.CSKelompok;
  const $ = (id) => document.getElementById(id);
  const { el, rpc, waktu, lencana } = K;

  const id = new URLSearchParams(location.search).get("id") || "";
  let d = null;
  let admin = false;
  const kotakCek = new Map(); // syarat_id -> checkbox

  function pesan(teks, galat) {
    const p = $("tg-pesan");
    p.textContent = teks || "";
    p.classList.toggle("galat", Boolean(galat));
  }

  function gambar() {
    $("kg-judul").textContent = d.tugas + " · Kiriman " + d.nomor;
    $("kg-sub").textContent = d.kelompok + " · dikirim " + waktu(d.dikirim);
    const l = $("kg-lencana");
    l.textContent = "";
    l.appendChild(lencana(d.status));
    if (d.terlambat) l.appendChild(el("span", "tg-label kg-terlambat", "Terlambat"));
    if (!d.terbaru) l.appendChild(el("span", "tg-label", "Bukan kiriman terbaru"));

    const bagian = (d.snapshot && Array.isArray(d.snapshot.bagian)) ? d.snapshot.bagian : [];
    K.pasangPratinjau($("kg-iframe"), bagian);
    $("kg-kode").textContent = K.kode(bagian);

    $("kg-balik").href = admin ? "admin-kelompok.html" : "kelompok-tugas.html?id=" + encodeURIComponent(d.penugasan_id);

    const sy = $("kg-syarat");
    sy.textContent = "";
    if (!d.syarat.length) sy.appendChild(el("li", "", "Tugas ini tidak punya syarat khusus."));
    d.syarat.forEach((s) => {
      const li = el("li", s.terpenuhi ? "ok" : "");
      li.append(el("span", "kg-tanda", s.terpenuhi ? "✓" : "•"),
        el("span", "", s.teks + (s.wajib ? " (wajib)" : " (opsional)")));
      sy.appendChild(li);
    });

    const cat = $("kg-catatan-daftar");
    cat.textContent = "";
    d.catatan.forEach((c) => {
      const li = el("li", "", c.isi);
      li.appendChild(el("small", "", "Catatan pengelola" + (c.penulis ? " (@" + c.penulis + ")" : "") + " · " + waktu(c.waktu)));
      cat.appendChild(li);
    });

    const bisaTinjau = admin && d.terbaru && d.status !== "ditarik";
    $("kg-tinjau").hidden = !bisaTinjau;
    if (bisaTinjau) gambarTinjau();
  }

  function gambarTinjau() {
    const ul = $("kg-cek");
    ul.textContent = "";
    kotakCek.clear();
    if (!d.syarat.length) ul.appendChild(el("li", "", "Tidak ada syarat untuk dicentang."));
    d.syarat.forEach((s, i) => {
      const li = el("li");
      const cb = el("input");
      cb.type = "checkbox";
      cb.id = "kg-cek-" + i;
      cb.checked = Boolean(s.terpenuhi);
      kotakCek.set(s.id, cb);
      const lb = el("label", "", s.teks + (s.wajib ? " (wajib)" : " (opsional)"));
      lb.htmlFor = cb.id;
      li.append(cb, lb);
      ul.appendChild(li);
    });
  }

  async function tinjau(status) {
    const info = $("kg-tinjau-pesan");
    info.classList.remove("galat");
    info.textContent = "Menyimpan…";
    const cek = [];
    kotakCek.forEach((cb, sid) => cek.push({ syarat_id: sid, terpenuhi: cb.checked }));
    $("kg-terima").disabled = true;
    $("kg-revisi").disabled = true;
    try {
      await rpc("admin_pengumpulan_tinjau", { p_id: id, p_status: status, p_cek: cek, p_catatan: $("kg-catatan").value });
      $("kg-catatan").value = "";
      d = await rpc("pengumpulan_detail", { p_id: id });
      gambar();
      info.textContent = status === "diterima" ? "Kiriman diterima." : "Diminta revisi. Kelompok akan melihat catatanmu.";
    } catch (e) {
      info.textContent = e.message;
      info.classList.add("galat");
    } finally {
      $("kg-terima").disabled = false;
      $("kg-revisi").disabled = false;
    }
  }

  function pasangTab() {
    document.querySelectorAll(".kg-tab-btn[data-v]").forEach((b) => {
      b.addEventListener("click", () => {
        const kode = b.dataset.v === "kode";
        document.querySelectorAll(".kg-tab-btn[data-v]").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
        $("kg-iframe").hidden = kode;
        $("kg-kode").hidden = !kode;
      });
    });
  }

  async function mulai() {
    if (!K.POLA_ID.test(id)) { pesan("Alamat halaman tidak lengkap.", true); return; }
    const u = await K.wajibMasuk("kelompok");
    if (!u) return;
    pasangTab();
    $("kg-terima").addEventListener("click", () => tinjau("diterima"));
    $("kg-revisi").addEventListener("click", () => tinjau("perlu_revisi"));
    try {
      const [detail, profil] = await Promise.all([rpc("pengumpulan_detail", { p_id: id }), K.akun().profil().catch(() => null)]);
      d = detail;
      admin = Boolean(profil && profil.admin === true);
      pesan("");
      $("tg-isi").hidden = false;
      gambar();
    } catch (e) {
      pesan(e.message, true);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mulai); else mulai();
})();
