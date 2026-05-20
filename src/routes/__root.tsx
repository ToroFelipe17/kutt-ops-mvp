import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center">
        <h1 className="text-6xl font-semibold tracking-tight">404</h1>
        <p className="mt-3 text-sm text-muted-foreground">Página no encontrada</p>
        <a href="/" className="mt-6 inline-block rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background">
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
          onClick={() => { router.invalidate(); reset(); }}
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
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1" },
      { name: "theme-color", content: "#0d0d10" },
      { title: "Sillón — Sistema de barbería" },
      { name: "description", content: "Sistema operativo simple, rápido y privado para barberías." },
      { property: "og:title", content: "Sillón — Sistema de barbería" },
      { name: "twitter:title", content: "Sillón — Sistema de barbería" },
      { property: "og:description", content: "Sistema operativo simple, rápido y privado para barberías." },
      { name: "twitter:description", content: "Sistema operativo simple, rápido y privado para barberías." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/179a9fa0-00d9-49f3-baf2-63315dbfc331/id-preview-cdc6ce70--d3eff18b-7d03-4ee3-b6a9-13658284333b.lovable.app-1778737884054.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/179a9fa0-00d9-49f3-baf2-63315dbfc331/id-preview-cdc6ce70--d3eff18b-7d03-4ee3-b6a9-13658284333b.lovable.app-1778737884054.png" },
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
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BusinessProvider>
          <Outlet />
          <Toaster position="top-center" theme="dark" richColors closeButton={false} />
        </BusinessProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
