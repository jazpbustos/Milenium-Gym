-- Milenium Gym — historial estable y auditable.
-- Una corrección actualiza actualizado_en, pero nunca mueve creado_en.

begin;

alter table public.pagos
  add column if not exists cliente_nombre text,
  add column if not exists actividad_nombre text,
  add column if not exists actualizado_en timestamptz not null default now();

-- Completa snapshots si ya hubiera movimientos.
update public.pagos p
set
  cliente_nombre = c.nombre,
  actividad_nombre = a.nombre
from public.clientes c, public.actividades a
where c.id = p.cliente_id
  and a.id = p.actividad_id
  and (p.cliente_nombre is null or p.actividad_nombre is null);

alter table public.pagos
  alter column cliente_nombre set not null,
  alter column actividad_nombre set not null;

-- Resuelve el cliente interno y congela los nombres vigentes antes
-- de insertar un movimiento.
create or replace function public.completar_pago_cliente_id()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  select c.id, c.nombre
    into new.cliente_id, new.cliente_nombre
  from public.clientes c
  where c.dni = new.cliente_dni;

  select a.nombre into new.actividad_nombre
  from public.actividades a
  where a.id = new.actividad_id;

  if new.cliente_id is null then
    raise exception 'No existe un cliente para el DNI %', new.cliente_dni;
  end if;
  if new.actividad_nombre is null then
    raise exception 'No existe la actividad %', new.actividad_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_completar_pago_cliente_id on public.pagos;
create trigger trg_completar_pago_cliente_id
  before insert or update of cliente_dni, actividad_id on public.pagos
  for each row execute function public.completar_pago_cliente_id();

create or replace function public.set_pago_actualizado_en()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

drop trigger if exists trg_pagos_actualizado_en on public.pagos;
create trigger trg_pagos_actualizado_en
  before update on public.pagos
  for each row execute function public.set_pago_actualizado_en();

-- Conserva la regla actual: mismo cliente + misma fecha corrige el
-- movimiento. creado_en permanece intacto y actualizado_en cambia solo.
create or replace function public.registrar_movimiento_pago()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.fecha_pago is not null and new.registrar_pago then
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

create or replace view public.v_pagos
with (security_invoker = on) as
select
  p.id,
  p.cliente_dni,
  p.cliente_nombre as cliente,
  p.actividad_nombre as actividad,
  p.fecha_pago,
  p.importe,
  p.dias_credito,
  p.nuevo_vencimiento,
  p.creado_en,
  p.cliente_id,
  p.actividad_id,
  p.actualizado_en
from public.pagos p;

commit;

select
  count(*) as pagos,
  count(*) filter (
    where cliente_id is null
       or cliente_nombre is null
       or actividad_nombre is null
  ) as pagos_incompletos
from public.pagos;
