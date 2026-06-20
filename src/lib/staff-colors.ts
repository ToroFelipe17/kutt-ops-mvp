export const DEFAULT_STAFF_COLOR = "#10b981";

const LEGACY_RED_STAFF_COLORS = new Set(["#ef4444", "#f43f5e"]);

export function getSafeStaffColor(color: string | null | undefined): string {
  const normalizedColor = color?.trim().toLowerCase();
  if (!normalizedColor || LEGACY_RED_STAFF_COLORS.has(normalizedColor)) {
    return DEFAULT_STAFF_COLOR;
  }
  return normalizedColor;
}
