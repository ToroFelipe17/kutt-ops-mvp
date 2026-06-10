import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Banknote, CheckCircle2, CreditCard, MessageCircle, MoreHorizontal, Plus, Send, Wallet, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { useBusiness } from "@/lib/business-context";
import { BottomNav } from "@/components/BottomNav";
import { StatusBadge, type AppointmentStatus } from "@/components/StatusBadge";
import { clp, endOfDay, shortTime, startOfDay, whatsappLink } from "@/lib/format";
import { encodePaymentNotes, getPaymentTipAmount, methodLabel, type PaymentMethod } from "@/lib/finance";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/today")({
  component: Today,
});

interface AppointmentRow {
  id: string;
  starts_at: string;
  duration_min: number;
  price: number;
  status: AppointmentStatus;
  client_name_snapshot: string | null;
  service_name_snapshot: string | null;
  notes: string | null;
  staff_id: string | null;
  staff: { name: string; color: string | null; commission_pct: number | null } | null;
  client: { phone: string | null } | null;
}

function Today() {
  
  const { business } = useBusiness();
  const qc = useQueryClient();
  const [paymentTarget, setPaymentTarget] = useState<AppointmentRow | null>(null);

  const { data: appts = [], isLoading } = useQuery({
    queryKey: ["today", business?.id],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id,starts_at,duration_min,price,status,client_name_snapshot,service_name_snapshot,notes,staff_id,staff:staff_id(name,color,commission_pct),client:client_id(phone)")
        .eq("business_id", business!.id)
        .gte("starts_at", startOfDay().toISOString())
        .lte("starts_at", endOfDay().toISOString())
        .order("starts_at");
      if (error) throw error;
      return data as unknown as AppointmentRow[];
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["today-payments", business?.id],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("amount,method,notes")
        .eq("business_id", business!.id)
        .gte("created_at", startOfDay().toISOString())
        .lte("created_at", endOfDay().toISOString());
      if (error) throw error;
      return data;
    },
  });

  // Realtime
  useEffect(() => {
    if (!business?.id) return;
    const ch = supabase
      .channel(`today:${business.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `business_id=eq.${business.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["today", business.id] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "payments", filter: `business_id=eq.${business.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["today-payments", business.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [business?.id, qc]);

  const totals = useMemo(() => {
    const revenue = payments.reduce((s, p) => s + (p.amount ?? 0), 0);
    const tips = payments.reduce((s, p) => s + getPaymentTipAmount(p), 0);
    const pending = appts
      .filter((a) => a.status !== "pagado" && a.status !== "completado" && a.status !== "cancelado")
      .reduce((s, a) => s + (a.price ?? 0), 0);
    const cash = payments.filter((p) => p.method === "efectivo").reduce((s, p) => s + (p.amount ?? 0), 0);
    return { revenue, tips, pending, cash, count: appts.length };
  }, [appts, payments]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AppointmentStatus }) => {
      const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["today", business?.id] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const collect = useMutation({
    mutationFn: async ({
      appointment,
      method,
      tipAmount,
      notes,
    }: {
      appointment: AppointmentRow;
      method: PaymentMethod;
      tipAmount: number;
      notes: string;
    }) => {
      const { data: existing, error: existingError } = await supabase
        .from("payments")
        .select("id")
        .eq("appointment_id", appointment.id)
        .limit(1)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing) throw new Error("Pago registrado");

      const a = appointment;
      const pct = a.staff?.commission_pct ?? null;
      const commissionAmount = pct != null ? Math.round((a.price * Number(pct)) / 100) : null;
      const { error: e1 } = await supabase.from("payments").insert({
        business_id: business!.id,
        appointment_id: a.id,
        method,
        amount: a.price,
        status: "conciliado",
        staff_id: a.staff_id,
        commission_pct: pct,
        commission_amount: commissionAmount,
        notes: encodePaymentNotes(notes, tipAmount),
      });
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("appointments").update({ status: "pagado" }).eq("id", a.id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Pago registrado");
      setPaymentTarget(null);
      qc.invalidateQueries({ queryKey: ["today", business?.id] });
      qc.invalidateQueries({ queryKey: ["today-payments", business?.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const now = new Date();
  const upcoming = appts.find((a) => new Date(a.starts_at) >= now && a.status !== "cancelado" && a.status !== "completado");

  return (
    <div className="min-h-screen bg-background pb-28 safe-top">
      <header className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Hoy</p>
          <h1 className="text-2xl font-semibold tracking-tight capitalize">
            {now.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "short" })}
          </h1>
        </div>
        <Link
          to="/new"
          className="h-10 w-10 rounded-full bg-foreground text-background grid place-items-center active:scale-90 transition-transform"
          aria-label="Nueva cita"
        >
          <Plus className="w-5 h-5" />
        </Link>
      </header>

      {/* Caja del día */}
      <section className="px-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-gradient-to-br from-surface-elevated to-surface hairline p-5 overflow-hidden relative"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Caja del día</p>
              <p className="mt-1 text-[34px] font-semibold tracking-tight tabular leading-none">
                {clp(totals.revenue)}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-success/15 grid place-items-center">
              <Wallet className="w-5 h-5 text-success" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <Stat label="Citas" value={String(totals.count)} />
            <Stat label="Efectivo" value={clp(totals.cash)} />
            <Stat label="Pendiente" value={clp(totals.pending)} tone="warning" />
          </div>
        </motion.div>
      </section>

      {/* Próxima cita */}
      {upcoming && (
        <section className="px-5 mt-5">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2 px-1">Próxima</p>
          <div className="rounded-2xl bg-surface hairline p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-semibold tabular">{shortTime(upcoming.starts_at)}</span>
              <StatusBadge status={upcoming.status} />
            </div>
            <p className="mt-1 text-base font-medium">{upcoming.client_name_snapshot ?? "Cliente"}</p>
            <p className="text-sm text-muted-foreground">
              {upcoming.service_name_snapshot ?? "—"} · {upcoming.staff?.name ?? "—"} · {clp(upcoming.price)}
            </p>
          </div>
        </section>
      )}

      {/* Lista del día */}
      <section className="px-5 mt-6">
        <div className="flex items-center justify-between px-1 mb-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Agenda hoy</p>
          <Link to="/agenda" className="text-xs text-muted-foreground active:text-foreground">Ver toda</Link>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-surface animate-pulse" />
            ))}
          </div>
        ) : appts.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-2">
            {appts.map((a) => (
              <AppointmentRowCard
                key={a.id}
                a={a}
                onStatus={(s) => updateStatus.mutate({ id: a.id, status: s })}
                onCollect={() => setPaymentTarget(a)}
              />
            ))}
          </ul>
        )}
      </section>

      <AnimatePresence>
        {paymentTarget && (
          <PaymentSheet
            appointment={paymentTarget}
            saving={collect.isPending}
            onClose={() => setPaymentTarget(null)}
            onSubmit={(payload) => collect.mutate(payload)}
          />
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warning" }) {
  return (
    <div className="rounded-xl bg-background/40 hairline p-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold tabular ${tone === "warning" ? "text-warning" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl bg-surface hairline p-8 text-center">
      <div className="mx-auto h-14 w-14 rounded-full bg-muted grid place-items-center mb-3">
        <span className="text-2xl">✂︎</span>
      </div>
      <p className="font-medium">Sin citas hoy</p>
      <p className="mt-1 text-sm text-muted-foreground">Toca el + para crear una.</p>
    </div>
  );
}

function AppointmentRowCard({
  a,
  onStatus,
  onCollect,
}: {
  a: AppointmentRow;
  onStatus: (s: AppointmentStatus) => void;
  onCollect: () => void;
}) {
  const [open, setOpen] = useState(false);
  const phone = a.client?.phone;
  const wa = whatsappLink(
    phone,
    `Hola ${a.client_name_snapshot ?? ""}, te recuerdo tu cita a las ${shortTime(a.starts_at)}.`
  );
  const isPaid = a.status === "pagado" || a.status === "completado";

  return (
    <li className="rounded-2xl bg-surface hairline overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full p-3.5 flex items-center gap-3 active:bg-surface-elevated transition-colors text-left"
      >
        <div className="flex flex-col items-center w-12 shrink-0">
          <span className="text-[11px] text-muted-foreground">{shortTime(a.starts_at).split(":")[0]}h</span>
          <span className="text-lg font-semibold tabular leading-tight">{shortTime(a.starts_at)}</span>
        </div>
        <span
          className="w-1 self-stretch rounded-full"
          style={{ background: a.staff?.color ?? "var(--color-muted-foreground)" }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{a.client_name_snapshot ?? "Cliente"}</p>
            <StatusBadge status={a.status} />
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {a.service_name_snapshot ?? "—"} · {a.staff?.name ?? "—"}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold tabular">{clp(a.price)}</p>
        </div>
        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
      </button>

      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="border-t border-border px-3.5 py-3 grid grid-cols-2 gap-2"
        >
          {!isPaid && (
            <ActionButton tone="success" onClick={onCollect}>
              Cobrar
            </ActionButton>
          )}
          {isPaid && (
            <div className="h-11 rounded-xl bg-success/15 text-success font-medium text-sm flex items-center justify-center">
              Pago registrado
            </div>
          )}
          {a.status === "pendiente" && (
            <ActionButton onClick={() => onStatus("confirmado")}>Confirmar</ActionButton>
          )}
          {(a.status === "pendiente" || a.status === "confirmado") && (
            <ActionButton onClick={() => onStatus("llego")}>Llegó</ActionButton>
          )}
          {a.status === "pagado" && (
            <ActionButton onClick={() => onStatus("completado")}>Completar</ActionButton>
          )}
          {phone && (
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="h-11 rounded-xl bg-success/15 text-success font-medium text-sm flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
          )}
          {a.status !== "cancelado" && (
            <ActionButton tone="destructive" onClick={() => onStatus("cancelado")}>
              Cancelar
            </ActionButton>
          )}
        </motion.div>
      )}
    </li>
  );
}

function PaymentSheet({
  appointment,
  saving,
  onClose,
  onSubmit,
}: {
  appointment: AppointmentRow;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    appointment: AppointmentRow;
    method: PaymentMethod;
    tipAmount: number;
    notes: string;
  }) => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("efectivo");
  const [tip, setTip] = useState("");
  const [notes, setNotes] = useState("");
  const tipAmount = parseCurrencyInput(tip);
  const total = appointment.price + tipAmount;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 420 }}
        animate={{ y: 0 }}
        exit={{ y: 420 }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md mx-auto bg-surface-elevated rounded-t-3xl p-5 pb-8 hairline"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Registrar pago</p>
            <h2 className="text-lg font-semibold">{appointment.client_name_snapshot ?? "Cliente"}</h2>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-muted grid place-items-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-5 rounded-2xl bg-background/50 hairline p-4 space-y-2">
          <AmountRow label="Servicio" value={clp(appointment.price)} />
          <AmountRow label="Propina" value={clp(tipAmount)} />
          <div className="pt-2 border-t border-border flex items-center justify-between">
            <span className="text-sm font-medium">Total recibido</span>
            <span className="text-xl font-semibold tabular">{clp(total)}</span>
          </div>
        </div>

        <label className="mt-4 block">
          <span className="text-xs text-muted-foreground font-medium px-1">Propina</span>
          <input
            inputMode="numeric"
            value={tip ? clp(tipAmount) : ""}
            onChange={(e) => setTip(e.target.value.replace(/\D/g, ""))}
            placeholder="$0"
            className="mt-1 w-full h-12 px-4 rounded-xl bg-background hairline text-sm tabular outline-none focus:hairline-strong"
          />
        </label>

        <div className="mt-4">
          <p className="text-xs text-muted-foreground font-medium px-1">Método de pago</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map((item) => {
              const Icon = item.icon;
              const active = method === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setMethod(item.value)}
                  className={`h-11 rounded-xl hairline flex items-center justify-center gap-2 text-sm font-medium active:scale-[0.98] transition-transform ${
                    active ? "bg-foreground text-background" : "bg-background/50 text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas opcionales"
          className="mt-4 w-full min-h-20 px-4 py-3 rounded-xl bg-background hairline text-sm outline-none resize-none focus:hairline-strong"
        />

        <button
          disabled={saving}
          onClick={() => onSubmit({ appointment, method, tipAmount, notes })}
          className="mt-5 w-full h-14 rounded-2xl bg-foreground text-background font-semibold active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          {saving ? "Registrando..." : "Marcar como pagado"}
        </button>
      </motion.div>
    </motion.div>
  );
}

function AmountRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular">{value}</span>
    </div>
  );
}

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string; icon: typeof Banknote }> = [
  { value: "efectivo", label: methodLabel("efectivo"), icon: Banknote },
  { value: "transferencia", label: methodLabel("transferencia"), icon: Send },
  { value: "debito", label: methodLabel("debito"), icon: CreditCard },
  { value: "credito", label: methodLabel("credito"), icon: CreditCard },
];

function parseCurrencyInput(value: string): number {
  return parseInt(value.replace(/\D/g, ""), 10) || 0;
}

function ActionButton({
  children,
  onClick,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: "success" | "destructive";
}) {
  const cls =
    tone === "success"
      ? "bg-success text-success-foreground"
      : tone === "destructive"
      ? "bg-destructive/15 text-destructive"
      : "bg-muted text-foreground";
  return (
    <button
      onClick={onClick}
      className={`h-11 rounded-xl ${cls} font-medium text-sm active:scale-[0.97] transition-transform`}
    >
      {children}
    </button>
  );
}
