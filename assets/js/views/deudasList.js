// ============================================================
// Milenium Gym — views/deudasList.js
// Vista "DEUDAS": réplica de la tabla "DEUDAS 2" que ya usás en
// AppSheet — más ancha que MILENIUM GYM, con teléfono, actividad,
// precio y comentarios a la vista, y llamar/WhatsApp sin tener
// que entrar al detalle de cada socio.
// ============================================================

import { listarDeudores } from '../api/clientes.js';
import { icon } from '../components/icons.js';
import { formatearFecha, formatearPrecio, textoEstado } from '../utils/formato.js';
import { telHref } from '../utils/telefono.js';
import { waHref, mensajeRecordatorio } from '../utils/whatsapp.js';
import { mostrarError } from '../utils/toast.js';
import { cerrarSesion } from '../auth.js';
import { setState } from '../state.js';
import { navegarA } from '../router.js';

export async function renderDeudasList(container, params, { renderTopbar }){
  renderTopbar({
    title: 'Deudas',
    actions: [
      { icono: 'refrescar', titulo: 'Actualizar', onClick: () => cargar() },
      { icono: 'salir', titulo: 'Cerrar sesión', onClick: async () => { await cerrarSesion(); navegarA('/login'); } },
    ],
  });

  container.innerHTML = `<div id="deudas-host"><div class="loading-bar"></div></div>`;
  const host = container.querySelector('#deudas-host');

  async function cargar(){
    host.innerHTML = '<div class="loading-bar"></div>';
    try {
      const deudores = await listarDeudores();
      pintar(deudores);
    } catch (err) {
      mostrarError(err);
      host.innerHTML = `<div class="estado-vacio"><p>No se pudo cargar la lista de deudores.</p></div>`;
    }
  }

  function pintar(deudores){
    if (!deudores.length){
      host.innerHTML = `
        <div class="estado-vacio">
          ${icon('caraTriste')}
          <p>No hay clientes con la cuota vencida ahora mismo.</p>
        </div>`;
      return;
    }

    setState({ listContext: { dnis: deudores.map((d) => d.dni), origen: 'deudores' } });

    host.innerHTML = `
      <div class="tabla-wrap">
        <table class="tabla">
          <thead>
            <tr>
              <th>Estado</th>
              <th>Nombre</th>
              <th>Contacto</th>
              <th>Actividad</th>
              <th>Precio</th>
              <th>Vencimiento</th>
              <th>Comentarios</th>
            </tr>
          </thead>
          <tbody>
            ${deudores.map((d) => `
              <tr data-dni="${d.dni}">
                <td><span class="badge-estado st-rojo" title="${textoEstado(d.estado)}">${d.estado}</span></td>
                <td class="col-nombre">${escapeHtml(d.nombre)}</td>
                <td>
                  ${d.telefono ? `
                    <div style="display:flex; gap:2px;">
                      <a class="icon-btn is-call" href="${telHref(d.telefono)}" title="Llamar" data-stop>${icon('telefono')}</a>
                      <a class="icon-btn is-whatsapp" href="${waHref(d.telefono, mensajeRecordatorio(d.nombre))}" target="_blank" rel="noopener" title="WhatsApp" data-stop>${icon('whatsapp')}</a>
                    </div>
                  ` : '<span style="color:var(--text-faint)">Sin teléfono</span>'}
                </td>
                <td>${escapeHtml(d.actividad)}</td>
                <td>${formatearPrecio(d.precio)}</td>
                <td>${formatearFecha(d.fecha_vencimiento)}</td>
                <td style="max-width:220px; white-space:normal; color:var(--text-dim);">${escapeHtml(d.comentarios || '')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <p style="text-align:center; color:var(--text-faint); font-size:13px; padding:16px;">
          ${deudores.length} cliente${deudores.length === 1 ? '' : 's'} con deuda
        </p>
      </div>
    `;

    host.querySelectorAll('tbody tr').forEach((tr) => {
      tr.addEventListener('click', (e) => {
        if (e.target.closest('[data-stop]')) return; // no navegar si tocó llamar/whatsapp
        window.location.hash = `/cliente/${tr.dataset.dni}`;
      });
    });
  }

  await cargar();
}

function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}
