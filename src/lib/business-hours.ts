export type WeekdayId =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type BusinessHoursMode = "simple" | "custom";
export type SimpleScheduleRange = "weekdays" | "monday-saturday" | "full-week";

export interface BusinessDayHours {
  day: WeekdayId;
  label: string;
  isOpen: boolean;
  openHour: number;
  closeHour: number;
}

export interface BusinessHoursSchedule {
  version: 1;
  mode: BusinessHoursMode;
  simpleRange: SimpleScheduleRange;
  openHour: number;
  closeHour: number;
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

export const SIMPLE_SCHEDULE_RANGES: Array<{
  value: SimpleScheduleRange;
  label: string;
}> = [
  { value: "weekdays", label: "Lunes a viernes" },
  { value: "monday-saturday", label: "Lunes a sábado" },
  { value: "full-week", label: "Lunes a domingo" },
];

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function getSimpleScheduleRangeLabel(range: SimpleScheduleRange): string {
  return SIMPLE_SCHEDULE_RANGES.find((item) => item.value === range)?.label ?? "Lunes a viernes";
}

export function getBusinessHoursStorageKey(businessId: string): string {
  return `kutt-business-hours:${businessId}`;
}

export function createScheduleFromSimple(
  range: SimpleScheduleRange = "weekdays",
  openHour = 10,
  closeHour = 20,
  mode: BusinessHoursMode = "simple",
): BusinessHoursSchedule {
  const open = clampHour(openHour, 6, 22);
  const close = clampHour(Math.max(open + 1, closeHour), open + 1, 23);

  return {
    version: 1,
    mode,
    simpleRange: range,
    openHour: open,
    closeHour: close,
    days: WEEKDAYS.map(({ id, label }) => ({
      day: id,
      label,
      isOpen: isDayOpenForSimpleRange(id, range),
      openHour: open,
      closeHour: close,
    })),
  };
}

export function loadBusinessHoursSchedule(
  businessId: string,
  openHour: number,
  closeHour: number,
): BusinessHoursSchedule {
  const fallback = createScheduleFromSimple("weekdays", openHour, closeHour);
  if (typeof window === "undefined") return fallback;

  const raw = window.localStorage.getItem(getBusinessHoursStorageKey(businessId));
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as Partial<BusinessHoursSchedule>;
    const simpleRange = normalizeSimpleRange(parsed.simpleRange);
    const mode = parsed.mode === "custom" ? "custom" : "simple";
    const open = clampHour(Number(parsed.openHour ?? openHour), 6, 22);
    const close = clampHour(Number(parsed.closeHour ?? closeHour), open + 1, 23);
    const simpleSchedule = createScheduleFromSimple(simpleRange, open, close, mode);

    if (mode === "simple" || !Array.isArray(parsed.days)) {
      return simpleSchedule;
    }

    return {
      ...simpleSchedule,
      mode: "custom",
      days: WEEKDAYS.map(({ id, label }) => {
        const saved = parsed.days?.find((day) => day.day === id);
        const base = simpleSchedule.days.find((day) => day.day === id)!;
        const dayOpen = clampHour(Number(saved?.openHour ?? base.openHour), 6, 22);
        const dayClose = clampHour(Number(saved?.closeHour ?? base.closeHour), dayOpen + 1, 23);

        return {
          day: id,
          label,
          isOpen: typeof saved?.isOpen === "boolean" ? saved.isOpen : base.isOpen,
          openHour: dayOpen,
          closeHour: dayClose,
        };
      }),
    };
  } catch {
    return fallback;
  }
}

export function saveBusinessHoursSchedule(businessId: string, schedule: BusinessHoursSchedule) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getBusinessHoursStorageKey(businessId), JSON.stringify(schedule));
}

export function getActiveWeeklySchedule(schedule: BusinessHoursSchedule): BusinessDayHours[] {
  if (schedule.mode === "simple") {
    return createScheduleFromSimple(schedule.simpleRange, schedule.openHour, schedule.closeHour)
      .days;
  }

  return schedule.days;
}

function isDayOpenForSimpleRange(day: WeekdayId, range: SimpleScheduleRange): boolean {
  if (range === "full-week") return true;
  if (range === "monday-saturday") return day !== "sunday";
  return day !== "saturday" && day !== "sunday";
}

function normalizeSimpleRange(range: unknown): SimpleScheduleRange {
  if (range === "monday-saturday" || range === "full-week") return range;
  return "weekdays";
}

function clampHour(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}
