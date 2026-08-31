-- Milenium Gym — retira la bandera obsoleta registrar_pago.
-- La app y registrar_movimiento_pago dejaron de usarla en la migración 17.

begin;

alter table public.clientes
  drop column if exists registrar_pago;

commit;

-- Verificación: debe devolver 0.
select count(*) as columnas_registrar_pago
from information_schema.columns
where table_schema = 'public'
  and table_name = 'clientes'
  and column_name = 'registrar_pago';
