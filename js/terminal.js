// Terminal mini untuk kotak output (dipakai Python Editor dan C++ Editor).
// Menampilkan teks program dan, saat program menunggu input, memunculkan kolom ketik
// tepat di ujung teks, seperti terminal sungguhan. Jawaban diketik di sana, bukan di kotak lain.
(function () {
  function create(pre) {
    let textNode = document.createTextNode("");
    let inputEl = null;
    let waiting = null; // { finish }

    pre.textContent = "";
    pre.appendChild(textNode);

    function reset(text) {
      cancel();
      pre.textContent = "";
      textNode = document.createTextNode(text);
      pre.appendChild(textNode);
    }

    // Menampilkan teks biasa (tanpa kolom input).
    function show(text) {
      reset(String(text));
    }

    // Menampilkan teks lalu menunggu pengguna mengetik satu baris di ujungnya.
    // Hasil: { line } saat Enter, { eof: true } saat Ctrl+D, atau null bila dibatalkan.
    function prompt(text) {
      reset(String(text));
      pre.classList.add("is-waiting");

      inputEl = document.createElement("input");
      inputEl.type = "text";
      inputEl.className = "term-input";
      inputEl.autocomplete = "off";
      inputEl.autocapitalize = "none";
      inputEl.spellcheck = false;
      inputEl.setAttribute("autocorrect", "off");
      inputEl.setAttribute("enterkeyhint", "send");
      inputEl.setAttribute("aria-label", "Ketik input program, lalu tekan Enter");
      pre.appendChild(inputEl);

      const committed = String(text);
      const field = inputEl;

      return new Promise((resolve) => {
        function finish(result) {
          if (waiting === null || inputEl !== field) return;
          waiting = null;
          inputEl = null;
          pre.classList.remove("is-waiting");
          field.remove();
          // Ketikan pengguna tetap tampil di output, seperti terminal.
          textNode.nodeValue = committed + (result && result.line !== undefined ? result.line + "\n" : "");
          resolve(result);
        }

        waiting = { finish };

        field.addEventListener("input", () => {
          field.style.width = Math.max(2, field.value.length + 1) + "ch";
        });
        field.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            finish({ line: field.value });
          } else if ((event.ctrlKey || event.metaKey) && (event.key === "d" || event.key === "D")) {
            event.preventDefault();
            finish({ eof: true });
          }
        });

        focus();
        pre.scrollTop = pre.scrollHeight;
      });
    }

    // Membatalkan input yang sedang ditunggu (hasilnya null).
    function cancel() {
      if (waiting === null) return;
      const { finish } = waiting;
      finish(null);
    }

    function focus() {
      if (inputEl) inputEl.focus({ preventScroll: true });
    }

    function isWaiting() {
      return waiting !== null;
    }

    // Mengetuk area output mana pun langsung memfokuskan kolom ketik.
    pre.addEventListener("click", () => {
      const selection = window.getSelection ? String(window.getSelection()) : "";
      if (inputEl && !selection) focus();
    });

    return { show, prompt, cancel, focus, isWaiting };
  }

  window.CkTerminal = { create };
})();
