export function clp(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(v);
}

export function shortTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function shortDay(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
}

export function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function addMinutes(d: Date, m: number): Date {
  return new Date(d.getTime() + m * 60_000);
}

export function whatsappLink(phone: string | null | undefined, text: string): string {
  const clean = (phone ?? "").replace(/[^\d]/g, "");
  const withCC = clean.startsWith("56") ? clean : clean ? `56${clean}` : "";
  return `https://wa.me/${withCC}?text=${encodeURIComponent(text)}`;
}
