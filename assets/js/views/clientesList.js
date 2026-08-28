// ============================================================
// Milenium Gym — views/clientesList.js
// Vista "MILENIUM GYM": todos los clientes activos, ordenados
// por nombre — igual que la vista homónima en AppSheet. El
// buscador vive inline en la topbar (ver components/topbar.js).
// ============================================================

import { listarClientes } from '../api/clientes.js';
import { renderTablaClientes } from '../components/tablaClientes.js';
import { icon } from '../components/icons.js';
import { mostrarError } from '../utils/toast.js';
import { cerrarSesion } from '../auth.js';
import { setState, getState } from '../state.js';
import { navegarA } from '../router.js';

export async function renderClientesList(container, params, { renderTopbar }){
  let textoBusqueda = '';

  renderTopbar({
    title: 'Socios',
    buscador: {
      placeholder: 'Buscar por nombre o DNI...',
      onBuscar: (texto) => { textoBusqueda = texto; aplicarFiltro(texto); },
    },
    actions: [
      { icono: 'refrescar', titulo: 'Actualizar', onClick: () => cargar(true) },
      { icono: 'salir', titulo: 'Cerrar sesión', onClick: async () => { await cerrarSesion(); navegarA('/login'); } },
    ],
  });

  container.innerHTML = `
    <div id="tabla-host">
      <div class="loading-bar"></div>
    </div>
    <button type="button" class="fab" id="fab-nuevo" title="Nuevo cliente">${icon('mas')}</button>
  `;

  const tablaHost = container.querySelector('#tabla-host');

  function aplicarFiltro(texto){
    const { clientes } = getState();
    const q = texto.trim().toLowerCase();
    const filtrados = !q
      ? clientes
      : clientes.filter((c) =>
          c.nombre.toLowerCase().includes(q) || String(c.dni).includes(q));
    renderTablaClientes(tablaHost, filtrados, { origen: 'clientes' });
  }

  container.querySelector('#fab-nuevo').addEventListener('click', () => navegarA('/cliente/nuevo'));

  async function cargar(forzar = false){
    if (!forzar && getState().clientes.length){
      aplicarFiltro(textoBusqueda);
      return;
    }
    tablaHost.innerHTML = '<div class="loading-bar"></div>';
    try {
      const clientes = await listarClientes();
      setState({ clientes });
      aplicarFiltro(textoBusqueda);
    } catch (err) {
      mostrarError(err);
      tablaHost.innerHTML = `<div class="estado-vacio"><p>No se pudo cargar la lista de clientes.</p></div>`;
    }
  }

  await cargar();
}
