-- Permite editar datos del socio sin generar un movimiento ficticio.
-- También actualiza el gráfico por actividad para contar solamente
-- socios con cuota vigente. Correr después de 11.

alter table clientes
  add column if not exists registrar_pago boolean not null default true;

comment on column clientes.registrar_pago is
  'Bandera interna: el trigger registra historial solamente cuando vale true.';

create or replace function registrar_movimiento_pago()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.fecha_pago is not null and new.registrar_pago then
    insert into pagos (cliente_dni, actividad_id, fecha_pago, importe, dias_credito)
    values (new.dni, new.actividad_id, new.fecha_pago, new.precio, new.dias_credito)
    on conflict (cliente_dni, fecha_pago) do update set
      actividad_id = excluded.actividad_id,
      importe = excluded.importe,
      dias_credito = excluded.dias_credito,
      creado_en = now();
  end if;
  return new;
end;
$$;

create or replace view v_estadisticas_actividad
with (security_invoker = on) as
select
  a.id as actividad_id,
  a.nombre as actividad,
  count(c.dni) as cantidad
from actividades a
left join clientes c
  on c.actividad_id = a.id
  and c.activo = true
  and c.fecha_vencimiento > (now() at time zone 'America/Argentina/Buenos_Aires')::date
group by a.id, a.nombre
order by cantidad desc;

comment on view v_estadisticas_actividad is
  'Cantidad de socios con cuota vigente por actividad.';

-- Reinstala el resumen con el inicio real de altas el 01/09/2026,
-- dejando afuera los 1360 registros de la migración inicial.
drop view if exists v_dashboard_estadisticas;

create view v_dashboard_estadisticas
with (security_invoker = on) as
with limites as (
  select
    (now() at time zone 'America/Argentina/Buenos_Aires')::date as hoy,
    date_trunc('month', now() at time zone 'America/Argentina/Buenos_Aires') as inicio_mes,
    date_trunc('month', now() at time zone 'America/Argentina/Buenos_Aires') + interval '1 month' as fin_mes,
    timestamp '2026-09-01 00:00:00' as inicio_altas_reales
)
select
  (select count(*) from clientes, limites
    where activo = true
      and fecha_vencimiento > limites.hoy) as socios_activos,
  (select count(*) from clientes cross join limites
    where activo = true
      and fecha_vencimiento between limites.hoy and limites.hoy + 3) as cuotas_por_vencer,
  (select count(*) from clientes cross join limites
    where activo = true
      and fecha_vencimiento between limites.hoy - 60 and limites.hoy - 30) as socios_vencidos,
  (select count(*) from clientes cross join limites
    where creado_en at time zone 'America/Argentina/Buenos_Aires' >= greatest(limites.inicio_mes, limites.inicio_altas_reales)
      and creado_en at time zone 'America/Argentina/Buenos_Aires' < limites.fin_mes) as nuevos_socios_mes,
  (select coalesce(sum(importe), 0) from pagos cross join limites
    where creado_en at time zone 'America/Argentina/Buenos_Aires' >= limites.inicio_mes
      and creado_en at time zone 'America/Argentina/Buenos_Aires' < limites.fin_mes) as ingresos_mes;
