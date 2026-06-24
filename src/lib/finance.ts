import { startOfDay, endOfDay, localDateKey } from "./format";

export type PaymentMethod = "efectivo" | "transferencia" | "debito" | "credito";
export type PaymentStatus = "pendiente" | "conciliado" | "parcial";

export interface PaymentRow {
  id: string;
  accounting_date: string;
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
  accounting_date: string;
  kind: "ingreso" | "egreso";
  amount: number;
  concept: string;
  method: PaymentMethod;
  created_at: string;
}

export interface DayTotals {
  sales: number; // Service sales only, excluding tips
  tips: number;
  received: number; // Sales + tips
  cash: number;
  transfer: number;
  card: number;
  pending: number; // Citas no cobradas
  commissions: number; // Suma comisiones congeladas
  expenses: number;
  extraIncome: number;
  cashManualIncome: number;
  cashExpenses: number;
  cashOnHand: number; // Cash service payments + cash tips + manual income - expenses
  agendaExpected: number;
  agendaCollected: number;
  profit: number; // sales + manual income - commissions - expenses
  ivaEstimated: number; // ~19% sobre ventas (CL)
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

export function isCollectedPayment(payment: Pick<PaymentRow, "status">): boolean {
  return payment.status !== "pendiente";
}

export function computeDayTotals(
  payments: PaymentRow[],
  appointments: AppointmentLite[],
  movements: CashMovementRow[],
): DayTotals {
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const collectedPayments = payments.filter(isCollectedPayment);
  const cashPayments = collectedPayments.filter((p) => p.method === "efectivo");
  const cash = sum(cashPayments.map((p) => p.amount));
  const transfer = sum(
    collectedPayments.filter((p) => p.method === "transferencia").map((p) => p.amount),
  );
  const card = sum(
    collectedPayments
      .filter((p) => p.method === "debito" || p.method === "credito")
      .map((p) => p.amount),
  );
  const sales = cash + transfer + card;
  const tips = sum(collectedPayments.map(getPaymentTipAmount));
  const cashTips = sum(cashPayments.map(getPaymentTipAmount));
  const received = sales + tips;
  const activeAppointments = appointments.filter(
    (appointment) => appointment.status !== "cancelado",
  );
  const appointmentIds = new Set(activeAppointments.map((appointment) => appointment.id));
  const agendaExpected = sum(activeAppointments.map((appointment) => appointment.price));
  const agendaCollected = sum(
    collectedPayments
      .filter((payment) => payment.appointment_id && appointmentIds.has(payment.appointment_id))
      .map((payment) => payment.amount),
  );
  const pending = Math.max(agendaExpected - agendaCollected, 0);
  const commissions = sum(collectedPayments.map((p) => p.commission_amount ?? 0));
  const incomeMovements = movements.filter((m) => m.kind === "ingreso");
  const expenseMovements = movements.filter((m) => m.kind === "egreso");
  const expenses = sum(expenseMovements.map((m) => m.amount));
  const extraIncome = sum(incomeMovements.map((m) => m.amount));
  const cashManualIncome = sum(
    incomeMovements.filter((m) => m.method === "efectivo").map((m) => m.amount),
  );
  const cashExpenses = sum(
    expenseMovements.filter((m) => m.method === "efectivo").map((m) => m.amount),
  );
  const cashOnHand = cash + cashTips + cashManualIncome - cashExpenses;
  const profit = sales + extraIncome - commissions - expenses;
  const ivaEstimated = Math.round((sales / 1.19) * 0.19);

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
    cashManualIncome,
    cashExpenses,
    cashOnHand,
    agendaExpected,
    agendaCollected,
    profit,
    ivaEstimated,
    count: collectedPayments.length,
  };
}

export function dayRange(d = new Date()): [string, string] {
  return [startOfDay(d).toISOString(), endOfDay(d).toISOString()];
}

export function accountingMonthRange(d = new Date()): [string, string] {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return [localDateKey(start), localDateKey(end)];
}

export function methodLabel(m: PaymentMethod): string {
  return {
    efectivo: "Efectivo",
    transferencia: "Transferencia",
    debito: "Débito",
    credito: "Crédito",
  }[m];
}
