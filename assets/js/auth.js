// ============================================================
// Milenium Gym — auth.js
// Envuelve Supabase Auth. Los usuarios (vos + el dueño) se crean
// a mano en el panel de Supabase — no hay pantalla de registro,
// a propósito: esta app no necesita alta abierta de cuentas.
// ============================================================

import { supabase } from './supabaseClient.js';
import { setState } from './state.js';

export async function iniciarSesion(email, password){
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  setState({ session: data.session });
  return data.session;
}

export async function cerrarSesion(){
  await supabase.auth.signOut();
  setState({ session: null, clientes: [], actividades: [] });
}

export async function obtenerSesionActual(){
  const { data } = await supabase.auth.getSession();
  setState({ session: data.session });
  return data.session;
}

export function onCambioAuth(callback){
  const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
    setState({ session });
    callback(session);
  });
  return () => sub.subscription.unsubscribe();
}
