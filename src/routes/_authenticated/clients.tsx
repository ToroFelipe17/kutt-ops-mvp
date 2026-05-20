import { createFileRoute } from "@tanstack/react-router";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/_authenticated/clients")({
  component: ClientsStub,
});

function ClientsStub() {
  return (
    <div className="min-h-screen bg-background pb-28 safe-top px-5 pt-5">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Clientes</p>
      <h1 className="text-2xl font-semibold tracking-tight">Próximamente</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Estamos puliendo este módulo en la siguiente fase, junto con Pagos, Caja y Ajustes.
      </p>
      <BottomNav />
    </div>
  );
}
