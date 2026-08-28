// ============================================================
// Milenium Gym — utils/telefono.js
// Normalización de teléfonos argentinos a E.164 (+549AAAANNNNNNN)
// para que tel: y wa.me funcionen sin adivinar nada en cada uso.
//
// Ojo: el código de área argentino tiene entre 2 y 4 dígitos
// (011, 0351, 02975...), así que separar "área" de "número" a
// partir de un string plano es ambiguo sin una tabla de prefijos.
// Por eso esto NO inventa una normalización silenciosa: arma la
// MEJOR conjetura y el formulario la muestra como vista previa
// editable — la misma idea que el precio sugerido — para que la
// persona la confirme o la corrija a mano.
// ============================================================

export function soloDigitos(raw){
  return (raw || '').replace(/\D/g, '');
}

// Mejor conjetura de E.164 a partir de lo que la persona tipeó.
export function sugerirE164(raw){
  let d = soloDigitos(raw);
  if (!d) return '';

  // Ya viene con código de país.
  if (d.startsWith('549')) return '+' + d;
  if (d.startsWith('54') && d.length > 10) return '+549' + d.slice(2);

  // Trunk prefix local (0) al inicio: 011..., 0351...
  if (d.startsWith('0')) d = d.slice(1);

  // "15" de celular metido después del área (formato viejo de
  // guías telefónicas: 0341 15 1234567). Como no sabemos el largo
  // exacto del área, solo lo sacamos cuando aparece pegado a un
  // total de dígitos que sugiere ese patrón (10-11 sin el 15).
  if (d.length >= 10 && d.slice(-8, -6) === '15'){
    d = d.slice(0, -8) + d.slice(-6);
  }

  return '+549' + d;
}

export function esE164Valido(str){
  return /^\+549\d{10}$/.test(str || '');
}

export function formatearVisual(e164){
  if (!e164) return '—';
  if (!esE164Valido(e164)) return e164;
  const resto = e164.slice(4); // después de +549
  return `+54 9 ${resto.slice(0, resto.length - 8)} ${resto.slice(-8, -4)}-${resto.slice(-4)}`;
}

export function telHref(e164){
  return `tel:${e164}`;
}
