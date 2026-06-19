# Backlog

Este backlog registra pendientes detectados durante pruebas y profesionalizacion del MVP.

## Completado recientemente

- Backend migrado a un proyecto Supabase propio.
- Migraciones remotas aplicadas correctamente con Supabase CLI.
- Error `permission denied for function user_owns_business` resuelto mediante `20260611090000_grant_user_owns_business_execute.sql`.
- Migracion `20260618165155_grant_authenticated_app_table_access.sql` aplicada.
- RLS y policies conservadas sin debilitar seguridad.
- Variables locales conectadas al Supabase propio.
- Flujo minimo probado: registro/login, onboarding, negocio, equipo, servicios y caja basica.
- KUTT Engineering Foundation creada en `docs/`.
- Refactor ESLint completado en el commit `986d079`.

## Auth y acceso

- Mostrar/ocultar contrasena en login y registro.
- Mejorar registro con nombre/apellido o nombre completo.
- Ajustar redirect de confirmacion de correo para produccion y red local.

## Fase 2A: Accounting date model

- Agregar `accounting_date` a pagos y movimientos de caja mediante una migracion versionada.
- Definir una estrategia segura de backfill para registros existentes.
- Guardar la fecha contable seleccionada en ingresos historicos.
- Agrupar Caja y cierre diario por `accounting_date`, no por `created_at`.
- Resolver explicitamente la zona horaria del negocio.

## Fase 2B: Tip amount migration

- Agregar `payments.tip_amount` con valor inicial cero y validacion no negativa.
- Migrar propinas existentes desde el marcador temporal `KUTT_TIP_AMOUNT`.
- Mantener ventas y propinas separadas en calculos y reportes.
- Eliminar el marcador temporal cuando `tip_amount` sea la fuente oficial.

## Fase 2C: Daily close enforcement

- Hacer que el cierre diario cierre una `accounting_date` especifica.
- Impedir pagos y movimientos normales sobre fechas cerradas.
- Definir un flujo de ajuste o reapertura explicito y auditable.
- Guardar en el cierre los totales necesarios, incluidas propinas e ingresos manuales.

## Fase 2D: Service price autocomplete

- Autocompletar el monto desde el precio del servicio seleccionado.
- Permitir una modificacion manual explicita cuando el precio real sea distinto.

## Fase 2E: Export and commissions alignment

- Agrupar exportaciones y comisiones por `accounting_date`.
- Evitar combinaciones de fecha UTC con hora local.
- Mantener comisiones entre 0 y 100 y mejorar su UX tactil.
- Mantener las propinas fuera de la base de comision salvo decision futura explicita.

## Agenda y clientes

- Agenda debe leer el horario real configurado para el negocio.
- Clientes debe convertirse en un modulo real con busqueda, edicion e historial operacional.

## UI y navegacion

- Mejorar navegacion movil tipo bottom navigation.
- Evaluar navegacion por swipe.
- Disenar futura interfaz KUTT Liquid UI inspirada en glassmorphism/iOS, sin sacrificar legibilidad.

## Limpieza Lovable pendiente

No eliminar todavia sin validar build:

- `.lovable/`
- `@lovable.dev/vite-tanstack-config` en `package.json`, `package-lock.json` y `bun.lock`.
- Plugins transitivos `@lovable.dev/vite-plugin-dev-server-bridge`, `@lovable.dev/vite-plugin-hmr-gate` y `lovable-tagger`.
- Comentario e import en `vite.config.ts` que dependen de `@lovable.dev/vite-tanstack-config`.
- Entradas de lockfile que resuelven paquetes desde cache historico de Lovable.

Plan sugerido:

1. Crear una rama tecnica dedicada.
2. Reemplazar la configuracion Vite/TanStack/Cloudflare por configuracion propia.
3. Ejecutar `npm run lint` y `npm run build`.
4. Probar login, onboarding, caja, agenda y cierre diario.
5. Solo entonces eliminar dependencias/configuracion Lovable.
