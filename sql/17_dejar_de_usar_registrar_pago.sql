-- Milenium Gym — deja de depender de clientes.registrar_pago.
-- La columna se conserva temporalmente para que la versión anterior
-- del frontend siga siendo compatible durante el despliegue.

begin;

-- Normaliza cualquier cliente que haya quedado con la bandera apagada.
-- Este UPDATE no toca datos de cuota y no genera movimientos.
update public.clientes
set registrar_pago = true
where registrar_pago = false;

-- Un movimiento se genera solamente cuando cambia uno de los campos de
-- cuota incluidos en el trigger. Editar nombre, DNI, teléfono o comentarios
-- no dispara el trigger, por lo que ya no hace falta una bandera persistente.
create or replace function public.registrar_movimiento_pago()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.fecha_pago is not null then
    insert into public.pagos (
      cliente_dni, actividad_id, fecha_pago, importe, dias_credito
    )
    values (
      new.dni, new.actividad_id, new.fecha_pago, new.precio, new.dias_credito
    )
    on conflict (cliente_dni, fecha_pago) do update set
      actividad_id = excluded.actividad_id,
      importe = excluded.importe,
      dias_credito = excluded.dias_credito,
      cliente_nombre = excluded.cliente_nombre,
      actividad_nombre = excluded.actividad_nombre;
  end if;
  return new;
end;
$$;

comment on column public.clientes.registrar_pago is
  'Obsoleta: se conserva temporalmente por compatibilidad y se eliminará después de verificar el frontend nuevo.';

commit;

select
  count(*) filter (where registrar_pago = false) as banderas_apagadas
from public.clientes;
