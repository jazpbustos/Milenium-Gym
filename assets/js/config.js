// ============================================================
// Milenium Gym — config.js
// Único lugar con valores que cambian entre entornos. La clave
// anon de Supabase es pública por diseño (ver sql/03_rls.sql y
// sql/04_rpc_checkin.sql: lo que protege los datos es RLS, no
// esconder esta clave) — igual, nunca pongas acá la service_role.
// ============================================================

export const SUPABASE_URL = 'https://tadipuhbehztxscijyki.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhZGlwdWhiZWh6dHhzY2lqeWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5MzAyMzcsImV4cCI6MjEwMzUwNjIzN30.kwUxYsiV28fBTdm-2Kjjv5AT-_yOLOnarQU3K_giK4c';

// Mismo umbral que usa Check-in-Milenium (assets/js/script.js,
// UMBRAL_POR_VENCER_DIAS) para que un socio no vea un color en la
// tablet y otro en la gestión.
export const UMBRAL_POR_VENCER_DIAS = 3;

// Inicio operativo del historial real. Los movimientos anteriores fueron
// creados en bloque durante la migración y no representan cobros cargados
// cronológicamente en la aplicación.
export const MOVIMIENTOS_DESDE = '2026-08-30T18:40:23-03:00';
