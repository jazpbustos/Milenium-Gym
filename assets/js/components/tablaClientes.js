// ============================================================
// Milenium Gym — components/tablaClientes.js
// Tabla de socios: DNI, NOMBRE y ESTADO.
//
// Encabezados clickeables para ordenar (asc/desc) por DNI, Nombre
// o Estado. El orden elegido se guarda en el state global
// (state.ordenClientes), no en el elemento contenedor — el
// contenedor se recrea entero cada vez que el router vuelve a
// montar la vista, así que guardar el orden ahí se perdía apenas
// se salía y volvía a entrar a Socios.
// ============================================================

import { claseEstado } from '../utils/formato.js';
import { icon } from './icons.js';
import { setState, getState } from '../state.js';

const COLUMNAS = [
  { campo: 'dni', label: 'DNI' },
  { campo: 'nombre', label: 'Nombre' },
  { campo: 'estado', label: 'Estado' },
];

function comparar(a, b, campo){
  if (campo === 'nombre'){
    return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
  }
  return a[campo] - b[campo]; // dni y estado son numéricos
}

/**
 * @param {HTMLElement} container
 * @param {Array} clientes filas de v_clientes
 * @param {{ origen: 'clientes' }} opts
 */
export function renderTablaClientes(container, clientes, { origen }){
  // Se guardan las filas tal cual llegaron (ya filtradas por el
  // buscador si corresponde) para poder reordenar sin depender de
  // la vista que llamó a esta función.
  container._clientes = clientes;

  if (!clientes.length){
    container.innerHTML = `
      <div class="estado-vacio">
        ${icon('buscar')}
        <p>No hay clientes para mostrar acá.</p>
      </div>`;
    return;
  }

  const { campo: campoOrden, dir } = getState().ordenClientes;
  const ordenados = [...clientes].sort((a, b) => dir * comparar(a, b, campoOrden));

  // Se guarda el orden actual para que el detalle pueda navegar
  // con las flechas prev/next dentro de esta misma lista.
  setState({ listContext: { dnis: ordenados.map((c) => c.dni), origen } });

  container.innerHTML = `
    <div class="tabla-wrap tabla-clientes-wrap">
      <table class="tabla tabla-clientes">
        <colgroup>
          <col class="col-ancho-dni">
          <col class="col-ancho-nombre">
          <col class="col-ancho-estado">
          <col class="col-ancho-chevron">
        </colgroup>
        <thead>
          <tr>
            ${COLUMNAS.map((col) => `
              <th class="col-head-${col.campo} is-sortable ${col.campo === campoOrden ? `is-orden-activo ${dir === -1 ? 'is-orden-desc' : ''}` : ''}" data-campo="${col.campo}">
                ${col.label}${icon('chevronDown').replace('<svg ', '<svg class="sort-arrow" ')}
              </th>
            `).join('')}
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${ordenados.map((c) => `
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

  container.querySelectorAll('thead th.is-sortable').forEach((th) => {
    th.addEventListener('click', () => {
      const campo = th.dataset.campo;
      const ordenActual = getState().ordenClientes;
      setState({
        ordenClientes: ordenActual.campo === campo
          ? { campo, dir: ordenActual.dir * -1 }
          : { campo, dir: 1 },
      });
      renderTablaClientes(container, container._clientes, { origen });
    });
  });

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
