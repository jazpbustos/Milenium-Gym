// ============================================================
// Milenium Gym — views/clienteDetail.js
// Detalle de solo lectura: labels chicos en mayúscula arriba,
// valor grande abajo — mismo patrón que "Details" en AppSheet.
// Llamar y WhatsApp junto al teléfono, editar por FAB, baja por
// ícono en la topbar, y flechas prev/next contra la lista de la
// que vino (MILENIUM GYM o DEUDAS).
// ============================================================

import { obtenerCliente, darDeBajaCliente } from '../api/clientes.js';
import { icon } from '../components/icons.js';
import { formatearFecha, formatearPrecio, claseEstado, textoEstado } from '../utils/formato.js';
import { telHref, formatearVisual } from '../utils/telefono.js';
import { waHref, mensajeRecordatorio } from '../utils/whatsapp.js';
import { mostrarError, mostrarToast } from '../utils/toast.js';
import { pedirConfirmacion } from '../utils/confirm.js';
import { getState } from '../state.js';
import { navegarA } from '../router.js';

export async function renderClienteDetail(container, params, { renderTopbar }){
  const dni = Number(params.dni);
  const { listContext } = getState();
  const origenRuta = listContext.origen === 'deudores' ? '/deudas' : '/clientes';

  renderTopbar({
    title: 'Detalle',
    onBack: () => navegarA(origenRuta),
    actions: [
      {
        icono: 'tacho',
        titulo: 'Dar de baja',
        claseExtra: 'is-danger',
        onClick: async () => {
          const ok = await pedirConfirmacion({
            titulo: 'Dar de baja al cliente',
            mensaje: 'El cliente deja de aparecer en las listas, pero su historial no se borra. Se puede reactivar más adelante desde la base si hace falta.',
            textoConfirmar: 'Dar de baja',
          });
          if (!ok) return;
          try {
            await darDeBajaCliente(dni);
            mostrarToast('Cliente dado de baja.');
            navegarA(origenRuta);
          } catch (err) { mostrarError(err); }
        },
      },
    ],
  });

  container.innerHTML = `<div class="loading-bar"></div>`;

  let cliente;
  try {
    cliente = await obtenerCliente(dni);
  } catch (err) {
    mostrarError(err);
    container.innerHTML = `<div class="estado-vacio"><p>No se pudo cargar este cliente.</p></div>`;
    return;
  }

  if (!cliente){
    container.innerHTML = `<div class="estado-vacio"><p>No encontramos un cliente con ese DNI.</p></div>`;
    return;
  }

  const dnis = listContext.dnis;
  const idx = dnis.indexOf(dni);
  const prevDni = idx > 0 ? dnis[idx - 1] : null;
  const nextDni = idx >= 0 && idx < dnis.length - 1 ? dnis[idx + 1] : null;

  container.innerHTML = `
    ${prevDni ? `<button type="button" class="detail-nav-arrow is-prev" title="Anterior">${icon('flechaIzq')}</button>` : ''}
    ${nextDni ? `<button type="button" class="detail-nav-arrow is-next" title="Siguiente">${icon('flecha')}</button>` : ''}

    <div class="detail-shell">
    <p class="detail-nombre">${escapeHtml(cliente.nombre)}</p>
    <div class="detail-field">
      <p class="detail-field-label">DNI</p>
      <p class="detail-field-value">${cliente.dni.toLocaleString('es-AR')}</p>
    </div>
    <div class="detail-field">
      <p class="detail-field-label">Teléfono</p>
      <p class="detail-field-value">
        <span>${formatearVisual(cliente.telefono)}</span>
        ${cliente.telefono ? `
          <span class="value-actions">
            <a class="icon-btn is-call" href="${telHref(cliente.telefono)}" title="Llamar">${icon('telefono')}</a>
            <a class="icon-btn is-whatsapp" href="${waHref(cliente.telefono, mensajeRecordatorio(cliente.nombre))}" target="_blank" rel="noopener" title="WhatsApp">${icon('whatsapp')}</a>
          </span>` : ''}
      </p>
    </div>
    <div class="detail-field">
      <p class="detail-field-label">Actividad</p>
      <p class="detail-field-value">${escapeHtml(cliente.actividad)}</p>
    </div>
    <div class="detail-field">
      <p class="detail-field-label">Precio</p>
      <p class="detail-field-value">${formatearPrecio(cliente.precio)}</p>
    </div>
    ${cliente.comentarios ? `
      <div class="detail-field">
        <p class="detail-field-label">Comentarios</p>
        <p class="detail-field-value" style="font-size:14px; font-weight:400; color:var(--text-dim);">${escapeHtml(cliente.comentarios)}</p>
      </div>` : ''}
    <div class="detail-field">
      <p class="detail-field-label">Fecha de pago</p>
      <p class="detail-field-value">${formatearFecha(cliente.fecha_pago)}</p>
    </div>
    <div class="detail-field">
      <p class="detail-field-label">Días de crédito</p>
      <p class="detail-field-value">${cliente.dias_credito}</p>
    </div>
    <div class="detail-field">
      <p class="detail-field-label">Fecha de vencimiento</p>
      <p class="detail-field-value">${formatearFecha(cliente.fecha_vencimiento)}</p>
    </div>
    <div class="detail-field">
      <p class="detail-field-label">Estado (negativo indica deuda / positivo indica activo)</p>
      <p class="detail-field-value">
        <span class="badge-estado ${claseEstado(cliente.estado)}">${cliente.estado}</span>
        <span style="font-size:13px; font-weight:400; color:var(--text-dim);">${textoEstado(cliente.estado)}</span>
      </p>
    </div>

    <div style="height:88px;"></div>
    </div>

    <button type="button" class="fab fab-standalone" id="fab-editar" title="Editar">${icon('lapiz')}</button>
  `;

  container.querySelector('#fab-editar').addEventListener('click', () => navegarA(`/cliente/${dni}/editar`));

  const btnPrev = container.querySelector('.detail-nav-arrow.is-prev');
  const btnNext = container.querySelector('.detail-nav-arrow.is-next');
  if (btnPrev) btnPrev.addEventListener('click', () => navegarA(`/cliente/${prevDni}`));
  if (btnNext) btnNext.addEventListener('click', () => navegarA(`/cliente/${nextDni}`));
}

function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}
