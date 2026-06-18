# Roadmap

KUTT debe avanzar en fases pequenas, revisables y con foco operacional.

## Fase 0: Migracion backend propio

Estado: completada.

- Migrar desde Lovable Cloud a un proyecto Supabase administrado por el equipo.
- Mantener migraciones versionadas en `supabase/migrations`.
- Mantener RLS activo.
- Evitar dependencia operativa del backend generado en Lovable.

## Fase 1: Engineering Foundation

Estado: en curso.

- Documentar arquitectura, reglas de caja, Supabase, UI y decisiones.
- Mejorar README principal.
- Registrar deuda tecnica y pendientes de producto.
- Dejar el repositorio entendible para futuros cambios.

## Fase 2: Caja estable

- Asegurar que todo ingreso pertenezca a una fecha.
- Corregir ingresos historicos y cierre diario por fecha especifica.
- Bloquear modificaciones normales en dias cerrados.
- Mantener ventas, propinas, egresos y comisiones separados.

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
