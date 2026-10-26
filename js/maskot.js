/* Skani, maskot Coding Skanetra.
   - Besar di beranda (#maskot), kecil melayang di halaman editor dan kuis.
   - Mata mengikuti kursor, berkedip, melambai, dan bereaksi pada hasil program/kuis.
   - Bisa dimatikan lewat Pengaturan (kunci localStorage "cs-maskot" = "off"). */
(() => {
  const KUNCI = "cs-maskot";
  const kurangGerak = window.matchMedia("(prefers-reduced-motion: reduce)");
  const baca = () => { try { return localStorage.getItem(KUNCI) !== "off"; } catch (e) { return true; } };
  const tulis = (aktif) => { try { localStorage.setItem(KUNCI, aktif ? "on" : "off"); } catch (e) { /* abaikan */ } };

  // Sakelar di halaman Pengaturan
  const sakelar = document.querySelector("#maskot-aktif");
  if (sakelar) {
    sakelar.checked = baca();
    sakelar.addEventListener("change", () => tulis(sakelar.checked));
  }
  if (!baca()) return;

  let nomor = 0;
  const SVG = (id) => `<svg viewBox="0 0 160 160" role="img" aria-hidden="true" focusable="false"><defs><linearGradient id="skani-badan-ID" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a6efc4"/><stop offset="1" stop-color="#6fd69a"/></linearGradient></defs><ellipse cx="80" cy="150" rx="38" ry="5" fill="#000" opacity=".22"/><g class="maskot-gerak"><g class="maskot-antena"><path d="M80 36 C80 26 82 22 84 16" stroke="#3f9f68" stroke-width="4" stroke-linecap="round" fill="none"/><circle cx="84" cy="13" r="6.5" fill="#ffd978"/><circle cx="82.2" cy="11.2" r="2" fill="#fff" opacity=".8"/></g><path d="M38 52 L44 24 Q46 18 52 22 L68 38 Z" fill="#6fd69a"/><path d="M122 52 L116 24 Q114 18 108 22 L92 38 Z" fill="#6fd69a"/><path d="M46 44 L49 31 L58 40 Z" fill="#ffb3c4" opacity=".85"/><path d="M114 44 L111 31 L102 40 Z" fill="#ffb3c4" opacity=".85"/><ellipse cx="62" cy="142" rx="13" ry="7" fill="#4eb97d"/><ellipse cx="98" cy="142" rx="13" ry="7" fill="#4eb97d"/><ellipse cx="25" cy="98" rx="8" ry="12" fill="#4eb97d" transform="rotate(14 25 98)"/><g class="maskot-lengan-kanan"><ellipse cx="135" cy="98" rx="8" ry="12" fill="#4eb97d" transform="rotate(-14 135 98)"/></g><rect x="28" y="34" width="104" height="104" rx="46" fill="url(#skani-badan-ID)"/><ellipse cx="56" cy="50" rx="16" ry="7" fill="#fff" opacity=".28" transform="rotate(-24 56 50)"/><rect x="40" y="62" width="80" height="54" rx="26" fill="#0e1a13"/><g class="maskot-wajah"><g class="maskot-mata-kiri"><ellipse cx="62" cy="86" rx="9" ry="11" fill="#e8fff1"/><ellipse cx="62" cy="87" rx="6.4" ry="8.4" fill="#0b100e"/><circle cx="59.8" cy="83.4" r="2.6" fill="#fff"/><circle cx="64.4" cy="90" r="1.2" fill="#fff" opacity=".8"/></g><g class="maskot-mata-kanan"><ellipse cx="98" cy="86" rx="9" ry="11" fill="#e8fff1"/><ellipse cx="98" cy="87" rx="6.4" ry="8.4" fill="#0b100e"/><circle cx="95.8" cy="83.4" r="2.6" fill="#fff"/><circle cx="100.4" cy="90" r="1.2" fill="#fff" opacity=".8"/></g><ellipse class="maskot-pipi" cx="48" cy="100" rx="6.5" ry="4" fill="#ff9db5"/><ellipse class="maskot-pipi" cx="112" cy="100" rx="6.5" ry="4" fill="#ff9db5"/><path class="maskot-mulut" d="M74 101 Q80 107 86 101" stroke="#a6efc4" stroke-width="2.6" stroke-linecap="round" fill="none"/><path class="maskot-mulut-senang" d="M73 100 Q80 111 87 100 Z" fill="#a6efc4" stroke="#a6efc4" stroke-width="2" stroke-linejoin="round"/></g><text x="80" y="131" text-anchor="middle" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="11" font-weight="700" fill="#2c7f50" opacity=".85">{ }</text></g></svg>`.replace(/ID/g, id);

  const SAPAAN = [
    "Hai! Aku Skani. Yuk belajar ngoding bareng!",
    "Salah itu biasa, namanya juga belajar.",
    "Coba buka Materi dulu, pelan-pelan aja.",
    "Habis baca, langsung coba di Playground ya!",
    "Error bukan musuh, itu petunjuk.",
    "Kamu pasti bisa! Satu baris dulu.",
    "Istirahat sebentar juga boleh, lho."
  ];

  // Membuat satu Skani di dalam wadah, mengembalikan kendalinya.
  const buat = (wadah, { gelembungAwal, tersembunyi } = {}) => {
    const id = "s" + (++nomor);
    wadah.classList.add("maskot");
    wadah.innerHTML =
      `<button class="maskot-badan" type="button" aria-label="Skani, maskot Coding Skanetra. Klik untuk menyapa">${SVG(id)}</button>` +
      `<p class="maskot-gelembung${tersembunyi ? " sembunyi" : ""}" aria-live="polite">${gelembungAwal || ""}</p>`;

    const badan = wadah.querySelector(".maskot-badan");
    const wajah = wadah.querySelector(".maskot-wajah");
    const gelembung = wadah.querySelector(".maskot-gelembung");
    let timerKedip = 0, timerTutup = 0, rafId = 0;
    let sasaranX = 0, sasaranY = 0, nowX = 0, nowY = 0, urutan = 0;

    const aksi = (kelas, ms) => {
      wadah.classList.remove(kelas);
      void wadah.offsetWidth;
      wadah.classList.add(kelas);
      window.setTimeout(() => wadah.classList.remove(kelas), ms);
    };

    const ucap = (teks, tutupMs) => {
      window.clearTimeout(timerTutup);
      gelembung.classList.add("ganti");
      window.setTimeout(() => {
        gelembung.textContent = teks;
        gelembung.classList.remove("ganti", "sembunyi");
      }, 160);
      if (tutupMs) timerTutup = window.setTimeout(() => gelembung.classList.add("sembunyi"), tutupMs);
    };

    const kedip = () => {
      wadah.classList.add("kedip");
      window.setTimeout(() => wadah.classList.remove("kedip"), 130);
    };
    const jadwalKedip = () => {
      window.clearTimeout(timerKedip);
      timerKedip = window.setTimeout(() => {
        kedip();
        if (Math.random() < 0.2) window.setTimeout(kedip, 220);
        jadwalKedip();
      }, 2200 + Math.random() * 3200);
    };

    const gerakMata = () => {
      nowX += (sasaranX - nowX) * 0.18;
      nowY += (sasaranY - nowY) * 0.18;
      wajah.style.transform = `translate(${nowX.toFixed(2)}px, ${nowY.toFixed(2)}px)`;
      rafId = (Math.abs(sasaranX - nowX) > 0.05 || Math.abs(sasaranY - nowY) > 0.05)
        ? requestAnimationFrame(gerakMata) : 0;
    };
    const lihat = (x, y) => {
      const k = badan.getBoundingClientRect();
      const dx = x - (k.left + k.width / 2);
      const dy = y - (k.top + k.height / 2);
      const jarak = Math.hypot(dx, dy) || 1;
      const kuat = Math.min(1, jarak / 220);
      sasaranX = (dx / jarak) * 4.5 * kuat;
      sasaranY = (dy / jarak) * 3.5 * kuat;
      if (!rafId) rafId = requestAnimationFrame(gerakMata);
    };

    // Reaksi: "senang" | "semangat" | "kaget"
    const bereaksi = (jenis, teks) => {
      ucap(teks, wadah.classList.contains("maskot-mini") ? 4200 : 0);
      if (jenis === "senang") {
        aksi("senang", 1600);
        if (!kurangGerak.matches) { aksi("loncat", 600); window.setTimeout(() => aksi("lambai", 950), 250); }
      } else if (jenis === "semangat") {
        aksi("sedih", 2200);
      } else {
        if (!kurangGerak.matches) aksi("lambai", 950);
      }
    };

    badan.addEventListener("click", () => {
      urutan = (urutan + 1) % SAPAAN.length;
      bereaksi("senang", SAPAAN[urutan]);
    });

    if (!kurangGerak.matches) {
      window.addEventListener("pointermove", (e) => lihat(e.clientX, e.clientY), { passive: true });
      jadwalKedip();
      window.setTimeout(() => aksi("lambai", 950), 700);
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) window.clearTimeout(timerKedip); else jadwalKedip();
      });
    }
    return { bereaksi, ucap };
  };

  // ---------- Beranda: Skani besar ----------
  const besar = document.querySelector("#maskot");
  if (besar) buat(besar, { gelembungAwal: SAPAAN[0] });

  // ---------- Halaman editor & kuis: Skani kecil ----------
  const PANTAU = [
    { sel: "#py-status", nama: "py" },
    { sel: "#cpp-status", nama: "cpp" },
    { sel: "#editor-status", nama: "web" },
    { sel: "#quiz-feedback", nama: "kuis" }
  ].map((p) => ({ ...p, el: document.querySelector(p.sel) })).filter((p) => p.el);

  if (!besar && PANTAU.length) {
    const wadah = document.createElement("div");
    wadah.className = "maskot-mini";
    document.body.appendChild(wadah);
    const skani = buat(wadah, { tersembunyi: true });

    const TEBAK = [
      [/animasi berjalan/i, "senang", "Wah, ada yang bergerak! Keren!"],
      [/error|gagal|belum tepat|tidak bisa/i, "semangat", "Tenang, baca pesan errornya pelan-pelan. Kamu bisa!"],
      [/selesai|berhasil|benar|diperbarui|dijalankan ulang/i, "senang", "Mantap! Programmu jalan!"]
    ];
    let terakhirUcap = 0;
    const KUIS = { benar: "Betul sekali! Pintar!", salah: "Belum tepat, coba lagi ya. Aku yakin bisa!" };

    // Pesan dari modul lain (mis. penjelas error): document.dispatchEvent(new CustomEvent("skani:ucap", {detail}))
    document.addEventListener("skani:ucap", (e) => {
      const d = e.detail || {};
      if (d.teks) { terakhirUcap = Date.now(); skani.bereaksi(d.jenis || "kaget", String(d.teks).slice(0, 140)); }
    });

    PANTAU.forEach((p) => {
      let terakhir = p.el.textContent.trim();
      new MutationObserver(() => {
        const teks = p.el.textContent.trim();
        if (!teks || teks === terakhir) return;
        terakhir = teks;
        if (p.nama === "kuis") {
          const benar = /benar/i.test(teks) && !/belum/i.test(teks);
          skani.bereaksi(benar ? "senang" : "semangat", benar ? KUIS.benar : KUIS.salah);
          return;
        }
        if (Date.now() - terakhirUcap < 600) return; // penjelas error sudah bicara
        for (const [pola, jenis, ucapan] of TEBAK) {
          if (pola.test(teks)) { skani.bereaksi(jenis, ucapan); return; }
        }
      }).observe(p.el, { childList: true, characterData: true, subtree: true });
    });
  }
})();
