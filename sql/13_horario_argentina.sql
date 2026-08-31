-- Milenium Gym — horario calendario argentino.
-- Cambia solamente el cálculo dinámico de ESTADO en v_clientes.
-- No modifica clientes, vencimientos, actividades ni pagos.

create or replace view public.v_clientes
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
  (
    c.fecha_vencimiento
    - (now() at time zone 'America/Argentina/Buenos_Aires')::date
  )::int as estado,
  c.activo,
  c.creado_en,
  c.actualizado_en
from public.clientes c
join public.actividades a on a.id = c.actividad_id;

comment on view public.v_clientes is
  'Clientes con actividad y estado calculado según el día calendario de Argentina.';
