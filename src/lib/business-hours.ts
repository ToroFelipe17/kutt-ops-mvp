export type WeekdayId =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface BusinessDayHours {
  day: WeekdayId;
  label: string;
  isOpen: boolean;
  openHour: number;
  closeHour: number;
}

export interface BusinessHoursSchedule {
  version: 1;
  days: BusinessDayHours[];
}

export const WEEKDAYS: Array<{ id: WeekdayId; label: string }> = [
  { id: "monday", label: "Lunes" },
  { id: "tuesday", label: "Martes" },
  { id: "wednesday", label: "Miércoles" },
  { id: "thursday", label: "Jueves" },
  { id: "friday", label: "Viernes" },
  { id: "saturday", label: "Sábado" },
  { id: "sunday", label: "Domingo" },
];

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function getBusinessHoursStorageKey(businessId: string): string {
  return `kutt-business-hours:${businessId}`;
}

export function createDefaultBusinessHours(
  openHour = 10,
  closeHour = 20,
): BusinessHoursSchedule {
  const open = clampHour(openHour, 6, 22);
  const close = clampHour(Math.max(open + 1, closeHour), open + 1, 23);
  const saturdayClose = clampHour(Math.min(open + 4, close), open + 1, 23);

  return {
    version: 1,
    days: WEEKDAYS.map(({ id, label }) => {
      if (id === "sunday") {
        return { day: id, label, isOpen: false, openHour: open, closeHour: close };
      }

      if (id === "saturday") {
        return { day: id, label, isOpen: true, openHour: open, closeHour: saturdayClose };
      }

      return { day: id, label, isOpen: true, openHour: open, closeHour: close };
    }),
  };
}

export function hasStoredBusinessHoursSchedule(businessId: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(getBusinessHoursStorageKey(businessId)) != null;
}

export function loadBusinessHoursSchedule(
  businessId: string,
  openHour: number,
  closeHour: number,
): BusinessHoursSchedule {
  const fallback = createDefaultBusinessHours(openHour, closeHour);
  if (typeof window === "undefined") return fallback;

  const raw = window.localStorage.getItem(getBusinessHoursStorageKey(businessId));
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as Partial<BusinessHoursSchedule>;
    if (!Array.isArray(parsed.days)) return fallback;

    return {
      version: 1,
      days: WEEKDAYS.map(({ id, label }) => {
        const saved = parsed.days?.find((day) => day.day === id);
        const base = fallback.days.find((day) => day.day === id)!;
        const open = clampHour(Number(saved?.openHour ?? base.openHour), 6, 22);
        const close = clampHour(Number(saved?.closeHour ?? base.closeHour), open + 1, 23);

        return {
          day: id,
          label,
          isOpen: typeof saved?.isOpen === "boolean" ? saved.isOpen : base.isOpen,
          openHour: open,
          closeHour: close,
        };
      }),
    };
  } catch {
    return fallback;
  }
}

export function saveBusinessHoursSchedule(
  businessId: string,
  schedule: BusinessHoursSchedule,
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getBusinessHoursStorageKey(businessId), JSON.stringify(schedule));
}

function clampHour(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}
