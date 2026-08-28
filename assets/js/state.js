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
