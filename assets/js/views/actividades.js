// ============================================================
// Milenium Gym — views/actividades.js
// Vista "ACTIVIDADES": deck de nombre + precio, con editar/borrar
// inline y alta por FAB — igual forma que la vista homónima en
// AppSheet. El orden es manual: se arrastra la fila (icono de la
// izquierda) para reordenar, y el nuevo orden se guarda solo.
// Esta tabla es la que alimenta la sugerencia de precio del
// formulario de clientes.
// ============================================================

import { listarActividades, eliminarActividad, guardarOrdenActividades } from '../api/actividades.js';
import { icon } from '../components/icons.js';
import { formatearPrecio } from '../utils/formato.js';
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

  container.querySelector('#fab-nueva').addEventListener('click', () => navegarA('/actividad/nueva'));

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
      <div class="deck-row" draggable="true" data-id="${a.id}">
        <div class="deck-row-drag" title="Arrastrar para reordenar">${icon('arrastrar')}</div>
        <div class="deck-row-main">
          <p class="deck-row-title">${escapeHtml(a.nombre)}</p>
          <p class="deck-row-sub">${formatearPrecio(a.precio)} · ${a.dias_credito} día${a.dias_credito === 1 ? '' : 's'}</p>
        </div>
        <div class="deck-row-actions">
          <button type="button" class="icon-btn btn-editar" title="Editar">${icon('lapiz')}</button>
          <button type="button" class="icon-btn is-danger btn-borrar" title="Borrar">${icon('tacho')}</button>
        </div>
      </div>
    `).join('');

    host.querySelectorAll('.deck-row').forEach((row) => {
      const a = actividades.find((x) => x.id === Number(row.dataset.id));

      row.querySelector('.btn-editar').addEventListener('click', () => navegarA(`/actividad/${a.id}/editar`));
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

    activarArrastre(host, actividades);
  }

  // --- Reordenar por drag & drop --------------------------------
  // Se arrastra la fila entera desde el ícono de la izquierda. Al
  // soltar, se lee el orden final del DOM y se guarda de una — nada
  // de moverla de a un lugar por vez con botones.
  function activarArrastre(host, actividadesActuales){
    let filaArrastrada = null;

    host.querySelectorAll('.deck-row').forEach((row) => {
      row.addEventListener('dragstart', () => {
        filaArrastrada = row;
        row.classList.add('is-dragging');
      });
      row.addEventListener('dragend', () => {
        row.classList.remove('is-dragging');
        filaArrastrada = null;
      });
      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!filaArrastrada || filaArrastrada === row) return;
        const rect = row.getBoundingClientRect();
        const antesDeEsta = (e.clientY - rect.top) < rect.height / 2;
        host.insertBefore(filaArrastrada, antesDeEsta ? row : row.nextSibling);
      });
    });

    host.addEventListener('dragover', (e) => e.preventDefault());
    host.addEventListener('drop', async (e) => {
      e.preventDefault();
      if (!filaArrastrada) return;
      const idsEnOrden = [...host.querySelectorAll('.deck-row')].map((r) => Number(r.dataset.id));
      try {
        await guardarOrdenActividades(idsEnOrden);
        const reordenadas = idsEnOrden.map((id) => actividadesActuales.find((a) => a.id === id));
        setState({ actividades: reordenadas });
      } catch (err) {
        mostrarError(err);
        cargar(); // si falló al guardar, se vuelve a traer el orden real
      }
    });
  }

  await cargar();
}

function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}
