// ============================================================
// Milenium Gym — components/editorPago.js
// Popup para corregir un movimiento del historial: fecha, actividad,
// importe y días de crédito. Mismo patrón que pickerActividad y
// confirm: devuelve una Promise que resuelve con los datos nuevos,
// o null si se cancela. No guarda nada por su cuenta — eso lo hace
// la vista que lo abre.
// ============================================================

import { elegirActividad } from './pickerActividad.js';
import { formatearPrecio } from '../utils/formato.js';
import { soloDigitos } from '../utils/validacion.js';
import { icon } from './icons.js';

export function editarPago(pago, actividades){
  return new Promise((resolve) => {
    let actividad = actividades.find((a) => a.id === pago.actividad_id) || null;

    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <form class="confirm-card editor-pago-card" novalidate>
        <h3>Corregir pago</h3>
        <p>${escapeHtml(pago.cliente)}</p>

        <div class="form-field">
          <label for="ep-actividad">Actividad</label>
          <button type="button" class="select-trigger" id="ep-actividad">
            <span id="ep-actividad-label">${actividad ? escapeHtml(actividad.nombre) : escapeHtml(pago.actividad)}</span>
            ${icon('chevronDown')}
          </button>
        </div>

        <div class="form-row-2">
          <div class="form-field">
            <label for="ep-fecha">Fecha de pago</label>
            <input id="ep-fecha" type="date" value="${pago.fecha_pago}" required>
          </div>
          <div class="form-field">
            <label for="ep-dias">Días de crédito</label>
            <input id="ep-dias" type="text" inputmode="numeric" value="${pago.dias_credito}" required>
          </div>
        </div>

        <div class="form-field">
          <label for="ep-importe">Importe</label>
          <input id="ep-importe" type="text" inputmode="numeric" value="${Math.round(Number(pago.importe))}" required>
          <small class="editor-pago-ayuda" id="ep-importe-ayuda">${formatearPrecio(pago.importe)}</small>
        </div>

        <div class="confirm-actions">
          <button type="button" class="btn btn-ghost" id="ep-cancelar">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar</button>
        </div>
      </form>
    `;
    document.body.appendChild(overlay);

    const form = overlay.querySelector('form');
    const inpFecha = overlay.querySelector('#ep-fecha');
    const inpDias = overlay.querySelector('#ep-dias');
    const inpImporte = overlay.querySelector('#ep-importe');
    const ayudaImporte = overlay.querySelector('#ep-importe-ayuda');
    const labelActividad = overlay.querySelector('#ep-actividad-label');

    const cerrar = (valor) => { overlay.remove(); resolve(valor); };

    inpDias.addEventListener('input', () => { inpDias.value = soloDigitos(inpDias.value).slice(0, 4); });
    inpImporte.addEventListener('input', () => {
      inpImporte.value = soloDigitos(inpImporte.value).slice(0, 9);
      ayudaImporte.textContent = inpImporte.value ? formatearPrecio(inpImporte.value) : '—';
    });

    // Cambiar la actividad trae su precio y duración vigentes como
    // punto de partida (se pueden retocar a mano después).
    overlay.querySelector('#ep-actividad').addEventListener('click', async () => {
      const elegida = await elegirActividad(actividades, actividad?.id ?? null);
      if (!elegida || elegida.id === actividad?.id) return;
      actividad = elegida;
      labelActividad.textContent = elegida.nombre;
      inpImporte.value = Math.round(Number(elegida.precio));
      ayudaImporte.textContent = formatearPrecio(elegida.precio);
      inpDias.value = elegida.dias_credito;
    });

    overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(null); });
    overlay.querySelector('#ep-cancelar').addEventListener('click', () => cerrar(null));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const importe = Number(inpImporte.value);
      const dias = Number(inpDias.value);
      if (!inpFecha.value || !actividad || !(importe > 0) || !(dias > 0)){
        form.querySelector('.editor-pago-error')?.remove();
        form.querySelector('.confirm-actions').insertAdjacentHTML(
          'beforebegin',
          '<p class="editor-pago-error">Completá fecha, actividad, importe y días.</p>'
        );
        return;
      }
      cerrar({
        fecha_pago: inpFecha.value,
        actividad_id: actividad.id,
        importe,
        dias_credito: dias,
      });
    });
  });
}

function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}
