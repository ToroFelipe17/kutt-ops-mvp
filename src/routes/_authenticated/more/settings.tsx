import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, ChevronLeft } from "lucide-react";
import { useBusiness } from "@/lib/business-context";
import { getStoredVisualTheme, setStoredVisualTheme, VISUAL_THEMES, type VisualTheme } from "@/lib/visual-theme";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/more/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { business } = useBusiness();
  const [visualTheme, setVisualTheme] = useState<VisualTheme>(() => getStoredVisualTheme());

  useEffect(() => {
    setVisualTheme(getStoredVisualTheme());
  }, []);

  const selectVisualTheme = (theme: VisualTheme) => {
    setVisualTheme(theme);
    setStoredVisualTheme(theme);
    toast.success("Preferencia visual actualizada");
  };

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
          <p className="text-xs text-muted-foreground">Preferencias</p>
          <h2 className="mt-1 text-base font-semibold">Tono visual</h2>
          <div className="mt-4 grid gap-2">
            {VISUAL_THEMES.map((theme) => (
              <button
                key={theme.value}
                type="button"
                onClick={() => selectVisualTheme(theme.value)}
                className={`relative rounded-2xl border p-4 text-left active:scale-[0.99] transition-transform overflow-hidden ${theme.previewClassName}`}
              >
                <span className="flex items-center justify-between gap-4">
                  <span>
                    <span className="block text-sm font-semibold">{theme.label}</span>
                    <span className="mt-1 block text-xs opacity-70">{theme.hint}</span>
                  </span>
                  {visualTheme === theme.value && (
                    <span className="h-8 w-8 rounded-full bg-current/10 grid place-items-center shrink-0">
                      <Check className="w-4 h-4" strokeWidth={3} />
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

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
