# KUTT OPS

KUTT es una aplicacion web para gestion operacional de barberias y negocios de servicios. El foco del MVP es ayudar a manejar el dia a dia: agenda, caja, pagos, propinas, comisiones, clientes, barberos, servicios, horarios y cierre diario.

KUTT OPS es el concepto interno del proyecto y del sistema operacional que sostiene el producto.

## Estado actual

El proyecto nacio desde Lovable, pero el backend ya fue migrado a un proyecto Supabase propio administrado por el equipo. Desde esta etapa, el objetivo es profesionalizar la base tecnica, mantener migraciones versionadas y reducir la dependencia operacional de Lovable Cloud sin romper el MVP.

Estado relevante:

- Backend en Supabase propio.
- Migraciones versionadas en `supabase/migrations`.
- RLS activo y obligatorio.
- UI web React enfocada en mobile first.
- Documentacion base en `docs/`.
- Configuracion tecnica Lovable aun presente donde el build depende de ella.

## Stack tecnico

- React
- TypeScript
- TanStack Start / TanStack Router
- Tailwind CSS
- Supabase Auth
- Supabase Postgres
- Row Level Security
- Radix UI / shadcn-style components
- Vite
- Cloudflare Workers configuration
- GitHub como control de versiones

## Arquitectura general

La aplicacion esta organizada como frontend React con Supabase como backend.

- `src/routes`: rutas y pantallas principales.
- `src/components`: componentes compartidos.
- `src/components/ui`: componentes UI base.
- `src/lib`: helpers y reglas de dominio.
- `src/integrations/supabase`: cliente Supabase, auth helpers y tipos.
- `supabase/migrations`: migraciones versionadas.
- `docs`: documentacion tecnica, producto y reglas operacionales.

La seguridad de datos depende de Supabase RLS. El frontend mejora la experiencia, pero no debe ser la unica barrera de seguridad.

## Setup local

Instalar dependencias:

```bash
npm install
```

Crear archivo local de entorno:

```bash
cp .env.example .env
```

Completar `.env` con los valores del proyecto Supabase correspondiente. No commitear `.env` ni valores reales.

## Variables de entorno

Variables esperadas para frontend:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Variables server-side si el entorno las requiere:

```bash
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Importante:

- No usar `SUPABASE_SERVICE_ROLE_KEY` en codigo frontend.
- No publicar llaves privadas.
- No modificar `.env` en commits.

## Comandos principales

Desarrollo local:

```bash
npm run dev
```

Build de produccion:

```bash
npm run build
```

Preview local:

```bash
npm run preview
```

Lint:

```bash
npm run lint
```

Formato:

```bash
npm run format
```

## Supabase

El proyecto usa Supabase propio para Auth, Postgres y RLS.

Comandos utiles:

```bash
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
```

Reglas:

- Mantener RLS activo.
- No eliminar policies para resolver errores rapidamente.
- No usar `service_role` en frontend.
- No versionar `supabase/.temp`.
- Revisar migraciones con `--dry-run` antes de aplicar cambios sensibles.

## Migraciones

Las migraciones viven en:

```bash
supabase/migrations
```

Cada cambio de base de datos debe quedar versionado como migracion. No aplicar cambios manuales en Supabase sin reflejarlos en el repositorio.

## Estructura del repositorio

```text
.
+-- docs/
+-- src/
|   +-- components/
|   +-- hooks/
|   +-- integrations/
|   +-- lib/
|   +-- routes/
+-- supabase/
|   +-- config.toml
|   +-- migrations/
+-- package.json
+-- vite.config.ts
+-- wrangler.jsonc
```

## Roadmap resumido

- Fase 0: Migracion backend propio.
- Fase 1: Engineering Foundation.
- Fase 2: Caja estable.
- Fase 3: Comisiones.
- Fase 4: Clientes.
- Fase 5: Agenda.
- Fase 6: Liquid UI.
- Fase 7: Automatizaciones/IA.

Ver detalle en [docs/ROADMAP.md](./docs/ROADMAP.md).

## Documentacion

La base documental esta en [docs/README.md](./docs/README.md).

Documentos principales:

- [Architecture](./docs/ARCHITECTURE.md)
- [Supabase](./docs/SUPABASE.md)
- [Cash Rules](./docs/CASH_RULES.md)
- [Backlog](./docs/BACKLOG.md)
- [Decisions](./docs/DECISIONS.md)
- [Philosophy](./docs/PHILOSOPHY.md)
- [UI Guidelines](./docs/UI_GUIDELINES.md)

## Nota sobre Lovable

El repositorio aun conserva scaffolding tecnico generado desde Lovable, incluyendo `@lovable.dev/vite-tanstack-config`. No debe eliminarse hasta reemplazar y validar de forma segura la configuracion Vite, TanStack Start, Tailwind y Cloudflare.

Las tareas de limpieza pendientes estan documentadas en [docs/BACKLOG.md](./docs/BACKLOG.md).
