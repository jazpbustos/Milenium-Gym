-- Milenium Gym — prepara pagos para relacionarse por cliente_id.
-- Compatible con la app actual: cliente_dni continúa existiendo y
-- los pagos nuevos completan cliente_id automáticamente.

begin;

alter table public.pagos
  add column if not exists cliente_id uuid;

-- Completa movimientos existentes, si los hubiera.
update public.pagos p
set cliente_id = c.id
from public.clientes c
where c.dni = p.cliente_dni
  and p.cliente_id is null;

alter table public.pagos
  drop constraint if exists pagos_cliente_id_fkey;

alter table public.pagos
  add constraint pagos_cliente_id_fkey
  foreign key (cliente_id)
  references public.clientes(id)
  on update restrict
  on delete restrict;

create index if not exists idx_pagos_cliente_id
  on public.pagos (cliente_id);

-- Mientras la app todavía inserta por DNI, este trigger resuelve el
-- ID interno antes de guardar el movimiento.
create or replace function public.completar_pago_cliente_id()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  select c.id into new.cliente_id
  from public.clientes c
  where c.dni = new.cliente_dni;

  if new.cliente_id is null then
    raise exception 'No existe un cliente para el DNI %', new.cliente_dni;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_completar_pago_cliente_id on public.pagos;
create trigger trg_completar_pago_cliente_id
  before insert or update of cliente_dni on public.pagos
  for each row execute function public.completar_pago_cliente_id();

commit;

-- Verificación: hoy debería devolver 0 pagos y 0 sin ID.
select
  count(*) as pagos,
  count(*) filter (where cliente_id is null) as pagos_sin_cliente_id
from public.pagos;
