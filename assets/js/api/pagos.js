// Historial de pagos. Las altas se generan en la base cada vez que
// cambia clientes.fecha_pago. Desde acá se consultan los movimientos
// y se corrigen/eliminan (ver sql/migrations/21_corregir_eliminar_pagos.sql:
// la base, además, vuelve a alinear la ficha del socio con su último pago).

import { supabase } from '../supabaseClient.js';

const COLUMNAS = 'id, cliente_id, cliente_dni, cliente, actividad, actividad_id, fecha_pago, importe, dias_credito, nuevo_vencimiento, creado_en';
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

export async function corregirPago(id, { fecha_pago, actividad_id, importe, dias_credito }){
  const { error } = await supabase.rpc('corregir_pago', {
    p_id: id,
    p_fecha_pago: fecha_pago,
    p_actividad_id: actividad_id,
    p_importe: importe,
    p_dias_credito: dias_credito,
  });
  if (error){
    if (error.code === '23505'){
      throw new Error('Ese socio ya tiene otro pago con esa misma fecha. Si es un duplicado, eliminá uno de los dos.');
    }
    throw error;
  }
}

// Devuelve qué pasó con la ficha del socio (ver migración 24):
// 'no_vigente' (era un pago viejo, la ficha no cambia) |
// 'restaurado' (la ficha volvió a como estaba antes) |
// 'sin_dato'   (era el vigente pero no hay fecha anterior guardada).
export async function eliminarPago(id){
  const { data, error } = await supabase.rpc('eliminar_pago', { p_id: id });
  if (error) throw error;
  return data;
}
