import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { Check, ChevronLeft, Plus, Scissors, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import {
  createScheduleFromSimple,
  formatHour,
  getActiveWeeklySchedule,
  getSimpleScheduleRangeLabel,
  loadBusinessHoursSchedule,
  saveBusinessHoursSchedule,
  SIMPLE_SCHEDULE_RANGES,
  type BusinessDayHours,
  type BusinessHoursSchedule,
  type BusinessHoursMode,
  type SimpleScheduleRange,
  type WeekdayId,
} from "@/lib/business-hours";
import { clp } from "@/lib/format";
import {
  getStoredVisualTheme,
  setStoredVisualTheme,
  VISUAL_THEMES,
  type VisualTheme,
} from "@/lib/visual-theme";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/more/settings")({
  component: SettingsPage,
});

interface StaffRow {
  id: string;
  name: string;
  color: string | null;
  active: boolean;
  commission_pct: number;
}

interface ServiceRow {
  id: string;
  name: string;
  price: number;
  duration_min: number;
  active: boolean;
}

const STAFF_COLORS = ["#10b981", "#38bdf8", "#f59e0b", "#a78bfa", "#f43f5e"];

function SettingsPage() {
  const { business, refresh } = useBusiness();
  const qc = useQueryClient();
  const [visualTheme, setVisualTheme] = useState<VisualTheme>(() => getStoredVisualTheme());
  const [schedule, setSchedule] = useState<BusinessHoursSchedule>(() => createScheduleFromSimple());
  const [savingHours, setSavingHours] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffCommission, setNewStaffCommission] = useState("0");
  const [savingStaff, setSavingStaff] = useState(false);
  const [updatingStaffId, setUpdatingStaffId] = useState<string | null>(null);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [newServiceDuration, setNewServiceDuration] = useState("60");
  const [savingService, setSavingService] = useState(false);
  const [updatingServiceId, setUpdatingServiceId] = useState<string | null>(null);

  const { data: staff = [], isLoading: staffLoading } = useQuery({
    queryKey: ["settings-staff", business?.id],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("id,name,color,active,commission_pct")
        .eq("business_id", business!.id)
        .order("name");
      if (error) throw error;
      return (data ?? []) as StaffRow[];
    },
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["settings-services", business?.id],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id,name,price,duration_min,active")
        .eq("business_id", business!.id)
        .order("name");
      if (error) throw error;
      return (data ?? []) as ServiceRow[];
    },
  });

  useEffect(() => {
    setVisualTheme(getStoredVisualTheme());
  }, []);

  useEffect(() => {
    if (!business) return;
    setSchedule(loadBusinessHoursSchedule(business.id, business.open_hour, business.close_hour));
  }, [business]);

  const selectVisualTheme = (theme: VisualTheme) => {
    setVisualTheme(theme);
    setStoredVisualTheme(theme);
    toast.success("Preferencia visual actualizada");
  };

  const saveHours = async () => {
    if (!business || savingHours) return;
    if (schedule.openHour >= schedule.closeHour) {
      toast.error("La hora de cierre debe ser posterior a la apertura");
      return;
    }

    setSavingHours(true);
    const { error } = await supabase
      .from("businesses")
      .update({ open_hour: schedule.openHour, close_hour: schedule.closeHour })
      .eq("id", business.id);
    setSavingHours(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    const next =
      schedule.mode === "simple"
        ? createScheduleFromSimple(schedule.simpleRange, schedule.openHour, schedule.closeHour)
        : schedule;
    setSchedule(next);
    saveBusinessHoursSchedule(business.id, next);
    await refresh();
    toast.success("Horario actualizado");
  };

  const createStaff = async () => {
    if (!business || savingStaff) return;
    const name = newStaffName.trim();
    if (name.length < 2) {
      toast.error("Ingresa el nombre del barbero");
      return;
    }

    const commission = clampPercent(parseDecimalInput(newStaffCommission));
    setSavingStaff(true);
    const { error } = await supabase.from("staff").insert({
      business_id: business.id,
      name,
      color: STAFF_COLORS[staff.length % STAFF_COLORS.length],
      commission_pct: commission,
      active: true,
    });
    setSavingStaff(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setNewStaffName("");
    setNewStaffCommission("0");
    await qc.invalidateQueries({ queryKey: ["settings-staff", business.id] });
    await qc.invalidateQueries({ queryKey: ["staff", business.id] });
    await qc.invalidateQueries({ queryKey: ["caja-staff", business.id] });
    toast.success("Barbero creado");
  };

  const toggleStaff = async (member: StaffRow) => {
    if (!business || updatingStaffId) return;
    setUpdatingStaffId(member.id);
    const { error } = await supabase
      .from("staff")
      .update({ active: !member.active })
      .eq("business_id", business.id)
      .eq("id", member.id);
    setUpdatingStaffId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    await qc.invalidateQueries({ queryKey: ["settings-staff", business.id] });
    await qc.invalidateQueries({ queryKey: ["staff", business.id] });
    await qc.invalidateQueries({ queryKey: ["caja-staff", business.id] });
  };

  const createService = async () => {
    if (!business || savingService) return;
    const name = newServiceName.trim();
    const price = parseCurrencyInput(newServicePrice);
    const duration = Math.max(5, parseInt(newServiceDuration, 10) || 60);

    if (name.length < 2) {
      toast.error("Ingresa el nombre del servicio");
      return;
    }
    if (!price) {
      toast.error("Ingresa el precio del servicio");
      return;
    }

    setSavingService(true);
    const { error } = await supabase.from("services").insert({
      business_id: business.id,
      name,
      price,
      duration_min: duration,
      active: true,
    });
    setSavingService(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setNewServiceName("");
    setNewServicePrice("");
    setNewServiceDuration("60");
    await qc.invalidateQueries({ queryKey: ["settings-services", business.id] });
    await qc.invalidateQueries({ queryKey: ["services", business.id] });
    await qc.invalidateQueries({ queryKey: ["caja-services", business.id] });
    toast.success("Servicio creado");
  };

  const toggleService = async (service: ServiceRow) => {
    if (!business || updatingServiceId) return;
    setUpdatingServiceId(service.id);
    const { error } = await supabase
      .from("services")
      .update({ active: !service.active })
      .eq("business_id", business.id)
      .eq("id", service.id);
    setUpdatingServiceId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    await qc.invalidateQueries({ queryKey: ["settings-services", business.id] });
    await qc.invalidateQueries({ queryKey: ["services", business.id] });
    await qc.invalidateQueries({ queryKey: ["caja-services", business.id] });
  };

  const setHoursMode = (mode: BusinessHoursMode) => {
    if (mode === schedule.mode) return;
    if (mode === "custom") {
      setSchedule({ ...schedule, mode: "custom", days: getActiveWeeklySchedule(schedule) });
      return;
    }

    setSchedule(
      createScheduleFromSimple(schedule.simpleRange, schedule.openHour, schedule.closeHour),
    );
  };

  const updateSimpleRange = (simpleRange: SimpleScheduleRange) => {
    setSchedule(createScheduleFromSimple(simpleRange, schedule.openHour, schedule.closeHour));
  };

  const updateSimpleHour = (
    patch: Partial<Pick<BusinessHoursSchedule, "openHour" | "closeHour">>,
  ) => {
    const openHour = patch.openHour ?? schedule.openHour;
    const closeHour = patch.closeHour ?? schedule.closeHour;
    setSchedule(createScheduleFromSimple(schedule.simpleRange, openHour, closeHour));
  };

  const updateDay = (dayId: WeekdayId, patch: Partial<BusinessDayHours>) => {
    const next = {
      ...schedule,
      mode: "custom" as const,
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
  };

  return (
    <div className="min-h-screen bg-background pb-28 safe-top">
      <header className="px-5 pt-5 pb-3 flex items-center gap-3">
        <Link
          to="/more"
          className="h-9 w-9 rounded-full bg-surface hairline grid place-items-center"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Ajustes</p>
          <h1 className="text-xl font-semibold tracking-tight">
            {business?.name ?? "Tu barbería"}
          </h1>
        </div>
      </header>

      <main className="px-5 mt-2 space-y-3">
        <SettingsPanel eyebrow="Preferencias visuales" title="Tono visual">
          <p className="text-xs text-muted-foreground">Elige el tono visual de tu sistema</p>
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
        </SettingsPanel>

        <SettingsPanel
          eyebrow="Horario"
          title={schedule.mode === "simple" ? "Horario simple" : "Personalizar días"}
          action={
            <button
              type="button"
              onClick={saveHours}
              disabled={!business || savingHours}
              className="h-9 px-3 rounded-full bg-foreground text-background text-xs font-medium active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {savingHours ? "Guardando" : "Guardar"}
            </button>
          }
        >
          <p className="text-xs text-muted-foreground">
            {schedule.mode === "simple"
              ? `${getSimpleScheduleRangeLabel(schedule.simpleRange)} · ${formatHour(schedule.openHour)} - ${formatHour(schedule.closeHour)}`
              : "Edita cada día de forma independiente"}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-background/40 hairline p-1">
            {(["simple", "custom"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setHoursMode(mode)}
                className={`h-10 rounded-xl text-sm font-medium transition-colors ${
                  schedule.mode === mode ? "bg-foreground text-background" : "text-muted-foreground"
                }`}
              >
                {mode === "simple" ? "Horario simple" : "Personalizar días"}
              </button>
            ))}
          </div>

          {schedule.mode === "simple" ? (
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Aplicar horario a
                </p>
                <div className="mt-2 grid gap-2">
                  {SIMPLE_SCHEDULE_RANGES.map((range) => (
                    <button
                      key={range.value}
                      type="button"
                      onClick={() => updateSimpleRange(range.value)}
                      className={`h-11 rounded-xl px-3 flex items-center justify-between text-sm font-medium hairline transition-colors ${
                        schedule.simpleRange === range.value
                          ? "bg-foreground/5 hairline-strong"
                          : "bg-background/40 text-muted-foreground"
                      }`}
                    >
                      <span>{range.label}</span>
                      {schedule.simpleRange === range.value && (
                        <Check className="w-4 h-4 text-success" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <HourStepper
                  label="Apertura"
                  value={schedule.openHour}
                  min={6}
                  max={schedule.closeHour - 1}
                  onChange={(value) => updateSimpleHour({ openHour: value })}
                />
                <HourStepper
                  label="Cierre"
                  value={schedule.closeHour}
                  min={schedule.openHour + 1}
                  max={23}
                  onChange={(value) => updateSimpleHour({ closeHour: value })}
                />
              </div>

              <WeeklyPreview days={getActiveWeeklySchedule(schedule)} />
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {schedule.days.map((day) => (
                <DayHoursRow key={day.day} day={day} onChange={updateDay} />
              ))}
            </div>
          )}
        </SettingsPanel>

        <SettingsPanel
          eyebrow="Equipo / Barberos"
          title="Barberos"
          action={<Users className="w-4 h-4 text-muted-foreground" />}
        >
          <div className="grid gap-2 sm:grid-cols-[1fr_7rem_auto]">
            <input
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              placeholder="Nombre del barbero"
              className="h-12 px-4 rounded-xl bg-background hairline text-sm outline-none focus:border-border-strong"
            />
            <label className="h-12 px-3 rounded-xl bg-background hairline flex flex-col justify-center">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Comisión
              </span>
              <input
                inputMode="decimal"
                value={newStaffCommission}
                onChange={(e) => setNewStaffCommission(e.target.value)}
                className="mt-0.5 bg-transparent text-sm font-medium outline-none"
              />
            </label>
            <button
              type="button"
              onClick={createStaff}
              disabled={!business || savingStaff}
              className="h-12 px-4 rounded-xl bg-foreground text-background text-sm font-semibold active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Crear
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {staffLoading ? (
              <p className="text-sm text-muted-foreground">Cargando barberos...</p>
            ) : staff.length === 0 ? (
              <p className="rounded-xl bg-background/40 hairline p-3 text-sm text-muted-foreground">
                Agrega al menos un barbero para usar Agenda y Caja con servicios.
              </p>
            ) : (
              staff.map((member) => (
                <div
                  key={member.id}
                  className="rounded-xl bg-background/40 hairline p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <span
                      className="h-8 w-8 rounded-full shrink-0"
                      style={{ background: member.color ?? "var(--color-muted)" }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{member.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatPercent(member.commission_pct)} comisión
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleStaff(member)}
                    disabled={updatingStaffId === member.id}
                    className={`h-8 px-3 rounded-full text-xs font-medium active:scale-[0.98] transition-transform disabled:opacity-50 ${
                      member.active
                        ? "bg-success/15 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {member.active ? "Activo" : "Inactivo"}
                  </button>
                </div>
              ))
            )}
          </div>
        </SettingsPanel>

        <SettingsPanel
          eyebrow="Servicios"
          title="Catálogo"
          action={<Scissors className="w-4 h-4 text-muted-foreground" />}
        >
          <div className="grid gap-2 sm:grid-cols-[1fr_7rem_6rem_auto]">
            <input
              value={newServiceName}
              onChange={(e) => setNewServiceName(e.target.value)}
              placeholder="Nombre del servicio"
              className="h-12 px-4 rounded-xl bg-background hairline text-sm outline-none focus:border-border-strong"
            />
            <input
              inputMode="numeric"
              value={newServicePrice ? clp(parseCurrencyInput(newServicePrice)) : ""}
              onChange={(e) => setNewServicePrice(e.target.value.replace(/\D/g, ""))}
              placeholder="$0"
              className="h-12 px-4 rounded-xl bg-background hairline text-sm outline-none focus:border-border-strong"
            />
            <label className="h-12 px-3 rounded-xl bg-background hairline flex flex-col justify-center">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Min
              </span>
              <input
                inputMode="numeric"
                value={newServiceDuration}
                onChange={(e) => setNewServiceDuration(e.target.value.replace(/\D/g, ""))}
                className="mt-0.5 bg-transparent text-sm font-medium outline-none"
              />
            </label>
            <button
              type="button"
              onClick={createService}
              disabled={!business || savingService}
              className="h-12 px-4 rounded-xl bg-foreground text-background text-sm font-semibold active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Crear
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {servicesLoading ? (
              <p className="text-sm text-muted-foreground">Cargando servicios...</p>
            ) : services.length === 0 ? (
              <p className="rounded-xl bg-background/40 hairline p-3 text-sm text-muted-foreground">
                Crea servicios rápidos para agendar y cobrar sin fricción.
              </p>
            ) : (
              services.map((service) => (
                <div
                  key={service.id}
                  className="rounded-xl bg-background/40 hairline p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{service.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {clp(service.price)} · {service.duration_min} min
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleService(service)}
                    disabled={updatingServiceId === service.id}
                    className={`h-8 px-3 rounded-full text-xs font-medium active:scale-[0.98] transition-transform disabled:opacity-50 ${
                      service.active
                        ? "bg-success/15 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {service.active ? "Activo" : "Inactivo"}
                  </button>
                </div>
              ))
            )}
          </div>
        </SettingsPanel>
      </main>
    </div>
  );
}

function SettingsPanel({
  eyebrow,
  title,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-surface hairline p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">{eyebrow}</p>
          <h2 className="mt-1 text-base font-semibold">{title}</h2>
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
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
            day.isOpen ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
          }`}
        >
          {day.isOpen ? "Abierto" : "Cerrado"}
        </button>
      </div>

      {day.isOpen && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <HourStepper
            label="Apertura"
            value={day.openHour}
            min={6}
            max={day.closeHour - 1}
            onChange={(value) => onChange(day.day, { openHour: value })}
          />
          <HourStepper
            label="Cierre"
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

function WeeklyPreview({ days }: { days: BusinessDayHours[] }) {
  return (
    <div className="rounded-2xl bg-background/40 hairline p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Vista semanal</p>
      <div className="mt-2 space-y-1">
        {days.map((day) => (
          <div key={day.day} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{day.label}</span>
            <span className="font-medium tabular">
              {day.isOpen
                ? `${formatHour(day.openHour)} - ${formatHour(day.closeHour)}`
                : "Cerrado"}
            </span>
          </div>
        ))}
      </div>
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

function parseCurrencyInput(value: string): number {
  return parseInt(value.replace(/\D/g, ""), 10) || 0;
}

function parseDecimalInput(value: string): number {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function formatPercent(value: number): string {
  return `${Number(value ?? 0).toLocaleString("es-CL", { maximumFractionDigits: 1 })}%`;
}
