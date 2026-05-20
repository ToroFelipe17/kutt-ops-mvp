import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { BottomNav } from "@/components/BottomNav";
import {
  ChevronRight,
  ClipboardCheck,
  Download,
  LogOut,
  Settings as SettingsIcon,
  Users2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useBusiness } from "@/lib/business-context";

export const Route = createFileRoute("/_authenticated/more")({
  component: MoreLayout,
});

function MoreLayout() {
  const loc = useLocation();
  if (loc.pathname !== "/more") return <Outlet />;
  return <MoreIndex />;
}

function MoreIndex() {
  const { signOut, user } = useAuth();
  const { business } = useBusiness();

  const items = [
    { to: "/more/close", label: "Cierre diario", desc: "Resumen y conteo de caja", icon: ClipboardCheck },
    { to: "/more/commissions", label: "Comisiones", desc: "% por barbero y deudas", icon: Users2 },
    { to: "/more/export", label: "Exportar contador", desc: "PDF, CSV mensual e IVA", icon: Download },
    { to: "/more/settings", label: "Ajustes", desc: "Equipo, servicios, horario", icon: SettingsIcon },
  ] as const;

  return (
    <div className="min-h-screen bg-background pb-28 safe-top px-5 pt-5">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Más</p>
      <h1 className="text-2xl font-semibold tracking-tight">{business?.name ?? "Tu barbería"}</h1>
      <p className="mt-1 text-xs text-muted-foreground truncate">{user?.email}</p>

      <ul className="mt-6 space-y-2">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className="rounded-2xl bg-surface hairline p-4 flex items-center gap-3 active:scale-[0.99] transition-transform"
              >
                <div className="h-10 w-10 rounded-xl bg-muted grid place-items-center shrink-0">
                  <Icon className="w-4.5 h-4.5 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{it.label}</p>
                  <p className="text-[11px] text-muted-foreground">{it.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            </li>
          );
        })}
      </ul>

      <button
        onClick={() => signOut()}
        className="mt-6 w-full h-12 rounded-2xl bg-destructive/10 text-destructive font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
      >
        <LogOut className="w-4 h-4" /> Cerrar sesión
      </button>

      <BottomNav />
    </div>
  );
}
