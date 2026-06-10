import { startOfDay, endOfDay } from "./format";

export type PaymentMethod = "efectivo" | "transferencia" | "debito" | "credito";
export type PaymentStatus = "pendiente" | "conciliado" | "parcial";

export interface PaymentRow {
  id: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  staff_id: string | null;
  commission_amount: number | null;
  commission_pct: number | null;
  appointment_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface AppointmentLite {
  id: string;
  starts_at: string;
  price: number;
  status: string;
  client_name_snapshot: string | null;
  staff_id: string | null;
}

export interface CashMovementRow {
  id: string;
  kind: "ingreso" | "egreso";
  amount: number;
  concept: string;
  created_at: string;
}

export interface DayTotals {
  sales: number;          // Service sales only, excluding tips
  tips: number;
  received: number;       // Sales + tips
  cash: number;
  transfer: number;
  card: number;
  pending: number;        // Citas no cobradas
  commissions: number;    // Suma comisiones congeladas
  expenses: number;
  extraIncome: number;
  cashOnHand: number;     // efectivo + ingresos manuales − egresos
  reconciled: number;
  unreconciled: number;
  profit: number;         // sales − commissions − expenses
  ivaEstimated: number;   // ~19% sobre ventas (CL)
  count: number;
}

const TIP_NOTE_PATTERN = /^KUTT_TIP_AMOUNT:(\d+)$/m;

export function getPaymentTipAmount(payment: Pick<PaymentRow, "notes">): number {
  const match = payment.notes?.match(TIP_NOTE_PATTERN);
  return match ? Number(match[1]) || 0 : 0;
}

export function getPaymentDisplayNotes(notes: string | null): string {
  return (notes ?? "").replace(TIP_NOTE_PATTERN, "").trim();
}

export function encodePaymentNotes(notes: string, tipAmount: number): string | null {
  const cleanNotes = notes.trim();
  const normalizedTip = Math.max(0, Math.round(tipAmount));
  const parts = [cleanNotes];

  if (normalizedTip > 0) {
    parts.push(`KUTT_TIP_AMOUNT:${normalizedTip}`);
  }

  const value = parts.filter(Boolean).join("\n");
  return value.length > 0 ? value : null;
}

export function computeDayTotals(
  payments: PaymentRow[],
  pendingApts: AppointmentLite[],
  movements: CashMovementRow[],
): DayTotals {
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const cash = sum(payments.filter((p) => p.method === "efectivo").map((p) => p.amount));
  const transfer = sum(payments.filter((p) => p.method === "transferencia").map((p) => p.amount));
  const card = sum(
    payments
      .filter((p) => p.method === "debito" || p.method === "credito")
      .map((p) => p.amount),
  );
  const sales = cash + transfer + card;
  const tips = sum(payments.map(getPaymentTipAmount));
  const received = sales + tips;
  const pending = sum(pendingApts.map((a) => a.price));
  const commissions = sum(payments.map((p) => p.commission_amount ?? 0));
  const expenses = sum(movements.filter((m) => m.kind === "egreso").map((m) => m.amount));
  const extraIncome = sum(movements.filter((m) => m.kind === "ingreso").map((m) => m.amount));
  const reconciled = sum(payments.filter((p) => p.status === "conciliado").map((p) => p.amount));
  const unreconciled = sum(payments.filter((p) => p.status !== "conciliado").map((p) => p.amount));
  const cashOnHand = cash + extraIncome - expenses;
  const profit = sales - commissions - expenses;
  const ivaEstimated = Math.round(sales / 1.19 * 0.19);

  return {
    sales,
    tips,
    received,
    cash,
    transfer,
    card,
    pending,
    commissions,
    expenses,
    extraIncome,
    cashOnHand,
    reconciled,
    unreconciled,
    profit,
    ivaEstimated,
    count: payments.length,
  };
}

export function dayRange(d = new Date()): [string, string] {
  return [startOfDay(d).toISOString(), endOfDay(d).toISOString()];
}

export function monthRange(d = new Date()): [string, string] {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  return [start.toISOString(), end.toISOString()];
}

export function methodLabel(m: PaymentMethod): string {
  return {
    efectivo: "Efectivo",
    transferencia: "Transferencia",
    debito: "Débito",
    credito: "Crédito",
  }[m];
}
