// Historial de pagos. Las altas se generan en la base cada vez que
// cambia clientes.fecha_pago; esta API solo consulta los movimientos.

import { supabase } from '../supabaseClient.js';

const COLUMNAS = 'id, cliente_dni, cliente, actividad, fecha_pago, importe, dias_credito, nuevo_vencimiento, creado_en';

export async function listarPagos({ desde = null } = {}){
  let query = supabase
    .from('v_pagos')
    .select(COLUMNAS)
    .order('creado_en', { ascending: false })
    .order('id', { ascending: false })
    .limit(1000);

  if (desde) query = query.gte('fecha_pago', desde);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
