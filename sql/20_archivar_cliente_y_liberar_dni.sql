-- Milenium Gym — archivado definitivo de clientes.
-- El DNI deja de identificar relaciones históricas: al eliminar un cliente
-- se libera su DNI, pero sus pagos permanecen asociados a clientes.id.

begin;

-- Los pagos ya tienen cliente_id completo y obligatorio desde la migración 15.
-- La relación por DNI se elimina para que ese número pueda reutilizarse.
alter table public.pagos
  drop constraint if exists pagos_cliente_dni_fkey;

-- La corrección de un pago sigue siendo "mismo cliente interno + misma fecha".
drop index if exists public.uq_pagos_cliente_fecha;
create unique index uq_pagos_cliente_id_fecha
  on public.pagos (cliente_id, fecha_pago);

-- El DNI queda nulo solamente en registros archivados. El UNIQUE existente
-- continúa impidiendo dos clientes visibles con el mismo DNI.
alter table public.clientes
  alter column dni drop not null;

-- Completa los snapshots usando siempre el identificador interno. Solo usa el
-- DNI como compatibilidad si alguien inserta manualmente un pago sin cliente_id.
create or replace function public.completar_pago_cliente_id()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.cliente_id is null then
    select c.id into new.cliente_id
    from public.clientes c
    where c.dni = new.cliente_dni
      and c.activo = true;
  end if;

  select c.nombre into new.cliente_nombre
  from public.clientes c
  where c.id = new.cliente_id;

  select a.nombre into new.actividad_nombre
  from public.actividades a
  where a.id = new.actividad_id;

  if new.cliente_id is null or new.cliente_nombre is null then
    raise exception 'No existe el cliente interno indicado';
  end if;
  if new.actividad_nombre is null then
    raise exception 'No existe la actividad %', new.actividad_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_completar_pago_cliente_id on public.pagos;
create trigger trg_completar_pago_cliente_id
  before insert or update of cliente_id, actividad_id on public.pagos
  for each row execute function public.completar_pago_cliente_id();

-- El movimiento se crea/corrige por el id interno del cliente. El DNI y los
-- nombres quedan congelados como datos históricos del momento del pago.
create or replace function public.registrar_movimiento_pago()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.fecha_pago is not null then
    insert into public.pagos (
      cliente_id, cliente_dni, actividad_id, fecha_pago,
      importe, dias_credito
    )
    values (
      new.id, new.dni, new.actividad_id, new.fecha_pago,
      new.precio, new.dias_credito
    )
    on conflict (cliente_id, fecha_pago) do update set
      cliente_dni = excluded.cliente_dni,
      actividad_id = excluded.actividad_id,
      importe = excluded.importe,
      dias_credito = excluded.dias_credito,
      cliente_nombre = excluded.cliente_nombre,
      actividad_nombre = excluded.actividad_nombre;
  end if;
  return new;
end;
$$;

-- Normaliza cualquier baja anterior. Sus movimientos conservan el DNI que
-- tenían porque pagos.cliente_dni ahora es un snapshot sin FK.
update public.clientes
set dni = null
where activo = false
  and dni is not null;

commit;

select
  (select count(*) from public.clientes where activo = false) as clientes_archivados,
  (select count(*) from public.clientes where activo = false and dni is not null) as archivados_con_dni,
  (select count(*) from public.pagos where cliente_id is null) as pagos_sin_cliente_id;
