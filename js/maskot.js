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
  const SVG = (id) => `<svg viewBox="0 0 160 160" role="img" aria-hidden="true" focusable="false"><defs><linearGradient id="skani-badan-ID" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a6efc4"/><stop offset="1" stop-color="#6fd69a"/></linearGradient></defs><ellipse class="maskot-bayangan" cx="80" cy="150" rx="38" ry="5" fill="#000" opacity=".22"/><g class="maskot-gerak"><g class="maskot-antena"><path d="M80 36 C80 26 82 22 84 16" stroke="#3f9f68" stroke-width="4" stroke-linecap="round" fill="none"/><circle cx="84" cy="13" r="6.5" fill="#ffd978"/><circle cx="82.2" cy="11.2" r="2" fill="#fff" opacity=".8"/></g><g class="maskot-telinga-kiri"><path d="M38 52 L44 24 Q46 18 52 22 L68 38 Z" fill="#6fd69a"/><path d="M46 44 L49 31 L58 40 Z" fill="#ffb3c4" opacity=".85"/></g><g class="maskot-telinga-kanan"><path d="M122 52 L116 24 Q114 18 108 22 L92 38 Z" fill="#6fd69a"/><path d="M114 44 L111 31 L102 40 Z" fill="#ffb3c4" opacity=".85"/></g><ellipse cx="62" cy="142" rx="13" ry="7" fill="#4eb97d"/><ellipse cx="98" cy="142" rx="13" ry="7" fill="#4eb97d"/><g class="maskot-lengan-kiri"><ellipse cx="25" cy="98" rx="8" ry="12" fill="#4eb97d" transform="rotate(14 25 98)"/></g><g class="maskot-lengan-kanan"><ellipse cx="135" cy="98" rx="8" ry="12" fill="#4eb97d" transform="rotate(-14 135 98)"/></g><rect x="28" y="34" width="104" height="104" rx="46" fill="url(#skani-badan-ID)"/><ellipse cx="56" cy="50" rx="16" ry="7" fill="#fff" opacity=".28" transform="rotate(-24 56 50)"/><rect x="40" y="62" width="80" height="54" rx="26" fill="#0e1a13"/><g class="maskot-wajah"><g class="maskot-mata-kiri"><ellipse cx="62" cy="86" rx="9" ry="11" fill="#e8fff1"/><ellipse cx="62" cy="87" rx="6.4" ry="8.4" fill="#0b100e"/><circle cx="59.8" cy="83.4" r="2.6" fill="#fff"/><circle cx="64.4" cy="90" r="1.2" fill="#fff" opacity=".8"/></g><g class="maskot-mata-kanan"><ellipse cx="98" cy="86" rx="9" ry="11" fill="#e8fff1"/><ellipse cx="98" cy="87" rx="6.4" ry="8.4" fill="#0b100e"/><circle cx="95.8" cy="83.4" r="2.6" fill="#fff"/><circle cx="100.4" cy="90" r="1.2" fill="#fff" opacity=".8"/></g><ellipse class="maskot-pipi" cx="48" cy="100" rx="6.5" ry="4" fill="#ff9db5"/><ellipse class="maskot-pipi" cx="112" cy="100" rx="6.5" ry="4" fill="#ff9db5"/><path class="maskot-mulut" d="M74 101 Q80 107 86 101" stroke="#a6efc4" stroke-width="2.6" stroke-linecap="round" fill="none"/><path class="maskot-mulut-senang" d="M73 100 Q80 111 87 100 Z" fill="#a6efc4" stroke="#a6efc4" stroke-width="2" stroke-linejoin="round"/></g><text x="80" y="131" text-anchor="middle" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="11" font-weight="700" fill="#2c7f50" opacity=".85">{ }</text></g></svg>`.replace(/ID/g, id);

  const SAPAAN = [
    "Hai! Aku Skani. Yuk belajar ngoding bareng!",
    "Salah itu biasa, namanya juga belajar.",
    "Coba buka Materi dulu, pelan-pelan aja.",
    "Habis baca, langsung coba di Playground ya!",
    "Error bukan musuh, itu petunjuk.",
    "Kamu pasti bisa! Satu baris dulu.",
    "Istirahat sebentar juga boleh, lho."
  ];

  // ---------- Mesin gerak: pegas (spring) supaya gerakan meluncur halus, bukan kaku ----------
  const pegas = (k, c, x = 0) => ({ x, v: 0, t: x, k, c });
  const maju = (p, dt) => {
    const n = Math.max(1, Math.ceil(dt / 0.008));
    const h = dt / n;
    for (let i = 0; i < n; i++) { p.v += (p.k * (p.t - p.x) - p.c * p.v) * h; p.x += p.v * h; }
  };
  const batas = (v, a, b) => Math.min(b, Math.max(a, v));

  // Membuat satu Skani di dalam wadah, mengembalikan kendalinya.
  const buat = (wadah, { gelembungAwal, tersembunyi } = {}) => {
    const id = "s" + (++nomor);
    wadah.classList.add("maskot");
    wadah.innerHTML =
      `<button class="maskot-badan" type="button" aria-label="Skani, maskot Coding Skanetra. Klik untuk menyapa">${SVG(id)}</button>` +
      `<p class="maskot-gelembung${tersembunyi ? " sembunyi" : ""}" aria-live="polite">${gelembungAwal || ""}</p>`;

    const badan = wadah.querySelector(".maskot-badan");
    const gelembung = wadah.querySelector(".maskot-gelembung");
    const q = (s) => wadah.querySelector(s);
    const B = {
      gerak: q(".maskot-gerak"), antena: q(".maskot-antena"), wajah: q(".maskot-wajah"),
      lenganK: q(".maskot-lengan-kanan"), lenganI: q(".maskot-lengan-kiri"),
      telK: q(".maskot-telinga-kiri"), telR: q(".maskot-telinga-kanan"),
      mataK: q(".maskot-mata-kiri"), mataR: q(".maskot-mata-kanan"), bayangan: q(".maskot-bayangan")
    };
    let timerTutup = 0, urutan = 0;

    const aksi = (kelas, ms) => {
      wadah.classList.remove(kelas);
      void wadah.offsetWidth;
      wadah.classList.add(kelas);
      window.setTimeout(() => wadah.classList.remove(kelas), ms);
    };

    const ucap = (teks, tutupMs) => {
      window.clearTimeout(timerTutup);
      wadah.classList.add("bicara");
      gelembung.classList.add("ganti");
      window.setTimeout(() => {
        gelembung.textContent = teks;
        gelembung.classList.remove("ganti", "sembunyi");
      }, 160);
      if (tutupMs) timerTutup = window.setTimeout(() => { gelembung.classList.add("sembunyi"); wadah.classList.remove("bicara"); }, tutupMs);
    };

    // ---- Keadaan gerak (satuan: unit viewBox 160, derajat) ----
    const S = {
      angkat: pegas(130, 9),      // naik/turun badan
      miring: pegas(70, 9),       // kemiringan badan
      mataX: pegas(150, 17), mataY: pegas(150, 17),
      antena: pegas(60, 2.6),     // sengaja kurang teredam: bergoyang lembut
      telK: pegas(110, 5), telR: pegas(110, 5),
      lengan: pegas(190, 13), lenganI: pegas(120, 9),
      kedip: pegas(1100, 52),
      layu: pegas(36, 9),         // 0 = ceria, 1 = lesu
      sipit: pegas(60, 10)        // mata menyipit saat senang
    };
    const M = { lambaiMulai: -9, lambaiSampai: 0, pointer: 0, saccade: 0, saccadeX: 0, saccadeY: 0, kedipLagi: 0, telinga: 0, jongkok: 0 };
    let jalan = false, rafId = 0, tLama = 0, tMulai = 0, terlihat = true;

    const loncat = (kuat = 1) => {
      // antisipasi: jongkok sebentar, lalu meluncur ke atas
      S.angkat.t = 5 * kuat;
      window.setTimeout(() => { S.angkat.t = 0; S.angkat.v = -245 * kuat; S.telK.v += -90 * kuat; S.telR.v += 90 * kuat; S.antena.v += 120 * kuat; }, 95);
    };
    const lambai = (detik = 1.15) => {
      const sekarang = (performance.now() - tMulai) / 1000;
      M.lambaiMulai = sekarang; M.lambaiSampai = sekarang + detik;
    };
    const lesu = (ms) => { S.layu.t = 1; window.setTimeout(() => { S.layu.t = 0; }, ms); };

    const lihat = (x, y) => {
      M.pointer = performance.now();
      const k = badan.getBoundingClientRect();
      const dx = x - (k.left + k.width / 2);
      const dy = y - (k.top + k.height / 2);
      const jarak = Math.hypot(dx, dy) || 1;
      const kuat = Math.min(1, jarak / 220);
      S.mataX.t = (dx / jarak) * 4.8 * kuat;
      S.mataY.t = (dy / jarak) * 3.6 * kuat;
    };

    const bingkai = (now) => {
      rafId = 0;
      if (!jalan) return;
      const dt = Math.min(0.05, (now - tLama) / 1000 || 0.016);
      tLama = now;
      const t = (now - tMulai) / 1000;

      // Mata melirik sendiri bila kursor lama tidak bergerak
      if (now - M.pointer > 3200 && now > M.saccade) {
        S.mataX.t = (Math.random() - 0.5) * 7; S.mataY.t = (Math.random() - 0.4) * 4;
        M.saccade = now + 1800 + Math.random() * 3200;
      }
      // Kedip alami, kadang dua kali
      if (now > M.kedipLagi) {
        S.kedip.t = 1;
        window.setTimeout(() => { S.kedip.t = 0; }, 95);
        if (Math.random() < 0.22) { window.setTimeout(() => { S.kedip.t = 1; }, 230); window.setTimeout(() => { S.kedip.t = 0; }, 325); }
        M.kedipLagi = now + 2300 + Math.random() * 3400;
      }
      // Telinga sesekali bergerak
      if (now > M.telinga) {
        const sisi = Math.random() < 0.5 ? S.telK : S.telR;
        sisi.v += (sisi === S.telK ? -1 : 1) * (150 + Math.random() * 90);
        M.telinga = now + 3500 + Math.random() * 5000;
      }

      // Lambaian: lengan mengayun dengan amplop halus
      const w = t - M.lambaiMulai, durasi = M.lambaiSampai - M.lambaiMulai;
      if (t < M.lambaiSampai && w >= 0) {
        const amplop = Math.sin(Math.PI * Math.min(1, w / durasi)) ** 0.6;
        S.lengan.t = -34 * amplop - Math.sin(w * 15) * 17 * amplop;
      } else S.lengan.t = 0;
      S.lenganI.t = -S.lengan.x * 0.14;

      const napas = Math.sin(t * 1.9);
      const sway = Math.sin(t * 0.7) * 1.1;
      S.miring.t = (S.mataX.t / 4.8) * 3.2 + sway - S.layu.x * 3.5;
      const hidup = S.angkat.v;
      S.antena.t = -S.miring.v * 0.16 - hidup * 0.075 + S.layu.x * 30 + Math.sin(t * 1.3) * 2.5;
      S.telK.t = hidup * 0.05 + S.layu.x * 12;
      S.telR.t = -hidup * 0.05 - S.layu.x * 12;
      S.sipit.t = wadah.classList.contains("senang") ? 0.3 : 0;
      [S.angkat, S.miring, S.mataX, S.mataY, S.antena, S.telK, S.telR, S.lengan, S.lenganI, S.kedip, S.layu, S.sipit].forEach((p) => maju(p, dt));

      // Menerapkan ke SVG
      const naik = S.angkat.x, v = S.angkat.v;
      const s = batas(1 - v * 0.0007 - Math.max(0, naik) * 0.011, 0.78, 1.22);
      const sx = 1 / Math.sqrt(s), sy = s;
      const nap = 1 + napas * 0.009;
      B.gerak.style.transform = `translate(0px, ${(naik + napas * 0.7 + S.layu.x * 2.5).toFixed(2)}px) rotate(${S.miring.x.toFixed(2)}deg) scale(${(sx * nap).toFixed(4)}, ${(sy / nap).toFixed(4)})`;
      B.wajah.style.transform = `translate(${S.mataX.x.toFixed(2)}px, ${(S.mataY.x + S.layu.x * 1.2).toFixed(2)}px)`;
      B.antena.style.transform = `rotate(${(S.antena.x + S.miring.x * 0.4).toFixed(2)}deg)`;
      if (B.telK) B.telK.style.transform = `rotate(${S.telK.x.toFixed(2)}deg)`;
      if (B.telR) B.telR.style.transform = `rotate(${S.telR.x.toFixed(2)}deg)`;
      B.lenganK.style.transform = `rotate(${(S.lengan.x - v * 0.04).toFixed(2)}deg)`;
      if (B.lenganI) B.lenganI.style.transform = `rotate(${(S.lenganI.x + v * 0.03).toFixed(2)}deg)`;
      const mata = Math.max(0, 1 - 0.88 * S.kedip.x - 0.15 * S.layu.x - S.sipit.x);
      const sm = `scale(1, ${mata.toFixed(3)})`;
      B.mataK.style.transform = sm; B.mataR.style.transform = sm;
      if (B.bayangan) {
        const j = batas(1 + naik / 90, 0.7, 1.15);
        B.bayangan.style.transform = `scale(${(j * (1 + (s - 1) * -0.6)).toFixed(3)}, 1)`;
        B.bayangan.style.opacity = String(batas(0.22 * (2 - j), 0.1, 0.3).toFixed(3));
      }
      rafId = requestAnimationFrame(bingkai);
    };
    const mulaiGerak = () => {
      if (jalan || !terlihat || document.hidden) return;
      jalan = true; tLama = performance.now(); rafId = requestAnimationFrame(bingkai);
    };
    const hentiGerak = () => { jalan = false; if (rafId) cancelAnimationFrame(rafId); rafId = 0; };

    // Reaksi: "senang" | "semangat" | "kaget"
    const bereaksi = (jenis, teks) => {
      ucap(teks, wadah.classList.contains("maskot-mini") ? 4200 : 0);
      if (jenis === "senang") {
        aksi("senang", 1700);
        if (!kurangGerak.matches) { loncat(1); window.setTimeout(() => lambai(1.1), 320); }
      } else if (jenis === "semangat") {
        aksi("sedih", 2400);
        if (!kurangGerak.matches) lesu(2400);
      } else if (!kurangGerak.matches) { loncat(0.5); lambai(0.9); }
    };

    badan.addEventListener("click", () => {
      urutan = (urutan + 1) % SAPAAN.length;
      bereaksi("senang", SAPAAN[urutan]);
    });
    badan.addEventListener("pointerenter", () => { wadah.classList.add("sorot"); if (!kurangGerak.matches) { S.telK.v += -120; S.telR.v += 120; S.antena.v += 90; } });
    badan.addEventListener("pointerleave", () => wadah.classList.remove("sorot"));

    if (!kurangGerak.matches) {
      wadah.classList.add("maskot-hidup");
      tMulai = performance.now();
      window.addEventListener("pointermove", (e) => lihat(e.clientX, e.clientY), { passive: true });
      if ("IntersectionObserver" in window) {
        new IntersectionObserver((d) => { terlihat = d[d.length - 1].isIntersecting; if (terlihat) mulaiGerak(); else hentiGerak(); }).observe(badan);
      }
      document.addEventListener("visibilitychange", () => { if (document.hidden) hentiGerak(); else mulaiGerak(); });
      mulaiGerak();
      window.setTimeout(() => { loncat(0.55); lambai(1.2); }, 650);
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
