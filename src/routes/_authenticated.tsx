import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useBusiness } from "@/lib/business-context";

export const Route = createFileRoute("/_authenticated")({
  component: Layout,
});

function Layout() {
  const { user, loading } = useAuth();
  const { business, loading: bLoading } = useBusiness();

  if (loading || bLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-7 w-7 rounded-full border-2 border-muted border-t-foreground animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" />;
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  if ((!business || !business.onboarded) && !path.startsWith("/onboarding")) {
    return <Navigate to="/onboarding" />;
  }
  return <Outlet />;
}
