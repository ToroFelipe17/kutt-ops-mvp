import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useBusiness } from "@/lib/business-context";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { loading, user } = useAuth();
  const { business, loading: bLoading, error: businessError, refresh } = useBusiness();

  if (loading || bLoading) return <SplashLoader />;
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
  if (!business || !business.onboarded) return <Navigate to="/onboarding" />;
  return <Navigate to="/today" />;
}

function SplashLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-9 w-9 rounded-full border-2 border-muted border-t-foreground animate-spin" />
        <p className="text-xs text-muted-foreground tracking-widest uppercase">KUTT</p>
      </div>
    </div>
  );
}
