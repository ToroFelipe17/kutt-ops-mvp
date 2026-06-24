import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { clp, localDateKey, shortTime } from "@/lib/format";
import {
  computeDayTotals,
  dayRange,
  filterCashActivePayments,
  isCollectedPayment,
  type AppointmentLite,
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
}

function CashAgendaDetailPage() {
  const { business } = useBusiness();
  const { date } = Route.useSearch();
  const [from, to] = dayRange(parseLocalDate(date));

  const { data: appointments = [] } = useQuery({
    queryKey: ["cash-agenda-appointments", business?.id, date],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id,starts_at,price,status,client_name_snapshot,staff_id")
        .eq("business_id", business!.id)
        .gte("starts_at", from)
        .lte("starts_at", to)
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AppointmentLite[];
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["cash-agenda-payments", business?.id, date],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(
          "id,accounting_date,annulled_at,annulment_reason,amount,method,status,staff_id,commission_amount,commission_pct,appointment_id,notes,created_at",
        )
        .eq("business_id", business!.id)
        .eq("accounting_date", date)
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
        .select("id,name")
        .eq("business_id", business!.id);
      if (error) throw error;
      return (data ?? []) as StaffRow[];
    },
  });

  const totals = useMemo(
    () => computeDayTotals(payments, appointments, []),
    [appointments, payments],
  );
  const activeAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.status !== "cancelado"),
    [appointments],
  );
  const activePayments = useMemo(
    () => filterCashActivePayments(payments, appointments),
    [appointments, payments],
  );
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
    () => Object.fromEntries(staff.map((member) => [member.id, member.name])),
    [staff],
  );
  const orderedAppointments = useMemo(
    () =>
      [...activeAppointments].sort((a, b) => {
        const aPending = a.price - (collectedByAppointment.get(a.id) ?? 0) > 0;
        const bPending = b.price - (collectedByAppointment.get(b.id) ?? 0) > 0;
        if (aPending !== bPending) return aPending ? -1 : 1;
        return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
      }),
    [activeAppointments, collectedByAppointment],
  );
  const progress =
    totals.agendaExpected > 0
      ? Math.min(100, Math.round((totals.agendaCollected / totals.agendaExpected) * 100))
      : 0;
  const hasExpectedAmount = totals.agendaExpected > 0;
  const hasMissingAmount = totals.pending > 0;

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
                    ? `Faltan ${clp(totals.pending)} por cobrar`
                    : "Agenda cobrada"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Cobrado {clp(totals.agendaCollected)} de {clp(totals.agendaExpected)}
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
              const collected = collectedByAppointment.get(appointment.id) ?? 0;
              const missing = Math.max(appointment.price - collected, 0);
              const hasAmount = appointment.price > 0;
              const paid = appointment.price > 0 && missing === 0;
              const partial = collected > 0 && missing > 0;

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
                      {appointment.staff_id && staffById[appointment.staff_id]
                        ? ` · ${staffById[appointment.staff_id]}`
                        : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular">{clp(appointment.price)}</p>
                    <p
                      className={`mt-0.5 text-[10px] font-medium ${
                        paid ? "text-success" : partial ? "text-warning" : "text-muted-foreground"
                      }`}
                    >
                      {!hasAmount
                        ? "Sin monto"
                        : paid
                          ? "Cobrado"
                          : partial
                            ? `${clp(missing)} pendiente`
                            : "Pendiente"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
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
