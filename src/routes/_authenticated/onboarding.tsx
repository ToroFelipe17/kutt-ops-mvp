import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useBusiness } from "@/lib/business-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

const ACCENTS = [
  { v: "#10b981", n: "Verde" },
  { v: "#3b82f6", n: "Azul" },
  { v: "#a78bfa", n: "Lila" },
  { v: "#f59e0b", n: "Ámbar" },
  { v: "#ef4444", n: "Rojo" },
  { v: "#f5f5f5", n: "Plata" },
];

const DEFAULT_SERVICES = [
  { name: "Corte clásico", duration_min: 30, price: 12000 },
  { name: "Corte + Barba", duration_min: 45, price: 17000 },
  { name: "Barba", duration_min: 20, price: 8000 },
];

function Onboarding() {
  const { user } = useAuth();
  const { refresh } = useBusiness();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [color, setColor] = useState(ACCENTS[0].v);
  const [barber, setBarber] = useState("");
  const [open, setOpen] = useState(10);
  const [close, setClose] = useState(21);
  const [busy, setBusy] = useState(false);

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = async () => {
    if (!user) return;
    if (busy) return;
    setBusy(true);
    try {
      const { data: biz, error } = await supabase
        .from("businesses")
        .insert({
          owner_id: user.id,
          name: name.trim(),
          primary_color: color,
          open_hour: open,
          close_hour: close,
          onboarded: true,
        })
        .select()
        .single();
      if (error) throw error;

      // First barber + default services
      await Promise.all([
        supabase.from("staff").insert({ business_id: biz.id, name: barber.trim() || "Barbero 1", color }),
        supabase.from("services").insert(
          DEFAULT_SERVICES.map((s) => ({ ...s, business_id: biz.id }))
        ),
        supabase.from("profiles").update({ default_business_id: biz.id }).eq("id", user.id),
      ]);

      await refresh();
      toast.success("Listo. Bienvenido.");
      navigate({ to: "/today" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  const canNext =
    (step === 0 && name.trim().length >= 2) ||
    (step === 1) ||
    (step === 2 && barber.trim().length >= 2) ||
    (step === 3);

  return (
    <div className="min-h-screen bg-background flex flex-col safe-top safe-bottom">
      {/* Progress */}
      <div className="px-6 pt-4">
        <div className="flex gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-foreground" : "bg-muted"}`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 px-6 pt-10 max-w-md mx-auto w-full">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {step === 0 && (
            <Step
              title="¿Cómo se llama tu barbería?"
              hint="Aparecerá en tu app y mensajes."
            >
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Don Pancho Barber"
                className="w-full h-16 px-4 rounded-2xl bg-surface hairline text-[17px] focus:outline-none focus:hairline-strong"
              />
            </Step>
          )}

          {step === 1 && (
            <Step title="Color de tu marca" hint="Da identidad a tu sistema.">
              <div className="grid grid-cols-3 gap-3">
                {ACCENTS.map((a) => (
                  <button
                    key={a.v}
                    type="button"
                    onClick={() => setColor(a.v)}
                    className={`relative h-24 rounded-2xl active:scale-95 transition-transform hairline overflow-hidden`}
                    style={{ background: a.v }}
                  >
                    {color === a.v && (
                      <span className="absolute inset-0 grid place-items-center bg-black/20">
                        <Check className="w-6 h-6 text-white" strokeWidth={3} />
                      </span>
                    )}
                    <span className="absolute bottom-1.5 left-2 text-[10px] font-medium text-white/90 mix-blend-difference">{a.n}</span>
                  </button>
                ))}
              </div>
            </Step>
          )}

          {step === 2 && (
            <Step title="Tu primer barbero" hint="Después puedes agregar más.">
              <input
                autoFocus
                value={barber}
                onChange={(e) => setBarber(e.target.value)}
                placeholder="Nombre del barbero"
                className="w-full h-16 px-4 rounded-2xl bg-surface hairline text-[17px] focus:outline-none focus:hairline-strong"
              />
            </Step>
          )}

          {step === 3 && (
            <Step title="Horario base" hint="Cuándo trabajas. Lo cambias después.">
              <div className="grid grid-cols-2 gap-3">
                <HourPicker label="Abre" value={open} onChange={setOpen} min={6} max={close - 1} />
                <HourPicker label="Cierra" value={close} onChange={setClose} min={open + 1} max={23} />
              </div>
              <div className="mt-6 p-4 rounded-2xl bg-surface hairline">
                <p className="text-sm text-muted-foreground">Crearemos servicios base:</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {DEFAULT_SERVICES.map((s) => (
                    <li key={s.name} className="flex justify-between">
                      <span>{s.name}</span>
                      <span className="text-muted-foreground tabular">{s.duration_min}min</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Step>
          )}
        </motion.div>
      </div>

      <div className="px-6 pb-6 pt-4 max-w-md mx-auto w-full flex gap-3">
        {step > 0 && (
          <button
            onClick={back}
            className="h-14 px-6 rounded-2xl bg-surface hairline text-foreground font-medium active:scale-[0.98] transition-transform"
          >
            Atrás
          </button>
        )}
        <button
          onClick={step === 3 ? finish : next}
          disabled={!canNext || busy}
          className="flex-1 h-14 rounded-2xl bg-foreground text-background font-medium text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-40"
        >
          {busy ? "Creando..." : step === 3 ? "Empezar" : "Continuar"}
          {!busy && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function Step({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[26px] leading-tight font-semibold tracking-tight">{title}</h2>
      {hint && <p className="mt-2 text-sm text-muted-foreground">{hint}</p>}
      <div className="mt-8">{children}</div>
    </div>
  );
}

function HourPicker({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <div className="rounded-2xl bg-surface hairline p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="h-9 w-9 rounded-full bg-muted active:scale-90 transition-transform grid place-items-center text-lg"
        >−</button>
        <span className="text-2xl font-semibold tabular">{String(value).padStart(2, "0")}:00</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="h-9 w-9 rounded-full bg-muted active:scale-90 transition-transform grid place-items-center text-lg"
        >+</button>
      </div>
    </div>
  );
}
