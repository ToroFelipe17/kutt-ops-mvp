import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Download, FileText } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { clp } from "@/lib/format";
import {
  getPaymentDisplayNotes,
  getPaymentTipAmount,
  monthRange,
  methodLabel,
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

function ExportPage() {
  const { business } = useBusiness();
  const [offset, setOffset] = useState(0);
  const ref = new Date();
  ref.setMonth(ref.getMonth() - offset);
  const [from, to] = monthRange(ref);
  const monthLabel = ref.toLocaleDateString("es-CL", { month: "long", year: "numeric" });

  const { data: payments = [] } = useQuery({
    queryKey: ["exp-pay", business?.id, from],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select(
          "id,amount,method,status,staff_id,commission_amount,commission_pct,appointment_id,notes,created_at",
        )
        .eq("business_id", business!.id)
        .gte("created_at", from)
        .lte("created_at", to)
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

  const sales = payments.reduce((s, p) => s + p.amount, 0);
  const tips = payments.reduce((s, p) => s + getPaymentTipAmount(p), 0);
  const received = sales + tips;
  const cash = payments.filter((p) => p.method === "efectivo").reduce((s, p) => s + p.amount, 0);
  const transfer = payments
    .filter((p) => p.method === "transferencia")
    .reduce((s, p) => s + p.amount, 0);
  const card = payments
    .filter((p) => p.method === "debito" || p.method === "credito")
    .reduce((s, p) => s + p.amount, 0);
  const commissions = payments.reduce((s, p) => s + (p.commission_amount ?? 0), 0);

  const downloadCSV = () => {
    const rows = [
      [
        "fecha",
        "hora",
        "metodo",
        "estado",
        "venta_clp",
        "propina_clp",
        "total_recibido_clp",
        "barbero",
        "comision_pct",
        "comision_clp",
        "notas",
      ],
      ...payments.map((p) => {
        const d = new Date(p.created_at);
        const tip = getPaymentTipAmount(p);
        return [
          d.toISOString().slice(0, 10),
          d.toTimeString().slice(0, 5),
          methodLabel(p.method),
          p.status,
          String(p.amount),
          String(tip),
          String(p.amount + tip),
          p.staff_id ? (staffMap[p.staff_id] ?? "") : "",
          p.commission_pct != null ? String(p.commission_pct) : "",
          p.commission_amount != null ? String(p.commission_amount) : "",
          getPaymentDisplayNotes(p.notes).replace(/[\n,;]/g, " "),
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
  <div class="card"><div class="l">Comisiones</div><div class="v">${clp(commissions)}</div></div>
  <div class="card"><div class="l">N° transacciones</div><div class="v">${payments.length}</div></div>
</div>
<h2>Por método</h2>
<table>
  <tr><th>Método</th><th class="right">Monto</th></tr>
  <tr><td>Efectivo</td><td class="right">${clp(cash)}</td></tr>
  <tr><td>Transferencia</td><td class="right">${clp(transfer)}</td></tr>
  <tr><td>Tarjeta</td><td class="right">${clp(card)}</td></tr>
</table>
<h2>Detalle</h2>
<table>
  <tr><th>Fecha</th><th>Método</th><th>Barbero</th><th>Estado</th><th class="right">Venta</th><th class="right">Propina</th><th class="right">Recibido</th></tr>
  ${payments
    .map((p) => {
      const d = new Date(p.created_at);
      const tip = getPaymentTipAmount(p);
      return `<tr><td>${d.toLocaleDateString("es-CL")} ${d.toTimeString().slice(0, 5)}</td><td>${methodLabel(p.method)}</td><td>${p.staff_id ? (staffMap[p.staff_id] ?? "") : ""}</td><td>${p.status}</td><td class="right">${clp(p.amount)}</td><td class="right">${clp(tip)}</td><td class="right">${clp(p.amount + tip)}</td></tr>`;
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
        <Card label="Comisiones" value={clp(commissions)} />
        <Card label="Transacciones" value={String(payments.length)} />
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
        Listo para entregar a tu contador. Incluye método, barbero, estado y comisión por pago.
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
