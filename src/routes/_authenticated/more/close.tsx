import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
  component: ClosePage,
});

function ClosePage() {
  const { business } = useBusiness();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [from, to] = dayRange();
  const accountingDate = localDateKey();
  // TODO(Phase 2C): Create automatic snapshots after midnight in America/Santiago.
  const [counted, setCounted] = useState("");

  const { data: payments = [] } = useQuery({
    queryKey: ["close-payments", business?.id, accountingDate],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select(
          "id,accounting_date,amount,method,status,staff_id,commission_amount,commission_pct,appointment_id,notes,created_at",
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
        .lte("starts_at", to)
        .neq("status", "cancelado");
      return data ?? [];
    },
  });

  const { data: movements = [] } = useQuery({
    queryKey: ["close-mov", business?.id, accountingDate],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("cash_movements")
        .select("id,accounting_date,kind,amount,concept,created_at")
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
  const countedNum = parseInt(counted.replace(/\D/g, ""), 10) || 0;
  const diff = countedNum > 0 ? countedNum - totals.cashOnHand : 0;

  const close = useMutation({
    mutationFn: async () => {
      const payload = {
        business_id: business!.id,
        close_date: accountingDate,
        total_sales: totals.sales,
        // The current schema has no manual-income column, so total_cash stores expected physical cash.
        total_cash: totals.cashOnHand,
        total_transfer: totals.transfer,
        total_card: totals.card,
        total_pending: totals.pending,
        total_commissions: totals.commissions,
        total_expenses: totals.expenses,
        cash_counted: countedNum > 0 ? countedNum : null,
        cash_diff: diff,
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
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

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
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Informe diario
          </p>
          <h1 className="text-xl font-semibold tracking-tight capitalize">
            {new Date().toLocaleDateString("es-CL", {
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
            <Row label="Efectivo por servicios" value={clp(totals.cash)} />
            <Row label="Transferencias" value={clp(totals.transfer)} />
            <Row label="Tarjeta" value={clp(totals.card)} />
            <Row label="Propinas" value={clp(totals.tips)} />
            <Row label="Ingresos manuales" value={clp(totals.extraIncome)} />
            <Row label="Por cobrar" value={clp(totals.pending)} tone="warning" />
            <Row label="Comisiones" value={`− ${clp(totals.commissions)}`} />
            <Row label="Egresos" value={`− ${clp(totals.expenses)}`} />
            <Row label="Efectivo esperado" value={clp(totals.cashOnHand)} bold />
            <Row label="IVA estimado" value={clp(totals.ivaEstimated)} />
            <Row
              label="Utilidad estimada"
              value={clp(totals.profit)}
              bold
              tone={totals.profit >= 0 ? "success" : "destructive"}
            />
          </dl>
        </motion.div>
      </section>

      <section className="px-5 mt-4">
        <div className="rounded-2xl bg-surface hairline p-4">
          <p className="text-xs text-muted-foreground">Conteo de efectivo</p>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-xs text-muted-foreground">Esperado</p>
            <p className="text-sm font-medium tabular">{clp(totals.cashOnHand)}</p>
          </div>
          <input
            inputMode="numeric"
            placeholder="¿Cuánto contaste? $0"
            value={counted ? clp(parseInt(counted.replace(/\D/g, ""), 10) || 0) : ""}
            onChange={(e) => setCounted(e.target.value.replace(/\D/g, ""))}
            className="mt-3 w-full h-12 px-4 rounded-xl bg-background hairline text-sm tabular outline-none focus:border-border-strong"
          />
          {countedNum > 0 && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Diferencia</p>
              <p
                className={`text-sm font-semibold tabular ${diff === 0 ? "text-success" : diff > 0 ? "text-info" : "text-destructive"}`}
              >
                {diff > 0 ? "+" : ""}
                {clp(diff)}
              </p>
            </div>
          )}
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
  tone?: "success" | "warning" | "destructive";
}) {
  const c =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "destructive"
          ? "text-destructive"
          : "text-foreground";
  return (
    <div className="py-2.5 flex items-center justify-between">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={`tabular ${bold ? "text-base font-semibold" : "text-sm font-medium"} ${c}`}>
        {value}
      </dd>
    </div>
  );
}
