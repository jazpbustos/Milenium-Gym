// Últimos pagos registrados. Reemplaza la antigua pestaña Deudas;
// las deudas siguen disponibles como filtro dentro de Socios.

import { listarPagos, corregirPago, eliminarPago } from '../api/pagos.js';
import { listarActividades } from '../api/actividades.js';
import { editarPago } from '../components/editorPago.js';
import { icon } from '../components/icons.js';
import { formatearFecha, formatearPrecio } from '../utils/formato.js';
import { mostrarError, mostrarToast } from '../utils/toast.js';
import { pedirConfirmacion } from '../utils/confirm.js';
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
    if (!host.isConnected) return; // ya se navegó a otra pantalla
    const q = texto.trim().toLowerCase();
    const visibles = q
      ? pagos.filter((p) => p.cliente.toLowerCase().includes(q) || String(p.cliente_dni).includes(q))
      : pagos;

    if (!visibles.length){
      host.innerHTML = `<div class="estado-vacio"><p>No hay movimientos para mostrar.</p></div>`;
      return;
    }

    const dnisConDetalle = [...new Set(
      visibles.map((p) => p.cliente_dni_actual).filter((dni) => dni != null)
    )];
    setState({ listContext: { dnis: dnisConDetalle, origen: 'movimientos' } });

    host.innerHTML = `
      <div class="tabla-wrap">
        <table class="tabla movimientos-tabla">
          <thead><tr><th>Fecha</th><th>Socio</th><th>Actividad</th><th>Importe</th><th>Nuevo vencimiento</th><th class="col-acciones"></th></tr></thead>
          <tbody>${visibles.map((p) => `
            <tr ${p.cliente_dni_actual != null ? `class="is-clickable" data-dni="${p.cliente_dni_actual}"` : ''}>
              <td>${formatearFecha(p.fecha_pago)}</td>
              <td class="col-nombre">${escapeHtml(p.cliente)}</td>
              <td>${escapeHtml(p.actividad)}</td>
              <td>${formatearPrecio(p.importe)}</td>
              <td>${formatearFecha(p.nuevo_vencimiento)}</td>
              <td class="col-acciones">
                <button type="button" class="icon-btn" data-editar="${p.id}" title="Corregir pago">${icon('lapiz')}</button>
                <button type="button" class="icon-btn is-danger" data-eliminar="${p.id}" title="Eliminar pago">${icon('tacho')}</button>
              </td>
            </tr>`).join('')}</tbody>
        </table>
      </div>`;

    host.querySelectorAll('tbody tr.is-clickable').forEach((tr) => {
      tr.addEventListener('click', () => navegarA(`/cliente/${tr.dataset.dni}`));
    });

    // Los botones viven dentro de la fila clickeable: stopPropagation
    // para que corregir/borrar no abra además la ficha del socio.
    host.querySelectorAll('[data-editar]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        corregir(pagos.find((p) => p.id === Number(btn.dataset.editar)));
      });
    });
    host.querySelectorAll('[data-eliminar]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        eliminar(pagos.find((p) => p.id === Number(btn.dataset.eliminar)));
      });
    });
  }

  async function corregir(pago){
    if (!pago) return;
    let actividades = getState().actividades;
    try {
      if (!actividades.length){
        actividades = await listarActividades();
        setState({ actividades });
      }
    } catch (err) { mostrarError(err); return; }

    const cambios = await editarPago(pago, actividades);
    if (!cambios) return;
    try {
      await corregirPago(pago.id, cambios);
      setState({ clientes: [] }); // la ficha del socio pudo cambiar (vencimiento)
      mostrarToast('Pago corregido.');
      await cargar();
    } catch (err) { mostrarError(err); }
  }

  async function eliminar(pago){
    if (!pago) return;
    const ok = await pedirConfirmacion({
      titulo: 'Eliminar pago',
      mensaje: `¿Eliminar el pago de ${pago.cliente} del ${formatearFecha(pago.fecha_pago)} (${formatearPrecio(pago.importe)})? Si es su pago vigente, la ficha vuelve a como estaba antes.`,
      textoConfirmar: 'Eliminar',
    });
    if (!ok) return;
    try {
      const resultado = await eliminarPago(pago.id);
      setState({ clientes: [] });
      if (resultado === 'sin_dato'){
        mostrarToast('Pago eliminado. No había una fecha anterior guardada: revisá la fecha de pago en la ficha del socio.', { error: true, duracionMs: 7000 });
      } else if (resultado === 'restaurado'){
        mostrarToast('Pago eliminado. La ficha del socio volvió a su pago anterior.');
      } else {
        mostrarToast('Pago eliminado.');
      }
      await cargar();
    } catch (err) { mostrarError(err); }
  }

  async function cargar(){
    host.innerHTML = '<div class="loading-bar"></div>';
    try {
      pagos = await listarPagos({ creadoDesde: creacionDesde(periodo) });
      pintar();
    } catch (err) {
      if (!host.isConnected) return;
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
