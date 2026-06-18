# Cash Rules

La caja es el nucleo operacional de KUTT. Debe ser simple, rapida y auditable.

## Reglas iniciales

- La caja nunca debe perder consistencia.
- Todo ingreso debe pertenecer a una fecha.
- El cierre diario debe guardar totales.
- Los dias cerrados no deberian aceptar cambios normales.
- Las propinas deben separarse de ventas.
- Las comisiones deben calcularse de forma explicita y auditable.

## Ventas y propinas

- `payments.amount` representa el monto del servicio.
- Las propinas no deben mezclarse con ventas del dia.
- El total recibido puede mostrarse como servicio + propina, pero los reportes deben poder separarlos.

## Cierre diario

Un cierre diario debe capturar los totales de una fecha especifica. No debe depender solo del estado visual de la pantalla.

Totales esperados:

- Ventas.
- Efectivo.
- Transferencia.
- Tarjeta.
- Propinas.
- Egresos.
- Comisiones.
- Utilidad estimada.

## Dias cerrados

Cuando un dia esta cerrado, la aplicacion deberia bloquear cambios normales y permitir solo correcciones controladas, auditables y explicitas.

## Auditoria

Cada calculo financiero importante debe poder explicarse desde datos guardados, no desde supuestos temporales del frontend.
