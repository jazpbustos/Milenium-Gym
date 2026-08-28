-- ============================================================
-- Milenium Gym — 05_seed_actividades.sql (OPCIONAL)
-- Carga inicial de ACTIVIDADES, tomada completa de la app de
-- AppSheet. idempotente: correrlo dos veces no duplica filas
-- (por el unique de actividades.nombre + on conflict).
-- ============================================================

insert into actividades (nombre, precio) values
  ('Aparatos',                                    40000.00),
  ('Aparatos dos veces por semana',                38000.00),
  ('Medio mes aparatos',                           24000.00),
  ('3 semanas aparatos',                           37000.00),
  ('1 semana aparatos',                            22000.00),
  ('El día aparatos',                               9000.00),
  ('HIFT X2',                                      41800.00),
  ('HIFT X3',                                      42000.00),
  ('HIFT X4',                                      42300.00),
  ('HIFT X5',                                      42600.00),
  ('HIFT X6',                                      43000.00),
  ('COMBO X2 (apa & cross)',                       46500.00),
  ('COMBO X3 (apa & cross)',                       47000.00),
  ('COMBO X4 (apa & cross)',                       47500.00),
  ('COMBO X5 (apa & cross)',                       48000.00),
  ('COMBO X6 (apa & cross)',                       48500.00),
  ('COMBO X7 (apa & cross)',                       49000.00),
  ('COMBO X8 (apa & cross)',                       49500.00),
  ('COMBO X9 (apa & cross)',                       50000.00),
  ('COMBO x10 (apa & cross)',                      50500.00),
  ('Boxeo x1',                                     15000.00),
  ('Boxeo x2',                                     24000.00),
  ('Calistenia x2',                                16800.00),
  ('Calistenia x3',                                17000.00),
  ('COMBO x2 (box/cal + apa)',                     27000.00),
  ('COMBO x3 (box/cal + apa)',                     28000.00),
  ('COMBO x4 (box/cal + apa)',                     29000.00),
  ('COMBO x5 (box/cal + apa)',                     30000.00),
  ('COMBO x6 (box/cal + apa)',                     31000.00),
  ('CrossFit Kids x1',                             10000.00),
  ('CrossFit Kids x2',                             19000.00),
  ('Pase Libre (apa todos los días + x5 clases cross)', 55000.00)
on conflict (nombre) do nothing;
