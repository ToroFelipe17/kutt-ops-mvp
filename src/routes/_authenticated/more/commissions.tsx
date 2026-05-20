import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/lib/business-context";
import { clp } from "@/lib/format";
import { monthRange } from "@/lib/finance";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/more/commissions")({
  component: CommissionsPage,
});

interface StaffRow { id: string; name: string; commission_pct: number; color: string | null }
interface PayRow { staff_id: string | null; commission_amount: number | null; amount: number; status: string }

function CommissionsPage() {
  const { business } = useBusiness();
  const qc = useQueryClient();
  const [from, to] = monthRange();

  const { data: staff = [] } = useQuery({
    queryKey: ["com-staff", business?.id],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data } = await supabase.from("staff")
        .select("id,name,commission_pct,color")
        .eq("business_id", business!.id).eq("active", true);
      return (data ?? []) as StaffRow[];
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["com-pay", business?.id, from],
    enabled: !!business?.id,
    queryFn: async () => {
      const { data } = await supabase.from("payments")
        .select("staff_id,commission_amount,amount,status")
        .eq("business_id", business!.id)
        .gte("created_at", from).lte("created_at", to);
      return (data ?? []) as PayRow[];
    },
  });

  const byStaff = useMemo(() => {
    const m = new Map<string, { sales: number; commission: number; count: number }>();
    for (const p of payments) {
      if (!p.staff_id) continue;
      const cur = m.get(p.staff_id) ?? { sales: 0, commission: 0, count: 0 };
      cur.sales += p.amount;
      cur.commission += p.commission_amount ?? 0;
      cur.count += 1;
      m.set(p.staff_id, cur);
    }
    return m;
  }, [payments]);

  const updatePct = useMutation({
    mutationFn: async ({ id, pct }: { id: string; pct: number }) => {
      const { error } = await supabase.from("staff").update({ commission_pct: pct }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["com-staff", business?.id] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  return (
    <div className="min-h-screen bg-background pb-28 safe-top">
      <header className="px-5 pt-5 pb-3 flex items-center gap-3">
        <Link to="/more" className="h-9 w-9 rounded-full bg-surface hairline grid place-items-center">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Comisiones</p>
          <h1 className="text-xl font-semibold tracking-tight">Mes en curso</h1>
        </div>
      </header>

      {staff.length === 0 ? (
        <div className="px-5">
          <div className="rounded-2xl bg-surface hairline p-8 text-center">
            <p className="text-sm font-medium">Sin barberos</p>
            <p className="mt-1 text-xs text-muted-foreground">Agrega tu equipo en Ajustes.</p>
          </div>
        </div>
      ) : (
        <ul className="px-5 space-y-2">
          {staff.map((s) => {
            const stats = byStaff.get(s.id) ?? { sales: 0, commission: 0, count: 0 };
            return (
              <li key={s.id} className="rounded-2xl bg-surface hairline p-4">
                <div className="flex items-center gap-3">
                  <span className="h-10 w-10 rounded-full grid place-items-center text-sm font-semibold" style={{ background: (s.color ?? "#10b981") + "30", color: s.color ?? "#10b981" }}>
                    {s.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground">{stats.count} pagos · ventas {clp(stats.sales)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-semibold tabular text-success">{clp(stats.commission)}</p>
                    <p className="text-[10px] text-muted-foreground">a pagar</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <p className="text-xs text-muted-foreground w-20">Comisión</p>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={s.commission_pct}
                    onChange={(e) => updatePct.mutate({ id: s.id, pct: Number(e.target.value) })}
                    className="flex-1 accent-foreground"
                  />
                  <p className="w-12 text-right text-sm font-semibold tabular">{Math.round(s.commission_pct)}%</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-6 px-7 text-[11px] text-muted-foreground text-center">
        El % se aplica al momento de cobrar y queda congelado en cada pago.
      </p>
    </div>
  );
}
