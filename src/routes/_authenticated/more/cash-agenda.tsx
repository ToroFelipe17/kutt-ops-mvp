import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  ChevronLeft,
  CreditCard,
  Send,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { clp, localDateKey, shortTime } from "@/lib/format";
import {
  dayRange,
  encodePaymentNotes,
  filterCashActivePayments,
  isCollectedPayment,
  methodLabel,
  type AppointmentLite,
  type PaymentMethod,
  type PaymentRow,
} from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/more/cash-agenda")({
  validateSearch: (search: Record<string, unknown>) => {
    const today = localDateKey();
    const requestedDate =
      typeof search.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(search.date)
        ? search.date
        : today;

    return { date: requestedDate <= today ? requestedDate : today };
  },
  component: CashAgendaDetailPage,
});

interface StaffRow {
  id: string;
  name: string;
  commission_pct: number | null;
}

interface AgendaAppointment extends AppointmentLite {
  service_name_snapshot: string | null;
}

function CashAgendaDetailPage() {
  const { business } = useBusiness();
  const { date } = Route.useSearch();
  const qc = useQueryClient();
  const today = localDateKey();
  const [from, to] = dayRange(parseLocalDate(date));
  const [paymentTarget, setPaymentTarget] = useState<AgendaAppointment | null>(null);

  const { data: appointments = [] } = useQuery({
    queryKey: ["cash-agenda-appointments", business?.id, date],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id,starts_at,price,status,client_name_snapshot,service_name_snapshot,staff_id")
        .eq("business_id", business!.id)
        .gte("starts_at", from)
        .lte("starts_at", to)
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AgendaAppointment[];
    },
  });

  const { data: previousAppointments = [] } = useQuery({
    queryKey: ["cash-agenda-previous-appointments", business?.id, date],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id,starts_at,price,status,client_name_snapshot,service_name_snapshot,staff_id")
        .eq("business_id", business!.id)
        .lt("starts_at", from)
        .neq("status", "cancelado")
        .order("starts_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as AgendaAppointment[];
    },
  });

  const relevantAppointments = useMemo(
    () => [...appointments, ...previousAppointments],
    [appointments, previousAppointments],
  );
  const relevantAppointmentIds = useMemo(
    () => Array.from(new Set(relevantAppointments.map((appointment) => appointment.id))),
    [relevantAppointments],
  );

  const { data: payments = [] } = useQuery({
    queryKey: ["cash-agenda-linked-payments", business?.id, relevantAppointmentIds],
    enabled: !!business?.id && relevantAppointmentIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(
          "id,accounting_date,annulled_at,annulment_reason,amount,method,status,staff_id,commission_amount,commission_pct,appointment_id,notes,created_at",
        )
        .eq("business_id", business!.id)
        .in("appointment_id", relevantAppointmentIds)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PaymentRow[];
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["cash-agenda-staff", business?.id],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("id,name,commission_pct")
        .eq("business_id", business!.id);
      if (error) throw error;
      return (data ?? []) as StaffRow[];
    },
  });

  const collectPayment = useMutation({
    mutationFn: async ({
      appointment,
      method,
      amount,
      tipAmount,
      notes,
    }: {
      appointment: AgendaAppointment;
      method: PaymentMethod;
      amount: number;
      tipAmount: number;
      notes: string;
    }) => {
      if (!business?.id) throw new Error("Negocio no disponible.");
      if (appointment.status === "cancelado") throw new Error("Esta cita está cancelada.");

      const serviceAmount = Math.max(0, Math.round(amount));
      if (serviceAmount <= 0) throw new Error("Ingresa un monto válido.");

      const { data: existing, error: existingError } = await supabase
        .from("payments")
        .select("id,status")
        .eq("appointment_id", appointment.id)
        .is("annulled_at", null)
        .limit(1)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing) throw new Error("Esta cita ya tiene un cobro activo.");

      const staffMember = appointment.staff_id
        ? staff.find((member) => member.id === appointment.staff_id)
        : null;
      const pct = staffMember?.commission_pct ?? null;
      const commissionAmount = pct != null ? Math.round((serviceAmount * Number(pct)) / 100) : null;

      const { error: paymentError } = await supabase.from("payments").insert({
        business_id: business.id,
        appointment_id: appointment.id,
        accounting_date: today,
        method,
        amount: serviceAmount,
        status: "conciliado",
        staff_id: appointment.staff_id,
        commission_pct: pct,
        commission_amount: commissionAmount,
        notes: encodePaymentNotes(notes, tipAmount),
      });
      if (paymentError) throw paymentError;

      const { error: appointmentError } = await supabase
        .from("appointments")
        .update({ status: "pagado" })
        .eq("id", appointment.id)
        .neq("status", "cancelado");
      if (appointmentError) throw appointmentError;
    },
    onSuccess: () => {
      toast.success("Cobro registrado");
      setPaymentTarget(null);
      qc.invalidateQueries({ queryKey: ["cash-agenda-appointments", business?.id, date] });
      qc.invalidateQueries({ queryKey: ["cash-agenda-previous-appointments", business?.id, date] });
      qc.invalidateQueries({ queryKey: ["cash-agenda-linked-payments", business?.id] });
      qc.invalidateQueries({ queryKey: ["caja-payments", business?.id, today] });
      qc.invalidateQueries({ queryKey: ["close-payments", business?.id, today] });
      qc.invalidateQueries({ queryKey: ["exp-pay", business?.id] });
      qc.invalidateQueries({ queryKey: ["today", business?.id] });
      qc.invalidateQueries({ queryKey: ["today-payments", business?.id, today] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Error"),
  });

  const closePending = useMutation({
    mutationFn: async (appointment: AgendaAppointment) => {
      if (!business?.id) throw new Error("Negocio no disponible.");

      const { data: existing, error: existingError } = await supabase
        .from("payments")
        .select("id")
        .eq("appointment_id", appointment.id)
        .is("annulled_at", null)
        .limit(1)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing) {
        throw new Error("Esta cita ya tiene un cobro activo. Primero se debe anular el cobro.");
      }

      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelado" })
        .eq("id", appointment.id)
        .eq("business_id", business.id)
        .neq("status", "cancelado");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pendiente cerrado");
      qc.invalidateQueries({ queryKey: ["cash-agenda-appointments", business?.id, date] });
      qc.invalidateQueries({ queryKey: ["cash-agenda-previous-appointments", business?.id, date] });
      qc.invalidateQueries({ queryKey: ["today", business?.id] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Error"),
  });

  const activeAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.status !== "cancelado"),
    [appointments],
  );
  const activePayments = useMemo(
    () => filterCashActivePayments(payments, relevantAppointments),
    [payments, relevantAppointments],
  );
  const activePaymentAppointmentIds = useMemo(
    () =>
      new Set(
        activePayments
          .map((payment) => payment.appointment_id)
          .filter((appointmentId): appointmentId is string => Boolean(appointmentId)),
      ),
    [activePayments],
  );
  const activePaymentByAppointment = useMemo(() => {
    const result = new Map<string, PaymentRow>();
    activePayments.forEach((payment) => {
      if (!payment.appointment_id || result.has(payment.appointment_id)) return;
      result.set(payment.appointment_id, payment);
    });
    return result;
  }, [activePayments]);
  const collectedByAppointment = useMemo(() => {
    const result = new Map<string, number>();
    activePayments.filter(isCollectedPayment).forEach((payment) => {
      if (!payment.appointment_id) return;
      result.set(
        payment.appointment_id,
        (result.get(payment.appointment_id) ?? 0) + payment.amount,
      );
    });
    return result;
  }, [activePayments]);
  const staffById = useMemo(
    () => new Map(staff.map((member) => [member.id, member.name])),
    [staff],
  );
  const agendaTotals = useMemo(() => {
    const expected = activeAppointments.reduce(
      (total, appointment) => total + appointment.price,
      0,
    );
    const pending = activeAppointments.reduce((total, appointment) => {
      if (activePaymentAppointmentIds.has(appointment.id)) return total;
      return total + appointment.price;
    }, 0);

    return {
      expected,
      pending,
      resolved: Math.max(expected - pending, 0),
    };
  }, [activeAppointments, activePaymentAppointmentIds]);
  const orderedAppointments = useMemo(
    () =>
      [...activeAppointments].sort((a, b) => {
        const aPending = !activePaymentAppointmentIds.has(a.id);
        const bPending = !activePaymentAppointmentIds.has(b.id);
        if (aPending !== bPending) return aPending ? -1 : 1;
        return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
      }),
    [activeAppointments, activePaymentAppointmentIds],
  );
  const previousPendingAppointments = useMemo(
    () =>
      [...previousAppointments]
        .filter((appointment) => appointment.status !== "cancelado")
        .filter((appointment) => {
          if (activePaymentAppointmentIds.has(appointment.id)) return false;
          const collected = collectedByAppointment.get(appointment.id) ?? 0;
          return Math.max(appointment.price - collected, 0) > 0;
        })
        .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()),
    [activePaymentAppointmentIds, collectedByAppointment, previousAppointments],
  );
  const progress =
    agendaTotals.expected > 0
      ? Math.min(100, Math.round((agendaTotals.resolved / agendaTotals.expected) * 100))
      : 0;
  const hasExpectedAmount = agendaTotals.expected > 0;
  const hasMissingAmount = agendaTotals.pending > 0;

  const confirmClosePending = (appointment: AgendaAppointment) => {
    const confirmed = window.confirm(
      "¿Cerrar este pendiente? La cita se marcará como cancelada y dejará de aparecer por cobrar. No se eliminará ningún pago.",
    );
    if (!confirmed) return;
    closePending.mutate(appointment);
  };

  return (
    <div className="min-h-screen bg-background pb-16 safe-top">
      <header className="flex items-center gap-3 px-5 pb-3 pt-5">
        <Link
          to="/caja"
          className="grid h-9 w-9 place-items-center rounded-full bg-surface hairline"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Cobros de agenda
          </p>
          <h1 className="text-xl font-semibold tracking-tight capitalize">
            {formatDateLabel(date)}
          </h1>
        </div>
      </header>

      <section className="px-5">
        <div className="rounded-2xl bg-surface p-5 hairline">
          <div className="flex items-start gap-3">
            <div
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                hasMissingAmount ? "bg-warning/15 text-warning" : "bg-success/15 text-success"
              }`}
            >
              {hasMissingAmount ? (
                <AlertCircle className="h-5 w-5" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold">
                {!hasExpectedAmount
                  ? "Sin cobros esperados"
                  : hasMissingAmount
                    ? `Faltan ${clp(agendaTotals.pending)} por cobrar`
                    : "Agenda cobrada"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Resuelto {clp(agendaTotals.resolved)} de {clp(agendaTotals.expected)}
              </p>
            </div>
            <span
              className={`text-sm font-semibold tabular ${hasMissingAmount ? "text-warning" : "text-success"}`}
            >
              {progress}%
            </span>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full transition-all ${hasMissingAmount ? "bg-warning" : "bg-success"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </section>

      <section className="mt-6 px-5">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-[11px] uppercase tracking-widest text-muted-foreground">Citas</h2>
          <span className="text-[10px] tabular text-muted-foreground">
            {orderedAppointments.length}
          </span>
        </div>
        {orderedAppointments.length === 0 ? (
          <p className="rounded-2xl bg-surface px-4 py-8 text-center text-sm text-muted-foreground hairline">
            No hay citas no canceladas para esta fecha.
          </p>
        ) : (
          <ul className="space-y-2">
            {orderedAppointments.map((appointment) => {
              const hasAmount = appointment.price > 0;
              const activePayment = activePaymentByAppointment.get(appointment.id) ?? null;
              const hasActivePayment = activePaymentAppointmentIds.has(appointment.id);
              const serviceDate = localDateKey(new Date(appointment.starts_at));
              const lateCollected =
                activePayment != null && activePayment.accounting_date !== serviceDate;
              const paid = hasActivePayment && appointment.price > 0;

              return (
                <li
                  key={appointment.id}
                  className="flex items-center gap-3 rounded-2xl bg-surface p-4 hairline"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {appointment.client_name_snapshot || "Cliente"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {shortTime(appointment.starts_at)}
                      {appointment.staff_id && staffById.get(appointment.staff_id)
                        ? ` · ${staffById.get(appointment.staff_id)}`
                        : ""}
                    </p>
                    {lateCollected ? (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        Registrado en caja del {activePayment.accounting_date}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular">{clp(appointment.price)}</p>
                    <p
                      className={`mt-0.5 text-[10px] font-medium ${
                        paid ? "text-success" : "text-muted-foreground"
                      }`}
                    >
                      {!hasAmount
                        ? "Sin monto"
                        : lateCollected
                          ? "Cobro fuera de fecha"
                          : paid
                            ? "Cobrado"
                            : "Pendiente"}
                    </p>
                  </div>
                  {!hasActivePayment ? (
                    <div className="flex shrink-0 flex-col gap-1.5">
                      {hasAmount ? (
                        <button
                          type="button"
                          onClick={() => setPaymentTarget(appointment)}
                          className="h-9 rounded-xl bg-foreground px-3 text-xs font-semibold text-background active:scale-[0.98] transition-transform"
                        >
                          Cobrar
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => confirmClosePending(appointment)}
                        className="h-8 rounded-xl px-3 text-[11px] font-medium text-muted-foreground active:scale-[0.98] transition-transform hover:bg-muted"
                      >
                        No se cobrará
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {previousPendingAppointments.length > 0 ? (
        <section className="mt-6 px-5">
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Pendientes anteriores
            </h2>
            <span className="text-[10px] tabular text-muted-foreground">
              {previousPendingAppointments.length}
            </span>
          </div>
          <ul className="space-y-2">
            {previousPendingAppointments.map((appointment) => {
              return (
                <li
                  key={appointment.id}
                  className="flex items-center gap-3 rounded-2xl bg-surface p-4 hairline"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {appointment.client_name_snapshot || "Cliente"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {formatShortDate(appointment.starts_at)} · {shortTime(appointment.starts_at)}
                      {appointment.staff_id && staffById.get(appointment.staff_id)
                        ? ` · ${staffById.get(appointment.staff_id)}`
                        : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular">{clp(appointment.price)}</p>
                    <p className="mt-0.5 text-[10px] font-medium text-warning">Pendiente</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaymentTarget(appointment)}
                      className="h-9 rounded-xl bg-foreground px-3 text-xs font-semibold text-background active:scale-[0.98] transition-transform"
                    >
                      Cobrar
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmClosePending(appointment)}
                      className="h-8 rounded-xl px-3 text-[11px] font-medium text-muted-foreground active:scale-[0.98] transition-transform hover:bg-muted"
                    >
                      No se cobrará
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <AnimatePresence>
        {paymentTarget ? (
          <PaymentSheet
            appointment={paymentTarget}
            saving={collectPayment.isPending}
            onClose={() => setPaymentTarget(null)}
            onSubmit={(payload) => collectPayment.mutate(payload)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function formatDateLabel(value: string): string {
  return parseLocalDate(value).toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

function formatShortDate(value: string): string {
  return new Date(value).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
  });
}

function PaymentSheet({
  appointment,
  saving,
  onClose,
  onSubmit,
}: {
  appointment: AgendaAppointment;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    appointment: AgendaAppointment;
    method: PaymentMethod;
    amount: number;
    tipAmount: number;
    notes: string;
  }) => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("efectivo");
  const [amount, setAmount] = useState(String(Math.max(appointment.price, 0)));
  const [tip, setTip] = useState("");
  const [notes, setNotes] = useState("");
  const serviceAmount = parseCurrencyInput(amount);
  const tipAmount = parseCurrencyInput(tip);
  const total = serviceAmount + tipAmount;
  const serviceDate = localDateKey(new Date(appointment.starts_at));
  const isPastService = serviceDate < localDateKey();
  const canSubmit = serviceAmount > 0 && !saving;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 420 }}
        animate={{ y: 0 }}
        exit={{ y: 420 }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        onClick={(event) => event.stopPropagation()}
        className="mx-auto max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface-elevated p-5 pb-8 hairline"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Cobrar cita pendiente</p>
            <h2 className="truncate text-lg font-semibold">
              {appointment.client_name_snapshot ?? "Cliente"}
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {formatShortDate(appointment.starts_at)} · {shortTime(appointment.starts_at)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isPastService ? (
          <p className="mt-4 rounded-2xl bg-warning/10 px-4 py-3 text-xs text-warning">
            Este pago se registrará en la caja de hoy.
          </p>
        ) : null}

        <label className="mt-4 block">
          <span className="px-1 text-xs font-medium text-muted-foreground">Monto del servicio</span>
          <input
            inputMode="numeric"
            value={amount ? clp(serviceAmount) : ""}
            onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))}
            placeholder="$0"
            className="mt-1 h-12 w-full rounded-xl bg-background px-4 text-sm tabular outline-none hairline focus:hairline-strong"
          />
        </label>

        <label className="mt-4 block">
          <span className="px-1 text-xs font-medium text-muted-foreground">Propina</span>
          <input
            inputMode="numeric"
            value={tip ? clp(tipAmount) : ""}
            onChange={(event) => setTip(event.target.value.replace(/\D/g, ""))}
            placeholder="$0"
            className="mt-1 h-12 w-full rounded-xl bg-background px-4 text-sm tabular outline-none hairline focus:hairline-strong"
          />
        </label>

        <div className="mt-4 rounded-2xl bg-background/50 p-4 hairline">
          <AmountRow label="Servicio" value={clp(serviceAmount)} />
          <AmountRow label="Propina" value={clp(tipAmount)} />
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
            <span className="text-sm font-medium">Total recibido</span>
            <span className="text-xl font-semibold tabular">{clp(total)}</span>
          </div>
        </div>

        <div className="mt-4">
          <p className="px-1 text-xs font-medium text-muted-foreground">Método de pago</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map((item) => {
              const Icon = item.icon;
              const active = method === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setMethod(item.value)}
                  className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-medium transition-transform hairline active:scale-[0.98] ${
                    active ? "bg-foreground text-background" : "bg-background/50 text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Notas opcionales"
          className="mt-4 min-h-20 w-full resize-none rounded-xl bg-background px-4 py-3 text-sm outline-none hairline focus:hairline-strong"
        />

        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => onSubmit({ appointment, method, amount: serviceAmount, tipAmount, notes })}
          className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-foreground font-semibold text-background transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" />
          {saving ? "Registrando..." : "Registrar cobro"}
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
