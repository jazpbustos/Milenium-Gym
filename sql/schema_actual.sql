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
  -- Cómo estaba la ficha del socio justo antes de este pago. Permite
  -- deshacerlo al borrarlo (ver eliminar_pago).
  ant_fecha_pago date,
  ant_dias_credito integer,
  ant_actividad_id integer references public.actividades(id) on delete restrict,
  ant_precio numeric(12,2),
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

-- Genera el movimiento cuando cambia la cuota de la ficha. Se saltea si
-- la ficha se está actualizando desde una corrección de pagos
-- (milenium.resincronizando = 'on', ver aplicar_ficha_sin_movimiento).
create function public.registrar_movimiento_pago()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_ant_fecha date;
  v_ant_dias integer;
  v_ant_actividad integer;
  v_ant_precio numeric(12,2);
begin
  if coalesce(current_setting('milenium.resincronizando', true), '') = 'on' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_ant_fecha := old.fecha_pago;
    v_ant_dias := old.dias_credito;
    v_ant_actividad := old.actividad_id;
    v_ant_precio := old.precio;
  end if;

  if new.fecha_pago is not null then
    insert into public.pagos (
      cliente_id, cliente_dni, actividad_id, fecha_pago, importe, dias_credito,
      ant_fecha_pago, ant_dias_credito, ant_actividad_id, ant_precio
    ) values (
      new.id, new.dni, new.actividad_id, new.fecha_pago, new.precio, new.dias_credito,
      v_ant_fecha, v_ant_dias, v_ant_actividad, v_ant_precio
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

-- CORRECCIÓN DE PAGOS --------------------------------------------------------
-- La ficha solo cambia si se corrige o borra el pago vigente (el que
-- tiene la misma fecha que la ficha). Borrar el vigente devuelve la ficha
-- a como estaba antes de ese pago.

-- Aplica valores a la ficha sin que el trigger genere un movimiento.
create function public.aplicar_ficha_sin_movimiento(
  p_cliente_id uuid, p_fecha date, p_dias integer, p_actividad_id integer, p_precio numeric
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform set_config('milenium.resincronizando', 'on', true);
  update public.clientes
     set fecha_pago   = p_fecha,
         dias_credito = coalesce(p_dias, dias_credito),
         actividad_id = coalesce(p_actividad_id, actividad_id),
         precio       = coalesce(p_precio, precio)
   where id = p_cliente_id;
  perform set_config('milenium.resincronizando', 'off', true);
end;
$$;

create function public.corregir_pago(
  p_id bigint,
  p_fecha_pago date,
  p_actividad_id integer,
  p_importe numeric,
  p_dias_credito integer
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_viejo public.pagos%rowtype;
  v_ficha_fecha date;
begin
  if p_fecha_pago is null or p_actividad_id is null
     or p_importe is null or p_importe <= 0
     or p_dias_credito is null or p_dias_credito < 1 then
    raise exception 'Datos del pago incompletos o inválidos.';
  end if;

  select * into v_viejo from public.pagos where id = p_id;
  if not found then
    raise exception 'No existe el pago indicado.';
  end if;
  select fecha_pago into v_ficha_fecha from public.clientes where id = v_viejo.cliente_id;

  update public.pagos
     set fecha_pago   = p_fecha_pago,
         actividad_id = p_actividad_id,
         importe      = p_importe,
         dias_credito = p_dias_credito
   where id = p_id;

  -- Los pagos que recordaban a este como "ficha anterior" quedan al día.
  update public.pagos
     set ant_fecha_pago   = p_fecha_pago,
         ant_dias_credito = p_dias_credito,
         ant_actividad_id = p_actividad_id,
         ant_precio       = p_importe
   where cliente_id = v_viejo.cliente_id
     and id <> p_id
     and ant_fecha_pago = v_viejo.fecha_pago;

  if v_ficha_fecha = v_viejo.fecha_pago then
    perform public.aplicar_ficha_sin_movimiento(
      v_viejo.cliente_id, p_fecha_pago, p_dias_credito, p_actividad_id, p_importe);
  end if;
end;
$$;

-- Devuelve: 'no_vigente' | 'restaurado' | 'sin_dato'
create function public.eliminar_pago(p_id bigint)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_pago public.pagos%rowtype;
  v_ult public.pagos%rowtype;
  v_ficha_fecha date;
begin
  select * into v_pago from public.pagos where id = p_id;
  if not found then
    raise exception 'No existe el pago indicado.';
  end if;
  select fecha_pago into v_ficha_fecha from public.clientes where id = v_pago.cliente_id;

  -- Mantener la cadena: quien recordaba a este pago, hereda su anterior.
  update public.pagos
     set ant_fecha_pago   = v_pago.ant_fecha_pago,
         ant_dias_credito = v_pago.ant_dias_credito,
         ant_actividad_id = v_pago.ant_actividad_id,
         ant_precio       = v_pago.ant_precio
   where cliente_id = v_pago.cliente_id
     and id <> p_id
     and ant_fecha_pago = v_pago.fecha_pago;

  delete from public.pagos where id = p_id;

  if v_ficha_fecha is distinct from v_pago.fecha_pago then
    return 'no_vigente';
  end if;

  if v_pago.ant_fecha_pago is not null then
    perform public.aplicar_ficha_sin_movimiento(
      v_pago.cliente_id, v_pago.ant_fecha_pago, v_pago.ant_dias_credito,
      v_pago.ant_actividad_id, v_pago.ant_precio);
    return 'restaurado';
  end if;

  select * into v_ult
  from public.pagos
  where cliente_id = v_pago.cliente_id
  order by fecha_pago desc, creado_en desc, id desc
  limit 1;
  if found then
    perform public.aplicar_ficha_sin_movimiento(
      v_pago.cliente_id, v_ult.fecha_pago, v_ult.dias_credito,
      v_ult.actividad_id, v_ult.importe);
    return 'restaurado';
  end if;

  return 'sin_dato';
end;
$$;

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
    where activo = true and fecha_vencimiento >= limites.hoy) as socios_activos,
  (select count(*) from public.clientes cross join limites
    where activo = true
      and fecha_vencimiento between limites.hoy and limites.hoy + 3) as cuotas_por_vencer,
  (select count(*) from public.clientes cross join limites
    where activo = true
      and fecha_vencimiento between limites.hoy - 30 and limites.hoy - 1) as socios_vencidos,
  (select count(*) from public.clientes cross join limites
    where creado_en at time zone 'America/Argentina/Buenos_Aires' >=
        greatest(limites.inicio_mes, limites.inicio_altas_reales)
      and creado_en at time zone 'America/Argentina/Buenos_Aires' < limites.fin_mes) as nuevos_socios_mes,
  (select coalesce(sum(importe), 0) from public.pagos cross join limites
    where creado_en at time zone 'America/Argentina/Buenos_Aires' >= limites.inicio_mes
      and creado_en at time zone 'America/Argentina/Buenos_Aires' < limites.fin_mes) as ingresos_mes,
  (select count(*) from public.clientes, limites
    where activo = true and fecha_vencimiento > limites.hoy + 3) as socios_al_dia;

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

-- ADMINISTRADORES -----------------------------------------------------------
-- Solo los usuarios de esta tabla ven y modifican datos (ver políticas
-- abajo). Con RLS activo y sin políticas, la tabla es invisible desde la
-- API. Se carga a mano desde el SQL Editor:
--   insert into public.administradores (user_id, email)
--   select id, email from auth.users where email = 'mail@ejemplo.com';
-- Además, en Supabase → Authentication conviene tener desactivado
-- "Allow new users to sign up".

create table public.administradores (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  creado_en timestamptz not null default now()
);

create function public.es_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.administradores where user_id = auth.uid());
$$;

revoke all on function public.es_admin() from public, anon;
grant execute on function public.es_admin() to authenticated;

-- SEGURIDAD -----------------------------------------------------------------

alter table public.actividades enable row level security;
alter table public.clientes enable row level security;
alter table public.pagos enable row level security;
alter table public.administradores enable row level security;

create policy "actividades: solo administradores"
  on public.actividades for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy "clientes: solo administradores"
  on public.clientes for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy "pagos: solo administradores"
  on public.pagos for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

revoke all on function public.aplicar_ficha_sin_movimiento(uuid, date, integer, integer, numeric) from public, anon;
revoke all on function public.corregir_pago(bigint, date, integer, numeric, integer) from public, anon;
revoke all on function public.eliminar_pago(bigint) from public, anon;
grant execute on function public.aplicar_ficha_sin_movimiento(uuid, date, integer, integer, numeric) to authenticated;
grant execute on function public.corregir_pago(bigint, date, integer, numeric, integer) to authenticated;
grant execute on function public.eliminar_pago(bigint) to authenticated;

commit;
