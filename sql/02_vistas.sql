-- ============================================================
-- Milenium Gym — 02_vistas.sql
-- v_clientes calcula ESTADO en el momento de la consulta.
-- v_deudores es v_clientes filtrada a estado < 0.
-- Correr después de 01_schema.sql.
-- ============================================================

-- security_invoker = on: sin esto, una vista corre con los
-- permisos de quien la CREÓ (vos), no de quien la consulta desde
-- la app — y se saltearía RLS por completo. Con el flag, la vista
-- respeta los permisos del usuario logueado.
create or replace view v_clientes
with (security_invoker = on) as
select
  c.dni,
  c.nombre,
  c.telefono,
  c.actividad_id,
  a.nombre                                     as actividad,
  c.precio,
  c.comentarios,
  c.fecha_pago,
  c.dias_credito,
  c.fecha_vencimiento,
  (c.fecha_vencimiento - current_date)::int     as estado,  -- negativo = deuda, positivo = activo
  c.activo,
  c.creado_en,
  c.actualizado_en
from clientes c
join actividades a on a.id = c.actividad_id;

comment on view v_clientes is 'CLIENTES + ACTIVIDAD resuelta + ESTADO calculado contra la fecha de hoy. Reemplaza a FECHA HOY y ESTADO como columnas.';

-- DEUDORES no es tabla propia: es esta misma vista filtrada.
create or replace view v_deudores
with (security_invoker = on) as
select *
from v_clientes
where estado < 0
  and activo = true;

comment on view v_deudores is 'Clientes activos con estado negativo (cuota vencida).';

-- Para la vista ESTADISTICAS: cuenta clientes por actividad hecha
-- en la base, no trayendo todas las filas al navegador para
-- contarlas en JS. Con miles de socios, la diferencia se nota.
create or replace view v_estadisticas_actividad
with (security_invoker = on) as
select
  a.id     as actividad_id,
  a.nombre as actividad,
  count(c.dni) as cantidad
from actividades a
left join clientes c on c.actividad_id = a.id and c.activo = true
group by a.id, a.nombre
order by cantidad desc;

comment on view v_estadisticas_actividad is 'Cantidad de clientes activos por actividad, para el gráfico de ESTADISTICAS.';
