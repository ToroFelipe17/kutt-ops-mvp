# Decisions

Registro de decisiones tecnicas y de producto relevantes.

## 2026-06-18: Migrar desde Lovable Cloud a Supabase propio

Decision: KUTT deja de depender operativamente de Lovable Cloud y usa un proyecto Supabase propio administrado por el equipo.

Motivos:

- Control del backend y de la configuracion del proyecto.
- Independencia tecnologica respecto de Lovable Cloud.
- Migraciones propias versionadas en el repositorio.
- Mayor control de seguridad, RLS, grants y politicas.
- Mejor base para escalar el producto y auditar cambios.

Consecuencias:

- Las migraciones viven en `supabase/migrations`.
- Supabase CLI pasa a ser parte del flujo tecnico.
- RLS debe mantenerse activo.
- Las credenciales reales no deben versionarse.
- Lovable puede seguir existiendo temporalmente como scaffolding tecnico hasta reemplazarlo de forma segura.
