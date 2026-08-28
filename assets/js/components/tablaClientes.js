// ============================================================
// Milenium Gym — components/tablaClientes.js
// Tabla compartida entre MILENIUM GYM y DEUDAS (misma forma de
// fila en ambas vistas de AppSheet: DNI, NOMBRE, ESTADO). Vive
// acá una sola vez para no mantener dos tablas casi idénticas.
// ============================================================

import { claseEstado } from '../utils/formato.js';
import { icon } from './icons.js';
import { setState } from '../state.js';

/**
 * @param {HTMLElement} container
 * @param {Array} clientes  filas de v_clientes / v_deudores
 * @param {{ origen: 'clientes' | 'deudores' }} opts
 */
export function renderTablaClientes(container, clientes, { origen }){
  if (!clientes.length){
    container.innerHTML = `
      <div class="estado-vacio">
        ${icon('buscar')}
        <p>No hay clientes para mostrar acá.</p>
      </div>`;
    return;
  }

  // Se guarda el orden actual para que el detalle pueda navegar
  // con las flechas prev/next dentro de esta misma lista.
  setState({ listContext: { dnis: clientes.map((c) => c.dni), origen } });

  container.innerHTML = `
    <div class="tabla-wrap">
      <table class="tabla">
        <thead>
          <tr>
            <th>DNI</th>
            <th>Nombre</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${clientes.map((c) => `
            <tr data-dni="${c.dni}">
              <td class="col-dni">${c.dni.toLocaleString('es-AR')}</td>
              <td class="col-nombre">${escapeHtml(c.nombre)}</td>
              <td><span class="badge-estado ${claseEstado(c.estado)}">${c.estado}</span></td>
              <td class="col-chevron">${icon('flecha')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <p style="text-align:center; color:var(--text-faint); font-size:13px; padding:16px;">
        ${clientes.length} cliente${clientes.length === 1 ? '' : 's'}
      </p>
    </div>
  `;

  container.querySelectorAll('tbody tr').forEach((tr) => {
    tr.addEventListener('click', () => {
      window.location.hash = `/cliente/${tr.dataset.dni}`;
    });
  });
}

function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}
