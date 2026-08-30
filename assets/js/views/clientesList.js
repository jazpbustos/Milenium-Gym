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
import { UMBRAL_POR_VENCER_DIAS } from '../config.js';

export async function renderClientesList(container, params, { renderTopbar }){
  // El texto buscado vive en el state global (ver state.js), no acá
  // — así, si la persona sale de esta vista y vuelve, lo encuentra
  // tal cual lo dejó en vez de arrancar de cero cada vez.
  let textoBusqueda = getState().filtroClientes;
  let filtroEstado = getState().estadoClientes;

  renderTopbar({
    title: 'Socios',
    buscador: {
      placeholder: 'Buscar por nombre o DNI...',
      valorInicial: textoBusqueda,
      onBuscar: (texto) => { textoBusqueda = texto; setState({ filtroClientes: texto }); aplicarFiltro(texto); },
    },
    actions: [
      { icono: 'refrescar', titulo: 'Actualizar', onClick: () => cargar(true) },
      { icono: 'salir', titulo: 'Cerrar sesión', onClick: async () => { await cerrarSesion(); navegarA('/login'); } },
    ],
  });

  // Si ya había clientes cargados (venimos de navegar, no de un F5),
  // se pinta la tabla directo con lo que ya está en memoria — nada
  // de mostrar el loading-bar y "refrescar" de nuevo contra la red
  // solo por haber cambiado de pestaña y vuelto.
  const yaHabiaDatos = getState().clientes.length > 0;

  container.innerHTML = `
    <div class="filter-bar" role="group" aria-label="Filtrar socios por estado">
      ${[
        ['todos', 'Todos'],
        ['al-dia', 'Al día'],
        ['por-vencer', 'Por vencer'],
        ['deuda', 'Con deuda'],
      ].map(([valor, label]) => `
        <button type="button" class="filter-chip${filtroEstado === valor ? ' is-active' : ''}" data-estado="${valor}">${label}</button>
      `).join('')}
    </div>
    <div id="tabla-host">
      ${yaHabiaDatos ? '' : '<div class="loading-bar"></div>'}
    </div>
    <button type="button" class="fab" id="fab-nuevo" title="Nuevo cliente">${icon('mas')}</button>
  `;

  const tablaHost = container.querySelector('#tabla-host');

  function aplicarFiltro(texto){
    const { clientes } = getState();
    const q = texto.trim().toLowerCase();
    const porTexto = !q
      ? clientes
      : clientes.filter((c) =>
          c.nombre.toLowerCase().includes(q) || String(c.dni).includes(q));
    const filtrados = porTexto.filter((c) => {
      if (filtroEstado === 'deuda') return c.estado < 0;
      if (filtroEstado === 'por-vencer') return c.estado >= 0 && c.estado <= UMBRAL_POR_VENCER_DIAS;
      if (filtroEstado === 'al-dia') return c.estado > UMBRAL_POR_VENCER_DIAS;
      return true;
    });
    renderTablaClientes(tablaHost, filtrados, { origen: 'clientes' });
  }

  container.querySelectorAll('.filter-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      filtroEstado = btn.dataset.estado;
      setState({ estadoClientes: filtroEstado });
      container.querySelectorAll('.filter-chip').forEach((chip) => {
        chip.classList.toggle('is-active', chip === btn);
      });
      aplicarFiltro(textoBusqueda);
    });
  });

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
