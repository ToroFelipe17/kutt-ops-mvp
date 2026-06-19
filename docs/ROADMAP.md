# Roadmap

KUTT debe avanzar en fases pequenas, revisables y con foco operacional.

Fase activa: **Fase 2 - Stable Cash Module (Caja estable)**.

## Fase 0: Migracion backend propio

Estado: completada.

- Backend oficial migrado desde Lovable Cloud a Supabase propio.
- Migraciones versionadas y aplicadas mediante Supabase CLI.
- RLS y policies mantenidas activas.
- Permisos de `user_owns_business` y tablas de aplicacion corregidos sin debilitar seguridad.
- Flujos minimos de auth, onboarding, negocio, equipo, servicios y caja verificados.

## Fase 1: Engineering Foundation

Estado: completada.

- Arquitectura, reglas de caja, Supabase, UI y decisiones documentadas.
- README principal actualizado en espanol.
- Backlog y roadmap iniciales creados.
- Refactor ESLint completado en un commit separado.

## Fase 2: Stable Cash Module

Estado: activa.

- Fase 2A: introducir el modelo `accounting_date`.
- Fase 2B: migrar propinas a `payments.tip_amount`.
- Fase 2C: implementar cierre diario y bloqueo de fechas cerradas.
- Fase 2D: autocompletar el precio del servicio en el ingreso rapido.
- Fase 2E: alinear exportaciones y comisiones con la fecha contable.

## Fase 3: Comisiones

- Validar que los porcentajes acepten solo valores entre 0 y 100.
- Reemplazar o mejorar controles de comision en movil.
- Asegurar calculos auditables por barbero, servicio y cierre diario.

## Fase 4: Clientes

- Mejorar busqueda, creacion y edicion de clientes.
- Mostrar historial, visitas, notas, telefono y gasto total si las relaciones lo permiten.
- Evitar friccion en flujos rapidos desde movil.

## Fase 5: Agenda

- Ajustar agenda a horarios reales configurados.
- Respetar dias cerrados sin bloquear casos excepcionales si el negocio lo permite.
- Mejorar creacion rapida de citas y registro tardio de servicios.

## Fase 6: Liquid UI

- Disenar el sistema visual KUTT Liquid UI.
- Inspirarse en glassmorphism e iOS sin sacrificar legibilidad.
- Mantener rendimiento, contraste y jerarquia visual.

## Fase 7: Automatizaciones/IA

- Explorar recordatorios, reportes automaticos y asistencia operacional.
- Priorizar automatizaciones que ahorren tiempo real al negocio.
- Evitar funciones vistosas que aumenten carga mental.
