import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useBusiness } from "@/lib/business-context";

export const Route = createFileRoute("/_authenticated/more/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { business } = useBusiness();
  return (
    <div className="min-h-screen bg-background pb-28 safe-top">
      <header className="px-5 pt-5 pb-3 flex items-center gap-3">
        <Link to="/more" className="h-9 w-9 rounded-full bg-surface hairline grid place-items-center">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Ajustes</p>
          <h1 className="text-xl font-semibold tracking-tight">{business?.name ?? "Tu barbería"}</h1>
        </div>
      </header>

      <section className="px-5 mt-2">
        <div className="rounded-2xl bg-surface hairline p-4">
          <p className="text-xs text-muted-foreground">Horario</p>
          <p className="mt-1 text-sm font-medium tabular">
            {business
              ? `${String(business.open_hour).padStart(2, "0")}:00 — ${String(business.close_hour).padStart(2, "0")}:00`
              : "—"}
          </p>
        </div>
      </section>

      <p className="mt-8 px-8 text-[11px] text-muted-foreground text-center">
        Próximamente: edición de equipo, servicios, marca y horario detallado.
      </p>
    </div>
  );
}
