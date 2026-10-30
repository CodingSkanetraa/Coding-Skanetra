
(() => {
  "use strict";

  const themeAPI = window.CodingSkanetraTheme;

  const EDITOR_KEY = "codingskanetra-editor-preferences";

  const defaults = {
    fontSize: 14,
    tabSize: 4,
    lineWrapping: false,
    lineNumbers: true,
    hint: true
  };

  const $ = (selector) => document.querySelector(selector);

  function readEditorPreferences() {
    try {
      const saved = JSON.parse(localStorage.getItem(EDITOR_KEY));
      const result = { ...defaults, ...(saved || {}) };

      // Validasi nilai agar penyimpanan yang rusak tidak merusak UI.
      if (![12, 13, 14, 15, 16, 18, 20].includes(Number(result.fontSize))) {
        result.fontSize = defaults.fontSize;
      }

      if (![2, 4].includes(Number(result.tabSize))) {
        result.tabSize = defaults.tabSize;
      }

      result.fontSize = Number(result.fontSize);
      result.tabSize = Number(result.tabSize);
      result.lineWrapping = Boolean(result.lineWrapping);
      result.lineNumbers = Boolean(result.lineNumbers);
      result.hint = result.hint !== false;

      return result;
    } catch {
      return { ...defaults };
    }
  }

  function saveEditorPreferences(preferences) {
    try {
      localStorage.setItem(EDITOR_KEY, JSON.stringify(preferences));
      if (window.CodingSkanetraAkun) window.CodingSkanetraAkun.sinkron.catat(EDITOR_KEY);
      $("#editor-status").textContent =
        "Preferensi editor berhasil disimpan di browser ini.";
    } catch {
      $("#editor-status").textContent =
        "Pengaturan tidak dapat disimpan. Periksa izin penyimpanan browser.";
    }
  }

  function renderThemeSelection() {
    if (!themeAPI) return;

    const mode = themeAPI.getSavedMode();
    const theme = themeAPI.getSavedTheme();

    document.querySelectorAll("[data-mode]").forEach((button) => {
      const selected = button.dataset.mode === mode;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    document.querySelectorAll("[data-theme]").forEach((button) => {
      const selected = button.dataset.theme === theme;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function renderEditorPreferences() {
    const preferences = readEditorPreferences();

    $("#editor-font-size").value = String(preferences.fontSize);
    $("#editor-tab-size").value = String(preferences.tabSize);
    $("#editor-wrap").checked = preferences.lineWrapping;
    $("#editor-line-numbers").checked = preferences.lineNumbers;
    $("#editor-hint").checked = preferences.hint;
  }

  function updateEditorPreference(key, value) {
    const preferences = readEditorPreferences();
    preferences[key] = value;
    saveEditorPreferences(preferences);
  }

  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!themeAPI) {
        $("#appearance-status").textContent =
          "API tema belum tersedia. Periksa pemuatan theme.js.";
        return;
      }

      themeAPI.setThemeMode(button.dataset.mode);
      renderThemeSelection();

      $("#appearance-status").textContent =
        "Mode tampilan diperbarui.";
    });
  });

  document.querySelectorAll("[data-theme]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!themeAPI) {
        $("#appearance-status").textContent =
          "API tema belum tersedia. Periksa pemuatan theme.js.";
        return;
      }

      themeAPI.setTheme(button.dataset.theme);
      renderThemeSelection();

      $("#appearance-status").textContent =
        "Warna tema diperbarui.";
    });
  });

  $("#editor-font-size").addEventListener("change", (event) => {
    updateEditorPreference("fontSize", Number(event.target.value));
  });

  $("#editor-tab-size").addEventListener("change", (event) => {
    updateEditorPreference("tabSize", Number(event.target.value));
  });

  $("#editor-wrap").addEventListener("change", (event) => {
    updateEditorPreference("lineWrapping", event.target.checked);
  });

  $("#editor-line-numbers").addEventListener("change", (event) => {
    updateEditorPreference("lineNumbers", event.target.checked);
  });

  $("#editor-hint").addEventListener("change", (event) => {
    updateEditorPreference("hint", event.target.checked);
  });

  $("#reset-settings").addEventListener("click", () => {
    const confirmed = window.confirm(
      "Kembalikan tema dan preferensi editor ke pengaturan awal?"
    );

    if (!confirmed) return;

    try {
      localStorage.removeItem(EDITOR_KEY);
      if (window.CodingSkanetraAkun) window.CodingSkanetraAkun.sinkron.catatHapus(EDITOR_KEY);

      if (themeAPI) {
        themeAPI.setTheme("emerald");
        themeAPI.setThemeMode("dark");
      }

      renderThemeSelection();
      renderEditorPreferences();

      $("#appearance-status").textContent =
        "Tema dikembalikan ke Emerald Dark.";
      $("#editor-status").textContent =
        "Preferensi editor dikembalikan ke default.";
    } catch {
      $("#editor-status").textContent =
        "Gagal mengatur ulang. Periksa izin penyimpanan browser.";
    }
  });

  renderThemeSelection();
  renderEditorPreferences();
})();
