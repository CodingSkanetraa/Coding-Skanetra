const THEME_STORAGE_KEY = "codingskanetra-theme";
const THEME_MODE_KEY = "codingskanetra-mode";

const themePresets = {
  emerald: {
    name: "Emerald",
    colors: {
      background: "#0b100e",
      surface: "#111915",
      surfaceHover: "#16211a",
      text: "#edf4ef",
      muted: "#99a89e",
      accent: "#70d99a",
      accentDark: "#2f9b62",
      border: "#25342b",
      navbarBackground: "rgb(11 16 14 / 92%)",
      navbarBorder: "rgb(37 52 43 / 75%)",
      cardBackground: "#121a15",
      cardHoverBackground: "#16231a",
      codeBackground: "#0e1511",
      codePanelBackground: "#111a15",
      buttonText: "#07120b",
      accentSoft: "rgb(112 217 154 / 8%)",
      accentGlow: "rgb(112 217 154 / 10%)",
      accentLight: "#d9f8e4",
      danger: "#ff8a80",
      warning: "#f0d77a"
    }
  },

  ocean: {
    name: "Ocean",
    colors: {
      background: "#0a1018",
      surface: "#111b29",
      surfaceHover: "#18283a",
      text: "#edf5ff",
      muted: "#9aadc4",
      accent: "#69baff",
      accentDark: "#287dc0",
      border: "#263b52",
      navbarBackground: "rgb(10 16 24 / 92%)",
      navbarBorder: "rgb(38 59 82 / 75%)",
      cardBackground: "#142033",
      cardHoverBackground: "#192b42",
      codeBackground: "#0d1724",
      codePanelBackground: "#111d2b",
      buttonText: "#07111d",
      accentSoft: "rgb(105 186 255 / 8%)",
      accentGlow: "rgb(105 186 255 / 10%)",
      accentLight: "#dcefff",
      danger: "#ff8a80",
      warning: "#f0d77a"
    }
  },

  amethyst: {
    name: "Amethyst",
    colors: {
      background: "#120e18",
      surface: "#1b1424",
      surfaceHover: "#281b35",
      text: "#f5efff",
      muted: "#b2a2c7",
      accent: "#c49aff",
      accentDark: "#8954c7",
      border: "#3b2b4d",
      navbarBackground: "rgb(18 14 24 / 92%)",
      navbarBorder: "rgb(59 43 77 / 75%)",
      cardBackground: "#21172d",
      cardHoverBackground: "#2b1e3b",
      codeBackground: "#17101f",
      codePanelBackground: "#1d1527",
      buttonText: "#170b24",
      accentSoft: "rgb(196 154 255 / 8%)",
      accentGlow: "rgb(196 154 255 / 10%)",
      accentLight: "#efe3ff",
      danger: "#ff8a80",
      warning: "#f0d77a"
    }
  },

  rose: {
    name: "Rose",
    colors: {
      background: "#180e12",
      surface: "#24151b",
      surfaceHover: "#352029",
      text: "#fff0f3",
      muted: "#c5a0ab",
      accent: "#ff91ad",
      accentDark: "#c94f76",
      border: "#4a2935",
      navbarBackground: "rgb(24 14 18 / 92%)",
      navbarBorder: "rgb(74 41 53 / 75%)",
      cardBackground: "#2b1921",
      cardHoverBackground: "#38202b",
      codeBackground: "#1d1118",
      codePanelBackground: "#25161e",
      buttonText: "#260c16",
      accentSoft: "rgb(255 145 173 / 8%)",
      accentGlow: "rgb(255 145 173 / 10%)",
      accentLight: "#ffe3ea",
      danger: "#ff9aa2",
      warning: "#f0d77a"
    }
  }
};

const lightPalettes = {
  emerald: {
    background: "#f3f8f4",
    surface: "#ffffff",
    surfaceHover: "#eaf4ed",
    text: "#20352a",
    muted: "#607064",
    accent: "#217c48",
    accentDark: "#17683a",
    border: "#d6e4da",
    navbarBackground: "rgb(255 255 255 / 92%)",
    navbarBorder: "rgb(214 228 218 / 85%)",
    cardBackground: "#ffffff",
    cardHoverBackground: "#f4fbf6",
    codeBackground: "#f0f5f1",
    codePanelBackground: "#e7efe9",
    buttonText: "#ffffff",
    accentSoft: "rgb(35 134 77 / 9%)",
    accentGlow: "rgb(35 134 77 / 12%)",
    accentLight: "#17683a",
    danger: "#c0392b",
    warning: "#966a00"
  },

  ocean: {
    background: "#f1f7fc",
    surface: "#ffffff",
    surfaceHover: "#e7f1fb",
    text: "#20364b",
    muted: "#5c6d83",
    accent: "#2171a8",
    accentDark: "#176397",
    border: "#d4e3f0",
    navbarBackground: "rgb(255 255 255 / 92%)",
    navbarBorder: "rgb(212 227 240 / 85%)",
    cardBackground: "#ffffff",
    cardHoverBackground: "#f0f7ff",
    codeBackground: "#edf4fa",
    codePanelBackground: "#e4eef7",
    buttonText: "#ffffff",
    accentSoft: "rgb(36 127 189 / 9%)",
    accentGlow: "rgb(36 127 189 / 12%)",
    accentLight: "#176397",
    danger: "#c0392b",
    warning: "#966a00"
  },

  amethyst: {
    background: "#f7f3fb",
    surface: "#ffffff",
    surfaceHover: "#f0e8f8",
    text: "#392747",
    muted: "#736281",
    accent: "#854fba",
    accentDark: "#693796",
    border: "#e3d7ee",
    navbarBackground: "rgb(255 255 255 / 92%)",
    navbarBorder: "rgb(227 215 238 / 85%)",
    cardBackground: "#ffffff",
    cardHoverBackground: "#faf5ff",
    codeBackground: "#f3edf8",
    codePanelBackground: "#ebe2f3",
    buttonText: "#ffffff",
    accentSoft: "rgb(135 80 189 / 9%)",
    accentGlow: "rgb(135 80 189 / 12%)",
    accentLight: "#693796",
    danger: "#c0392b",
    warning: "#966a00"
  },

  rose: {
    background: "#fff4f6",
    surface: "#ffffff",
    surfaceHover: "#ffeaef",
    text: "#492b35",
    muted: "#84626e",
    accent: "#b14766",
    accentDark: "#a9365b",
    border: "#f0d5de",
    navbarBackground: "rgb(255 255 255 / 92%)",
    navbarBorder: "rgb(240 213 222 / 85%)",
    cardBackground: "#ffffff",
    cardHoverBackground: "#fff3f6",
    codeBackground: "#fbf0f3",
    codePanelBackground: "#f5e5eb",
    buttonText: "#ffffff",
    accentSoft: "rgb(201 79 118 / 9%)",
    accentGlow: "rgb(201 79 118 / 12%)",
    accentLight: "#a9365b",
    danger: "#c0392b",
    warning: "#966a00"
  }
};


function getSavedMode() {
  try {
    return localStorage.getItem(THEME_MODE_KEY) === "light"
      ? "light"
      : "dark";
  } catch (error) {
    return "dark";
  }
}

function applyTheme(themeName, mode = getSavedMode()) {
  const preset = themePresets[themeName] || themePresets.emerald;
  const root = document.documentElement;

  const colors = mode === "light"
    ? lightPalettes[themeName] || lightPalettes.emerald
    : preset.colors;

  const cssVariables = {
    "--background": colors.background,
    "--surface": colors.surface,
    "--surface-hover": colors.surfaceHover,
    "--text": colors.text,
    "--muted": colors.muted,
    "--accent": colors.accent,
    "--accent-dark": colors.accentDark,
    "--border": colors.border,

    "--primary": colors.accent,
    "--text-muted": colors.muted,
    "--border-color": colors.border,

    "--navbar-background": colors.navbarBackground,
    "--navbar-border": colors.navbarBorder,
    "--card-background": colors.cardBackground,
    "--card-hover-background": colors.cardHoverBackground,
    "--code-background": colors.codeBackground,
    "--code-panel-background": colors.codePanelBackground,
    "--button-text": colors.buttonText,

    "--accent-soft": colors.accentSoft,
    "--accent-glow": colors.accentGlow,

        
    "--text-soft": mode === "light"
    ? colors.muted
    : "#bdcfc3",
    "--text-subtle": colors.muted,
    "--text-link": mode === "light"
    ? colors.text
    : "#c7d7cc",

    "--code-window-border": colors.border,
    "--code-window-dots": mode === "light"
    ? "#9aa99e"
    : "#435247",
    "--code-line-number": colors.muted,
    "--code-line-text": colors.text,
    "--code-output-text": mode === "light"
    ? colors.accentDark
    : "#a9dcb7",

    "--panel-heading-background": colors.surfaceHover,
    "--editor-background": mode === "light"
    ? "#f8faf9"
    : colors.codeBackground,
    "--editor-text": colors.text,
    "--editor-gutter-background": mode === "light"
    ? "#eaf0ec"
    : "#080d0b",
    "--console-background": colors.codeBackground,
    "--console-text": colors.text,

    "--hover-border": colors.accentDark,

    // Token bersama untuk semua halaman (CSS per-halaman wajib memakai ini, bukan hex tetap).
    "--accent-light": colors.accentLight,
    "--danger": colors.danger,
    "--warning": colors.warning,
    "--on-accent": colors.buttonText,
    "--shadow": mode === "light" ? "rgb(30 50 40 / 14%)" : "rgb(0 0 0 / 28%)",
    "--overlay": mode === "light" ? "rgb(20 30 25 / 40%)" : "rgb(0 0 0 / 65%)"
  };

  Object.entries(cssVariables).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });

  root.style.colorScheme = mode;
  root.dataset.theme = themeName;
  root.dataset.mode = mode;

  // Warna bilah browser (mobile) ikut tema.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", colors.background);
}

function setThemeMode(mode) {
  if (mode !== "light" && mode !== "dark") return;

  try {
    localStorage.setItem(THEME_MODE_KEY, mode);
  } catch (error) {
    // Mode tetap diterapkan untuk halaman ini.
  }

  applyTheme(getSavedTheme(), mode);
}


function getSavedTheme() {
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return savedTheme && themePresets[savedTheme]
      ? savedTheme
      : "emerald";
  } catch (error) {
    return "emerald";
  }
}

function setTheme(themeName) {
  if (!themePresets[themeName]) return;

  applyTheme(themeName);

  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeName);
  } catch (error) {
    // Tema tetap aktif untuk halaman ini meskipun penyimpanan gagal.
  }
}

// Terapkan tema tersimpan saat file ini dimuat.

applyTheme(getSavedTheme(), getSavedMode());

// Menyinkronkan tema bila diubah dari tab/halaman lain.
window.addEventListener("storage", (event) => {
  if (event.key === THEME_STORAGE_KEY || event.key === THEME_MODE_KEY) {
    applyTheme(getSavedTheme(), getSavedMode());
  }
});

window.CodingSkanetraTheme = {
  presets: themePresets,
  lightPalettes,
  getSavedTheme,
  getSavedMode,
  setTheme,
  setThemeMode,
  applyTheme
};

