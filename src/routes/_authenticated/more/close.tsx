import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { useAuth } from "@/lib/auth-context";
import { clp, localDateKey } from "@/lib/format";
import { computeDayTotals, dayRange, type CashMovementRow, type PaymentRow } from "@/lib/finance";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/more/close")({
  validateSearch: (search: Record<string, unknown>): { date?: string; from?: "caja" } => {
    const requestedDate =
      typeof search.date === "string" && isSelectableAccountingDate(search.date)
        ? search.date
        : undefined;
    const source = search.from === "caja" ? "caja" : undefined;

    return {
      ...(requestedDate ? { date: requestedDate } : {}),
      ...(source ? { from: source } : {}),
    };
  },
  component: ClosePage,
});

const LAST_CASH_ACCOUNTING_DATE_KEY = "kutt-last-cash-accounting-date";

function ClosePage() {
  const { business } = useBusiness();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { date, from: source } = Route.useSearch();
  const accountingDate = date ?? getStoredAccountingDate();
  const [from, to] = dayRange(parseLocalDate(accountingDate));
  // TODO(Phase 2C): Create automatic snapshots after midnight in America/Santiago.
  const [counted, setCounted] = useState("");

  const { data: payments = [] } = useQuery({
    queryKey: ["close-payments", business?.id, accountingDate],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select(
          "id,accounting_date,annulled_at,annulment_reason,amount,method,status,staff_id,commission_amount,commission_pct,appointment_id,notes,created_at",
        )
        .eq("business_id", business!.id)
        .eq("accounting_date", accountingDate);
      return (data ?? []) as PaymentRow[];
    },
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["close-appointments", business?.id, accountingDate],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("id,starts_at,price,status,client_name_snapshot,staff_id")
        .eq("business_id", business!.id)
        .gte("starts_at", from)
        .lte("starts_at", to);
      return data ?? [];
    },
  });

  const { data: movements = [] } = useQuery({
    queryKey: ["close-mov", business?.id, accountingDate],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("cash_movements")
        .select("id,accounting_date,kind,amount,concept,method,created_at")
        .eq("business_id", business!.id)
        .eq("accounting_date", accountingDate);
      return (data ?? []) as CashMovementRow[];
    },
  });

  const { data: existing } = useQuery({
    queryKey: ["close-existing", business?.id, accountingDate],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_closes")
        .select("*")
        .eq("business_id", business!.id)
        .eq("close_date", accountingDate)
        .maybeSingle();
      return data;
    },
  });

  const totals = useMemo(
    () => computeDayTotals(payments, appointments, movements),
    [payments, appointments, movements],
  );
  const hasCountedCash = counted.trim() !== "";
  const countedNum = hasCountedCash ? parseInt(counted.replace(/\D/g, ""), 10) || 0 : null;
  const diff = countedNum === null ? null : countedNum - totals.cashOnHand;
  const adjustedResult = diff === null ? null : totals.profit + diff;

  useEffect(() => {
    setCounted(existing?.cash_counted == null ? "" : String(existing.cash_counted));
  }, [accountingDate, existing?.cash_counted]);

  const close = useMutation({
    mutationFn: async () => {
      const payload = {
        business_id: business!.id,
        close_date: accountingDate,
        total_sales: totals.sales,
        // total_cash stores expected physical cash, not every non-cash manual flow.
        total_cash: totals.cashOnHand,
        total_transfer: totals.transfer,
        total_card: totals.card,
        total_pending: totals.pending,
        total_commissions: totals.commissions,
        total_expenses: totals.expenses,
        cash_counted: countedNum,
        cash_diff: diff ?? 0,
        iva_estimated: totals.ivaEstimated,
        profit_estimated: totals.profit,
        closed_by: user?.id ?? null,
      };
      const { error } = await supabase
        .from("daily_closes")
        .upsert(payload, { onConflict: "business_id,close_date" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(existing ? "Informe actualizado" : "Informe guardado");
      qc.invalidateQueries({ queryKey: ["close-existing", business?.id, accountingDate] });
      qc.invalidateQueries({ queryKey: ["caja-report", business?.id, accountingDate] });
      qc.invalidateQueries({ queryKey: ["exp-close", business?.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  return (
    <div className="min-h-screen bg-background pb-28 safe-top">
      <header className="px-5 pt-5 pb-3 flex items-center gap-3">
        {source === "caja" ? (
          <Link
            to="/caja"
            search={{ date: accountingDate }}
            className="h-9 w-9 rounded-full bg-surface hairline grid place-items-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
        ) : (
          <Link
            to="/more"
            className="h-9 w-9 rounded-full bg-surface hairline grid place-items-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
        )}
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Informe diario
          </p>
          <h1 className="text-xl font-semibold tracking-tight capitalize">
            {parseLocalDate(accountingDate).toLocaleDateString("es-CL", {
              weekday: "long",
              day: "numeric",
              month: "short",
            })}
          </h1>
        </div>
      </header>

      <section className="px-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-surface-elevated hairline p-5"
        >
          <p className="text-xs text-muted-foreground">Total ventas</p>
          <p className="mt-1 text-4xl font-semibold tabular tracking-tight">{clp(totals.sales)}</p>

          <dl className="mt-5 divide-y divide-border">
            {totals.cash > 0 && <Row label="Efectivo por servicios" value={clp(totals.cash)} />}
            {totals.cashManualIncome > 0 && (
              <Row label="Efectivo por ingresos manuales" value={clp(totals.cashManualIncome)} />
            )}
            {totals.cashExpenses > 0 && (
              <Row label="Egresos en efectivo" value={`− ${clp(totals.cashExpenses)}`} />
            )}
            {totals.transfer > 0 && <Row label="Transferencias" value={clp(totals.transfer)} />}
            {totals.card > 0 && <Row label="Tarjeta" value={clp(totals.card)} />}
            {totals.tips > 0 && <Row label="Propinas" value={clp(totals.tips)} />}
            {totals.extraIncome > totals.cashManualIncome && (
              <Row
                label="Ingresos manuales no efectivo"
                value={clp(totals.extraIncome - totals.cashManualIncome)}
              />
            )}
            {totals.expenses > totals.cashExpenses && (
              <Row
                label="Egresos no efectivo"
                value={`− ${clp(totals.expenses - totals.cashExpenses)}`}
              />
            )}
            {totals.pending > 0 && (
              <Row label="Por cobrar" value={clp(totals.pending)} tone="warning" />
            )}
            {totals.commissions > 0 && (
              <Row label="Comisiones" value={`− ${clp(totals.commissions)}`} />
            )}
            {totals.annulledCount > 0 && (
              <Row label="Cobros anulados" value={String(totals.annulledCount)} />
            )}
            <Row label="Efectivo esperado" value={clp(totals.cashOnHand)} bold />
            {totals.ivaEstimated > 0 && <Row label="IVA estimado" value={clp(totals.ivaEstimated)} />}
          </dl>
        </motion.div>
      </section>

      <section className="px-5 mt-4">
        <div className="rounded-2xl bg-surface hairline p-4">
          <p className="text-xs font-medium">Efectivo contado</p>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-xs text-muted-foreground">Efectivo esperado</p>
            <p className="text-sm font-medium tabular">{clp(totals.cashOnHand)}</p>
          </div>
          <input
            inputMode="numeric"
            placeholder="¿Cuánto contaste? $0"
            value={counted ? clp(parseInt(counted.replace(/\D/g, ""), 10) || 0) : ""}
            onChange={(e) => setCounted(e.target.value.replace(/\D/g, ""))}
            className="mt-3 w-full h-12 px-4 rounded-xl bg-background hairline text-sm tabular outline-none focus:border-border-strong"
          />
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Solo los movimientos manuales marcados como efectivo afectan el efectivo esperado.
          </p>
          {diff !== null && (
            <div
              className={`mt-4 rounded-xl px-3.5 py-3 ${
                diff === 0 ? "bg-success/10" : diff > 0 ? "bg-info/10" : "bg-destructive/10"
              }`}
            >
              <p
                className={`text-sm font-semibold ${
                  diff === 0 ? "text-success" : diff > 0 ? "text-info" : "text-destructive"
                }`}
              >
                {diff === 0
                  ? "Caja cuadrada"
                  : diff > 0
                    ? `Sobran ${clp(Math.abs(diff))}`
                    : `Faltan ${clp(Math.abs(diff))}`}
              </p>
              <div className="mt-2 flex items-center justify-between gap-4">
                <p className="text-xs text-muted-foreground">Diferencia de caja</p>
                <p className="text-sm font-semibold tabular">
                  {diff > 0 ? "+" : ""}
                  {clp(diff)}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="px-5 mt-4">
        <div className="rounded-2xl bg-surface hairline px-4">
          <dl className="divide-y divide-border">
            <Row
              label="Ganancia estimada"
              value={clp(totals.profit)}
              bold
              tone={totals.profit >= 0 ? "success" : "destructive"}
            />
            <Row
              label="Diferencia de caja"
              value={diff === null ? "Sin conteo" : `${diff > 0 ? "+" : ""}${clp(diff)}`}
              tone={diff === null || diff === 0 ? undefined : diff > 0 ? "info" : "destructive"}
            />
            <Row
              label="Resultado ajustado"
              value={adjustedResult === null ? "Sin conteo" : clp(adjustedResult)}
              bold
              tone={
                adjustedResult === null
                  ? undefined
                  : adjustedResult >= 0
                    ? "success"
                    : "destructive"
              }
            />
          </dl>
          <p className="pb-4 pt-1 text-[11px] leading-relaxed text-muted-foreground">
            El resultado ajustado suma la diferencia operativa al cálculo original de utilidad.
          </p>
        </div>
      </section>

      <section className="px-5 mt-5">
        <button
          onClick={() => close.mutate()}
          disabled={close.isPending}
          className="w-full h-14 rounded-2xl bg-foreground text-background font-semibold active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          {existing ? "Actualizar informe" : "Guardar informe"}
        </button>
        {existing && (
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Informe guardado a las{" "}
            {new Date(existing.created_at).toLocaleTimeString("es-CL", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  tone,
}: {
  label: string;
  value: string;
  bold?: boolean;
  tone?: "success" | "warning" | "destructive" | "info";
}) {
  const c =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "info"
          ? "text-info"
          : tone === "destructive"
            ? "text-destructive"
            : "text-foreground";
  return (
    <div className="py-2.5 flex items-center justify-between">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={`tabular ${
          value === "Sin conteo"
            ? "text-xs font-medium text-muted-foreground"
            : `${bold ? "text-sm font-semibold" : "text-sm font-medium"} ${c}`
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function isSelectableAccountingDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value <= localDateKey();
}

function getStoredAccountingDate(): string {
  if (typeof window === "undefined") return localDateKey();
  const stored = window.localStorage.getItem(LAST_CASH_ACCOUNTING_DATE_KEY);
  return stored && isSelectableAccountingDate(stored) ? stored : localDateKey();
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}
