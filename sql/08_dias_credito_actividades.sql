-- Agrega la duración en días al catálogo de actividades.
-- Correr una sola vez después de 07_historial_pagos.sql.

alter table actividades
  add column if not exists dias_credito integer;

-- Valores iniciales según el nombre actual de las actividades. El resto
-- son cuotas mensuales y comienza en 30 días; luego se puede ajustar desde
-- el formulario de Actividades.
update actividades
set dias_credito = case
  when lower(nombre) like '1 día %' then 1
  when lower(nombre) like '1 semana %' then 7
  when lower(nombre) like '2 semanas %' then 15
  when lower(nombre) like '3 semanas %' then 21
  else 30
end
where dias_credito is null;

alter table actividades alter column dias_credito set default 30;
alter table actividades alter column dias_credito set not null;

comment on column actividades.dias_credito is
  'Duración en días que se copia al cliente al seleccionar esta actividad.';
