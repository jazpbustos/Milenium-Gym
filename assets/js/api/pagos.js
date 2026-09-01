// Historial de pagos. Las altas se generan en la base cada vez que
// cambia clientes.fecha_pago; esta API solo consulta los movimientos.

import { supabase } from '../supabaseClient.js';

const COLUMNAS = 'id, cliente_id, cliente_dni, cliente, actividad, fecha_pago, importe, dias_credito, nuevo_vencimiento, creado_en';
const TAMANIO_PAGINA = 1000;

async function obtenerDnisActivosPorId(){
  let desde = 0;
  const porId = new Map();
  for (;;) {
    const { data, error } = await supabase
      .from('clientes')
      .select('id, dni')
      .eq('activo', true)
      .range(desde, desde + TAMANIO_PAGINA - 1);
    if (error) throw error;
    data.forEach((cliente) => porId.set(cliente.id, cliente.dni));
    if (data.length < TAMANIO_PAGINA) break;
    desde += TAMANIO_PAGINA;
  }
  return porId;
}

export async function listarPagos({ creadoDesde = null } = {}){
  let desdeFila = 0;
  let todos = [];

  for (;;) {
    let query = supabase
      .from('v_pagos')
      .select(COLUMNAS)
      .order('creado_en', { ascending: false })
      .order('id', { ascending: false })
      .range(desdeFila, desdeFila + TAMANIO_PAGINA - 1);

    if (creadoDesde) query = query.gte('creado_en', creadoDesde);
    const { data, error } = await query;
    if (error) throw error;
    todos = todos.concat(data);
    if (data.length < TAMANIO_PAGINA) break;
    desdeFila += TAMANIO_PAGINA;
  }

  const dnisActivosPorId = await obtenerDnisActivosPorId();
  return todos.map((pago) => ({
    ...pago,
    cliente_dni_actual: dnisActivosPorId.get(pago.cliente_id) ?? null,
  }));
}
