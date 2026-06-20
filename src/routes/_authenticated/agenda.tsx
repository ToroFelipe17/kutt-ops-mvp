import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { BottomNav } from "@/components/BottomNav";
import { StatusBadge, type AppointmentStatus } from "@/components/StatusBadge";
import { clp, endOfDay, shortTime, startOfDay } from "@/lib/format";
import { getSafeStaffColor } from "@/lib/staff-colors";

export const Route = createFileRoute("/_authenticated/agenda")({
  component: Agenda,
});

interface Row {
  id: string;
  starts_at: string;
  duration_min: number;
  price: number;
  status: AppointmentStatus;
  client_name_snapshot: string | null;
  service_name_snapshot: string | null;
  staff: { name: string; color: string | null } | null;
}

function Agenda() {
  const { business } = useBusiness();
  const qc = useQueryClient();
  const [date, setDate] = useState(() => startOfDay());

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["agenda", business?.id, date.toISOString()],
    enabled: !!business?.id,
    queryFn: async () => {
      const start = startOfDay(date);
      const end = endOfDay(date);
      const { data, error } = await supabase
        .from("appointments")
        .select(
          "id,starts_at,duration_min,price,status,client_name_snapshot,service_name_snapshot,staff:staff_id(name,color)",
        )
        .eq("business_id", business!.id)
        .gte("starts_at", start.toISOString())
        .lte("starts_at", end.toISOString())
        .order("starts_at");
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  useEffect(() => {
    if (!business?.id) return;
    const ch = supabase
      .channel(`agenda:${business.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `business_id=eq.${business.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["agenda", business.id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [business?.id, qc]);

  const open = business?.open_hour ?? 9;
  const close = business?.close_hour ?? 21;
  const hours = useMemo(
    () => Array.from({ length: close - open }, (_, i) => open + i),
    [open, close],
  );

  const HOUR_PX = 88;

  const shift = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(startOfDay(d));
  };

  const isToday = startOfDay().getTime() === date.getTime();

  return (
    <div className="min-h-screen bg-background pb-28 safe-top">
      <header className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Agenda</p>
          <h1 className="text-2xl font-semibold tracking-tight capitalize">
            {date.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "short" })}
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => shift(-1)}
            className="h-10 w-10 rounded-full bg-surface hairline grid place-items-center active:scale-90 transition-transform"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDate(startOfDay())}
            className={`h-10 px-3 rounded-full hairline text-xs font-medium ${isToday ? "bg-foreground text-background" : "bg-surface"}`}
          >
            Hoy
          </button>
          <button
            onClick={() => shift(1)}
            className="h-10 w-10 rounded-full bg-surface hairline grid place-items-center active:scale-90 transition-transform"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <Link
            to="/new"
            className="h-10 w-10 rounded-full bg-foreground text-background grid place-items-center active:scale-90 transition-transform"
            aria-label="Nueva cita"
          >
            <Plus className="w-5 h-5" />
          </Link>
        </div>
      </header>

      {isLoading ? (
        <div className="px-5 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-surface animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="px-5 mt-2 relative">
          <div className="relative">
            {hours.map((h) => (
              <div key={h} className="flex items-start gap-3" style={{ height: HOUR_PX }}>
                <div className="w-10 shrink-0 pt-1">
                  <span className="text-[11px] tabular text-muted-foreground">
                    {String(h).padStart(2, "0")}:00
                  </span>
                </div>
                <div className="flex-1 border-t border-border/60" />
              </div>
            ))}

            {/* Now line */}
            {isToday &&
              (() => {
                const now = new Date();
                const offsetMin = (now.getHours() - open) * 60 + now.getMinutes();
                if (offsetMin < 0 || offsetMin > (close - open) * 60) return null;
                const top = (offsetMin / 60) * HOUR_PX;
                return (
                  <div
                    className="absolute left-10 right-0 z-10 flex items-center gap-2 pointer-events-none"
                    style={{ top }}
                  >
                    <div className="h-2 w-2 rounded-full bg-info shadow-[0_0_0_4px_rgba(56,189,248,0.15)]" />
                    <div className="flex-1 h-px bg-info/60" />
                  </div>
                );
              })()}

            {/* Appointment blocks */}
            {rows.map((r) => {
              const d = new Date(r.starts_at);
              const offsetMin = (d.getHours() - open) * 60 + d.getMinutes();
              if (offsetMin < 0) return null;
              const top = (offsetMin / 60) * HOUR_PX;
              const height = Math.max(48, (r.duration_min / 60) * HOUR_PX - 4);
              const accent = getSafeStaffColor(r.staff?.color);
              return (
                <div
                  key={r.id}
                  className="absolute left-14 right-0 rounded-xl bg-surface-elevated hairline overflow-hidden"
                  style={{ top, height }}
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{ background: accent }}
                  />
                  <div className="pl-3 pr-3 py-2 h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold truncate">
                          {r.client_name_snapshot ?? "Cliente"}
                        </p>
                        <span className="text-[11px] tabular text-muted-foreground shrink-0">
                          {shortTime(r.starts_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {r.service_name_snapshot ?? "—"} · {r.staff?.name ?? "—"}
                      </p>
                    </div>
                    {height > 60 && (
                      <div className="flex items-center justify-between">
                        <StatusBadge status={r.status} />
                        <span className="text-[11px] tabular font-medium">{clp(r.price)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
