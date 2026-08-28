-- ============================================================
-- Milenium Gym — 05_seed_actividades.sql (OPCIONAL)
-- Carga inicial de ACTIVIDADES, tomada de lo que se ve hoy en la
-- app de AppSheet. Es una muestra parcial (la pantalla scrollea
-- y hay más filas de las que llegué a ver) — completá el resto
-- desde tu tabla ACTIVIDADES en AppSheet antes de dar de baja esa
-- app. idempotente: correrlo dos veces no duplica filas.
-- ============================================================

insert into actividades (nombre, precio) values
  ('Aparatos',                         40000.00),
  ('Aparatos dos veces por semana',    38000.00),
  ('Medio mes aparatos',               24000.00),
  ('3 semanas aparatos',               37000.00),
  ('1 semana aparatos',                22000.00),
  ('El día aparatos',                   9000.00),
  ('HIFT X2',                          41800.00)
on conflict (nombre) do nothing;

-- Completá acá las que falten (HIFT X3/X4/X5, COMBOs, AEROLOCAL,
-- CARDIO STRONG, Boxeo, Calistenia, PERSONALIZADO, Pase Libre,
-- etc. — se ven en tu pestaña ACTIVIDADES y en el gráfico de
-- ESTADISTICAS) siguiendo el mismo patrón:
--
-- insert into actividades (nombre, precio) values
--   ('Nombre exacto de la actividad', 00000.00)
-- on conflict (nombre) do nothing;
