// ============================================================
// Milenium Gym — utils/formato.js
// Formateo de fechas, plata y el texto de estado. Todo en un
// solo lugar para que "vence en 3 días" se escriba igual en toda
// la app (y no dependa de que cada vista repita el mismo if).
// ============================================================

import { UMBRAL_POR_VENCER_DIAS } from '../config.js';

const fmtFecha = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtPrecio = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export function formatearFecha(fechaISO){
  if (!fechaISO) return '—';
  // new Date('YYYY-MM-DD') interpreta en UTC; sumamos el offset local
  // para no mostrar el día anterior en husos horarios negativos.
  const d = new Date(fechaISO + 'T00:00:00');
  return fmtFecha.format(d);
}

export function formatearPrecio(valor){
  if (valor === null || valor === undefined || valor === '') return '—';
  return fmtPrecio.format(Number(valor));
}

// Postgres devuelve numeric como string con 2 decimales fijos
// ("40000.00"). Para un campo editable eso se ve raro — esto lo
// deja en "40000" cuando es entero, o "40000.5" si tiene centavos
// reales, sin perder precisión ni forzar decimales de más.
export function precioParaInput(valor){
  if (valor === null || valor === undefined || valor === '') return '';
  return String(Number(valor)); // "40000.00" -> "40000", "40000.50" -> "40000.5"
}

// Clase de color: mismo criterio que Check-in-Milenium/assets/js/script.js
export function claseEstado(estado){
  if (estado < 0) return 'st-rojo';
  if (estado <= UMBRAL_POR_VENCER_DIAS) return 'st-amarillo';
  return 'st-verde';
}

export function textoEstado(estado){
  if (estado < 0){
    const dias = Math.abs(estado);
    return `Vencida hace ${dias} día${dias === 1 ? '' : 's'}`;
  }
  if (estado === 0) return 'Vence hoy';
  if (estado <= UMBRAL_POR_VENCER_DIAS) return `Vence en ${estado} día${estado === 1 ? '' : 's'}`;
  return `Vence en ${estado} días`;
}

export function hoyISO(){
  return new Date().toISOString().slice(0, 10);
}
