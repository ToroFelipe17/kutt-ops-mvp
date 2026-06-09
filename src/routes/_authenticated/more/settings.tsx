import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import {
  createDefaultBusinessHours,
  formatHour,
  hasStoredBusinessHoursSchedule,
  loadBusinessHoursSchedule,
  saveBusinessHoursSchedule,
  type BusinessDayHours,
  type BusinessHoursSchedule,
  type WeekdayId,
} from "@/lib/business-hours";
import { getStoredVisualTheme, setStoredVisualTheme, VISUAL_THEMES, type VisualTheme } from "@/lib/visual-theme";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/more/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { business, refresh } = useBusiness();
  const [visualTheme, setVisualTheme] = useState<VisualTheme>(() => getStoredVisualTheme());
  const [baseOpen, setBaseOpen] = useState(10);
  const [baseClose, setBaseClose] = useState(20);
  const [schedule, setSchedule] = useState<BusinessHoursSchedule>(() => createDefaultBusinessHours());
  const [customDaysOpen, setCustomDaysOpen] = useState(false);
  const [savingBase, setSavingBase] = useState(false);

  useEffect(() => {
    setVisualTheme(getStoredVisualTheme());
  }, []);

  useEffect(() => {
    if (!business) return;
    setBaseOpen(business.open_hour);
    setBaseClose(business.close_hour);
    setSchedule(loadBusinessHoursSchedule(business.id, business.open_hour, business.close_hour));
    setCustomDaysOpen(hasStoredBusinessHoursSchedule(business.id));
  }, [business]);

  const selectVisualTheme = (theme: VisualTheme) => {
    setVisualTheme(theme);
    setStoredVisualTheme(theme);
    toast.success("Preferencia visual actualizada");
  };

  const saveBaseSchedule = async () => {
    if (!business || savingBase) return;
    if (baseOpen >= baseClose) {
      toast.error("La hora de cierre debe ser posterior a la apertura");
      return;
    }

    setSavingBase(true);
    const { error } = await supabase
      .from("businesses")
      .update({ open_hour: baseOpen, close_hour: baseClose })
      .eq("id", business.id);
    setSavingBase(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (!customDaysOpen) {
      setSchedule(createDefaultBusinessHours(baseOpen, baseClose));
    }

    await refresh();
    toast.success("Horario base actualizado");
  };

  const updateDay = (dayId: WeekdayId, patch: Partial<BusinessDayHours>) => {
    if (!business) return;
    const next = {
      ...schedule,
      days: schedule.days.map((day) => {
        if (day.day !== dayId) return day;
        const updated = { ...day, ...patch };
        if (updated.openHour >= updated.closeHour) {
          updated.closeHour = Math.min(23, updated.openHour + 1);
        }
        return updated;
      }),
    };
    setSchedule(next);
    saveBusinessHoursSchedule(business.id, next);
  };

  const toggleCustomDays = () => {
    if (!business) return;
    const nextOpen = !customDaysOpen;
    setCustomDaysOpen(nextOpen);
    if (nextOpen) {
      saveBusinessHoursSchedule(business.id, schedule);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28 safe-top">
      <header className="px-5 pt-5 pb-3 flex items-center gap-3">
        <Link to="/more" className="h-9 w-9 rounded-full bg-surface hairline grid place-items-center">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Ajustes</p>
          <h1 className="text-xl font-semibold tracking-tight">{business?.name ?? "Tu barbería"}</h1>
        </div>
      </header>

      <section className="px-5 mt-2">
        <div className="rounded-2xl bg-surface hairline p-4">
          <p className="text-xs text-muted-foreground">Preferencias</p>
          <h2 className="mt-1 text-base font-semibold">Tono visual</h2>
          <div className="mt-4 grid gap-2">
            {VISUAL_THEMES.map((theme) => (
              <button
                key={theme.value}
                type="button"
                onClick={() => selectVisualTheme(theme.value)}
                className={`relative rounded-2xl border p-4 text-left active:scale-[0.99] transition-transform overflow-hidden ${theme.previewClassName}`}
              >
                <span className="flex items-center justify-between gap-4">
                  <span>
                    <span className="block text-sm font-semibold">{theme.label}</span>
                    <span className="mt-1 block text-xs opacity-70">{theme.hint}</span>
                  </span>
                  {visualTheme === theme.value && (
                    <span className="h-8 w-8 rounded-full bg-current/10 grid place-items-center shrink-0">
                      <Check className="w-4 h-4" strokeWidth={3} />
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 mt-2">
        <div className="rounded-2xl bg-surface hairline p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Horario base</p>
              <h2 className="mt-1 text-base font-semibold">
                Lunes a viernes: {formatHour(baseOpen)} - {formatHour(baseClose)}
              </h2>
            </div>
            <button
              type="button"
              onClick={saveBaseSchedule}
              disabled={!business || savingBase}
              className="h-9 px-3 rounded-full bg-foreground text-background text-xs font-medium active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {savingBase ? "Guardando" : "Guardar"}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <HourStepper
              label="Abre"
              value={baseOpen}
              min={6}
              max={baseClose - 1}
              onChange={setBaseOpen}
            />
            <HourStepper
              label="Cierra"
              value={baseClose}
              min={baseOpen + 1}
              max={23}
              onChange={setBaseClose}
            />
          </div>

          <button
            type="button"
            onClick={toggleCustomDays}
            disabled={!business}
            className="mt-4 w-full h-11 rounded-xl bg-background/40 hairline px-3 flex items-center justify-between text-sm font-medium active:scale-[0.99] transition-transform disabled:opacity-50"
          >
            <span>Personalizar días</span>
            {customDaysOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {customDaysOpen && (
            <div className="mt-3 space-y-2">
              {schedule.days.map((day) => (
                <DayHoursRow key={day.day} day={day} onChange={updateDay} />
              ))}
            </div>
          )}
        </div>
      </section>

      <p className="mt-8 px-8 text-[11px] text-muted-foreground text-center">
        Próximamente: edición de equipo, servicios y preferencias avanzadas.
      </p>
    </div>
  );
}

function DayHoursRow({
  day,
  onChange,
}: {
  day: BusinessDayHours;
  onChange: (dayId: WeekdayId, patch: Partial<BusinessDayHours>) => void;
}) {
  return (
    <div className="rounded-2xl bg-background/40 hairline p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{day.label}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground tabular">
            {day.isOpen ? `${formatHour(day.openHour)} - ${formatHour(day.closeHour)}` : "Cerrado"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(day.day, { isOpen: !day.isOpen })}
          className={`h-8 px-3 rounded-full text-xs font-medium active:scale-[0.98] transition-transform ${
            day.isOpen
              ? "bg-success/15 text-success"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {day.isOpen ? "Activo" : "Cerrado"}
        </button>
      </div>

      {day.isOpen && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <HourStepper
            label="Abre"
            value={day.openHour}
            min={6}
            max={day.closeHour - 1}
            onChange={(value) => onChange(day.day, { openHour: value })}
          />
          <HourStepper
            label="Cierra"
            value={day.closeHour}
            min={day.openHour + 1}
            max={23}
            onChange={(value) => onChange(day.day, { closeHour: value })}
          />
        </div>
      )}
    </div>
  );
}

function HourStepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-xl bg-background/50 hairline p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="h-8 w-8 rounded-full bg-muted text-sm active:scale-90 transition-transform"
        >
          -
        </button>
        <span className="text-sm font-semibold tabular">{formatHour(value)}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="h-8 w-8 rounded-full bg-muted text-sm active:scale-90 transition-transform"
        >
          +
        </button>
      </div>
    </div>
  );
}
