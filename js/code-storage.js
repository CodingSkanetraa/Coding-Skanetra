// Penyimpanan kode editor di browser ini (localStorage), dipakai Editor HTML, Python, dan C++.
//
// Kode hanya disimpan saat tombol "Simpan" (atau Ctrl + S) ditekan, lalu dimuat otomatis
// saat editor dibuka lagi. Datanya tersimpan per browser dan per alamat situs: tidak ikut
// berpindah ke browser/perangkat lain, dan hilang bila data situs dihapus dari browser.
(function () {
  const PREFIX = "codingskanetra-code:";
  const VERSION = 1;

  // Hasil: { v, savedAt, data } atau null bila belum ada / tidak bisa dibaca.
  function read(name) {
    try {
      const raw = window.localStorage.getItem(PREFIX + name);
      if (!raw) return null;
      const item = JSON.parse(raw);
      if (!item || item.v !== VERSION || item.data === undefined) return null;
      return item;
    } catch (error) {
      return null;
    }
  }

  // Hasil: { ok: true } atau { ok: false, reason }.
  function write(name, data) {
    try {
      window.localStorage.setItem(
        PREFIX + name,
        JSON.stringify({ v: VERSION, savedAt: Date.now(), data })
      );
      return { ok: true };
    } catch (error) {
      const penuh = error && (error.name === "QuotaExceededError" || error.code === 22);
      return {
        ok: false,
        reason: penuh
          ? "penyimpanan browser penuh"
          : "browser memblokir penyimpanan (mode privat?)"
      };
    }
  }

  function remove(name) {
    try {
      window.localStorage.removeItem(PREFIX + name);
    } catch (error) {
      // diabaikan: tidak ada yang perlu dihapus bila penyimpanan tidak tersedia
    }
  }

  function formatTime(timestamp) {
    try {
      return new Date(timestamp).toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (error) {
      return "";
    }
  }

  // Menghubungkan tombol Simpan ke sebuah editor.
  //   button          tombol Simpan
  //   getKey()        nama penyimpanan saat ini (bisa berubah, mis. mode Console/Visual)
  //   getData()       isi yang disimpan (string atau objek biasa)
  //   notify(pesan)   menampilkan pesan di status editor
  //   successMessage()  (opsional) teks pesan setelah berhasil menyimpan
  // Tombol diberi titik kuning (class "is-dirty") bila ada perubahan yang belum disimpan.
  // Panggil refresh() setiap isi editor berubah.
  function bindButton(options) {
    const { button, getKey, getData, notify } = options;
    const baseline = {}; // nama -> isi terakhir yang dimuat/disimpan
    const idleHtml = button.innerHTML;
    let timer = null;

    const snapshot = () => JSON.stringify(getData());

    function refresh() {
      const key = getKey();
      if (!(key in baseline)) baseline[key] = snapshot();
      const dirty = snapshot() !== baseline[key];
      button.classList.toggle("is-dirty", dirty);
      button.title = dirty
        ? "Ada perubahan yang belum disimpan (Ctrl + S)"
        : "Simpan kode di browser ini (Ctrl + S)";
    }

    function save() {
      const result = write(getKey(), getData());
      if (!result.ok) {
        notify("Gagal menyimpan: " + result.reason + ".");
        return false;
      }
      baseline[getKey()] = snapshot();
      refresh();
      notify(
        options.successMessage
          ? options.successMessage()
          : "Kode disimpan di browser ini."
      );
      button.innerHTML = window.CodingSkanetraIkon
        ? window.CodingSkanetraIkon.svg("centang", 18) + '<span class="tb-label">Tersimpan</span>'
        : "✓ Tersimpan";
      button.classList.add("is-saved");
      clearTimeout(timer);
      timer = setTimeout(() => {
        button.innerHTML = idleHtml;
        button.classList.remove("is-saved");
      }, 1600);
      return true;
    }

    button.addEventListener("click", save);
    return { save, refresh };
  }

  // Ctrl + S / Cmd + S menyimpan, bukan membuka dialog "Simpan halaman" browser.
  function bindShortcut(element, save) {
    element.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === "s") {
        event.preventDefault();
        save();
      }
    });
  }

  window.CodeStorage = { read, write, remove, formatTime, bindButton, bindShortcut };
})();
