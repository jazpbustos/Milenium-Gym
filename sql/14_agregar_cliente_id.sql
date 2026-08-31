-- Milenium Gym — agrega una identidad interna a clientes.
-- Paso compatible: el DNI continúa siendo la PK por ahora y la app
-- sigue funcionando igual. No modifica ni elimina datos existentes.

begin;

alter table public.clientes
  add column if not exists id uuid;

update public.clientes
set id = gen_random_uuid()
where id is null;

alter table public.clientes
  alter column id set default gen_random_uuid(),
  alter column id set not null;

create unique index if not exists uq_clientes_id
  on public.clientes (id);

comment on column public.clientes.id is
  'Identidad interna e inmutable del cliente. El DNI queda como dato único editable.';

commit;

-- Verificación: debe devolver 1360, 1360 y 0.
select
  count(*) as clientes,
  count(distinct id) as ids_unicos,
  count(*) filter (where id is null) as ids_nulos
from public.clientes;
