import type { Database } from "@/integrations/supabase/types";

export type AppointmentStatus = Database["public"]["Enums"]["appointment_status"];

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  llego: "Llegó",
  pagado: "Pagado",
  completado: "Completado",
  cancelado: "Cancelado",
};

export const STATUS_STYLES: Record<AppointmentStatus, { dot: string; text: string; bg: string }> = {
  pendiente:   { dot: "bg-warning",     text: "text-warning",     bg: "bg-warning/10" },
  confirmado:  { dot: "bg-info",        text: "text-info",        bg: "bg-info/10" },
  llego:       { dot: "bg-foreground",  text: "text-foreground",  bg: "bg-foreground/10" },
  pagado:      { dot: "bg-success",     text: "text-success",     bg: "bg-success/10" },
  completado:  { dot: "bg-muted-foreground", text: "text-muted-foreground", bg: "bg-muted/40" },
  cancelado:   { dot: "bg-destructive", text: "text-destructive", bg: "bg-destructive/10" },
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}
