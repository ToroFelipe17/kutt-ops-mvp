# Backlog

Este backlog registra pendientes detectados durante pruebas y profesionalizacion del MVP.

## Producto y UX

- Mostrar/ocultar contrasena en login y registro.
- Mejorar registro con nombre/apellido o nombre completo.
- Corregir redirect de confirmacion de correo.
- Mejorar navegacion movil tipo bottom navigation.
- Evaluar navegacion por swipe.
- Disenar futura interfaz KUTT Liquid UI inspirada en glassmorphism/iOS, sin sacrificar legibilidad.

## Caja y operaciones

- Ingreso por servicio debe autocompletar precio.
- Ingresos de dias anteriores deben pertenecer a la fecha seleccionada.
- Cierre diario debe cerrar una fecha especifica.
- Dias cerrados deben bloquear modificaciones normales.
- Comisiones deben aceptar valores entre 0 y 100.
- Reemplazar o mejorar slider de comisiones para movil.

## Supabase y seguridad

- Confirmar en el proyecto remoto que la migracion `20260611090000_grant_user_owns_business_execute.sql` fue aplicada.
- Mantener RLS activo en tablas operacionales.
- No usar `service_role` en frontend.
- Revisar periodicamente que no se versionen secretos ni `supabase/.temp`.

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
