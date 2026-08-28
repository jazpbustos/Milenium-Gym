// ============================================================
// Milenium Gym — api/clientes.js
// Lecturas contra las vistas (v_clientes / v_deudores, donde
// ESTADO ya viene calculado) y escrituras contra la tabla
// clientes. Las vistas nunca llaman a supabase directo.
// ============================================================

import { supabase } from '../supabaseClient.js';

const COLUMNAS_VISTA = 'dni, nombre, telefono, actividad_id, actividad, precio, comentarios, fecha_pago, dias_credito, fecha_vencimiento, estado, activo';

export async function listarClientes(){
  const { data, error } = await supabase
    .from('v_clientes')
    .select(COLUMNAS_VISTA)
    .eq('activo', true)
    .order('nombre', { ascending: true });
  if (error) throw error;
  return data;
}

export async function listarDeudores(){
  const { data, error } = await supabase
    .from('v_deudores')
    .select(COLUMNAS_VISTA)
    .order('estado', { ascending: true }); // más vencidos primero
  if (error) throw error;
  return data;
}

export async function obtenerCliente(dni){
  const { data, error } = await supabase
    .from('v_clientes')
    .select(COLUMNAS_VISTA)
    .eq('dni', dni)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function crearCliente(payload){
  const fila = mapPayloadATabla(payload);
  const { data, error } = await supabase
    .from('clientes')
    .insert(fila)
    .select()
    .single();

  if (error){
    if (error.code === '23505'){
      throw new Error(`Ya existe un cliente con el DNI ${payload.dni}.`);
    }
    throw error;
  }
  return data;
}

export async function actualizarCliente(dni, payload){
  const fila = mapPayloadATabla(payload);
  delete fila.dni; // el DNI es la clave, no se reasigna en un update

  const { data, error } = await supabase
    .from('clientes')
    .update(fila)
    .eq('dni', dni)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Atajo para la acción más frecuente del día a día: marcar que
// el socio pagó hoy, sin abrir el resto del formulario.
export async function registrarPagoHoy(dni){
  const hoy = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('clientes')
    .update({ fecha_pago: hoy })
    .eq('dni', dni)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Baja lógica: nunca DELETE de un socio real. activo=false lo
// saca de las listas sin perder su historial.
export async function darDeBajaCliente(dni){
  const { error } = await supabase
    .from('clientes')
    .update({ activo: false })
    .eq('dni', dni);
  if (error) throw error;
}

function mapPayloadATabla(payload){
  return {
    dni: payload.dni,
    nombre: payload.nombre?.trim(),
    telefono: payload.telefono?.trim() || null,
    actividad_id: payload.actividad_id,
    precio: payload.precio,
    comentarios: payload.comentarios?.trim() || null,
    fecha_pago: payload.fecha_pago || null,
    dias_credito: payload.dias_credito,
  };
}
