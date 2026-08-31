// ============================================================
// Milenium Gym — components/pickerActividad.js
// Popup para elegir una ACTIVIDAD desde el formulario de clientes,
// igual que el selector de AppSheet: se toca el campo, se abre una
// lista, se toca una fila y se cierra. Reemplaza al <select> nativo.
// Devuelve una Promise que resuelve con la actividad elegida, o
// null si se cancela.
// ============================================================

import { formatearPrecio } from '../utils/formato.js';

export function elegirActividad(actividades, actividadActualId){
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay picker-overlay';
    overlay.innerHTML = `
      <div class="confirm-card picker-card">
        <h3>Elegí una actividad</h3>
        <div class="picker-list">
          ${actividades.map((a) => `
            <button type="button" class="picker-item${a.id === actividadActualId ? ' is-selected' : ''}" data-id="${a.id}">
              <span class="picker-item-radio"></span>
              <span class="picker-item-nombre">${escapeHtml(a.nombre)}</span>
              <span class="picker-item-precio">${formatearPrecio(a.precio)} · ${a.dias_credito}d</span>
            </button>
          `).join('')}
        </div>
        <div class="confirm-actions">
          <button type="button" class="btn btn-ghost" id="picker-cancelar">Cancelar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const cerrar = (resultado) => {
      overlay.remove();
      resolve(resultado);
    };

    overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(null); });
    overlay.querySelector('#picker-cancelar').addEventListener('click', () => cerrar(null));
    overlay.querySelectorAll('.picker-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const actividad = actividades.find((a) => a.id === Number(btn.dataset.id));
        cerrar(actividad || null);
      });
    });
  });
}

function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}
