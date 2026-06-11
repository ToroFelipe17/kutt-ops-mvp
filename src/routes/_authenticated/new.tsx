import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { addMinutes, clp, shortTime } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/new")({
  component: NewAppointment,
});

interface Service { id: string; name: string; duration_min: number; price: number; }
interface Staff { id: string; name: string; color: string | null; }
interface Client { id: string; name: string; phone: string | null; }

function NewAppointment() {
  const { business } = useBusiness();
  const navigate = useNavigate();

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [pickedClient, setPickedClient] = useState<Client | null>(null);
  const [serviceId, setServiceId] = useState<string>("");
  const [staffId, setStaffId] = useState<string>("");
  const [time, setTime] = useState<Date>(() => currentMinute());
  const [durationMin, setDurationMin] = useState(60);
  const [busy, setBusy] = useState(false);

  const { data: services = [] } = useQuery({
    queryKey: ["services", business?.id],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data } = await supabase.from("services").select("id,name,duration_min,price").eq("business_id", business!.id).eq("active", true).order("name");
      return (data ?? []) as Service[];
    },
  });
  const { data: staff = [] } = useQuery({
    queryKey: ["staff", business?.id],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data } = await supabase.from("staff").select("id,name,color").eq("business_id", business!.id).eq("active", true).order("name");
      return (data ?? []) as Staff[];
    },
  });
  const { data: recentClients = [] } = useQuery({
    queryKey: ["clients-recent", business?.id],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id,name,phone").eq("business_id", business!.id).order("last_visit_at", { ascending: false, nullsFirst: false }).limit(20);
      return (data ?? []) as Client[];
    },
  });

  // Auto-pick defaults
  useEffect(() => { if (!staffId && staff[0]) setStaffId(staff[0].id); }, [staff, staffId]);
  useEffect(() => { if (!serviceId && services[0]) setServiceId(services[0].id); }, [services, serviceId]);

  const service = useMemo(() => services.find((s) => s.id === serviceId) ?? null, [services, serviceId]);

  const filteredClients = useMemo(() => {
    if (!clientName.trim()) return recentClients.slice(0, 5);
    const q = clientName.toLowerCase();
    return recentClients.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 5);
  }, [clientName, recentClients]);

  const canSave = clientName.trim().length >= 2 && service && staffId;

  const save = async () => {
    if (!canSave || !business || busy) return;
    setBusy(true);
    try {
      let clientId = pickedClient?.id ?? null;
      // Create client if needed
      if (!clientId) {
        const { data: existing } = await supabase
          .from("clients")
          .select("id")
          .eq("business_id", business.id)
          .ilike("name", clientName.trim())
          .limit(1)
          .maybeSingle();
        if (existing) clientId = existing.id;
        else {
          const { data: created, error } = await supabase
            .from("clients")
            .insert({ business_id: business.id, name: clientName.trim(), phone: clientPhone.trim() || null })
            .select("id")
            .single();
          if (error) throw error;
          clientId = created.id;
        }
      }

      const { error } = await supabase.from("appointments").insert({
        business_id: business.id,
        client_id: clientId,
        staff_id: staffId,
        service_id: service!.id,
        client_name_snapshot: clientName.trim(),
        service_name_snapshot: service!.name,
        starts_at: time.toISOString(),
        duration_min: durationMin,
        price: service!.price,
        status: "pendiente",
      });
      if (error) throw error;

      toast.success("Cita creada");
      navigate({ to: "/today" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  const adjustTime = (mins: number) => setTime((t) => addMinutes(t, mins));
  const outsideHours = business
    ? time.getHours() < business.open_hour || time.getHours() >= business.close_hour
    : false;

  return (
    <div className="min-h-screen bg-background safe-top safe-bottom flex flex-col">
      <header className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={() => navigate({ to: "/today" })} className="h-10 w-10 rounded-full bg-surface hairline grid place-items-center active:scale-90 transition-transform">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-lg font-semibold">Nueva cita</h1>
      </header>

      <div className="flex-1 px-4 overflow-y-auto pb-32">
        {/* Cliente */}
        <Section label="Cliente">
          <input
            autoFocus
            value={clientName}
            onChange={(e) => { setClientName(e.target.value); setPickedClient(null); }}
            placeholder="Nombre"
            className="w-full h-14 px-4 rounded-2xl bg-surface hairline text-[15px] focus:outline-none focus:hairline-strong"
          />
          {filteredClients.length > 0 && !pickedClient && (
            <div className="mt-2 flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
              {filteredClients.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setPickedClient(c); setClientName(c.name); setClientPhone(c.phone ?? ""); }}
                  className="shrink-0 px-3 h-9 rounded-full bg-muted hairline text-xs active:scale-95 transition-transform"
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
          <input
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            placeholder="Teléfono (opcional)"
            inputMode="tel"
            className="mt-2 w-full h-12 px-4 rounded-2xl bg-surface hairline text-[14px] focus:outline-none focus:hairline-strong"
          />
        </Section>

        {/* Servicio */}
        <Section label="Servicio">
          <div className="grid grid-cols-1 gap-2">
            {services.map((s) => {
              const active = s.id === serviceId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setServiceId(s.id)}
                  className={`flex items-center justify-between rounded-2xl p-3.5 hairline text-left active:scale-[0.99] transition-transform ${active ? "bg-foreground/5 hairline-strong" : "bg-surface"}`}
                >
                  <div>
                    <p className="font-medium text-[15px]">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.duration_min} min</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm tabular font-semibold">{clp(s.price)}</span>
                    {active && <Check className="w-4 h-4 text-success" />}
                  </div>
                </button>
              );
            })}
          </div>
        </Section>

        {/* Barbero */}
        <Section label="Barbero">
          <div className="flex gap-2 flex-wrap">
            {staff.map((s) => {
              const active = s.id === staffId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStaffId(s.id)}
                  className={`flex items-center gap-2 px-4 h-11 rounded-full hairline active:scale-95 transition-transform ${active ? "bg-foreground text-background" : "bg-surface"}`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color ?? "#10b981" }} />
                  <span className="text-sm font-medium">{s.name}</span>
                </button>
              );
            })}
          </div>
        </Section>

        {/* Hora */}
        <Section label="Hora">
          <div className="rounded-2xl bg-surface hairline p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">
                {time.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" })}
              </p>
              <p className="text-3xl font-semibold tabular mt-0.5">{shortTime(time)}</p>
            </div>
            <Clock className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {[-30, -15, 15, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => adjustTime(d)}
                className="h-11 rounded-xl bg-muted hairline text-sm font-medium active:scale-95 transition-transform tabular"
              >
                {d > 0 ? `+${d}` : d}m
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="rounded-xl bg-surface hairline p-3">
              <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Fecha</span>
              <input
                type="date"
                value={dateInputValue(time)}
                onChange={(e) => setTime((current) => applyDateInput(current, e.target.value))}
                className="mt-1 w-full bg-transparent text-sm font-medium outline-none"
              />
            </label>
            <label className="rounded-xl bg-surface hairline p-3">
              <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Hora</span>
              <input
                type="time"
                value={timeInputValue(time)}
                onChange={(e) => setTime((current) => applyTimeInput(current, e.target.value))}
                className="mt-1 w-full bg-transparent text-sm font-medium outline-none"
              />
            </label>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setTime(currentMinute())} className="h-11 rounded-xl bg-muted hairline text-sm active:scale-95 transition-transform">Ahora</button>
            <button type="button" onClick={() => setTime(addMinutes(roundUpTo15(new Date()), 60))} className="h-11 rounded-xl bg-muted hairline text-sm active:scale-95 transition-transform">En 1h</button>
          </div>
          {outsideHours && (
            <p className="mt-2 text-xs text-warning px-1">
              Fuera del horario configurado. Puedes guardar igual.
            </p>
          )}
          <div className="mt-2 rounded-2xl bg-surface hairline p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Duración</p>
              <p className="mt-0.5 text-lg font-semibold tabular">{durationMin} min</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDurationMin((value) => Math.max(15, value - 15))}
                className="h-9 w-9 rounded-full bg-muted active:scale-90 transition-transform"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => setDurationMin((value) => Math.min(240, value + 15))}
                className="h-9 w-9 rounded-full bg-muted active:scale-90 transition-transform"
              >
                +
              </button>
            </div>
          </div>
        </Section>
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 inset-x-0 px-4 pb-5 pt-3 bg-gradient-to-t from-background via-background to-transparent">
        <div className="max-w-md mx-auto">
          <motion.button
            whileTap={{ scale: 0.98 }}
            disabled={!canSave || busy}
            onClick={save}
            className="w-full h-14 rounded-2xl bg-foreground text-background font-medium text-[15px] disabled:opacity-40"
          >
            {busy ? "Guardando..." : `Crear cita · ${service ? clp(service.price) : "—"}`}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2 px-1">{label}</p>
      {children}
    </section>
  );
}

function roundUpTo15(d: Date): Date {
  const x = new Date(d);
  const m = x.getMinutes();
  const add = 15 - (m % 15);
  x.setMinutes(m + (add === 15 ? 0 : add), 0, 0);
  return x;
}

function currentMinute(): Date {
  const now = new Date();
  now.setSeconds(0, 0);
  return now;
}

function dateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function timeInputValue(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function applyDateInput(current: Date, value: string): Date {
  if (!value) return current;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return current;
  const next = new Date(current);
  next.setFullYear(year, month - 1, day);
  return next;
}

function applyTimeInput(current: Date, value: string): Date {
  const [hour, minute] = value.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return current;
  const next = new Date(current);
  next.setHours(hour, minute, 0, 0);
  return next;
}
