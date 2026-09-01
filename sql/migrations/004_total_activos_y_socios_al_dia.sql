-- Expone el total de cuotas vigentes y, por separado, los dos grupos
-- excluyentes que lo componen: al día y por vencer.

create or replace view public.v_dashboard_estadisticas
with (security_invoker = on) as
with limites as (
  select
    (now() at time zone 'America/Argentina/Buenos_Aires')::date as hoy,
    date_trunc('month', now() at time zone 'America/Argentina/Buenos_Aires') as inicio_mes,
    date_trunc('month', now() at time zone 'America/Argentina/Buenos_Aires') + interval '1 month' as fin_mes,
    timestamp '2026-09-01 00:00:00' as inicio_altas_reales
)
select
  (select count(*) from public.clientes, limites
    where activo = true
      and fecha_vencimiento >= limites.hoy) as socios_activos,
  (select count(*) from public.clientes cross join limites
    where activo = true
      and fecha_vencimiento between limites.hoy and limites.hoy + 3) as cuotas_por_vencer,
  (select count(*) from public.clientes cross join limites
    where activo = true
      and fecha_vencimiento between limites.hoy - 30 and limites.hoy - 1) as socios_vencidos,
  (select count(*) from public.clientes cross join limites
    where creado_en at time zone 'America/Argentina/Buenos_Aires' >=
        greatest(limites.inicio_mes, limites.inicio_altas_reales)
      and creado_en at time zone 'America/Argentina/Buenos_Aires' < limites.fin_mes) as nuevos_socios_mes,
  (select coalesce(sum(importe), 0) from public.pagos cross join limites
    where creado_en at time zone 'America/Argentina/Buenos_Aires' >= limites.inicio_mes
      and creado_en at time zone 'America/Argentina/Buenos_Aires' < limites.fin_mes) as ingresos_mes,
  (select count(*) from public.clientes, limites
    where activo = true
      and fecha_vencimiento > limites.hoy + 3) as socios_al_dia;

comment on view public.v_dashboard_estadisticas is
  'Activos totales; al día y por vencer como grupos excluyentes; vencidos de los últimos 30 días.';
