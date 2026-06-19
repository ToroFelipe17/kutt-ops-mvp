# Cash Rules

La caja es el nucleo operacional de KUTT. Debe ser simple, rapida y auditable.

## Reglas iniciales

- La caja nunca debe perder consistencia.
- Todo ingreso debe pertenecer a una fecha contable.
- El cierre diario debe guardar totales.
- Los dias cerrados no deberian aceptar cambios normales.
- Las propinas deben separarse de ventas.
- Las comisiones deben calcularse de forma explicita y auditable.

## Modelo oficial de fechas

- `created_at` representa el momento en que el registro fue creado en el sistema.
- `accounting_date` representa la fecha comercial asignada al pago o movimiento.
- Las vistas de caja deben agrupar por `accounting_date`, nunca por `created_at`.
- Un ingreso historico debe pertenecer a la `accounting_date` seleccionada por el usuario, aunque haya sido registrado posteriormente.
- La fecha de una cita puede orientar el valor inicial, pero no reemplaza la fecha contable explicita del pago.

## Ventas y propinas

- `payments.amount` representa el monto del servicio.
- Las propinas deben almacenarse separadas de las ventas.
- El total recibido puede mostrarse como servicio + propina, pero los reportes deben poder separarlos.
- Las comisiones no deben incluir propinas, salvo que una decision futura lo autorice de forma explicita.

## Cierre diario

Un cierre diario debe cerrar una `accounting_date` especifica y capturar sus totales. No debe depender del momento de creacion de los registros ni solo del estado visual de la pantalla.

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

Cuando una fecha contable esta cerrada, no debe aceptar pagos ni movimientos de caja normales. Las correcciones posteriores deben usar un ajuste controlado, auditable y explicito.

## Auditoria

Cada calculo financiero importante debe poder explicarse desde datos guardados, no desde supuestos temporales del frontend.

## Pendiente para Fase 2

### Fecha contable del ingreso

Agregar `accounting_date` como dato persistente para pagos y movimientos. Registrar hoy un ingreso historico no debe sumarlo automaticamente a la caja de hoy.

### Cierre diario real

El cierre debe ejecutarse sobre una fecha especifica, guardar sus totales y permitir reconstruir como se obtuvo cada valor.

### Bloqueo de dia cerrado

Un dia cerrado no debe aceptar modificaciones normales. Cualquier correccion posterior debe realizarse como ajuste explicito y auditable.

### Propinas separadas

Las propinas deben mantenerse separadas de las ventas en almacenamiento, calculos y reportes. `payments.tip_amount` es el destino previsto; `KUTT_TIP_AMOUNT` es un marcador temporal que debera eliminarse.

### Comisiones auditables

Las comisiones deben aceptar porcentajes validos entre 0 y 100, excluir propinas, guardar los valores necesarios para auditoria y no recalcular historicos de forma silenciosa cuando cambie la configuracion de un barbero.
