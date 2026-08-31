-- Milenium Gym — convierte clientes.id en la clave primaria.
-- El DNI continúa siendo obligatorio, único y editable.

begin;

-- Crea primero la unicidad independiente del DNI, mientras todavía
-- está protegido por la PK anterior.
alter table public.clientes
  add constraint clientes_dni_key unique (dni);

-- La FK antigua debe soltarse momentáneamente para retirar la PK del DNI.
alter table public.pagos
  drop constraint pagos_cliente_dni_fkey;

alter table public.clientes
  drop constraint clientes_pkey;

-- Reutiliza el índice único creado en la migración 14.
alter table public.clientes
  add constraint clientes_pkey primary key using index uq_clientes_id;

-- Se conserva esta relación durante la transición para que la app actual
-- pueda seguir corrigiendo DNI y registrando pagos sin interrupciones.
alter table public.pagos
  add constraint pagos_cliente_dni_fkey
  foreign key (cliente_dni)
  references public.clientes(dni)
  on update cascade
  on delete restrict;

commit;

select
  conname as restriccion,
  contype as tipo,
  pg_get_constraintdef(oid) as definicion
from pg_constraint
where conrelid = 'public.clientes'::regclass
  and conname in ('clientes_pkey', 'clientes_dni_key')
order by conname;
