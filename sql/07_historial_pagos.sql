-- Historial de pagos. Correr una sola vez después de 06.
-- Registra los pagos nuevos desde que se instala el historial. No crea
-- movimientos iniciales desde clientes.fecha_pago porque no conocemos el
-- verdadero momento en que esos cobros históricos fueron recibidos.

create table if not exists pagos (
  id                bigint generated always as identity primary key,
  cliente_dni       integer not null references clientes(dni) on delete restrict,
  actividad_id      integer not null references actividades(id) on delete restrict,
  fecha_pago        date not null,
  importe           numeric(12,2) not null,
  dias_credito      integer not null,
  nuevo_vencimiento date generated always as (fecha_pago + dias_credito) stored,
  creado_en         timestamptz not null default now()
);

create index if not exists idx_pagos_cliente on pagos (cliente_dni);
create index if not exists idx_pagos_fecha on pagos (fecha_pago desc);
create index if not exists idx_pagos_creado on pagos (creado_en desc);

alter table pagos enable row level security;
drop policy if exists "pagos: acceso total autenticado" on pagos;
drop policy if exists "pagos: lectura autenticada" on pagos;
drop policy if exists "pagos: alta autenticada" on pagos;
create policy "pagos: lectura autenticada"
  on pagos for select to authenticated using (true);
create policy "pagos: alta autenticada"
  on pagos for insert to authenticated with check (true);

create or replace function registrar_movimiento_pago()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.fecha_pago is not null
     and (tg_op = 'INSERT' or new.fecha_pago is distinct from old.fecha_pago) then
    insert into pagos (cliente_dni, actividad_id, fecha_pago, importe, dias_credito)
    values (new.dni, new.actividad_id, new.fecha_pago, new.precio, new.dias_credito);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_registrar_movimiento_pago on clientes;
create trigger trg_registrar_movimiento_pago
  after insert or update of fecha_pago on clientes
  for each row execute function registrar_movimiento_pago();

create or replace view v_pagos
with (security_invoker = on) as
select
  p.id,
  p.cliente_dni,
  c.nombre as cliente,
  a.nombre as actividad,
  p.fecha_pago,
  p.importe,
  p.dias_credito,
  p.nuevo_vencimiento,
  p.creado_en
from pagos p
join clientes c on c.dni = p.cliente_dni
join actividades a on a.id = p.actividad_id;

comment on table pagos is 'Historial inmutable de pagos de socios. Cada fila conserva importe, actividad y crédito del momento del cobro.';
