# Architecture

KUTT es una aplicacion web MVP construida con frontend React y backend Supabase.

## Capas actuales

- React frontend para interfaz y flujos de usuario.
- TanStack Router / TanStack Start para rutas y estructura de app.
- Supabase Auth para autenticacion.
- Supabase Postgres como base de datos operacional.
- Row Level Security para control de acceso por negocio.
- Migraciones versionadas en `supabase/migrations`.
- GitHub como control de versiones y fuente de verdad del repositorio.

## Estructura relevante

- `src/routes`: pantallas y rutas de la aplicacion.
- `src/components`: componentes compartidos.
- `src/components/ui`: componentes UI base estilo shadcn/Radix.
- `src/lib`: reglas y helpers de dominio, formato, caja, horario y tema visual.
- `src/integrations/supabase`: clientes, helpers de auth y tipos generados.
- `supabase/migrations`: historial versionado de cambios de base de datos.
- `docs`: documentacion tecnica y de producto.

## Flujos principales

- Autenticacion: Supabase Auth.
- Negocio activo: contexto de negocio en frontend.
- Caja: pagos, movimientos, propinas, egresos y cierre diario.
- Agenda: citas con servicio, barbero, cliente y estado.
- Configuracion: preferencias visuales, horario, barberos y servicios.

## Regla de arquitectura

La logica critica de seguridad debe vivir en Supabase mediante RLS, policies, constraints y migraciones. El frontend puede mejorar UX, pero no debe ser la unica barrera de seguridad.
