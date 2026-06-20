import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useBusiness } from "@/lib/business-context";

export const Route = createFileRoute("/_authenticated")({
  component: Layout,
});

function Layout() {
  const { user, loading } = useAuth();
  const { business, loading: bLoading, error: businessError, refresh } = useBusiness();

  if (loading || bLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-7 w-7 rounded-full border-2 border-muted border-t-foreground animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" />;
  if (businessError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold">No pudimos cargar tu negocio</h1>
          <p className="mt-2 text-sm text-muted-foreground">{businessError}</p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-5 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  if ((!business || !business.onboarded) && !path.startsWith("/onboarding")) {
    return <Navigate to="/onboarding" />;
  }
  return <Outlet />;
}
