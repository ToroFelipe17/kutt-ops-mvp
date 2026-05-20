import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Plus,
  Receipt,
  Send,
  Wallet,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { BottomNav } from "@/components/BottomNav";
import { clp, shortTime } from "@/lib/format";
import {
  computeDayTotals,
  dayRange,
  methodLabel,
  type CashMovementRow,
  type PaymentRow,
  type PaymentStatus,
} from "@/lib/finance";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/caja")({
  component: CajaPage,
});

function CajaPage() {
  const { business } = useBusiness();
  const qc = useQueryClient();
  const [from, to] = dayRange();

  const { data: payments = [] } = useQuery({
    queryKey: ["caja-payments", business?.id, from],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id,amount,method,status,staff_id,commission_amount,commission_pct,appointment_id,notes,created_at")
        .eq("business_id", business!.id)
        .gte("created_at", from)
        .lte("created_at", to)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PaymentRow[];
    },
  });

  const { data: pending = [] } = useQuery({
    queryKey: ["caja-pending", business?.id, from],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id,starts_at,price,status,client_name_snapshot,staff_id")
        .eq("business_id", business!.id)
        .gte("starts_at", from)
        .lte("starts_at", to)
        .not("status", "in", "(pagado,completado,cancelado)");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: movements = [] } = useQuery({
    queryKey: ["caja-mov", business?.id, from],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_movements")
        .select("id,kind,amount,concept,created_at")
        .eq("business_id", business!.id)
        .gte("created_at", from)
        .lte("created_at", to)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CashMovementRow[];
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["caja-staff", business?.id],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("staff")
        .select("id,name,color")
        .eq("business_id", business!.id);
      return data ?? [];
    },
  });

  // Realtime
  useEffect(() => {
    if (!business?.id) return;
    const ch = supabase
      .channel(`caja:${business.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments", filter: `business_id=eq.${business.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["caja-payments", business.id, from] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "cash_movements", filter: `business_id=eq.${business.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["caja-mov", business.id, from] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `business_id=eq.${business.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["caja-pending", business.id, from] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [business?.id, from, qc]);

  const totals = useMemo(
    () => computeDayTotals(payments, pending, movements),
    [payments, pending, movements],
  );

  const staffById = useMemo(() => Object.fromEntries(staff.map((s) => [s.id, s])), [staff]);

  const [movOpen, setMovOpen] = useState(false);

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PaymentStatus }) => {
      const { error } = await supabase.from("payments").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["caja-payments", business?.id, from] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  return (
    <div className="min-h-screen bg-background pb-28 safe-top">
      <header className="px-5 pt-5 pb-3 flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Caja</p>
          <h1 className="text-2xl font-semibold tracking-tight">Hoy</h1>
        </div>
        <Link
          to="/more/close"
          className="text-xs font-medium text-muted-foreground active:text-foreground flex items-center gap-1"
        >
          Cerrar día <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      {/* HERO — saldo + utilidad */}
      <section className="px-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-gradient-to-br from-surface-elevated via-surface to-background hairline p-6 relative overflow-hidden"
        >
          <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-success/10 blur-3xl pointer-events-none" />
          <div className="relative">
            <p className="text-xs text-muted-foreground">Ventas del día</p>
            <p className="mt-1 text-[44px] leading-none font-semibold tracking-tight tabular">
              {clp(totals.sales)}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-success/15 text-success">
                <ArrowUpRight className="w-3 h-3" /> {totals.count} cobros
              </span>
              {totals.pending > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-warning/15 text-warning">
                  {clp(totals.pending)} por cobrar
                </span>
              )}
            </div>
          </div>

          <div className="relative mt-6 grid grid-cols-3 gap-2">
            <Mini icon={<Banknote className="w-3.5 h-3.5" />} label="Efectivo" value={clp(totals.cash)} />
            <Mini icon={<Send className="w-3.5 h-3.5" />} label="Transfer." value={clp(totals.transfer)} />
            <Mini icon={<CreditCard className="w-3.5 h-3.5" />} label="Tarjeta" value={clp(totals.card)} />
          </div>
        </motion.div>
      </section>

      {/* Métricas operativas */}
      <section className="px-5 mt-3 grid grid-cols-2 gap-2">
        <KpiCard
          label="Utilidad estimada"
          value={clp(totals.profit)}
          tone={totals.profit >= 0 ? "success" : "destructive"}
          sub={`Ventas − comisiones − gastos`}
        />
        <KpiCard
          label="Caja en mano"
          value={clp(totals.cashOnHand)}
          sub="Efectivo + ingresos − egresos"
        />
        <KpiCard label="Comisiones" value={clp(totals.commissions)} sub={`${payments.filter((p) => p.commission_amount).length} pagos`} />
        <KpiCard label="IVA estimado" value={clp(totals.ivaEstimated)} sub="19% sobre ventas" />
      </section>

      {/* Conciliación */}
      <section className="px-5 mt-5">
        <div className="rounded-2xl bg-surface hairline p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Conciliación</p>
              <p className="mt-1 text-sm font-medium">
                {clp(totals.reconciled)} <span className="text-muted-foreground">de {clp(totals.sales)}</span>
              </p>
            </div>
            <span className="text-xs font-semibold tabular text-success">
              {totals.sales > 0 ? Math.round((totals.reconciled / totals.sales) * 100) : 0}%
            </span>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-success transition-all"
              style={{ width: `${totals.sales > 0 ? (totals.reconciled / totals.sales) * 100 : 0}%` }}
            />
          </div>
        </div>
      </section>

      {/* Acciones rápidas */}
      <section className="px-5 mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => setMovOpen(true)}
          className="h-12 rounded-xl bg-surface hairline flex items-center justify-center gap-2 text-sm font-medium active:scale-[0.98] transition-transform"
        >
          <Plus className="w-4 h-4" /> Ingreso / egreso
        </button>
        <Link
          to="/more/export"
          className="h-12 rounded-xl bg-surface hairline flex items-center justify-center gap-2 text-sm font-medium active:scale-[0.98] transition-transform"
        >
          <Receipt className="w-4 h-4" /> Exportar
        </Link>
      </section>

      {/* Movimientos */}
      <section className="px-5 mt-6">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2 px-1">
          Movimientos
        </p>
        {payments.length === 0 && movements.length === 0 ? (
          <div className="rounded-2xl bg-surface hairline p-8 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-muted grid place-items-center mb-3">
              <Wallet className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Caja en cero</p>
            <p className="mt-1 text-xs text-muted-foreground">Los cobros aparecerán aquí en tiempo real.</p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {payments.map((p) => (
              <PaymentItem
                key={p.id}
                p={p}
                staffName={p.staff_id ? staffById[p.staff_id]?.name : null}
                onToggle={() =>
                  setStatus.mutate({
                    id: p.id,
                    status: p.status === "conciliado" ? "pendiente" : "conciliado",
                  })
                }
              />
            ))}
            {movements.map((m) => (
              <MovementItem key={m.id} m={m} />
            ))}
          </ul>
        )}
      </section>

      <AnimatePresence>
        {movOpen && (
          <NewMovementSheet
            businessId={business!.id}
            onClose={() => setMovOpen(false)}
            onDone={() => qc.invalidateQueries({ queryKey: ["caja-mov", business?.id, from] })}
          />
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

function Mini({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background/40 hairline p-2.5">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <p className="text-[10px] uppercase tracking-wider">{label}</p>
      </div>
      <p className="mt-1 text-sm font-semibold tabular">{value}</p>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "success" | "destructive";
}) {
  return (
    <div className="rounded-2xl bg-surface hairline p-3.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-lg font-semibold tabular ${
          tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "text-foreground"
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function PaymentItem({
  p,
  staffName,
  onToggle,
}: {
  p: PaymentRow;
  staffName: string | null | undefined;
  onToggle: () => void;
}) {
  const Icon =
    p.method === "efectivo" ? Banknote : p.method === "transferencia" ? Send : CreditCard;
  return (
    <li className="rounded-xl bg-surface hairline px-3.5 py-3 flex items-center gap-3">
      <div className="h-9 w-9 rounded-full bg-muted grid place-items-center shrink-0">
        <Icon className="w-4 h-4 text-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{methodLabel(p.method)}</p>
          {p.commission_amount ? (
            <span className="text-[10px] text-muted-foreground">
              −{clp(p.commission_amount)} com.
            </span>
          ) : null}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {shortTime(p.created_at)}
          {staffName ? ` · ${staffName}` : ""}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold tabular">{clp(p.amount)}</p>
        <button
          onClick={onToggle}
          className={`mt-0.5 text-[10px] font-medium px-2 py-0.5 rounded-full ${
            p.status === "conciliado"
              ? "bg-success/15 text-success"
              : "bg-warning/15 text-warning"
          }`}
        >
          {p.status === "conciliado" ? "✓ Conciliado" : "Pendiente"}
        </button>
      </div>
    </li>
  );
}

function MovementItem({ m }: { m: CashMovementRow }) {
  const isOut = m.kind === "egreso";
  return (
    <li className="rounded-xl bg-surface hairline px-3.5 py-3 flex items-center gap-3">
      <div
        className={`h-9 w-9 rounded-full grid place-items-center shrink-0 ${
          isOut ? "bg-destructive/15 text-destructive" : "bg-info/15 text-info"
        }`}
      >
        {isOut ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{m.concept}</p>
        <p className="text-[11px] text-muted-foreground">{shortTime(m.created_at)} · {isOut ? "Egreso" : "Ingreso manual"}</p>
      </div>
      <p className={`text-sm font-semibold tabular ${isOut ? "text-destructive" : "text-info"}`}>
        {isOut ? "−" : "+"}{clp(m.amount)}
      </p>
    </li>
  );
}

function NewMovementSheet({
  businessId,
  onClose,
  onDone,
}: {
  businessId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [kind, setKind] = useState<"ingreso" | "egreso">("egreso");
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const n = parseInt(amount.replace(/\D/g, ""), 10);
    if (!n || !concept.trim()) {
      toast.error("Falta monto o concepto");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("cash_movements").insert({
      business_id: businessId,
      kind,
      amount: n,
      concept: concept.trim(),
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(kind === "egreso" ? "Egreso registrado" : "Ingreso registrado");
    onDone();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 400 }}
        animate={{ y: 0 }}
        exit={{ y: 400 }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md mx-auto bg-surface-elevated rounded-t-3xl p-5 pb-8 hairline"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Movimiento de caja</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-muted grid place-items-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-background hairline">
          {(["egreso", "ingreso"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`h-10 rounded-lg text-sm font-medium ${
                kind === k ? "bg-foreground text-background" : "text-muted-foreground"
              }`}
            >
              {k === "egreso" ? "Egreso" : "Ingreso"}
            </button>
          ))}
        </div>

        <input
          autoFocus
          inputMode="numeric"
          placeholder="$0"
          value={amount ? clp(parseInt(amount.replace(/\D/g, ""), 10) || 0) : ""}
          onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
          className="mt-4 w-full bg-transparent text-3xl font-semibold tabular text-center outline-none border-0"
        />

        <input
          placeholder="Concepto (ej: arriendo, propina, productos…)"
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          className="mt-4 w-full h-12 px-4 rounded-xl bg-background hairline text-sm outline-none focus:border-border-strong"
        />

        <button
          disabled={saving}
          onClick={submit}
          className="mt-5 w-full h-13 py-3.5 rounded-2xl bg-foreground text-background font-semibold active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" /> Registrar
        </button>
      </motion.div>
    </motion.div>
  );
}
