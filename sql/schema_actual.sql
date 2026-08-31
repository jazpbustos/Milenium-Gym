-- Milenium Gym — esquema consolidado actual
-- Para crear una base NUEVA. No ejecutar sobre la base de producción.
-- No contiene clientes, pagos ni actividades.

begin;

create extension if not exists pgcrypto;

-- TABLAS --------------------------------------------------------------------

create table public.actividades (
  id integer generated always as identity primary key,
  nombre text not null unique,
  precio numeric(12,2) not null default 0,
  dias_credito integer not null default 30,
  orden integer not null default 0,
  creado_en timestamptz not null default now()
);

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  dni integer unique,
  nombre text not null,
  telefono text,
  actividad_id integer not null references public.actividades(id) on delete restrict,
  precio numeric(12,2) not null,
  comentarios text,
  fecha_pago date,
  dias_credito integer not null default 30,
  fecha_vencimiento date generated always as (fecha_pago + dias_credito) stored,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.pagos (
  id bigint generated always as identity primary key,
  cliente_id uuid not null references public.clientes(id) on update restrict on delete restrict,
  cliente_dni integer not null,
  cliente_nombre text not null,
  actividad_id integer not null references public.actividades(id) on delete restrict,
  actividad_nombre text not null,
  fecha_pago date not null,
  importe numeric(12,2) not null,
  dias_credito integer not null,
  nuevo_vencimiento date generated always as (fecha_pago + dias_credito) stored,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index idx_clientes_actividad on public.clientes (actividad_id);
create index idx_clientes_activo on public.clientes (activo);
create index idx_clientes_nombre on public.clientes (lower(nombre));
create index idx_pagos_cliente_id on public.pagos (cliente_id);
create index idx_pagos_cliente_dni on public.pagos (cliente_dni);
create index idx_pagos_fecha on public.pagos (fecha_pago desc);
create index idx_pagos_creado on public.pagos (creado_en desc);
create unique index uq_pagos_cliente_id_fecha
  on public.pagos (cliente_id, fecha_pago);

-- TIMESTAMPS ----------------------------------------------------------------

create function public.set_actualizado_en()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

create trigger trg_clientes_actualizado_en
  before update on public.clientes
  for each row execute function public.set_actualizado_en();

create function public.set_pago_actualizado_en()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

create trigger trg_pagos_actualizado_en
  before update on public.pagos
  for each row execute function public.set_pago_actualizado_en();

-- HISTORIAL DE PAGOS --------------------------------------------------------

create function public.completar_pago_cliente_id()
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

create trigger trg_completar_pago_cliente_id
  before insert or update of cliente_id, actividad_id on public.pagos
  for each row execute function public.completar_pago_cliente_id();

create function public.registrar_movimiento_pago()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.fecha_pago is not null then
    insert into public.pagos (
      cliente_id, cliente_dni, actividad_id, fecha_pago, importe, dias_credito
    ) values (
      new.id, new.dni, new.actividad_id, new.fecha_pago, new.precio, new.dias_credito
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

create trigger trg_registrar_movimiento_pago
  after insert or update of fecha_pago, actividad_id, precio, dias_credito
  on public.clientes
  for each row execute function public.registrar_movimiento_pago();

-- VISTAS --------------------------------------------------------------------

create view public.v_clientes
with (security_invoker = on) as
select
  c.dni,
  c.nombre,
  c.telefono,
  c.actividad_id,
  a.nombre as actividad,
  c.precio,
  c.comentarios,
  c.fecha_pago,
  c.dias_credito,
  c.fecha_vencimiento,
  (c.fecha_vencimiento -
    (now() at time zone 'America/Argentina/Buenos_Aires')::date)::int as estado,
  c.activo,
  c.creado_en,
  c.actualizado_en
from public.clientes c
join public.actividades a on a.id = c.actividad_id;

create view public.v_deudores
with (security_invoker = on) as
select *
from public.v_clientes
where estado < 0 and activo = true;

create view public.v_pagos
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

create view public.v_estadisticas_actividad
with (security_invoker = on) as
select
  a.id as actividad_id,
  a.nombre as actividad,
  count(c.id) as cantidad
from public.actividades a
left join public.clientes c
  on c.actividad_id = a.id
  and c.activo = true
  and c.fecha_vencimiento >
    (now() at time zone 'America/Argentina/Buenos_Aires')::date
group by a.id, a.nombre
order by cantidad desc;

create view public.v_dashboard_estadisticas
with (security_invoker = on) as
with limites as (
  select
    (now() at time zone 'America/Argentina/Buenos_Aires')::date as hoy,
    date_trunc('month', now() at time zone 'America/Argentina/Buenos_Aires') as inicio_mes,
    date_trunc('month', now() at time zone 'America/Argentina/Buenos_Aires') + interval '1 month' as fin_mes,
    timestamp '2026-09-01 00:00:00' as inicio_altas_reales
)
select
  (select count(*) from public.clientes, limites
    where activo = true and fecha_vencimiento > limites.hoy) as socios_activos,
  (select count(*) from public.clientes cross join limites
    where activo = true
      and fecha_vencimiento between limites.hoy and limites.hoy + 3) as cuotas_por_vencer,
  (select count(*) from public.clientes cross join limites
    where activo = true
      and fecha_vencimiento between limites.hoy - 60 and limites.hoy - 30) as socios_vencidos,
  (select count(*) from public.clientes cross join limites
    where creado_en at time zone 'America/Argentina/Buenos_Aires' >=
        greatest(limites.inicio_mes, limites.inicio_altas_reales)
      and creado_en at time zone 'America/Argentina/Buenos_Aires' < limites.fin_mes) as nuevos_socios_mes,
  (select coalesce(sum(importe), 0) from public.pagos cross join limites
    where creado_en at time zone 'America/Argentina/Buenos_Aires' >= limites.inicio_mes
      and creado_en at time zone 'America/Argentina/Buenos_Aires' < limites.fin_mes) as ingresos_mes;

-- CHECK-IN ------------------------------------------------------------------

create function public.buscar_socio(p_dni integer)
returns table (nombre text, fecha_pago date, fecha_vencimiento date)
language sql
security definer
set search_path = public
stable
as $$
  select c.nombre, c.fecha_pago, c.fecha_vencimiento
  from public.clientes c
  where c.dni = p_dni and c.activo = true;
$$;

revoke all on function public.buscar_socio(integer) from public;
grant execute on function public.buscar_socio(integer) to anon, authenticated;

-- SEGURIDAD -----------------------------------------------------------------

alter table public.actividades enable row level security;
alter table public.clientes enable row level security;
alter table public.pagos enable row level security;

create policy "actividades: acceso total autenticado"
  on public.actividades for all to authenticated
  using (true) with check (true);

create policy "clientes: acceso total autenticado"
  on public.clientes for all to authenticated
  using (true) with check (true);

create policy "pagos: lectura autenticada"
  on public.pagos for select to authenticated using (true);
create policy "pagos: alta autenticada"
  on public.pagos for insert to authenticated with check (true);
create policy "pagos: correccion autenticada"
  on public.pagos for update to authenticated using (true) with check (true);

commit;
