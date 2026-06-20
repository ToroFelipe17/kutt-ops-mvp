export type VisualTheme = "dark" | "light";

export const THEME_STORAGE_KEY = "kutt-theme-mode";
export const THEME_CHANGE_EVENT = "kutt-theme-change";

const THEME_COLORS: Record<VisualTheme, string> = {
  dark: "#171719",
  light: "#f8f8f7",
};

const LEGACY_INLINE_THEME_PROPERTIES = [
  "--primary",
  "--primary-foreground",
  "--accent",
  "--accent-foreground",
  "--border",
  "--border-strong",
  "--ring",
];

export const VISUAL_THEMES: Array<{
  value: VisualTheme;
  label: string;
  hint: string;
  previewClassName: string;
}> = [
  {
    value: "dark",
    label: "Oscuro premium",
    hint: "Grafito, contraste alto y foco operativo.",
    previewClassName: "bg-[#171719] text-white border-white/10",
  },
  {
    value: "light",
    label: "Claro minimalista",
    hint: "Base limpia, luminosa y simple.",
    previewClassName: "bg-[#f8f8f7] text-[#202024] border-black/10",
  },
];

export function normalizeVisualTheme(value: string | null): VisualTheme {
  return value === "light" ? "light" : "dark";
}

export function getStoredVisualTheme(): VisualTheme {
  if (typeof window === "undefined") return "dark";
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const theme = normalizeVisualTheme(storedTheme);
    if (storedTheme !== theme) window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    return theme;
  } catch {
    return "dark";
  }
}

export function applyVisualTheme(theme: VisualTheme) {
  if (typeof document === "undefined") return;
  const normalizedTheme = normalizeVisualTheme(theme);
  const root = document.documentElement;
  LEGACY_INLINE_THEME_PROPERTIES.forEach((property) => root.style.removeProperty(property));
  root.dataset.theme = normalizedTheme;
  root.classList.toggle("dark", normalizedTheme === "dark");
  root.style.colorScheme = normalizedTheme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLORS[normalizedTheme]);
}

export function setStoredVisualTheme(theme: VisualTheme) {
  if (typeof window === "undefined") return;
  const normalizedTheme = normalizeVisualTheme(theme);
  applyVisualTheme(normalizedTheme);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, normalizedTheme);
  } catch {
    // The selected theme still applies for this session when storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: normalizedTheme }));
}
