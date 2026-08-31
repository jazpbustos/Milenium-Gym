-- Un solo movimiento por socio y fecha de pago.
--
-- Cambiar el precio de una actividad NO modifica cobros anteriores.
-- Si se vuelve a guardar el mismo socio con la misma fecha de pago,
-- el movimiento existente se corrige con la última actividad, importe
-- y cantidad de días guardados.
--
-- Correr una sola vez después de 08_dias_credito_actividades.sql.

-- Si durante las pruebas ya se generaron duplicados del mismo día,
-- conserva solamente el último movimiento cargado.
delete from pagos anterior
using pagos posterior
where anterior.cliente_dni = posterior.cliente_dni
  and anterior.fecha_pago = posterior.fecha_pago
  and anterior.id < posterior.id;

create unique index if not exists uq_pagos_cliente_fecha
  on pagos (cliente_dni, fecha_pago);

-- El trigger hace un UPSERT: si el pago ya existe necesita permiso
-- de UPDATE además de los permisos de lectura y alta del script 07.
drop policy if exists "pagos: correccion autenticada" on pagos;
create policy "pagos: correccion autenticada"
  on pagos for update to authenticated using (true) with check (true);

create or replace function registrar_movimiento_pago()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.fecha_pago is not null and new.registrar_pago then
    insert into pagos (cliente_dni, actividad_id, fecha_pago, importe, dias_credito)
    values (new.dni, new.actividad_id, new.fecha_pago, new.precio, new.dias_credito)
    on conflict (cliente_dni, fecha_pago) do update set
      actividad_id = excluded.actividad_id,
      importe = excluded.importe,
      dias_credito = excluded.dias_credito,
      creado_en = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_registrar_movimiento_pago on clientes;
create trigger trg_registrar_movimiento_pago
  after insert or update of fecha_pago, actividad_id, precio, dias_credito on clientes
  for each row execute function registrar_movimiento_pago();

comment on index uq_pagos_cliente_fecha is
  'Evita duplicar un pago al corregir varias veces al mismo socio con la misma fecha.';
