// ============================================================
// Milenium Gym — api/estadisticas.js
// El conteo por actividad se hace en la base (v_estadisticas_actividad),
// no trayendo todos los clientes al navegador para contarlos en JS.
// ============================================================

import { supabase } from '../supabaseClient.js';

export async function listarClientesPorActividad(){
  const { data, error } = await supabase
    .from('v_estadisticas_actividad')
    .select('actividad_id, actividad, cantidad')
    .order('cantidad', { ascending: false });
  if (error) throw error;
  return data;
}
