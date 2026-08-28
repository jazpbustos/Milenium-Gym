-- ============================================================
-- Milenium Gym — 04_rpc_checkin.sql
-- Función pública y acotada para el check-in de la tablet, que
-- no tiene login. Reemplaza al Apps Script: recibe un DNI y
-- devuelve SOLO nombre, fecha de pago y vencimiento de esa fila
-- — nunca la base completa, nunca teléfono/precio/comentarios.
-- Correr después de 03_rls.sql.
-- ============================================================

create or replace function public.buscar_socio(p_dni integer)
returns table (
  nombre             text,
  fecha_pago         date,
  fecha_vencimiento  date
)
language sql
security definer      -- corre con permisos elevados, ignorando RLS...
set search_path = public   -- ...por eso se fija el search_path (buena práctica con security definer)
stable
as $$
  select c.nombre, c.fecha_pago, c.fecha_vencimiento
  from clientes c
  where c.dni = p_dni
    and c.activo = true;
$$;

comment on function public.buscar_socio(integer) is 'Acceso público acotado para el check-in de tablet: dado un DNI, devuelve solo nombre y fechas. Nunca teléfono, precio ni comentarios.';

-- Nadie puede ejecutarla salvo a quien se la habilitamos explícitamente.
revoke all on function public.buscar_socio(integer) from public;
grant execute on function public.buscar_socio(integer) to anon, authenticated;

-- Nota de seguridad (no la resuelve este script):
-- con la clave anon, alguien podría probar DNIs uno por uno y
-- ver nombre + vencimiento de quien acierte. Es el mismo riesgo
-- que ya existe hoy con el Apps Script, así que no empeora nada.
-- Si en algún momento molesta, se acota con rate limiting en
-- Supabase (Auth → Rate Limits) o moviendo esto detrás de una
-- Edge Function.
