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
      cardBackground: "linear-gradient(145deg, #121a15, #0e1411)",
      cardHoverBackground: "linear-gradient(145deg, #16231a, #101713)",
      codeBackground: "#0e1511",
      codePanelBackground: "#111a15",
      buttonText: "#07120b",
      accentSoft: "rgb(112 217 154 / 8%)",
      accentGlow: "rgb(112 217 154 / 10%)"
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
      cardBackground: "linear-gradient(145deg, #142033, #0e1724)",
      cardHoverBackground: "linear-gradient(145deg, #192b42, #111d2c)",
      codeBackground: "#0d1724",
      codePanelBackground: "#111d2b",
      buttonText: "#07111d",
      accentSoft: "rgb(105 186 255 / 8%)",
      accentGlow: "rgb(105 186 255 / 10%)"
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
      cardBackground: "linear-gradient(145deg, #21172d, #17111f)",
      cardHoverBackground: "linear-gradient(145deg, #2b1e3b, #1d1428)",
      codeBackground: "#17101f",
      codePanelBackground: "#1d1527",
      buttonText: "#170b24",
      accentSoft: "rgb(196 154 255 / 8%)",
      accentGlow: "rgb(196 154 255 / 10%)"
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
      cardBackground: "linear-gradient(145deg, #2b1921, #1d1218)",
      cardHoverBackground: "linear-gradient(145deg, #38202b, #25161e)",
      codeBackground: "#1d1118",
      codePanelBackground: "#25161e",
      buttonText: "#260c16",
      accentSoft: "rgb(255 145 173 / 8%)",
      accentGlow: "rgb(255 145 173 / 10%)"
    }
  }
};

const lightPalettes = {
  emerald: {
    background: "#f3f8f4",
    surface: "#ffffff",
    surfaceHover: "#eaf4ed",
    text: "#20352a",
    muted: "#64766a",
    accent: "#23864d",
    accentDark: "#17683a",
    border: "#d6e4da",
    navbarBackground: "rgb(255 255 255 / 92%)",
    navbarBorder: "rgb(214 228 218 / 85%)",
    cardBackground: "linear-gradient(145deg, #ffffff, #f5faf6)",
    cardHoverBackground: "linear-gradient(145deg, #f4fbf6, #eaf5ed)",
    codeBackground: "#f0f5f1",
    codePanelBackground: "#e7efe9",
    buttonText: "#ffffff",
    accentSoft: "rgb(35 134 77 / 9%)",
    accentGlow: "rgb(35 134 77 / 12%)"
  },

  ocean: {
    background: "#f1f7fc",
    surface: "#ffffff",
    surfaceHover: "#e7f1fb",
    text: "#20364b",
    muted: "#637b91",
    accent: "#247fbd",
    accentDark: "#176397",
    border: "#d4e3f0",
    navbarBackground: "rgb(255 255 255 / 92%)",
    navbarBorder: "rgb(212 227 240 / 85%)",
    cardBackground: "linear-gradient(145deg, #ffffff, #f3f8fd)",
    cardHoverBackground: "linear-gradient(145deg, #f0f7ff, #e5f0fb)",
    codeBackground: "#edf4fa",
    codePanelBackground: "#e4eef7",
    buttonText: "#ffffff",
    accentSoft: "rgb(36 127 189 / 9%)",
    accentGlow: "rgb(36 127 189 / 12%)"
  },

  amethyst: {
    background: "#f7f3fb",
    surface: "#ffffff",
    surfaceHover: "#f0e8f8",
    text: "#392747",
    muted: "#81708f",
    accent: "#8750bd",
    accentDark: "#693796",
    border: "#e3d7ee",
    navbarBackground: "rgb(255 255 255 / 92%)",
    navbarBorder: "rgb(227 215 238 / 85%)",
    cardBackground: "linear-gradient(145deg, #ffffff, #faf6fd)",
    cardHoverBackground: "linear-gradient(145deg, #faf5ff, #f0e7f8)",
    codeBackground: "#f3edf8",
    codePanelBackground: "#ebe2f3",
    buttonText: "#ffffff",
    accentSoft: "rgb(135 80 189 / 9%)",
    accentGlow: "rgb(135 80 189 / 12%)"
  },

  rose: {
    background: "#fff4f6",
    surface: "#ffffff",
    surfaceHover: "#ffeaef",
    text: "#492b35",
    muted: "#8e6c78",
    accent: "#c94f76",
    accentDark: "#a9365b",
    border: "#f0d5de",
    navbarBackground: "rgb(255 255 255 / 92%)",
    navbarBorder: "rgb(240 213 222 / 85%)",
    cardBackground: "linear-gradient(145deg, #ffffff, #fff6f8)",
    cardHoverBackground: "linear-gradient(145deg, #fff3f6, #ffeaef)",
    codeBackground: "#fbf0f3",
    codePanelBackground: "#f5e5eb",
    buttonText: "#ffffff",
    accentSoft: "rgb(201 79 118 / 9%)",
    accentGlow: "rgb(201 79 118 / 12%)"
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

    "--hover-border": colors.accentDark

  };

  Object.entries(cssVariables).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });

  root.style.colorScheme = mode;
  root.dataset.theme = themeName;
  root.dataset.mode = mode;
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

window.CodingSkanetraTheme = {
  presets: themePresets,
  lightPalettes,
  getSavedTheme,
  getSavedMode,
  setTheme,
  setThemeMode,
  applyTheme
};

