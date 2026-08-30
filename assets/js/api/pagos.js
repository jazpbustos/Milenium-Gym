// Historial de pagos. Las altas se generan en la base cada vez que
// cambia clientes.fecha_pago; esta API solo consulta los movimientos.

import { supabase } from '../supabaseClient.js';

const COLUMNAS = 'id, cliente_dni, cliente, actividad, fecha_pago, importe, dias_credito, nuevo_vencimiento, creado_en';

export async function listarPagos({ creadoDesde = null } = {}){
  const tamanioPagina = 1000;
  let desdeFila = 0;
  let todos = [];

  for (;;) {
    let query = supabase
      .from('v_pagos')
      .select(COLUMNAS)
      .order('creado_en', { ascending: false })
      .order('id', { ascending: false })
      .range(desdeFila, desdeFila + tamanioPagina - 1);

    if (creadoDesde) query = query.gte('creado_en', creadoDesde);
    const { data, error } = await query;
    if (error) throw error;
    todos = todos.concat(data);
    if (data.length < tamanioPagina) break;
    desdeFila += tamanioPagina;
  }

  return todos;
}
