// ============================================================
// Milenium Gym — api/actividades.js
// Toda la conversación con la tabla ACTIVIDADES pasa por acá.
// Las vistas nunca llaman a supabase directo.
// ============================================================

import { supabase } from '../supabaseClient.js';

export async function listarActividades(){
  const { data, error } = await supabase
    .from('actividades')
    .select('id, nombre, precio')
    .order('nombre', { ascending: true });
  if (error) throw error;
  return data;
}

export async function crearActividad({ nombre, precio }){
  const { data, error } = await supabase
    .from('actividades')
    .insert({ nombre: nombre.trim(), precio })
    .select()
    .single();
  if (error){
    if (error.code === '23505'){
      throw new Error(`Ya existe una actividad llamada "${nombre.trim()}".`);
    }
    throw error;
  }
  return data;
}

export async function actualizarActividad(id, { nombre, precio }){
  const { data, error } = await supabase
    .from('actividades')
    .update({ nombre: nombre.trim(), precio })
    .eq('id', id)
    .select()
    .single();
  if (error){
    if (error.code === '23505'){
      throw new Error(`Ya existe una actividad llamada "${nombre.trim()}".`);
    }
    throw error;
  }
  return data;
}

export async function eliminarActividad(id){
  const { error } = await supabase
    .from('actividades')
    .delete()
    .eq('id', id);

  if (error){
    // 23503 = foreign_key_violation: hay clientes usando esta actividad.
    if (error.code === '23503'){
      throw new Error('No se puede borrar: hay clientes con esta actividad asignada. Reasigná esos clientes primero.');
    }
    throw error;
  }
}
