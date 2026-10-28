/* Tampilan editor yang ringkas (Python, C++, Web):
   - Toolbar satu baris berisi ikon; aksi jarang dipakai masuk ke menu ⋯.
   - HP: tab Kode | Output, status jadi toast, contoh & referensi jadi laci, dan barisan simbol di atas keyboard.
   - Desktop: tata letak tetap dua panel; hanya tombolnya yang dirapikan (ikon + label). */
(() => {
  const I = window.CodingSkanetraIkon;
  if (!I) return;
  const qs = (s, r) => (r || document).querySelector(s);
  const qsa = (s, r) => Array.from((r || document).querySelectorAll(s));
  const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks) e.textContent = teks; return e; };

  const KONFIG = [
    {
      nama: "py", layout: ".py-editor-layout", aksi: ".py-actions", run: "#py-run", save: "#py-save", status: "#py-status",
      sekunder: [["#py-reset", "reset", "Atur ulang"], ["#py-clear", "bersihkan", "Bersihkan output"], ["#py-download", "unduh", "Unduh .py"]],
      laci: ".py-basics", tab: true,
      simbol: ["tab", "()", "[]", "{}", '""', "''", ":", "=", "#", ",", ".", "_", "+", "-", "*", "/", "%", "<", ">", "!", "←", "→"]
    },
    {
      nama: "cpp", layout: ".py-editor-layout", aksi: ".py-actions", run: "#cpp-run", save: "#cpp-save", status: "#cpp-status",
      sekunder: [["#cpp-reset", "reset", "Atur ulang"], ["#cpp-clear", "bersihkan", "Bersihkan output"], ["#cpp-download", "unduh", "Unduh .cpp"]],
      laci: ".py-basics", tab: true,
      simbol: ["tab", "()", "[]", "{}", '""', "''", ";", "<<", ">>", "#", ":", ",", ".", "=", "+", "-", "*", "/", "&", "!", "<", ">", "←", "→"]
    },
    {
      nama: "web", layout: ".playground-workspace", aksi: ".editor-actions", run: "#run-code", save: "#save-code", status: "#editor-status",
      sekunder: [["#reset-code", "reset", "Reset"]], bawaan: ".download-menu", laci: null, tab: false,
      simbol: ["tab", "<", ">", "</", "/", '""', "''", "=", "()", "{}", ";", ":", "#", ".", "-", "_", "←", "→"]
    }
  ];

  const cfg = KONFIG.find((k) => qs(k.run) && qs(k.aksi));
  if (!cfg) return;

  const hp = window.matchMedia("(max-width: 720px)");
  const aksi = qs(cfg.aksi), run = qs(cfg.run), save = qs(cfg.save), status = qs(cfg.status), layout = qs(cfg.layout);
  document.body.classList.add("halaman-editor");

  /* ---------- Ikon di tombol utama ---------- */
  I.isiTombol(run, "jalankan", "Jalankan");
  I.isiTombol(save, "simpan", "Simpan", { ikonSaja: true });
  save.setAttribute("aria-label", "Simpan");

  /* ---------- Menu ⋯ (aksi jarang dipakai) ---------- */
  const grup = el("div", "tb-more-group");
  grup.id = "tb-more-group";
  grup.setAttribute("role", "menu");
  cfg.sekunder.forEach(([sel, ik, label]) => {
    const b = qs(sel);
    if (!b) return;
    I.isiTombol(b, ik, label);
    grup.appendChild(b);
  });
  if (cfg.bawaan) { const b = qs(cfg.bawaan); if (b) grup.appendChild(b); }
  // Tombol Unduh Editor Web: ganti glyph teks (⭳ ▾) dengan ikon SVG supaya tidak jadi kotak kosong di sebagian HP.
  const tombolUnduh = qs("#download-toggle", grup); // grup belum masuk dokumen, jadi cari di dalamnya
  if (tombolUnduh) I.isiTombol(tombolUnduh, "unduh", "Unduh");

  const lebih = el("button", (cfg.nama === "web" ? "playground-reset" : "py-btn-secondary") + " tb-more-btn");
  lebih.type = "button";
  lebih.title = "Menu lainnya";
  lebih.setAttribute("aria-haspopup", "true");
  lebih.setAttribute("aria-expanded", "false");
  lebih.setAttribute("aria-controls", "tb-more-group");
  I.isiTombol(lebih, "lainnya", "Lainnya", { ikonSaja: true });
  save.insertAdjacentElement("afterend", lebih);
  lebih.insertAdjacentElement("afterend", grup);

  const bukaMenu = (ya) => {
    grup.classList.toggle("is-open", ya);
    lebih.setAttribute("aria-expanded", String(ya));
  };
  lebih.addEventListener("click", (e) => { e.stopPropagation(); bukaMenu(!grup.classList.contains("is-open")); });
  grup.addEventListener("click", (e) => { if (e.target.closest("button") && !e.target.closest(".download-toggle")) bukaMenu(false); });
  document.addEventListener("click", (e) => { if (!grup.contains(e.target) && e.target !== lebih) bukaMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") bukaMenu(false); });

  /* ---------- Desktop: tombol kembali ke Playground ---------- */
  const kembali = el("a", "py-btn-secondary tb-btn tb-kembali");
  kembali.href = "playground.html";
  kembali.title = "Kembali ke Playground";
  kembali.setAttribute("aria-label", "Kembali ke Playground");
  I.isiTombol(kembali, "kembali", "Playground");
  aksi.prepend(kembali);

  /* ---------- Desktop: Mode fokus keluar dari menu ⋯ agar selalu terlihat ---------- */
  const desktop = window.matchMedia("(min-width: 721px)");
  const susunDesktop = () => {
    const fokus = qs('[data-alat="fokus"]');
    if (!fokus) return;
    if (desktop.matches) {
      if (fokus.parentElement === grup) save.insertAdjacentElement("afterend", fokus);
    } else if (fokus.parentElement !== grup) {
      grup.prepend(fokus);
    }
  };
  desktop.addEventListener("change", susunDesktop);
  window.addEventListener("alat:siap", susunDesktop);
  susunDesktop();

  /* ---------- Tab Kode | Output (HP) ---------- */
  let setTab = () => {};
  if (cfg.tab && layout) {
    const tabs = el("div", "tb-tabs");
    tabs.setAttribute("role", "tablist");
    const tKode = el("button", "tb-tab is-active", "Kode");
    const tOut = el("button", "tb-tab", "Output");
    [tKode, tOut].forEach((t) => { t.type = "button"; t.setAttribute("role", "tab"); tabs.appendChild(t); });
    run.insertAdjacentElement("afterend", tabs);

    setTab = (nama) => {
      layout.dataset.tab = nama;
      tKode.classList.toggle("is-active", nama === "kode");
      tOut.classList.toggle("is-active", nama === "output");
      tKode.setAttribute("aria-selected", String(nama === "kode"));
      tOut.setAttribute("aria-selected", String(nama === "output"));
      if (nama === "kode") qsa(".CodeMirror").forEach((c) => { if (c.CodeMirror) c.CodeMirror.refresh(); });
      window.scrollTo(0, 0);
    };
    tKode.addEventListener("click", () => setTab("kode"));
    tOut.addEventListener("click", () => setTab("output"));
    layout.dataset.tab = "kode";
    tKode.setAttribute("aria-selected", "true");
    tOut.setAttribute("aria-selected", "false");
    run.addEventListener("click", () => { if (hp.matches) setTab("output"); });
  }

  /* ---------- Laci Contoh & referensi ---------- */
  if (cfg.laci) {
    const bagian = qsa(cfg.laci);
    if (bagian.length) {
      const laci = el("div", "py-laci");
      laci.id = "py-laci";
      const kepala = el("div", "py-laci-kepala");
      kepala.appendChild(el("strong", "", "Contoh & referensi"));
      const tutup = el("button", "py-btn-secondary tb-btn tb-ikon-saja");
      tutup.type = "button";
      I.isiTombol(tutup, "tutup", "Tutup", { ikonSaja: true });
      kepala.appendChild(tutup);
      const isi = el("div", "py-laci-isi");
      bagian[0].before(laci);
      laci.append(kepala, isi);
      bagian.forEach((b) => isi.appendChild(b));
      const latar = el("div", "py-laci-latar");
      laci.after(latar);

      const bContoh = el("button", "py-btn-secondary tb-contoh");
      bContoh.type = "button";
      bContoh.setAttribute("aria-controls", "py-laci");
      bContoh.setAttribute("aria-expanded", "false");
      I.isiTombol(bContoh, "contoh", "Contoh", { ikonSaja: true });
      bContoh.title = "Contoh dan referensi";
      (qs(".tb-tabs", aksi) || run).insertAdjacentElement("afterend", bContoh);

      const toggle = (ya) => {
        document.body.classList.toggle("laci-buka", ya);
        bContoh.setAttribute("aria-expanded", String(ya));
      };
      bContoh.addEventListener("click", () => toggle(!document.body.classList.contains("laci-buka")));
      const itemContoh = el("button", "py-btn-secondary tb-btn tb-item-contoh");
      itemContoh.type = "button";
      I.isiTombol(itemContoh, "contoh", "Contoh & referensi");
      itemContoh.addEventListener("click", () => toggle(true));
      grup.prepend(itemContoh);
      tutup.addEventListener("click", () => toggle(false));
      latar.addEventListener("click", () => toggle(false));
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggle(false); });
      laci.addEventListener("click", (e) => {
        if (e.target.closest("[data-example],[data-visual-example]") && hp.matches) {
          window.setTimeout(() => { toggle(false); setTab("kode"); }, 0);
        }
      });
    }
  }

  /* ---------- Mode fokus (desktop): output sebagai panel geser ---------- */
  const root = document.documentElement;
  run.addEventListener("click", () => {
    if (!hp.matches && root.classList.contains("mode-fokus")) root.classList.add("output-buka");
  });
  document.addEventListener("pointerdown", (e) => {
    if (!root.classList.contains("output-buka")) return;
    if (e.target.closest(".py-output-panel, .tb-btn#"+run.id)) return;
    root.classList.remove("output-buka");
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") root.classList.remove("output-buka"); });
  new MutationObserver(() => {
    // classList.remove pada kelas yang tidak ada tetap memicu observer lagi (putaran tanpa henti), jadi cek dulu.
    if (!root.classList.contains("mode-fokus") && root.classList.contains("output-buka")) root.classList.remove("output-buka");
  })
    .observe(root, { attributes: true, attributeFilter: ["class"] });

  /* ---------- Editor selalu mengisi ruang yang tersedia ---------- */
  const segarkan = () => qsa(".CodeMirror").forEach((c) => { if (c.CodeMirror) c.CodeMirror.refresh(); });
  window.addEventListener("resize", segarkan);
  window.addEventListener("load", () => window.setTimeout(segarkan, 150));
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => segarkan());
    qsa(".py-code-panel, .editor-panel").forEach((n) => ro.observe(n));
  }

  /* ---------- Status menjadi toast di HP ---------- */
  if (status) {
    let terakhir = status.textContent.trim();
    let timer = 0;
    new MutationObserver(() => {
      const t = status.textContent.trim();
      if (!t || t === terakhir) return;
      terakhir = t;
      if (!hp.matches || t === "Siap dijalankan") return;
      status.classList.add("toast-tampil");
      window.clearTimeout(timer);
      timer = window.setTimeout(() => status.classList.remove("toast-tampil"), 2800);
    }).observe(status, { childList: true, characterData: true, subtree: true });
  }

  /* ---------- Barisan simbol di atas keyboard (layar sentuh) ---------- */
  const sentuh = window.matchMedia("(max-width: 720px) and (pointer: coarse)");
  const bar = el("div", "tb-simbol");
  bar.setAttribute("role", "toolbar");
  bar.setAttribute("aria-label", "Simbol kode");
  bar.hidden = true;
  let cmAktif = null;

  const sisip = (kunci) => {
    const cm = cmAktif;
    if (!cm) return;
    if (kunci === "tab") cm.execCommand(cm.getOption("indentWithTabs") ? "insertTab" : "insertSoftTab");
    else if (kunci === "←") cm.execCommand("goCharLeft");
    else if (kunci === "→") cm.execCommand("goCharRight");
    else if (kunci.length === 2 && /^(\(\)|\[\]|\{\}|""|'')$/.test(kunci)) {
      cm.replaceSelection(kunci, "start");
      cm.execCommand("goCharRight");
    } else cm.replaceSelection(kunci, "end");
    cm.focus();
  };

  cfg.simbol.forEach((k) => {
    const b = el("button", "tb-simbol-tombol", k === "tab" ? "Tab" : k);
    b.type = "button";
    b.setAttribute("aria-label", k === "tab" ? "Tab" : k === "←" ? "Geser kursor ke kiri" : k === "→" ? "Geser kursor ke kanan" : "Sisipkan " + k);
    b.addEventListener("pointerdown", (e) => e.preventDefault()); // jangan mencuri fokus dari editor
    b.addEventListener("click", () => sisip(k));
    bar.appendChild(b);
  });
  document.body.appendChild(bar);

  const letakkan = () => {
    const vv = window.visualViewport;
    if (!vv) { bar.style.bottom = "0"; return; }
    bar.style.top = Math.max(0, vv.offsetTop + vv.height - bar.offsetHeight) + "px";
    bar.style.left = vv.offsetLeft + "px";
    bar.style.width = vv.width + "px";
  };
  const tampil = (ya) => {
    bar.hidden = !(ya && sentuh.matches);
    if (!bar.hidden) letakkan();
  };
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", letakkan);
    window.visualViewport.addEventListener("scroll", letakkan);
  }
  document.addEventListener("focusin", (e) => {
    const cm = e.target.closest && e.target.closest(".CodeMirror");
    if (cm && cm.CodeMirror) { cmAktif = cm.CodeMirror; tampil(true); }
    else if (!bar.contains(e.target)) tampil(false);
  });
  document.addEventListener("focusout", () => {
    window.setTimeout(() => {
      const a = document.activeElement;
      if (!(a && a.closest && a.closest(".CodeMirror"))) tampil(false);
    }, 120);
  });
})();
