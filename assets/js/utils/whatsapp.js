// ============================================================
// Milenium Gym — utils/whatsapp.js
// Arma el link de wa.me. Reemplaza al "Send SMS" de la spec
// original: la app genera el link, WhatsApp abre con el mensaje
// precargado y la persona lo manda ella misma desde su teléfono.
// ============================================================

import { soloDigitos } from './telefono.js';

export function waHref(e164, mensaje = ''){
  const numero = soloDigitos(e164); // wa.me quiere solo dígitos, sin '+'
  const base = `https://wa.me/${numero}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}

export function mensajeRecordatorio(nombre){
  const primerNombre = (nombre || '').trim().split(' ')[0] || '';
  return `Hola${primerNombre ? ' ' + primerNombre : ''}! Te escribimos de Milenium Centro de Entrenamiento para recordarte que tenés la cuota pendiente. ¡Cualquier cosa contactanos! 💪`;
}
