// ============================================================
// Milenium Gym — utils/toast.js
// Mensajes cortos y no bloqueantes (guardado, error de red, etc).
// ============================================================

let root = null;

function getRoot(){
  if (!root) root = document.getElementById('toast-root');
  return root;
}

export function mostrarToast(mensaje, { error = false, duracionMs = 3200 } = {}){
  const r = getRoot();
  if (!r) return;

  const el = document.createElement('div');
  el.className = 'toast' + (error ? ' is-error' : '');
  el.textContent = mensaje;
  r.appendChild(el);

  setTimeout(() => el.remove(), duracionMs);
}

export function mostrarError(err){
  const mensaje = err?.message || 'Ocurrió un error inesperado.';
  mostrarToast(mensaje, { error: true });
  console.error(err);
}
