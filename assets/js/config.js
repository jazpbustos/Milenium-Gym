// ============================================================
// Milenium Gym — config.js
// Único lugar con valores que cambian entre entornos. La clave
// anon de Supabase es pública por diseño (ver sql/03_rls.sql y
// sql/04_rpc_checkin.sql: lo que protege los datos es RLS, no
// esconder esta clave) — igual, nunca pongas acá la service_role.
// ============================================================

export const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
export const SUPABASE_ANON_KEY = 'TU-ANON-KEY';

// Mismo umbral que usa Check-in-Milenium (assets/js/script.js,
// UMBRAL_POR_VENCER_DIAS) para que un socio no vea un color en la
// tablet y otro en la gestión.
export const UMBRAL_POR_VENCER_DIAS = 3;

export const DIAS_CREDITO_DEFAULT = 30;
