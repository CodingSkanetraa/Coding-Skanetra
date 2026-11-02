/* Beranda HP: isi ikon shortcut dan sapaan sesuai akun yang sedang masuk. */
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
    const nama = p.username;
    halo.textContent = "Halo, @" + nama;
    sub.textContent = "Lihat profil dan proyekmu";
    tautan.setAttribute("href", "pages/profil.html");
    const foto = fotoLokal(p.id);
    if (foto) {
      const img = new Image();
      img.alt = "";
      img.src = foto;
      avatar.replaceChildren(img);
    } else {
      avatar.textContent = nama.charAt(0).toUpperCase();
    }
  };

  tampil();
  const akun = window.CodingSkanetraAkun;
  if (akun && akun.siap && akun.siap.then) akun.siap.then(tampil, () => {});
  window.addEventListener("cs:foto", tampil);
})();
