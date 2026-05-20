import { Link, useLocation } from "@tanstack/react-router";
import { CalendarDays, Home, Users, Wallet, MoreHorizontal } from "lucide-react";

const items = [
  { to: "/today", label: "Hoy", icon: Home },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/caja", label: "Caja", icon: Wallet },
  { to: "/clients", label: "Clientes", icon: Users },
  { to: "/more", label: "Más", icon: MoreHorizontal },
] as const;

export function BottomNav() {
  const loc = useLocation();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 safe-bottom">
      <div className="mx-auto max-w-md px-3 pb-2">
        <div className="glass hairline rounded-2xl flex items-stretch justify-around h-[58px] px-1">
          {items.map((it) => {
            const Icon = it.icon;
            const active =
              loc.pathname === it.to ||
              (it.to !== "/today" && loc.pathname.startsWith(it.to));
            return (
              <Link
                key={it.to}
                to={it.to}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform relative"
              >
                {active && (
                  <span className="absolute top-1 h-[3px] w-6 rounded-full bg-foreground" />
                )}
                <Icon
                  className={`w-[20px] h-[20px] ${
                    active ? "text-foreground" : "text-muted-foreground"
                  }`}
                />
                <span
                  className={`text-[10px] font-medium tracking-wide ${
                    active ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {it.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
