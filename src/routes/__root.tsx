import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth-context";
import { BusinessProvider } from "@/lib/business-context";
import { Toaster } from "@/components/ui/sonner";
import {
  applyVisualTheme,
  getStoredVisualTheme,
  normalizeVisualTheme,
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  type VisualTheme,
} from "@/lib/visual-theme";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center">
        <h1 className="text-6xl font-semibold tracking-tight">404</h1>
        <p className="mt-3 text-sm text-muted-foreground">Página no encontrada</p>
        <a
          href="/"
          className="mt-6 inline-block rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background"
        >
          Volver
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-sm text-center">
        <h1 className="text-lg font-semibold">Algo no cargó</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-5 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1",
      },
      { name: "theme-color", content: "#0d0d10" },
      { title: "KUTT — Barber shop operations" },
      {
        name: "description",
        content:
          "Minimal daily operations for barber shops: appointments, payments, cash and clients.",
      },
      { property: "og:title", content: "KUTT — Barber shop operations" },
      { name: "twitter:title", content: "KUTT — Barber shop operations" },
      {
        property: "og:description",
        content:
          "Minimal daily operations for barber shops: appointments, payments, cash and clients.",
      },
      {
        name: "twitter:description",
        content:
          "Minimal daily operations for barber shops: appointments, payments, cash and clients.",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [visualTheme, setVisualTheme] = useState<VisualTheme>(() => getStoredVisualTheme());

  useEffect(() => {
    const theme = getStoredVisualTheme();
    applyVisualTheme(theme);
    setVisualTheme(theme);

    const syncTheme = () => {
      const nextTheme = getStoredVisualTheme();
      applyVisualTheme(nextTheme);
      setVisualTheme(nextTheme);
    };

    const handleThemeChange = (event: Event) => {
      const nextTheme = normalizeVisualTheme((event as CustomEvent<VisualTheme>).detail);
      applyVisualTheme(nextTheme);
      setVisualTheme(nextTheme);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) syncTheme();
    };

    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("pageshow", syncTheme);
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("pageshow", syncTheme);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BusinessProvider>
          <Outlet />
          <Toaster position="top-center" theme={visualTheme} richColors closeButton={false} />
        </BusinessProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
