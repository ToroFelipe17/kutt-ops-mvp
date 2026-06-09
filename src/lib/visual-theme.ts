export type VisualTheme = "dark" | "light";

export const THEME_STORAGE_KEY = "kutt-theme-mode";
export const THEME_CHANGE_EVENT = "kutt-theme-change";

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
  return normalizeVisualTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
}

export function applyVisualTheme(theme: VisualTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
}

export function setStoredVisualTheme(theme: VisualTheme) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyVisualTheme(theme);
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: theme }));
}
