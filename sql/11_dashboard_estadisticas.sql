-- Resumen operativo para la pantalla Estadísticas.
-- Correr una sola vez después de 10_dni_editable.sql.

-- Se elimina primero porque esta versión ya no expone pagos_mes.
drop view if exists v_dashboard_estadisticas;

-- El gráfico también considera "activo" solamente a quien tiene
-- días positivos de cuota, no a todos los socios sin baja lógica.
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
  (select count(*) from clientes
    cross join limites
    where activo = true
      and fecha_vencimiento between limites.hoy and limites.hoy + 3) as cuotas_por_vencer,
  (select count(*) from clientes
    cross join limites
    where activo = true
      and fecha_vencimiento between limites.hoy - 60 and limites.hoy - 30) as socios_vencidos,
  (select count(*) from clientes
    cross join limites
    where creado_en at time zone 'America/Argentina/Buenos_Aires' >= greatest(limites.inicio_mes, limites.inicio_altas_reales)
      and creado_en at time zone 'America/Argentina/Buenos_Aires' < limites.fin_mes) as nuevos_socios_mes,
  (select coalesce(sum(importe), 0) from pagos
    cross join limites
    where creado_en at time zone 'America/Argentina/Buenos_Aires' >= limites.inicio_mes
      and creado_en at time zone 'America/Argentina/Buenos_Aires' < limites.fin_mes) as ingresos_mes;

comment on view v_dashboard_estadisticas is
  'Indicadores operativos: cuotas activas, por vencer, vencidas entre 30 y 60 días, ingresos y altas del mes calendario.';
