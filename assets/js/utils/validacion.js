// ============================================================
// Milenium Gym — utils/validacion.js
// Saneo de campos mientras se tipea (deja solo los caracteres que
// tienen sentido para ese campo) y helpers para marcar/limpiar
// errores inline en los forms — mismo patrón en cliente y actividad.
// ============================================================

export function soloDigitos(str){
  return str.replace(/[^0-9]/g, '');
}

// Números con un solo punto decimal (para precio) — nunca dos.
export function soloDecimal(str){
  const limpio = str.replace(/[^0-9.]/g, '');
  const [entero, ...resto] = limpio.split('.');
  return resto.length ? `${entero}.${resto.join('')}` : entero;
}

// Nombre y apellido: letras (con tildes/ñ), espacios, guion y
// apóstrofe (para "María José", "Pérez-García", "O'Connor"). Nada
// de números ni símbolos raros.
export function soloTexto(str){
  return str.replace(/[^a-zA-ZÀ-ÖØ-öø-ÿñÑ\s'-]/g, '');
}

// Teléfono: dígitos, "+" (código de país), espacios, guiones y
// paréntesis — el formato final lo termina de armar utils/telefono.js.
export function soloTelefono(str){
  return str.replace(/[^0-9+\-\s()]/g, '');
}

// Marca un campo con error: agrega la clase al .form-field que lo
// contiene y un mensaje chico en rojo debajo, mismo estilo que ya
// tenía definido components.css (.form-field.has-error / .error).
export function marcarError(elemento, mensaje){
  const campo = elemento.closest('.form-field');
  if (!campo) return;
  campo.classList.add('has-error');
  if (!campo.querySelector('.error')){
    const p = document.createElement('p');
    p.className = 'error';
    p.textContent = mensaje;
    campo.appendChild(p);
  }
}

export function limpiarErrores(container){
  container.querySelectorAll('.form-field.has-error').forEach((campo) => {
    campo.classList.remove('has-error');
    campo.querySelector('.error')?.remove();
  });
}
