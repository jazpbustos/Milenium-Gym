// ============================================================
// Milenium Gym — api/actividades.js
// Toda la conversación con la tabla ACTIVIDADES pasa por acá.
// Las vistas nunca llaman a supabase directo.
// ============================================================

import { supabase } from '../supabaseClient.js';

export async function listarActividades(){
  const { data, error } = await supabase
    .from('actividades')
    .select('id, nombre, precio, orden')
    .order('orden', { ascending: true })
    .order('nombre', { ascending: true }); // desempate si dos quedaron con el mismo orden
  if (error) throw error;
  return data;
}

export async function crearActividad({ nombre, precio }){
  // Nueva actividad: va al final de la lista (orden manual), no
  // se mezcla sola en el medio. Después se reordena con los
  // botones de subir/bajar si hace falta.
  const { data: ultima, error: errOrden } = await supabase
    .from('actividades')
    .select('orden')
    .order('orden', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (errOrden) throw errOrden;
  const siguienteOrden = (ultima?.orden ?? 0) + 1;

  const { data, error } = await supabase
    .from('actividades')
    .insert({ nombre: nombre.trim(), precio, orden: siguienteOrden })
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

// Persiste el nuevo orden manual después de arrastrar y soltar una
// fila en la vista ACTIVIDADES. Recibe los ids ya en el orden final
// (de arriba a abajo) y guarda el índice de cada uno como su orden.
export async function guardarOrdenActividades(idsEnOrden){
  const actualizaciones = idsEnOrden.map((id, i) =>
    supabase.from('actividades').update({ orden: i + 1 }).eq('id', id)
  );
  const resultados = await Promise.all(actualizaciones);
  const conError = resultados.find((r) => r.error);
  if (conError) throw conError.error;
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
