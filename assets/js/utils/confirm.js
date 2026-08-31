// ============================================================
// Milenium Gym — utils/confirm.js
// Confirmación para acciones irreversibles (baja de cliente,
// borrar una actividad). Evita el confirm() nativo del navegador,
// que no se puede estilar y corta la ejecución del script.
// ============================================================

export function pedirConfirmacion({ titulo, mensaje, textoConfirmar = 'Confirmar', peligroso = true }){
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-card">
        <h3>${escapeHtml(titulo)}</h3>
        <p>${escapeHtml(mensaje)}</p>
        <div class="confirm-actions">
          <button type="button" class="btn btn-ghost" id="confirm-cancel">Cancelar</button>
          <button type="button" class="btn ${peligroso ? 'btn-danger' : 'btn-primary'}" id="confirm-ok">${escapeHtml(textoConfirmar)}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const cerrar = (valor) => { overlay.remove(); resolve(valor); };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(false); });
    overlay.querySelector('#confirm-cancel').addEventListener('click', () => cerrar(false));
    overlay.querySelector('#confirm-ok').addEventListener('click', () => cerrar(true));
  });
}

function escapeHtml(valor){
  const div = document.createElement('div');
  div.textContent = valor ?? '';
  return div.innerHTML;
}
