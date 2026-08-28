// ============================================================
// Milenium Gym — views/actividades.js
// Vista "ACTIVIDADES": deck de nombre + precio, con editar/borrar
// inline y alta por FAB — igual forma que la vista homónima en
// AppSheet. Esta tabla es la que alimenta la sugerencia de precio
// del formulario de clientes.
// ============================================================

import { listarActividades, crearActividad, actualizarActividad, eliminarActividad } from '../api/actividades.js';
import { icon } from '../components/icons.js';
import { formatearPrecio, precioParaInput } from '../utils/formato.js';
import { mostrarError, mostrarToast } from '../utils/toast.js';
import { pedirConfirmacion } from '../utils/confirm.js';
import { cerrarSesion } from '../auth.js';
import { setState } from '../state.js';
import { navegarA } from '../router.js';

export async function renderActividades(container, params, { renderTopbar }){
  renderTopbar({
    title: 'Actividades',
    actions: [
      { icono: 'refrescar', titulo: 'Actualizar', onClick: () => cargar() },
      { icono: 'salir', titulo: 'Cerrar sesión', onClick: async () => { await cerrarSesion(); navegarA('/login'); } },
    ],
  });

  container.innerHTML = `
    <div id="deck-host"><div class="loading-bar"></div></div>
    <button type="button" class="fab" id="fab-nueva" title="Nueva actividad">${icon('mas')}</button>
  `;
  const host = container.querySelector('#deck-host');

  container.querySelector('#fab-nueva').addEventListener('click', () => abrirModal(null));

  async function cargar(){
    host.innerHTML = '<div class="loading-bar"></div>';
    try {
      const actividades = await listarActividades();
      setState({ actividades });
      pintar(actividades);
    } catch (err) {
      mostrarError(err);
      host.innerHTML = `<div class="estado-vacio"><p>No se pudieron cargar las actividades.</p></div>`;
    }
  }

  function pintar(actividades){
    if (!actividades.length){
      host.innerHTML = `<div class="estado-vacio"><p>Todavía no cargaste ninguna actividad. Creá la primera con el botón +.</p></div>`;
      return;
    }
    host.innerHTML = actividades.map((a) => `
      <div class="deck-row" data-id="${a.id}">
        <div class="deck-row-main">
          <p class="deck-row-title">${escapeHtml(a.nombre)}</p>
          <p class="deck-row-sub">${formatearPrecio(a.precio)}</p>
        </div>
        <div class="deck-row-actions">
          <button type="button" class="icon-btn btn-editar" title="Editar">${icon('lapiz')}</button>
          <button type="button" class="icon-btn is-danger btn-borrar" title="Borrar">${icon('tacho')}</button>
        </div>
      </div>
    `).join('');

    host.querySelectorAll('.deck-row').forEach((row) => {
      const a = actividades.find((x) => x.id === Number(row.dataset.id));
      row.querySelector('.btn-editar').addEventListener('click', () => abrirModal(a));
      row.querySelector('.btn-borrar').addEventListener('click', async () => {
        const ok = await pedirConfirmacion({
          titulo: 'Borrar actividad',
          mensaje: `Se va a borrar "${a.nombre}". Esto no se puede deshacer.`,
          textoConfirmar: 'Borrar',
        });
        if (!ok) return;
        try {
          await eliminarActividad(a.id);
          mostrarToast('Actividad borrada.');
          cargar();
        } catch (err) { mostrarError(err); }
      });
    });
  }

  function abrirModal(actividad){
    const esEdicion = !!actividad;
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-card">
        <h3>${esEdicion ? 'Editar actividad' : 'Nueva actividad'}</h3>
        <div class="form-field">
          <label for="m-nombre">Nombre<span class="req">*</span></label>
          <input id="m-nombre" type="text" value="${esEdicion ? escapeAttr(actividad.nombre) : ''}" required>
        </div>
        <div class="form-field">
          <label for="m-precio">Precio<span class="req">*</span></label>
          <input id="m-precio" type="text" inputmode="decimal" value="${esEdicion ? precioParaInput(actividad.precio) : ''}" required>
        </div>
        <div class="confirm-actions">
          <button type="button" class="btn btn-ghost" id="m-cancelar">Cancelar</button>
          <button type="button" class="btn btn-primary" id="m-guardar">Guardar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const cerrar = () => overlay.remove();
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
    overlay.querySelector('#m-cancelar').addEventListener('click', cerrar);
    overlay.querySelector('#m-guardar').addEventListener('click', async () => {
      const nombre = overlay.querySelector('#m-nombre').value.trim();
      const precio = Number(overlay.querySelector('#m-precio').value);
      if (!nombre || !overlay.querySelector('#m-precio').value){
        mostrarToast('Completá nombre y precio.', { error: true });
        return;
      }
      try {
        if (esEdicion) await actualizarActividad(actividad.id, { nombre, precio });
        else await crearActividad({ nombre, precio });
        mostrarToast(esEdicion ? 'Actividad actualizada.' : 'Actividad creada.');
        cerrar();
        cargar();
      } catch (err) { mostrarError(err); }
    });
  }

  await cargar();
}

function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}
function escapeAttr(str){
  return escapeHtml(str).replace(/"/g, '&quot;');
}
