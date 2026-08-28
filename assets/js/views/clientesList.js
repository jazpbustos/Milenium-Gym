// ============================================================
// Milenium Gym — views/clientesList.js
// Vista "MILENIUM GYM": todos los clientes activos, ordenados
// por nombre — igual que la vista homónima en AppSheet.
// ============================================================

import { listarClientes } from '../api/clientes.js';
import { renderTablaClientes } from '../components/tablaClientes.js';
import { icon } from '../components/icons.js';
import { mostrarError } from '../utils/toast.js';
import { cerrarSesion } from '../auth.js';
import { setState, getState } from '../state.js';
import { navegarA } from '../router.js';

export async function renderClientesList(container, params, { renderTopbar }){
  renderTopbar({
    title: 'Milenium Gym',
    actions: [
      { icono: 'buscar', titulo: 'Buscar', onClick: () => toggleBusqueda() },
      { icono: 'refrescar', titulo: 'Actualizar', onClick: () => cargar(true) },
      { icono: 'salir', titulo: 'Cerrar sesión', onClick: async () => { await cerrarSesion(); navegarA('/login'); } },
    ],
  });

  container.innerHTML = `
    <div class="search-bar" id="search-bar" style="display:none;">
      ${icon('buscar')}
      <input type="text" id="search-input" placeholder="Buscar por nombre o DNI...">
      <button type="button" class="icon-btn clear-btn" id="search-clear">${icon('cerrar')}</button>
    </div>
    <div id="tabla-host">
      <div class="loading-bar"></div>
    </div>
    <button type="button" class="fab" id="fab-nuevo" title="Nuevo cliente">${icon('mas')}</button>
  `;

  const searchBar = container.querySelector('#search-bar');
  const searchInput = container.querySelector('#search-input');
  const tablaHost = container.querySelector('#tabla-host');

  function toggleBusqueda(){
    const visible = searchBar.style.display !== 'none';
    searchBar.style.display = visible ? 'none' : 'flex';
    if (!visible) searchInput.focus();
    else { searchInput.value = ''; aplicarFiltro(''); }
  }

  function aplicarFiltro(texto){
    const { clientes } = getState();
    const q = texto.trim().toLowerCase();
    const filtrados = !q
      ? clientes
      : clientes.filter((c) =>
          c.nombre.toLowerCase().includes(q) || String(c.dni).includes(q));
    renderTablaClientes(tablaHost, filtrados, { origen: 'clientes' });
  }

  searchInput.addEventListener('input', () => {
    searchBar.classList.toggle('has-value', !!searchInput.value);
    aplicarFiltro(searchInput.value);
  });
  container.querySelector('#search-clear').addEventListener('click', () => {
    searchInput.value = '';
    searchBar.classList.remove('has-value');
    aplicarFiltro('');
  });

  container.querySelector('#fab-nuevo').addEventListener('click', () => navegarA('/cliente/nuevo'));

  async function cargar(forzar = false){
    if (!forzar && getState().clientes.length){
      aplicarFiltro(searchInput.value);
      return;
    }
    tablaHost.innerHTML = '<div class="loading-bar"></div>';
    try {
      const clientes = await listarClientes();
      setState({ clientes });
      aplicarFiltro(searchInput.value);
    } catch (err) {
      mostrarError(err);
      tablaHost.innerHTML = `<div class="estado-vacio"><p>No se pudo cargar la lista de clientes.</p></div>`;
    }
  }

  await cargar();
}
