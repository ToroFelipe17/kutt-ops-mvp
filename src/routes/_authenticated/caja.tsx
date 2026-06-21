import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  ChevronLeft,
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
import { clp, localDateKey, shortTime } from "@/lib/format";
import {
  computeDayTotals,
  dayRange,
  encodePaymentNotes,
  methodLabel,
  getPaymentTipAmount,
  type CashMovementRow,
  type PaymentMethod,
  type PaymentRow,
  type PaymentStatus,
} from "@/lib/finance";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/caja")({
  component: CajaPage,
});

interface ServiceRow {
  id: string;
  name: string;
  duration_min: number;
  price: number;
}
interface StaffRow {
  id: string;
  name: string;
  color: string | null;
}
interface ClientRow {
  id: string;
  name: string;
  phone: string | null;
}

function CajaPage() {
  const { business } = useBusiness();
  const qc = useQueryClient();
  const [accountingDate, setAccountingDate] = useState(() => localDateKey());
  // TODO(Phase 2): Add week aggregation once all cash queries share a tested range model.
  const selectedDate = useMemo(() => parseLocalDateKey(accountingDate), [accountingDate]);
  const [from, to] = dayRange(selectedDate);
  const isToday = accountingDate === localDateKey();

  const { data: payments = [] } = useQuery({
    queryKey: ["caja-payments", business?.id, accountingDate],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(
          "id,accounting_date,amount,method,status,staff_id,commission_amount,commission_pct,appointment_id,notes,created_at",
        )
        .eq("business_id", business!.id)
        .eq("accounting_date", accountingDate)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PaymentRow[];
    },
  });

  const { data: pending = [] } = useQuery({
    queryKey: ["caja-pending", business?.id, accountingDate],
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
    queryKey: ["caja-mov", business?.id, accountingDate],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_movements")
        .select("id,accounting_date,kind,amount,concept,created_at")
        .eq("business_id", business!.id)
        .eq("accounting_date", accountingDate)
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
        .eq("business_id", business!.id)
        .eq("active", true)
        .order("name");
      return (data ?? []) as StaffRow[];
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ["caja-services", business?.id],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("services")
        .select("id,name,duration_min,price")
        .eq("business_id", business!.id)
        .eq("active", true)
        .order("name");
      return (data ?? []) as ServiceRow[];
    },
  });

  const { data: recentClients = [] } = useQuery({
    queryKey: ["caja-clients", business?.id],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("id,name,phone")
        .eq("business_id", business!.id)
        .order("last_visit_at", { ascending: false, nullsFirst: false })
        .limit(20);
      return (data ?? []) as ClientRow[];
    },
  });

  // Realtime
  useEffect(() => {
    if (!business?.id) return;
    const ch = supabase
      .channel(`caja:${business.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payments",
          filter: `business_id=eq.${business.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["caja-payments", business.id, accountingDate] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cash_movements",
          filter: `business_id=eq.${business.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["caja-mov", business.id, accountingDate] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `business_id=eq.${business.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["caja-pending", business.id, accountingDate] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [accountingDate, business?.id, qc]);

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
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["caja-payments", business?.id, accountingDate] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  return (
    <div className="min-h-screen bg-background pb-28 safe-top">
      <header className="px-5 pt-5 pb-3 flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Caja</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isToday ? "Hoy" : "Fecha seleccionada"}
          </h1>
        </div>
        <Link
          to="/more/close"
          className="text-xs font-medium text-muted-foreground active:text-foreground flex items-center gap-1"
        >
          Cerrar día <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      <section className="px-5 pb-3">
        <div className="grid min-h-12 grid-cols-[2.5rem_minmax(0,1fr)_2.5rem_auto] items-center gap-1 rounded-xl border border-border/70 bg-surface p-1 shadow-sm">
          <button
            type="button"
            title="Día anterior"
            aria-label="Ver día anterior"
            onClick={() => setAccountingDate((current) => shiftLocalDateKey(current, -1))}
            className="grid h-10 w-10 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted active:bg-muted"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0 rounded-lg border border-border/60 bg-background px-2 py-2 text-center">
            <p className="truncate text-sm font-medium capitalize leading-5">
              {formatAccountingDateLabel(accountingDate)}
            </p>
          </div>
          <button
            type="button"
            title="Día siguiente"
            aria-label="Ver día siguiente"
            onClick={() => setAccountingDate((current) => shiftLocalDateKey(current, 1))}
            disabled={isToday}
            className="grid h-10 w-10 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted active:bg-muted disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setAccountingDate(localDateKey())}
            disabled={isToday}
            className={`h-10 rounded-lg border px-3 text-xs font-medium transition-colors ${
              isToday
                ? "border-success/20 bg-success/10 text-success"
                : "border-border/70 bg-background text-foreground hover:bg-muted active:bg-muted"
            }`}
          >
            Hoy
          </button>
        </div>
      </section>

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
            <Mini
              icon={<Banknote className="w-3.5 h-3.5" />}
              label="Efectivo"
              value={clp(totals.cash)}
            />
            <Mini
              icon={<Send className="w-3.5 h-3.5" />}
              label="Transfer."
              value={clp(totals.transfer)}
            />
            <Mini
              icon={<CreditCard className="w-3.5 h-3.5" />}
              label="Tarjeta"
              value={clp(totals.card)}
            />
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
        <KpiCard label="Propinas" value={clp(totals.tips)} sub="Separadas de ventas" />
      </section>

      {/* Conciliación */}
      <section className="px-5 mt-5">
        <div className="rounded-2xl bg-surface hairline p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Conciliación</p>
              <p className="mt-1 text-sm font-medium">
                {clp(totals.reconciled)}{" "}
                <span className="text-muted-foreground">de {clp(totals.sales)}</span>
              </p>
            </div>
            <span className="text-xs font-semibold tabular text-success">
              {totals.sales > 0 ? Math.round((totals.reconciled / totals.sales) * 100) : 0}%
            </span>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-success transition-all"
              style={{
                width: `${totals.sales > 0 ? (totals.reconciled / totals.sales) * 100 : 0}%`,
              }}
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
            <p className="mt-1 text-xs text-muted-foreground">
              Los cobros aparecerán aquí en tiempo real.
            </p>
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
            initialAccountingDate={accountingDate}
            services={services}
            staff={staff}
            recentClients={recentClients}
            onClose={() => setMovOpen(false)}
            onDone={() => {
              qc.invalidateQueries({ queryKey: ["caja-mov", business?.id, accountingDate] });
              qc.invalidateQueries({
                queryKey: ["caja-payments", business?.id, accountingDate],
              });
              qc.invalidateQueries({
                queryKey: ["caja-pending", business?.id, accountingDate],
              });
            }}
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
          tone === "success"
            ? "text-success"
            : tone === "destructive"
              ? "text-destructive"
              : "text-foreground"
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
  const tip = getPaymentTipAmount(p);
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
        {tip > 0 && <p className="text-[10px] text-success tabular">+ {clp(tip)} propina</p>}
        <button
          onClick={onToggle}
          className={`mt-0.5 text-[10px] font-medium px-2 py-0.5 rounded-full ${
            p.status === "conciliado" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
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
        <p className="text-[11px] text-muted-foreground">
          {shortTime(m.created_at)} · {isOut ? "Egreso" : "Ingreso manual"}
        </p>
      </div>
      <p className={`text-sm font-semibold tabular ${isOut ? "text-destructive" : "text-info"}`}>
        {isOut ? "−" : "+"}
        {clp(m.amount)}
      </p>
    </li>
  );
}

function NewMovementSheet({
  businessId,
  initialAccountingDate,
  services,
  staff,
  recentClients,
  onClose,
  onDone,
}: {
  businessId: string;
  initialAccountingDate: string;
  services: ServiceRow[];
  staff: StaffRow[];
  recentClients: ClientRow[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [kind, setKind] = useState<"ingreso" | "egreso">("egreso");
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("");
  const [isService, setIsService] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [clientName, setClientName] = useState("");
  const [pickedClient, setPickedClient] = useState<ClientRow | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("efectivo");
  const [tip, setTip] = useState("");
  const [serviceTime, setServiceTime] = useState(() =>
    applyDateInput(currentMinute(), initialAccountingDate),
  );
  const [accountingDate, setAccountingDate] = useState(initialAccountingDate);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedService = services.find((service) => service.id === serviceId) ?? null;
  const serviceAmount = parseCurrencyInput(amount);
  const tipAmount = parseCurrencyInput(tip);
  const hasValidAmount = serviceAmount > 0;
  const hasValidAccountingDate = /^\d{4}-\d{2}-\d{2}$/.test(accountingDate);
  const submitDisabled =
    saving ||
    !hasValidAmount ||
    !hasValidAccountingDate ||
    (isService ? !selectedService || !staffId : !concept.trim());
  const filteredClients = useMemo(() => {
    if (!clientName.trim()) return recentClients.slice(0, 5);
    const query = clientName.toLowerCase();
    return recentClients.filter((client) => client.name.toLowerCase().includes(query)).slice(0, 5);
  }, [clientName, recentClients]);

  useEffect(() => {
    if (!staffId && staff[0]) setStaffId(staff[0].id);
  }, [staff, staffId]);

  const updateAccountingDate = (value: string) => {
    setAccountingDate(value);
    setServiceTime((current) => applyDateInput(current, value));
  };

  const submit = async () => {
    const n = parseCurrencyInput(amount);
    if (isService) {
      await submitServicePayment();
      return;
    }

    if (!n || !concept.trim()) {
      toast.error("Falta monto o concepto");
      return;
    }
    if (!hasValidAccountingDate) {
      toast.error("Selecciona una fecha contable válida");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("cash_movements").insert({
      business_id: businessId,
      kind,
      amount: n,
      concept: concept.trim(),
      accounting_date: accountingDate,
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

  const submitServicePayment = async () => {
    if (!serviceAmount) {
      toast.error("Falta monto del servicio");
      return;
    }
    if (!staffId) {
      toast.error("Selecciona barbero");
      return;
    }
    if (!hasValidAccountingDate) {
      toast.error("Selecciona una fecha contable válida");
      return;
    }
    setSaving(true);
    try {
      let clientId = pickedClient?.id ?? null;
      const cleanClientName = clientName.trim();

      if (!clientId && cleanClientName.length >= 2) {
        const { data: existing } = await supabase
          .from("clients")
          .select("id")
          .eq("business_id", businessId)
          .ilike("name", cleanClientName)
          .limit(1)
          .maybeSingle();

        if (existing) {
          clientId = existing.id;
        } else {
          const { data: created, error } = await supabase
            .from("clients")
            .insert({ business_id: businessId, name: cleanClientName })
            .select("id")
            .single();
          if (error) throw error;
          clientId = created.id;
        }
      }

      const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          business_id: businessId,
          client_id: clientId,
          staff_id: staffId,
          service_id: selectedService?.id ?? null,
          client_name_snapshot: cleanClientName || "Cliente",
          service_name_snapshot: selectedService?.name ?? "Servicio",
          starts_at: serviceTime.toISOString(),
          duration_min: 60,
          price: serviceAmount,
          status: "pagado",
          notes: notes.trim() || null,
        })
        .select("id")
        .single();
      if (appointmentError) throw appointmentError;

      const selectedStaff = staff.find((item) => item.id === staffId);
      const { data: staffWithCommission } = await supabase
        .from("staff")
        .select("commission_pct")
        .eq("id", staffId)
        .maybeSingle();
      const pct = staffWithCommission?.commission_pct ?? null;
      const commissionAmount = pct != null ? Math.round((serviceAmount * Number(pct)) / 100) : null;

      const { data: existingPayment, error: existingPaymentError } = await supabase
        .from("payments")
        .select("id")
        .eq("appointment_id", appointment.id)
        .limit(1)
        .maybeSingle();
      if (existingPaymentError) throw existingPaymentError;
      if (existingPayment) throw new Error("Pago registrado");

      const { error: paymentError } = await supabase.from("payments").insert({
        business_id: businessId,
        appointment_id: appointment.id,
        accounting_date: accountingDate,
        method,
        amount: serviceAmount,
        status: "conciliado",
        staff_id: staffId,
        commission_pct: pct,
        commission_amount: commissionAmount,
        notes: encodePaymentNotes(
          notes.trim() || `Servicio rápido${selectedStaff ? ` · ${selectedStaff.name}` : ""}`,
          tipAmount,
        ),
      });
      if (paymentError) throw paymentError;

      toast.success("Servicio cobrado");
      onDone();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setSaving(false);
    }
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
        className="w-full max-w-md mx-auto bg-surface-elevated rounded-t-3xl hairline max-h-[92vh] overflow-hidden flex flex-col"
      >
        <div className="p-5 pb-4 overflow-y-auto overscroll-contain">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Movimiento de caja</h2>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-muted grid place-items-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-background hairline">
            {(["egreso", "ingreso"] as const).map((k) => (
              <button
                key={k}
                onClick={() => {
                  setKind(k);
                  if (k === "egreso") setIsService(false);
                }}
                className={`h-10 rounded-lg text-sm font-medium ${
                  kind === k ? "bg-foreground text-background" : "text-muted-foreground"
                }`}
              >
                {k === "egreso" ? "Egreso" : "Ingreso"}
              </button>
            ))}
          </div>

          {kind === "ingreso" && (
            <button
              type="button"
              onClick={() => setIsService((value) => !value)}
              className={`mt-4 w-full h-11 rounded-xl hairline text-sm font-medium transition-colors ${
                isService ? "bg-success/15 text-success" : "bg-background text-foreground"
              }`}
            >
              ¿Este ingreso corresponde a un servicio/corte?
            </button>
          )}

          <div className="mt-4">
            <DateTimeInput
              label="Fecha contable"
              value={accountingDate}
              type="date"
              onChange={updateAccountingDate}
              hint="Este movimiento se incluirá en la caja de esta fecha."
            />
          </div>

          {!isService && (
            <div className="mt-4 rounded-2xl border border-border/70 bg-background/50 p-4 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Monto</p>
              <input
                autoFocus
                inputMode="numeric"
                placeholder="$0"
                value={amount ? clp(parseCurrencyInput(amount)) : ""}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                className="mt-1 w-full border-0 bg-transparent text-center text-3xl font-semibold tabular outline-none"
              />
            </div>
          )}

          {isService ? (
            services.length > 0 ? (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground px-1">Servicio</p>
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    {services.map((service) => (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => {
                          setServiceId(service.id);
                          setAmount(String(service.price));
                        }}
                        className={`shrink-0 px-3 h-10 rounded-full hairline text-xs font-medium ${
                          service.id === serviceId
                            ? "bg-foreground text-background"
                            : "bg-background"
                        }`}
                      >
                        {service.name}
                      </button>
                    ))}
                  </div>
                  {selectedService && (
                    <div className="mt-3 flex items-center justify-between rounded-xl border border-border/70 bg-background/50 p-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Monto del servicio</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          La propina se suma por separado.
                        </p>
                      </div>
                      <span className="text-base font-semibold tabular">{clp(serviceAmount)}</span>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs text-muted-foreground px-1">Barbero</p>
                  {staff.length === 0 ? (
                    <p className="mt-2 rounded-xl bg-background hairline p-3 text-xs text-muted-foreground">
                      Crea o activa un barbero en Ajustes para registrar servicios.
                    </p>
                  ) : (
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                      {staff.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setStaffId(item.id)}
                          className={`shrink-0 px-3 h-10 rounded-full hairline text-xs font-medium ${
                            item.id === staffId ? "bg-foreground text-background" : "bg-background"
                          }`}
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs text-muted-foreground px-1">Cliente</p>
                  <input
                    value={clientName}
                    onChange={(e) => {
                      setClientName(e.target.value);
                      setPickedClient(null);
                    }}
                    placeholder="Nombre rápido (opcional)"
                    className="mt-2 w-full h-12 px-4 rounded-xl bg-background hairline text-sm outline-none focus:border-border-strong"
                  />
                  {filteredClients.length > 0 && !pickedClient && (
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                      {filteredClients.map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => {
                            setPickedClient(client);
                            setClientName(client.name);
                          }}
                          className="shrink-0 px-3 h-9 rounded-full bg-muted hairline text-xs active:scale-95 transition-transform"
                        >
                          {client.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <DateTimeInput
                    label="Hora"
                    value={timeInputValue(serviceTime)}
                    type="time"
                    onChange={(value) =>
                      setServiceTime((current) => applyTimeInput(current, value))
                    }
                  />
                </div>

                <input
                  inputMode="numeric"
                  placeholder="Propina $0"
                  value={tip ? clp(tipAmount) : ""}
                  onChange={(e) => setTip(e.target.value.replace(/\D/g, ""))}
                  className="w-full h-12 px-4 rounded-xl bg-background hairline text-sm outline-none focus:border-border-strong"
                />

                <div className="rounded-xl bg-background/50 hairline p-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total recibido</span>
                  <span className="text-base font-semibold tabular">
                    {clp(serviceAmount + tipAmount)}
                  </span>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground px-1">Método de pago</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {PAYMENT_METHODS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setMethod(item.value)}
                          className={`h-10 rounded-xl hairline flex items-center justify-center gap-2 text-xs font-medium ${
                            method === item.value
                              ? "bg-foreground text-background"
                              : "bg-background"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <textarea
                  placeholder="Notas opcionales"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full min-h-20 px-4 py-3 rounded-xl bg-background hairline text-sm outline-none resize-none focus:border-border-strong"
                />
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-warning/10 text-warning hairline p-3 text-xs">
                Crea servicios en Ajustes para registrar un servicio desde Caja.
              </div>
            )
          ) : (
            <div className="mt-4">
              <input
                placeholder="Concepto (ej: arriendo, productos...)"
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-background hairline text-sm outline-none focus:border-border-strong"
              />
            </div>
          )}
        </div>

        <div className="p-5 pt-3 bg-surface-elevated/95 backdrop-blur">
          <button
            disabled={submitDisabled}
            onClick={submit}
            className="w-full min-h-12 py-3 rounded-2xl bg-foreground text-background font-semibold active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" /> {saving ? "Registrando" : "Registrar"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string; icon: typeof Banknote }> = [
  { value: "efectivo", label: methodLabel("efectivo"), icon: Banknote },
  { value: "transferencia", label: methodLabel("transferencia"), icon: Send },
  { value: "debito", label: methodLabel("debito"), icon: CreditCard },
  { value: "credito", label: methodLabel("credito"), icon: CreditCard },
];

function parseLocalDateKey(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day, 12);
}

function shiftLocalDateKey(value: string, days: number): string {
  const date = parseLocalDateKey(value);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

function formatAccountingDateLabel(value: string): string {
  return parseLocalDateKey(value).toLocaleDateString("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function DateTimeInput({
  label,
  value,
  type,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  type: "date" | "time";
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <label className="block min-w-0 rounded-xl border border-border/70 bg-background p-3">
      <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block min-w-0 max-w-full w-full bg-transparent text-sm font-medium text-foreground outline-none"
      />
      {hint && (
        <span className="mt-1.5 block text-[11px] leading-4 text-muted-foreground">{hint}</span>
      )}
    </label>
  );
}

function parseCurrencyInput(value: string): number {
  return parseInt(value.replace(/\D/g, ""), 10) || 0;
}

function currentMinute(): Date {
  const now = new Date();
  now.setSeconds(0, 0);
  return now;
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
