import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Download, FileText } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { clp } from "@/lib/format";
import {
  accountingMonthRange,
  dayRange,
  filterCashActivePayments,
  getPaymentDisplayNotes,
  getPaymentTipAmount,
  isCollectedPayment,
  isPaymentLinkedToCancelledAppointment,
  methodLabel,
  type AppointmentLite,
  type CashMovementRow,
  type PaymentRow,
} from "@/lib/finance";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/more/export")({
  component: ExportPage,
});

interface StaffRow {
  id: string;
  name: string;
}

interface DailyCloseRow {
  close_date: string;
  total_cash: number;
  cash_counted: number | null;
  cash_diff: number;
  profit_estimated: number;
  created_at: string;
}

function ExportPage() {
  const { business } = useBusiness();
  const [offset, setOffset] = useState(0);
  const ref = new Date();
  ref.setMonth(ref.getMonth() - offset);
  const [from, to] = accountingMonthRange(ref);
  const [appointmentsFrom] = dayRange(parseLocalDate(from));
  const [, appointmentsTo] = dayRange(parseLocalDate(to));
  const monthLabel = ref.toLocaleDateString("es-CL", { month: "long", year: "numeric" });

  const { data: payments = [] } = useQuery({
    queryKey: ["exp-pay", business?.id, from],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select(
          "id,accounting_date,amount,method,status,staff_id,commission_amount,commission_pct,appointment_id,notes,created_at",
        )
        .eq("business_id", business!.id)
        .gte("accounting_date", from)
        .lte("accounting_date", to)
        .order("accounting_date")
        .order("created_at");
      return (data ?? []) as PaymentRow[];
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["exp-staff", business?.id],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("staff")
        .select("id,name")
        .eq("business_id", business!.id);
      return (data ?? []) as StaffRow[];
    },
  });
  const staffMap = Object.fromEntries(staff.map((s) => [s.id, s.name]));

  const { data: appointments = [] } = useQuery({
    queryKey: ["exp-appointments", business?.id, from],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("id,starts_at,price,status,client_name_snapshot,staff_id")
        .eq("business_id", business!.id)
        .gte("starts_at", appointmentsFrom)
        .lte("starts_at", appointmentsTo);
      return (data ?? []) as AppointmentLite[];
    },
  });

  const { data: movements = [] } = useQuery({
    queryKey: ["exp-mov", business?.id, from],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("cash_movements")
        .select("id,accounting_date,kind,amount,concept,method,created_at")
        .eq("business_id", business!.id)
        .gte("accounting_date", from)
        .lte("accounting_date", to)
        .order("accounting_date")
        .order("created_at");
      return (data ?? []) as CashMovementRow[];
    },
  });

  const { data: dailyCloses = [] } = useQuery({
    queryKey: ["exp-close", business?.id, from],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_closes")
        .select("close_date,total_cash,cash_counted,cash_diff,profit_estimated,created_at")
        .eq("business_id", business!.id)
        .gte("close_date", from)
        .lte("close_date", to)
        .order("close_date");
      if (error) throw error;
      return (data ?? []) as DailyCloseRow[];
    },
  });

  const activePayments = filterCashActivePayments(payments, appointments);
  const cancelledAppointmentPayments = payments.filter((payment) =>
    isPaymentLinkedToCancelledAppointment(payment, appointments),
  );
  const collectedPayments = activePayments.filter(isCollectedPayment);
  const sales = collectedPayments.reduce((s, p) => s + p.amount, 0);
  const tips = collectedPayments.reduce((s, p) => s + getPaymentTipAmount(p), 0);
  const received = sales + tips;
  const cash = collectedPayments
    .filter((p) => p.method === "efectivo")
    .reduce((s, p) => s + p.amount, 0);
  const transfer = collectedPayments
    .filter((p) => p.method === "transferencia")
    .reduce((s, p) => s + p.amount, 0);
  const card = collectedPayments
    .filter((p) => p.method === "debito" || p.method === "credito")
    .reduce((s, p) => s + p.amount, 0);
  const commissions = collectedPayments.reduce((s, p) => s + (p.commission_amount ?? 0), 0);
  const manualIncome = movements
    .filter((movement) => movement.kind === "ingreso")
    .reduce((sum, movement) => sum + movement.amount, 0);
  const expenses = movements
    .filter((movement) => movement.kind === "egreso")
    .reduce((sum, movement) => sum + movement.amount, 0);
  const netFlow = received + manualIncome - expenses;

  const downloadCSV = () => {
    const rows = [
      [
        "fecha",
        "hora_registro",
        "tipo",
        "categoria",
        "metodo",
        "estado",
        "monto_clp",
        "propina_clp",
        "total_contable_clp",
        "impacto_efectivo_clp",
        "barbero",
        "comision_pct",
        "comision_clp",
        "notas",
        "efectivo_esperado_clp",
        "efectivo_contado_clp",
        "diferencia_caja_clp",
        "resultado_ajustado_clp",
      ],
      ...activePayments.map((p) => {
        const d = new Date(p.created_at);
        const tip = getPaymentTipAmount(p);
        const collected = isCollectedPayment(p);
        return [
          p.accounting_date,
          d.toTimeString().slice(0, 5),
          "pago_servicio",
          "Servicio",
          methodLabel(p.method),
          p.status,
          String(p.amount),
          String(tip),
          String(collected ? p.amount + tip : 0),
          String(collected && p.method === "efectivo" ? p.amount + tip : 0),
          p.staff_id ? (staffMap[p.staff_id] ?? "") : "",
          p.commission_pct != null ? String(p.commission_pct) : "",
          p.commission_amount != null ? String(p.commission_amount) : "",
          getPaymentDisplayNotes(p.notes).replace(/[\n,;]/g, " "),
          "",
          "",
          "",
          "",
        ];
      }),
      ...movements.map((movement) => {
        const d = new Date(movement.created_at);
        const signedAmount = movement.kind === "egreso" ? -movement.amount : movement.amount;
        const cashImpact = movement.method === "efectivo" ? signedAmount : 0;
        return [
          movement.accounting_date,
          d.toTimeString().slice(0, 5),
          `${movement.kind}_manual`,
          "Movimiento manual",
          methodLabel(movement.method),
          "registrado",
          String(movement.amount),
          "0",
          String(signedAmount),
          String(cashImpact),
          "",
          "",
          "",
          movement.concept.replace(/[\n,;]/g, " "),
          "",
          "",
          "",
          "",
        ];
      }),
      ...cancelledAppointmentPayments.map((p) => {
        const d = new Date(p.created_at);
        const tip = getPaymentTipAmount(p);
        return [
          p.accounting_date,
          d.toTimeString().slice(0, 5),
          "pago_servicio_no_contabilizado",
          "Cita cancelada",
          methodLabel(p.method),
          `${p.status}_cita_cancelada`,
          String(p.amount),
          String(tip),
          "0",
          "0",
          p.staff_id ? (staffMap[p.staff_id] ?? "") : "",
          p.commission_pct != null ? String(p.commission_pct) : "",
          p.commission_amount != null ? String(p.commission_amount) : "",
          "Pago ligado a cita cancelada. No contabilizado como venta activa.",
          "",
          "",
          "",
          "",
        ];
      }),
      ...dailyCloses.map((report) => {
        const createdAt = new Date(report.created_at);
        return [
          report.close_date,
          createdAt.toTimeString().slice(0, 5),
          "informe_diario",
          "Informe diario",
          "",
          "guardado",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          String(report.total_cash),
          report.cash_counted == null ? "" : String(report.cash_counted),
          report.cash_counted == null ? "" : String(report.cash_diff),
          report.cash_counted == null ? "" : String(report.profit_estimated + report.cash_diff),
        ];
      }),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${business?.name ?? "barberia"}-${monthLabel.replace(/\s/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV descargado");
  };

  const printPDF = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>Resumen ${monthLabel}</title>
<style>
  body{font-family:-apple-system,Inter,sans-serif;padding:32px;color:#111;max-width:720px;margin:0 auto;}
  h1{font-size:22px;margin:0 0 4px}
  h2{font-size:14px;margin:24px 0 8px;text-transform:uppercase;letter-spacing:0.08em;color:#666}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{padding:6px 8px;border-bottom:1px solid #eee;text-align:left}
  th{color:#666;font-weight:500;text-transform:uppercase;font-size:10px;letter-spacing:0.06em}
  .totals{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:8px}
  .card{border:1px solid #eee;border-radius:10px;padding:12px}
  .card .l{font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.06em}
  .card .v{font-size:18px;font-weight:600;margin-top:2px}
  .right{text-align:right}
</style></head><body>
<h1>${business?.name ?? "Barbería"}</h1>
<p style="color:#666;margin:0">Resumen contable — ${monthLabel}</p>
<div class="totals">
  <div class="card"><div class="l">Total ventas</div><div class="v">${clp(sales)}</div></div>
  <div class="card"><div class="l">Propinas</div><div class="v">${clp(tips)}</div></div>
  <div class="card"><div class="l">Total recibido</div><div class="v">${clp(received)}</div></div>
  <div class="card"><div class="l">Ingresos manuales</div><div class="v">${clp(manualIncome)}</div></div>
  <div class="card"><div class="l">Egresos</div><div class="v">${clp(expenses)}</div></div>
  <div class="card"><div class="l">Flujo neto</div><div class="v">${clp(netFlow)}</div></div>
  <div class="card"><div class="l">Comisiones</div><div class="v">${clp(commissions)}</div></div>
  <div class="card"><div class="l">Cobros</div><div class="v">${collectedPayments.length}</div></div>
</div>
<h2>Por método</h2>
<table>
  <tr><th>Método</th><th class="right">Monto</th></tr>
  <tr><td>Efectivo</td><td class="right">${clp(cash)}</td></tr>
  <tr><td>Transferencia</td><td class="right">${clp(transfer)}</td></tr>
  <tr><td>Tarjeta</td><td class="right">${clp(card)}</td></tr>
</table>
<h2>Informes diarios</h2>
<table>
  <tr><th>Fecha</th><th class="right">Esperado</th><th class="right">Contado</th><th class="right">Diferencia</th><th class="right">Resultado ajustado</th></tr>
  ${
    dailyCloses.length > 0
      ? dailyCloses
          .map(
            (report) =>
              `<tr><td>${formatAccountingDate(report.close_date)}</td><td class="right">${clp(report.total_cash)}</td><td class="right">${report.cash_counted == null ? "Sin conteo" : clp(report.cash_counted)}</td><td class="right">${report.cash_counted == null ? "—" : `${report.cash_diff > 0 ? "+" : ""}${clp(report.cash_diff)}`}</td><td class="right">${report.cash_counted == null ? "—" : clp(report.profit_estimated + report.cash_diff)}</td></tr>`,
          )
          .join("")
      : '<tr><td colspan="5">Sin informes guardados para este período.</td></tr>'
  }
</table>
<h2>Detalle</h2>
<table>
  <tr><th>Fecha</th><th>Método</th><th>Barbero</th><th>Estado</th><th class="right">Venta</th><th class="right">Propina</th><th class="right">Recibido</th></tr>
  ${[...activePayments, ...cancelledAppointmentPayments]
    .map((p) => {
      const d = new Date(p.created_at);
      const tip = getPaymentTipAmount(p);
      const linkedToCancelled = isPaymentLinkedToCancelledAppointment(p, appointments);
      const total = !linkedToCancelled && isCollectedPayment(p) ? p.amount + tip : 0;
      const status = linkedToCancelled ? "No contabilizado · cita cancelada" : p.status;
      return `<tr><td>${formatAccountingDate(p.accounting_date)} ${d.toTimeString().slice(0, 5)}</td><td>${methodLabel(p.method)}</td><td>${p.staff_id ? (staffMap[p.staff_id] ?? "") : ""}</td><td>${status}</td><td class="right">${clp(p.amount)}</td><td class="right">${clp(tip)}</td><td class="right">${clp(total)}</td></tr>`;
    })
    .join("")}
</table>
<h2>Movimientos manuales</h2>
<table>
  <tr><th>Fecha</th><th>Tipo</th><th>Método</th><th>Concepto</th><th class="right">Monto</th><th class="right">Impacto efectivo</th></tr>
  ${movements
    .map((movement) => {
      const d = new Date(movement.created_at);
      const sign = movement.kind === "egreso" ? "−" : "+";
      const signedAmount = movement.kind === "egreso" ? -movement.amount : movement.amount;
      const cashImpact = movement.method === "efectivo" ? signedAmount : 0;
      return `<tr><td>${formatAccountingDate(movement.accounting_date)} ${d.toTimeString().slice(0, 5)}</td><td>${movement.kind}</td><td>${methodLabel(movement.method)}</td><td>${movement.concept}</td><td class="right">${sign} ${clp(movement.amount)}</td><td class="right">${cashImpact > 0 ? "+" : ""}${clp(cashImpact)}</td></tr>`;
    })
    .join("")}
</table>
<script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
</body></html>`);
    w.document.close();
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
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Exportar</p>
          <h1 className="text-xl font-semibold tracking-tight capitalize">{monthLabel}</h1>
        </div>
      </header>

      <div className="px-5 flex gap-2">
        <button
          onClick={() => setOffset((o) => o + 1)}
          className="flex-1 h-10 rounded-xl bg-surface hairline text-xs font-medium"
        >
          ← Mes anterior
        </button>
        {offset > 0 && (
          <button
            onClick={() => setOffset((o) => Math.max(0, o - 1))}
            className="flex-1 h-10 rounded-xl bg-surface hairline text-xs font-medium"
          >
            Mes siguiente →
          </button>
        )}
      </div>

      <section className="px-5 mt-4 grid grid-cols-2 gap-2">
        <Card label="Ventas" value={clp(sales)} />
        <Card label="Propinas" value={clp(tips)} />
        <Card label="Recibido" value={clp(received)} />
        <Card label="Ingresos manuales" value={clp(manualIncome)} />
        <Card label="Egresos" value={clp(expenses)} />
        <Card label="Flujo neto" value={clp(netFlow)} />
        <Card label="Comisiones" value={clp(commissions)} />
        <Card label="Cobros" value={String(collectedPayments.length)} />
      </section>

      <section className="px-5 mt-5 space-y-2">
        <button
          onClick={printPDF}
          className="w-full h-14 rounded-2xl bg-foreground text-background font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          <FileText className="w-4 h-4" /> Imprimir / PDF
        </button>
        <button
          onClick={downloadCSV}
          className="w-full h-14 rounded-2xl bg-surface hairline font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          <Download className="w-4 h-4" /> Descargar CSV
        </button>
      </section>

      <p className="mt-6 px-8 text-[11px] text-muted-foreground text-center">
        Incluye cobros, movimientos e informes diarios guardados por fecha contable.
      </p>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface hairline p-3.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular">{value}</p>
    </div>
  );
}

function formatAccountingDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}
