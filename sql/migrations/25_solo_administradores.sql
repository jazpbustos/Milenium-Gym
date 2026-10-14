-- Milenium Gym — 25: solo los administradores pueden ver y tocar datos
-- Ejecutar UNA vez en producción (Supabase → SQL Editor).
-- Una vez verificado, consolidar en schema_actual.sql y borrar este archivo.
--
-- Problema: las políticas RLS permitían todo a CUALQUIER usuario
-- logueado ("to authenticated using (true)"). La clave anon de la app es
-- pública (está en config.js), y con ella cualquiera puede llamar a
-- signUp() y crearse una cuenta si el registro está habilitado en
-- Supabase (viene habilitado por defecto). Con esa cuenta podría leer
-- DNI/teléfonos, modificar o borrar todo.
--
-- Solución: tabla `administradores` con los usuarios permitidos, y todas
-- las políticas pasan a exigir es_admin(). Aunque alguien se registre,
-- no ve ni toca nada.
--
-- ANTES DE CORRER: poné abajo los mails reales de las cuentas que usan
-- el tablero (la tuya y la del dueño). Si ningún mail coincide con una
-- cuenta existente, la migración se cancela sola y no cambia nada.

begin;

create table if not exists public.administradores (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  creado_en timestamptz not null default now()
);
-- Con RLS activo y sin políticas, la tabla es invisible desde la API.
alter table public.administradores enable row level security;

insert into public.administradores (user_id, email)
select u.id, u.email
from auth.users u
where lower(u.email) in (
  'jaz_bustos@outlook.com',      -- ← REEMPLAZAR por los mails reales
  'mail-del-duenio@ejemplo.com'  -- ← REEMPLAZAR
)
on conflict (user_id) do nothing;

do $$
begin
  if (select count(*) from public.administradores) = 0 then
    raise exception 'Ningún mail coincide con una cuenta de Supabase. Revisá la lista de mails: no se aplicó ningún cambio.';
  end if;
end;
$$;

create or replace function public.es_admin()
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

-- Borra TODAS las políticas actuales de las tres tablas (sea cual sea su
-- nombre) y las vuelve a crear exigiendo es_admin().
do $$
declare
  pol record;
begin
  for pol in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in ('actividades', 'clientes', 'pagos')
  loop
    execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end;
$$;

create policy "actividades: solo administradores"
  on public.actividades for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy "clientes: solo administradores"
  on public.clientes for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy "pagos: solo administradores"
  on public.pagos for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

commit;

-- Para revisar quién quedó como administrador:
--   select * from public.administradores;
-- Para sumar a alguien más adelante:
--   insert into public.administradores (user_id, email)
--   select id, email from auth.users where email = 'nuevo@mail.com';
