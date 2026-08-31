// Últimos pagos registrados. Reemplaza la antigua pestaña Deudas;
// las deudas siguen disponibles como filtro dentro de Socios.

import { listarPagos } from '../api/pagos.js';
import { formatearFecha, formatearPrecio } from '../utils/formato.js';
import { mostrarError } from '../utils/toast.js';
import { cerrarSesion } from '../auth.js';
import { getState, setState } from '../state.js';
import { navegarA } from '../router.js';
import { MOVIMIENTOS_DESDE } from '../config.js';

const PERIODOS = [
  ['hoy', 'Hoy'],
  ['7dias', 'Últimos 7 días'],
  ['mes', 'Este mes'],
  ['todos', 'Todos'],
];

function creacionDesde(periodo){
  const ahora = new Date();
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const inicioHistorial = new Date(MOVIMIENTOS_DESDE);
  let desde = inicioHistorial;
  if (periodo === 'hoy') desde = inicioHoy;
  if (periodo === '7dias'){
    inicioHoy.setDate(inicioHoy.getDate() - 6);
    desde = inicioHoy;
  }
  if (periodo === 'mes') desde = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  // Ningún filtro puede retroceder antes del inicio operativo.
  return new Date(Math.max(desde.getTime(), inicioHistorial.getTime())).toISOString();
}

export async function renderMovimientos(container, params, { renderTopbar }){
  let texto = getState().filtroMovimientos;
  let periodo = getState().periodoMovimientos;
  let pagos = [];

  renderTopbar({
    title: 'Movimientos',
    buscador: {
      placeholder: 'Buscar por socio o DNI...',
      valorInicial: texto,
      onBuscar: (valor) => {
        texto = valor;
        setState({ filtroMovimientos: valor });
        pintar();
      },
    },
    actions: [
      { icono: 'refrescar', titulo: 'Actualizar', onClick: () => cargar() },
      { icono: 'salir', titulo: 'Cerrar sesión', onClick: async () => { await cerrarSesion(); navegarA('/login'); } },
    ],
  });

  container.innerHTML = `
    <div class="filter-bar" role="group" aria-label="Período de movimientos">
      ${PERIODOS.map(([valor, label]) => `<button type="button" class="filter-chip${periodo === valor ? ' is-active' : ''}" data-periodo="${valor}">${label}</button>`).join('')}
    </div>
    <div id="movimientos-host"><div class="loading-bar"></div></div>
  `;
  const host = container.querySelector('#movimientos-host');

  container.querySelectorAll('.filter-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      periodo = btn.dataset.periodo;
      setState({ periodoMovimientos: periodo });
      container.querySelectorAll('.filter-chip').forEach((chip) => chip.classList.toggle('is-active', chip === btn));
      cargar();
    });
  });

  function pintar(){
    const q = texto.trim().toLowerCase();
    const visibles = q
      ? pagos.filter((p) => p.cliente.toLowerCase().includes(q) || String(p.cliente_dni).includes(q))
      : pagos;
    const total = visibles.reduce((suma, p) => suma + Number(p.importe), 0);

    if (!visibles.length){
      host.innerHTML = `<div class="estado-vacio"><p>No hay movimientos para mostrar.</p></div>`;
      return;
    }

    host.innerHTML = `
      <div class="movimientos-resumen"><strong>${visibles.length} pago${visibles.length === 1 ? '' : 's'}</strong><span>${formatearPrecio(total)}</span></div>
      <div class="tabla-wrap">
        <table class="tabla movimientos-tabla">
          <thead><tr><th>Fecha</th><th>Socio</th><th>Actividad</th><th>Importe</th><th>Nuevo vencimiento</th></tr></thead>
          <tbody>${visibles.map((p) => `
            <tr>
              <td>${formatearFecha(p.fecha_pago)}</td>
              <td class="col-nombre">${escapeHtml(p.cliente)}</td>
              <td>${escapeHtml(p.actividad)}</td>
              <td>${formatearPrecio(p.importe)}</td>
              <td>${formatearFecha(p.nuevo_vencimiento)}</td>
            </tr>`).join('')}</tbody>
        </table>
      </div>`;
  }

  async function cargar(){
    host.innerHTML = '<div class="loading-bar"></div>';
    try {
      pagos = await listarPagos({ creadoDesde: creacionDesde(periodo) });
      pintar();
    } catch (err) {
      mostrarError(err);
      host.innerHTML = `<div class="estado-vacio"><p>No se pudo cargar el historial de pagos.</p></div>`;
    }
  }

  await cargar();
}

function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}
