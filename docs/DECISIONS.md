# Decisions

Registro de decisiones tecnicas y de producto relevantes.

## 2026-06-18: Supabase propio como backend oficial

Estado: aplicada.

Decision: KUTT deja de depender de Lovable Cloud para el backend. El proyecto Supabase propio pasa a ser la fuente oficial del backend y las migraciones versionadas pasan a ser la fuente de verdad de la base de datos.

Motivos:

- Control del backend y de la configuracion del proyecto.
- Independencia tecnologica respecto de Lovable Cloud.
- Migraciones propias versionadas en el repositorio.
- Mayor control de seguridad, RLS, grants y politicas.
- Mejor base para escalar el producto y auditar cambios.

Consecuencias:

- Las migraciones viven en `supabase/migrations`.
- Supabase CLI pasa a ser parte del flujo tecnico.
- Los cambios remotos deben originarse o quedar representados en una migracion versionada.
- `20260611090000_grant_user_owns_business_execute.sql` y `20260618165155_grant_authenticated_app_table_access.sql` forman parte del estado aplicado.
- RLS debe mantenerse activo.
- Las policies no deben eliminarse ni relajarse para resolver errores de permisos.
- Las credenciales reales no deben versionarse.
- Lovable puede seguir existiendo temporalmente como scaffolding tecnico hasta reemplazarlo de forma segura.

## 2026-06-18: `accounting_date` como fecha comercial

Estado: aprobada para Fase 2.

Decision: KUTT incorporara `accounting_date` como la fecha comercial oficial de pagos y movimientos de caja. `created_at` conservara exclusivamente el momento tecnico en que cada registro fue creado.

Motivos:

- Un servicio historico registrado hoy debe pertenecer a la fecha seleccionada, no a la caja de hoy.
- Caja, cierres, exportaciones y comisiones necesitan una misma referencia contable.
- Las conversiones UTC no deben cambiar la fecha comercial del negocio.

Consecuencias:

- Las consultas financieras se agruparan por `accounting_date`.
- El cierre diario operara sobre una `accounting_date` especifica.
- Los registros existentes requeriran un backfill revisado antes de activar el nuevo modelo.
- `created_at` seguira disponible para auditoria tecnica y orden de creacion.
