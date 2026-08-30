// ============================================================
// Milenium Gym — state.js
// Un store mínimo tipo pub/sub. No hace falta un framework para
// esto: la app tiene 7 pantallas y un puñado de datos en memoria.
// ============================================================

const state = {
  session: null,        // sesión de Supabase Auth, o null
  actividades: [],       // cache de la tabla ACTIVIDADES
  clientes: [],          // cache de v_clientes (se refresca al entrar a cada vista)
  listContext: {          // para las flechas prev/next del detalle
    dnis: [],
    origen: 'clientes',   // 'clientes' | 'deudores'
  },
  // Borradores de formularios sin guardar (ver views/clienteForm.js
  // y views/actividadForm.js). Viven en memoria, sobreviven salir y
  // volver a entrar a la vista dentro de la misma sesión — pero se
  // pierden solos con un F5 real, que es justo lo que se busca: no
  // borrar nada por navegar, solo al refrescar la página de verdad.
  borradores: {},

  // Mismo criterio que arriba, pero para la lista de Socios: el
  // texto buscado y el orden de columna elegido. Antes vivían en
  // variables locales de clientesList.js/tablaClientes.js, que se
  // reinician solas cada vez que el router vuelve a montar la vista
  // — por eso se "perdía" el filtro con solo cambiar de pestaña.
  // Ahora quedan acá, sobreviven navegar y solo un F5 real los
  // limpia (ver router.js/auth.js).
  filtroClientes: '',
  ordenClientes: { campo: 'nombre', dir: 1 },
};

const listeners = new Set();

export function getState(){
  return state;
}

export function setState(patch){
  Object.assign(state, patch);
  listeners.forEach((fn) => fn(state));
}

export function subscribe(fn){
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getActividadById(id){
  return state.actividades.find((a) => a.id === id) || null;
}

// --- Borradores de formularios ---------------------------------
export function guardarBorrador(clave, valores){
  setState({ borradores: { ...state.borradores, [clave]: valores } });
}

export function obtenerBorrador(clave){
  return state.borradores[clave] || null;
}

export function borrarBorrador(clave){
  if (!(clave in state.borradores)) return;
  const copia = { ...state.borradores };
  delete copia[clave];
  setState({ borradores: copia });
}
