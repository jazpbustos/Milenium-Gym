-- Permite corregir el DNI de un socio sin borrarlo ni perder sus pagos.
-- Los movimientos asociados acompañan automáticamente el cambio.
-- Correr una sola vez después de 09_pago_unico_cliente_fecha.sql.

alter table pagos
  drop constraint if exists pagos_cliente_dni_fkey;

alter table pagos
  add constraint pagos_cliente_dni_fkey
  foreign key (cliente_dni)
  references clientes(dni)
  on update cascade
  on delete restrict;

comment on constraint pagos_cliente_dni_fkey on pagos is
  'Conserva los pagos al corregir el DNI del socio y evita borrar socios con historial.';
