-- Actividades que aparecen en el CSV de AppSheet y no estaban
-- en sql/05_seed_actividades.sql. Correr ANTES que 02_clientes_import.sql.
-- El precio es el más frecuente entre los clientes que la tenían;
-- ajustalo en la pantalla de Actividades si no es el que querés dejar fijo.

insert into actividades (nombre, precio) values
  ('AEROLOCAL X3', 14500.00),
  ('CARDIO STRONG X3', 17000.00),
  ('PERSONALIZADO X3', 25000.00),
  ('PERSONALIZADO X5', 32000.00),
  ('CARDIO STRONG X2', 14800.00),
  ('Boxeo x3', 2000.00),
  ('AEROLOCAL X2', 1770.00)
on conflict (nombre) do nothing;
