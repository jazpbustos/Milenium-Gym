-- ============================================================
-- Milenium Gym — 06_agregar_orden_actividades.sql
-- Solo hace falta correr esto si ya habías ejecutado 01_schema.sql
-- ANTES de que existiera la columna "orden" (si estás arrancando
-- de cero, ya está incluida en 01_schema.sql y este script no
-- rompe nada — es idempotente, podés correrlo igual).
-- Agrega orden manual a ACTIVIDADES: arranca en el orden
-- alfabético que ya tenías, para no dejar todo en cero.
-- ============================================================

alter table actividades add column if not exists orden integer;

update actividades a
set orden = sub.rn
from (
  select id, row_number() over (order by nombre) as rn
  from actividades
) sub
where a.id = sub.id
  and a.orden is null;

alter table actividades alter column orden set default 0;
alter table actividades alter column orden set not null;

comment on column actividades.orden is 'Orden manual de despliegue (deck de ACTIVIDADES y dropdown del formulario de clientes). No es alfabético.';
