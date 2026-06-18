# Supabase

KUTT usa un proyecto Supabase propio. Lovable Cloud ya no es la fuente operativa del backend.

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

Usar `--dry-run` antes de aplicar cambios cuando haya dudas.

## Seguridad

- RLS debe mantenerse activo.
- No desactivar policies para resolver errores rapidamente.
- No usar `service_role` en frontend.
- No exponer credenciales reales en commits, issues, logs o screenshots.
- No versionar `.env`.
- No versionar `supabase/.temp`.

## Funcion `user_owns_business`

Las policies usan `public.user_owns_business(business_id)` para validar propiedad del negocio.

La migracion `20260611090000_grant_user_owns_business_execute.sql` concede `EXECUTE` al rol `authenticated`. Si aparece el error `permission denied for function user_owns_business`, revisar que esa migracion exista y haya sido aplicada en el proyecto remoto.

## Variables

El frontend solo debe usar variables publicas pensadas para navegador, por ejemplo:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Las llaves privadas o `service_role` no deben usarse en codigo cliente.
