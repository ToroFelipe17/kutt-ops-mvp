import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useBusiness } from "@/lib/business-context";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { loading, user } = useAuth();
  const { business, loading: bLoading } = useBusiness();

  if (loading || bLoading) return <SplashLoader />;
  if (!user) return <Navigate to="/auth" />;
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
