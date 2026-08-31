// ============================================================
// Milenium Gym — api/clientes.js
// Lecturas contra v_clientes (donde
// ESTADO ya viene calculado) y escrituras contra la tabla
// clientes. Las vistas nunca llaman a supabase directo.
// ============================================================

import { supabase } from '../supabaseClient.js';

const COLUMNAS_VISTA = 'dni, nombre, telefono, actividad_id, actividad, precio, comentarios, fecha_pago, dias_credito, fecha_vencimiento, estado, activo';

// PostgREST (la API de Supabase) devuelve como mucho 1000 filas por
// consulta, calladito — sin error, simplemente corta ahí. Con más de
// 1000 clientes, listarClientes() se quedaba a mitad de camino del
// abecedario y "desaparecían" los apellidos de la segunda mitad
// (por eso no aparecía nadie con Z). Acá se pagina con .range() y
// se van pidiendo de a 1000 hasta que una página vuelve incompleta.
const TAMANIO_PAGINA = 1000;

async function listarPaginado(vista, construirQuery){
  let desde = 0;
  let todo = [];
  for (;;) {
    const { data, error } = await construirQuery(supabase.from(vista).select(COLUMNAS_VISTA))
      .range(desde, desde + TAMANIO_PAGINA - 1);
    if (error) throw error;
    todo = todo.concat(data);
    if (data.length < TAMANIO_PAGINA) break;
    desde += TAMANIO_PAGINA;
  }
  return todo;
}

export async function listarClientes(){
  return listarPaginado('v_clientes', (q) => q
    .eq('activo', true)
    .order('nombre', { ascending: true })
    .order('dni', { ascending: true })); // desempate estable entre nombres iguales, para que la paginación no repita ni salte filas
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
      // Una baja es lógica: el DNI continúa en la tabla para conservar
      // sus pagos. Si se vuelve a cargar ese DNI, reactivamos la misma
      // persona y actualizamos sus datos en vez de crear un duplicado.
      const { data: existente, error: errorLectura } = await supabase
        .from('clientes')
        .select('dni, activo')
        .eq('dni', payload.dni)
        .maybeSingle();
      if (errorLectura) throw errorLectura;

      if (existente && !existente.activo){
        const filaReactivada = { ...fila, activo: true };
        delete filaReactivada.dni;
        const { data: reactivado, error: errorReactivacion } = await supabase
          .from('clientes')
          .update(filaReactivada)
          .eq('dni', payload.dni)
          .select()
          .single();
        if (errorReactivacion) throw errorReactivacion;
        return { ...reactivado, reactivado: true };
      }

      throw new Error(`Ya existe un cliente activo con el DNI ${payload.dni}.`);
    }
    throw error;
  }
  return { ...data, reactivado: false };
}

export async function actualizarCliente(dni, payload, { registrarPago = true } = {}){
  const fila = mapPayloadATabla(payload);
  if (!registrarPago){
    // Una corrección administrativa no toca ningún dato de la cuota.
    // Así cambiar teléfono, nombre, DNI o comentarios no modifica el
    // vencimiento ni crea un movimiento indirectamente.
    delete fila.actividad_id;
    delete fila.precio;
    delete fila.fecha_pago;
    delete fila.dias_credito;
  }

  const { data, error } = await supabase
    .from('clientes')
    .update(fila)
    .eq('dni', dni)
    .select()
    .single();
  if (error){
    if (error.code === '23505'){
      throw new Error(`Ya existe otro cliente con el DNI ${payload.dni}.`);
    }
    throw error;
  }
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
