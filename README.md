# Milenium Gym — Sistema de gestión

Sistema administrativo para la operación diaria de **Milenium Centro de Entrenamiento**. Centraliza socios, actividades, cuotas, vencimientos, movimientos de pago e indicadores operativos en una única fuente de datos compartida con el sistema de check-in.

## Alcance funcional

La aplicación permite administrar el ciclo completo de una cuota: alta del socio, selección de actividad, registro del pago, cálculo del vencimiento, seguimiento del estado y conservación del movimiento histórico.

El sistema está orientado al uso cotidiano desde computadoras, tablets y teléfonos. La información se actualiza contra la base central y utiliza el día calendario de Argentina para calcular estados y períodos.

## Socios

Cada socio posee una identidad interna permanente y un DNI único editable. La ficha contiene nombre, teléfono, actividad, precio, comentarios, fecha de pago, duración de la cuota y vencimiento calculado.

La lista permite buscar, ordenar y filtrar por:

- **Activos:** más de tres días restantes de cuota.
- **Por vencer:** vencimiento entre hoy y los próximos tres días.
- **Vencidos:** cuota fuera de vigencia.
- **Todos:** totalidad de socios visibles.

Los datos personales pueden corregirse sin generar un pago. Registrar una cuota es una operación separada y crea o actualiza el movimiento correspondiente.

Eliminar un socio lo archiva y libera su DNI para una nueva alta. Su historial previo permanece vinculado a su identidad interna y no se transfiere a otra persona que reutilice ese DNI.

## Actividades y precios

El catálogo de actividades define nombre, precio vigente, duración en días y orden de presentación.

Al registrar una cuota, la actividad seleccionada aporta automáticamente su precio y duración. En actividades cuyo nombre contiene **Aparatos**, puede indicarse pago por transferencia, aplicando un recargo del 10 % sobre el precio base.

Los cambios futuros en el catálogo no alteran movimientos anteriores: cada pago conserva el importe y la actividad registrados en ese momento.

## Movimientos

Movimientos funciona como historial cronológico de pagos. Las filas se ordenan por el momento en que fueron registradas y pueden filtrarse por hoy, últimos siete días, mes calendario o historial completo.

Cada movimiento conserva:

- Identidad interna y DNI histórico del socio.
- Nombre del socio al momento del pago.
- Actividad e importe registrados.
- Fecha de pago y días de crédito.
- Nuevo vencimiento.
- Fecha y hora de creación y última corrección.

Cuando el socio continúa activo, el movimiento permite abrir su ficha. Si fue eliminado, el movimiento permanece visible pero no enlaza a una persona nueva que pueda haber reutilizado el DNI.

## Estadísticas

El tablero se calcula en tiempo real desde socios y movimientos:

- **Socios activos:** total de cuotas vigentes, incluyendo las que vencen hoy.
- **Socios al día:** cuotas con más de tres días restantes.
- **Por vencer:** cuotas que vencen entre hoy y los próximos tres días.
- **Vencidos:** cuotas vencidas durante los últimos 30 días.
- **Nuevos clientes:** altas realizadas dentro del mes calendario actual, excluyendo la migración inicial.
- **Ingresos del mes:** suma de movimientos registrados durante el mes calendario actual.
- **Socios por actividad:** distribución de socios con cuota vigente según su actividad.

Los grupos **Socios al día** y **Por vencer** son excluyentes y, sumados, componen el total de **Socios activos**. Todos los indicadores cambian automáticamente con el paso de los días y al registrar o corregir pagos.

## Check-in

El sistema comparte la base con **Check-in Milenium**. La consulta por DNI expone únicamente el nombre, la fecha de pago y el vencimiento necesarios para informar si la cuota está activa.

Los cambios realizados en la administración quedan disponibles para el check-in sin duplicar información ni mantener planillas paralelas.

## Integridad y acceso

El acceso administrativo requiere una sesión autenticada. La información de clientes, actividades y pagos está protegida por políticas de acceso en la base.

El historial se relaciona mediante identificadores internos, mientras que nombres, actividades, DNI e importes quedan registrados como datos históricos del movimiento. Esta separación permite editar o archivar socios sin perder trazabilidad ni mezclar pagos entre personas.
