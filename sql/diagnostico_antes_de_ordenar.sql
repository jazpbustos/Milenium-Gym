-- Diagnóstico previo a ordenar la base de Milenium Gym.
-- SOLO LECTURA: no crea, modifica ni borra datos.

-- 1. Cantidades generales.
select
  (select count(*) from public.clientes) as clientes_total,
  (select count(*) from public.clientes where activo = true) as clientes_activos,
  (select count(*) from public.clientes where activo = false) as clientes_inactivos,
  (select count(*) from public.actividades) as actividades_total,
  (select count(*) from public.pagos) as pagos_total;

-- 2. DNI que necesitan revisión antes de agregar validaciones.
select dni, nombre, activo
from public.clientes
where dni <= 0
   or dni < 1000000
   or dni > 99999999
order by dni;

-- 3. Clientes con valores que podrían romper una migración.
select dni, nombre, precio, dias_credito, fecha_pago, actividad_id
from public.clientes
where btrim(nombre) = ''
   or precio <= 0
   or dias_credito <= 0
   or actividad_id is null
order by dni;

-- 4. Pagos duplicados para un mismo cliente y fecha.
select cliente_dni, fecha_pago, count(*) as cantidad
from public.pagos
group by cliente_dni, fecha_pago
having count(*) > 1
order by cantidad desc, cliente_dni, fecha_pago;

-- 5. Pagos que no encuentran su cliente o actividad.
select p.id, p.cliente_dni, p.actividad_id, p.fecha_pago
from public.pagos p
left join public.clientes c on c.dni = p.cliente_dni
left join public.actividades a on a.id = p.actividad_id
where c.dni is null or a.id is null
order by p.id;

-- 6. Columnas reales de las tres tablas principales.
select table_name, ordinal_position, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('clientes', 'actividades', 'pagos')
order by table_name, ordinal_position;
