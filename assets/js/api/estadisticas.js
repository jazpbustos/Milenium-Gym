// ============================================================
// Milenium Gym — api/estadisticas.js
// El conteo por actividad se hace en la base (v_estadisticas_actividad),
// no trayendo todos los clientes al navegador para contarlos en JS.
// ============================================================

import { supabase } from '../supabaseClient.js';

export async function obtenerResumenDashboard(){
  const { data, error } = await supabase
    .from('v_dashboard_estadisticas')
    .select('socios_activos, cuotas_por_vencer, socios_vencidos, nuevos_socios_mes, ingresos_mes')
    .single();
  if (error) throw error;
  return {
    sociosActivos: Number(data.socios_activos),
    cuotasPorVencer: Number(data.cuotas_por_vencer),
    sociosVencidos: Number(data.socios_vencidos),
    nuevosSociosMes: Number(data.nuevos_socios_mes),
    ingresosMes: Number(data.ingresos_mes),
  };
}

export async function listarClientesPorActividad(){
  const { data, error } = await supabase
    .from('v_estadisticas_actividad')
    .select('actividad_id, actividad, cantidad')
    .order('cantidad', { ascending: false });
  if (error) throw error;
  return data;
}
