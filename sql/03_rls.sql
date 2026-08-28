-- ============================================================
-- Milenium Gym — 03_rls.sql
-- Row Level Security: sin esto, la clave anon (pública, visible
-- en el JS del navegador) podría leer y escribir todo. Con esto,
-- solo un usuario logueado (authenticated) puede tocar los datos.
-- Correr después de 02_vistas.sql.
-- ============================================================

alter table clientes    enable row level security;
alter table actividades enable row level security;

-- Vos + el dueño del gym entran con usuario/contraseña creados a
-- mano en Supabase (Authentication → Add user, sin registro
-- abierto). Ambos con los mismos permisos: leer y escribir todo.
drop policy if exists "clientes: acceso total autenticado" on clientes;
create policy "clientes: acceso total autenticado"
  on clientes
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "actividades: acceso total autenticado" on actividades;
create policy "actividades: acceso total autenticado"
  on actividades
  for all
  to authenticated
  using (true)
  with check (true);

-- Nadie sin loguearse (anon) tiene ninguna policy sobre estas
-- tablas: por default eso significa cero filas visibles, cero
-- filas escribibles. El acceso público y acotado que necesita el
-- check-in NO pasa por acá — pasa por la función buscar_socio()
-- de 04_rpc_checkin.sql, que expone solo tres campos de una sola
-- fila por vez.
