# Supabase

KUTT usa un proyecto Supabase propio, actualmente operativo y validado con los flujos minimos del MVP. Lovable Cloud ya no es la fuente oficial ni operativa del backend.

Estado actual:

- Migraciones aplicadas correctamente mediante Supabase CLI.
- Error de permisos de `user_owns_business` resuelto.
- Acceso de `authenticated` a tablas de aplicacion concedido mediante migracion.
- RLS y policies permanecen activas.

## Componentes usados

- Supabase Auth para login, registro y sesion.
- Supabase Postgres para datos del negocio.
- RLS para aislar datos por negocio.
- Supabase CLI para migraciones.

## Migraciones

Las migraciones viven en:

```bash
supabase/migrations
```

Comandos utiles:

```bash
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
```

Ejecutar `npx supabase db push --dry-run` antes de cada push de migraciones. Revisar la salida y solo entonces ejecutar `npx supabase db push`.

Las migraciones versionadas son la fuente de verdad de la base de datos. No aplicar cambios manuales permanentes sin representarlos en `supabase/migrations`.

## Seguridad

- RLS debe mantenerse activo.
- No desactivar policies para resolver errores rapidamente.
- No usar `service_role` en frontend.
- No exponer credenciales reales en commits, issues, logs o screenshots.
- No versionar `.env`.
- No versionar `supabase/.temp`.

## Funcion `user_owns_business`

Las policies usan `public.user_owns_business(business_id)` para validar propiedad del negocio.

La migracion `20260611090000_grant_user_owns_business_execute.sql` concede `EXECUTE` al rol `authenticated` y ya fue aplicada. La migracion `20260618165155_grant_authenticated_app_table_access.sql` completa los grants requeridos por las tablas de la aplicacion.

El error `permission denied for function user_owns_business` se considera resuelto. Si reaparece, se debe comparar el historial remoto con `supabase/migrations`, sin desactivar RLS ni policies.

## Variables

El frontend solo debe usar variables publicas pensadas para navegador, por ejemplo:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Las llaves privadas o `service_role` no deben usarse en codigo cliente.
