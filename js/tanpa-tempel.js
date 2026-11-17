// Editor kode: tempel kode dari luar editor tidak diizinkan (supaya latihan diketik sendiri).
// Ini hanya penghalang belajar yang ramah, bukan pengaman: orang yang bertekad tetap bisa mengakalinya.
// Yang tetap boleh: menyalin dan menempel kode yang disalin dari editor ini sendiri, dan menyeret teks di dalam editor.
(() => {
  "use strict";
  if (!window.CodeMirror || typeof CodeMirror.defineInitHook !== "function") return;

  const PESAN = "Tempel kode dari luar dimatikan di editor ini. Yuk ketik sendiri, begitu belajar coding paling cepat paham.";
  const rapikan = (t) => String(t == null ? "" : t).replace(/\r\n?/g, "\n");
  let salinan = null; // teks terakhir yang disalin dari dalam editor

  let waktu = 0;
  function beritahu() {
    let kotak = document.getElementById("cs-tanpa-tempel");
    if (!kotak) {
      if (!document.getElementById("cs-tanpa-tempel-gaya")) {
        const g = document.createElement("style");
        g.id = "cs-tanpa-tempel-gaya";
        g.textContent =
          "#cs-tanpa-tempel{position:fixed;z-index:4000;left:50%;bottom:calc(84px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);" +
          "width:min(92vw,440px);display:flex;align-items:flex-start;gap:10px;padding:11px 14px;border-radius:12px;font:600 .9rem/1.45 inherit;" +
          "background:var(--card-background,#121a15);color:var(--text,#edf4ef);border:1px solid var(--accent,#70d99a);box-shadow:0 14px 40px rgb(0 0 0/40%)}" +
          "#cs-tanpa-tempel button{flex:none;font:inherit;padding:4px 10px;border-radius:8px;border:0;cursor:pointer;background:var(--accent,#70d99a);color:var(--button-text,#07120b)}" +
          "#cs-tanpa-tempel span{flex:1}";
        document.head.appendChild(g);
      }
      kotak = document.createElement("div");
      kotak.id = "cs-tanpa-tempel";
      kotak.setAttribute("role", "status");
      kotak.setAttribute("aria-live", "polite");
      const isi = document.createElement("span");
      isi.textContent = PESAN;
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = "Oke";
      b.addEventListener("click", () => kotak.remove());
      kotak.append(isi, b);
      document.body.appendChild(kotak);
    }
    clearTimeout(waktu);
    waktu = setTimeout(() => { const k = document.getElementById("cs-tanpa-tempel"); if (k) k.remove(); }, 5000);
  }

  const dariEditor = (teks) => salinan !== null && rapikan(teks) === salinan;

  CodeMirror.defineInitHook((cm) => {
    const catat = () => { const t = cm.getSelection(); if (t) salinan = rapikan(t); };
    cm.on("copy", catat);
    cm.on("cut", catat);

    cm.on("paste", (_c, e) => {
      const teks = e.clipboardData ? e.clipboardData.getData("text") : null;
      if (teks !== null && dariEditor(teks)) return;
      e.preventDefault();
      beritahu();
    });

    // Jalur lain (seret dari luar, menu klik kanan, papan ketik HP) yang berakhir sebagai sisipan "paste".
    cm.on("beforeChange", (_c, perubahan) => {
      if (perubahan.origin !== "paste") return;
      if (dariEditor(perubahan.text.join("\n"))) return;
      perubahan.cancel();
      beritahu();
    });

    const ladang = cm.getInputField();
    ladang.addEventListener("beforeinput", (e) => {
      if (e.inputType !== "insertFromPaste" && e.inputType !== "insertFromDrop") return;
      const teks = typeof e.data === "string" ? e.data : (e.dataTransfer ? e.dataTransfer.getData("text") : null);
      if (teks === null || teks === undefined || dariEditor(teks)) return;
      e.preventDefault();
      beritahu();
    });

    // Seret dari luar editor: cegah di tingkat DOM supaya tidak sempat disisipkan.
    cm.on("drop", (_c, e) => {
      if (cm.state.draggingText) return; // seret di dalam editor sendiri
      const teks = e.dataTransfer ? e.dataTransfer.getData("text") : "";
      if (teks && dariEditor(teks)) return;
      e.preventDefault();
      beritahu();
    });
  });
})();
