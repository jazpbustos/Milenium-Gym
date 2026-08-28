// ============================================================
// Milenium Gym — views/clienteForm.js
// Alta y edición de clientes en un solo formulario. El corazón
// de esta vista es el campo PRECIO: se autocompleta como sugerencia
// al elegir ACTIVIDAD (sin fórmula que lo trabe), y dejar de
// sugerir en cuanto la persona lo toca — igual que en AppSheet.
// ============================================================

import { listarActividades } from '../api/actividades.js';
import { obtenerCliente, crearCliente, actualizarCliente, registrarPagoHoy } from '../api/clientes.js';
import { icon } from '../components/icons.js';
import { mostrarError, mostrarToast } from '../utils/toast.js';
import { sugerirE164, esE164Valido } from '../utils/telefono.js';
import { hoyISO, precioParaInput } from '../utils/formato.js';
import { getState, setState } from '../state.js';
import { navegarA } from '../router.js';
import { DIAS_CREDITO_DEFAULT } from '../config.js';

export async function renderClienteForm(container, params, { renderTopbar }){
  const dniEdicion = params.dni ? Number(params.dni) : null;
  const esEdicion = dniEdicion !== null;

  renderTopbar({
    title: esEdicion ? 'Editar cliente' : 'Nuevo cliente',
    onBack: () => navegarA(esEdicion ? `/cliente/${dniEdicion}` : '/clientes'),
  });

  container.innerHTML = `<div class="loading-bar"></div>`;

  // Actividades: se cachean en el state porque el select las usa
  // en cada apertura del formulario y casi no cambian.
  let actividades = getState().actividades;
  if (!actividades.length){
    try {
      actividades = await listarActividades();
      setState({ actividades });
    } catch (err) {
      mostrarError(err);
      container.innerHTML = `<div class="estado-vacio"><p>No se pudieron cargar las actividades.</p></div>`;
      return;
    }
  }

  if (!actividades.length){
    container.innerHTML = `
      <div class="estado-vacio">
        <p>Todavía no hay actividades cargadas. Andá a la pestaña Actividades y creá al menos una antes de dar de alta clientes.</p>
      </div>`;
    return;
  }

  let cliente = null;
  if (esEdicion){
    try {
      cliente = await obtenerCliente(dniEdicion);
    } catch (err) {
      mostrarError(err);
      container.innerHTML = `<div class="estado-vacio"><p>No se pudo cargar este cliente.</p></div>`;
      return;
    }
    if (!cliente){
      container.innerHTML = `<div class="estado-vacio"><p>No encontramos este cliente.</p></div>`;
      return;
    }
  }

  container.innerHTML = `
    <form id="cliente-form" novalidate style="padding-bottom:8px;">
      <div style="padding:0 20px;">

        <div class="form-field">
          <label for="f-dni">DNI<span class="req">*</span></label>
          <input id="f-dni" type="text" inputmode="numeric" pattern="[0-9]*"
            value="${esEdicion ? cliente.dni : ''}" ${esEdicion ? 'disabled' : ''} required>
          ${esEdicion ? '<p class="hint">El DNI no se puede modificar. Si está mal, dalo de baja y cargá el cliente de nuevo.</p>' : ''}
        </div>

        <div class="form-field">
          <label for="f-nombre">Nombre<span class="req">*</span></label>
          <input id="f-nombre" type="text" value="${esEdicion ? escapeAttr(cliente.nombre) : ''}" required>
        </div>

        <div class="form-field">
          <label for="f-telefono">Teléfono</label>
          <input id="f-telefono" type="tel" placeholder="011 15 1234-5678" value="${esEdicion ? escapeAttr(cliente.telefono || '') : ''}">
          <p class="hint" id="f-telefono-hint"></p>
        </div>

        <div class="form-field">
          <label for="f-actividad">Actividad<span class="req">*</span></label>
          <div class="select-wrap">
            <select id="f-actividad" required>
              <option value="" disabled ${!esEdicion ? 'selected' : ''}>Elegí una actividad</option>
              ${actividades.map((a) => `
                <option value="${a.id}" data-precio="${a.precio}" ${esEdicion && a.id === cliente.actividad_id ? 'selected' : ''}>
                  ${escapeHtml(a.nombre)}
                </option>`).join('')}
            </select>
            ${icon('chevronDown')}
          </div>
        </div>

        <div class="form-field precio-field">
          <label for="f-precio">Precio<span class="req">*</span></label>
          <input id="f-precio" type="text" inputmode="decimal"
            value="${esEdicion ? precioParaInput(cliente.precio) : ''}" required>
          <p class="precio-sugerido" id="f-precio-sugerido" style="display:none;"></p>
        </div>

        <div class="form-field">
          <label for="f-comentarios">Comentarios</label>
          <textarea id="f-comentarios">${esEdicion ? escapeHtml(cliente.comentarios || '') : ''}</textarea>
        </div>

        ${esEdicion ? `
          <div class="pago-hoy-row">
            <p>¿Pagó hoy? <strong>Actualiza la fecha de pago al día de hoy.</strong></p>
            <button type="button" class="btn btn-ghost" id="btn-pago-hoy">Registrar pago</button>
          </div>
        ` : ''}

        <div class="form-row-2">
          <div class="form-field">
            <label for="f-fecha-pago">Fecha de pago</label>
            <input id="f-fecha-pago" type="date" value="${esEdicion ? (cliente.fecha_pago || '') : hoyISO()}">
          </div>
          <div class="form-field">
            <label for="f-dias-credito">Días de crédito</label>
            <input id="f-dias-credito" type="number" min="0" step="1"
              value="${esEdicion ? cliente.dias_credito : DIAS_CREDITO_DEFAULT}">
          </div>
        </div>

      </div>

      <div class="form-actions-bar">
        <button type="button" class="btn btn-ghost" id="btn-cancelar">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="btn-guardar">Guardar</button>
      </div>
    </form>
  `;

  const form = container.querySelector('#cliente-form');
  const selActividad = container.querySelector('#f-actividad');
  const inpPrecio = container.querySelector('#f-precio');
  const precioSugeridoEl = container.querySelector('#f-precio-sugerido');
  const inpTelefono = container.querySelector('#f-telefono');
  const telefonoHint = container.querySelector('#f-telefono-hint');
  const btnGuardar = container.querySelector('#btn-guardar');

  // --- Precio sugerido: el corazón de la spec original ---------
  // Sin "tocado", el precio sigue a la actividad elegida. En
  // cuanto la persona escribe algo en el campo, deja de pisarse:
  // así un precio pactado no se borra solo al tocar la actividad.
  function mostrarSugerencia(actividad){
    if (!actividad) { precioSugeridoEl.style.display = 'none'; return; }
    precioSugeridoEl.textContent = `Sugerido para ${actividad.nombre}: $${Number(actividad.precio).toLocaleString('es-AR')} — tocá para usarlo`;
    precioSugeridoEl.style.display = 'block';
  }

  selActividad.addEventListener('change', () => {
    const opt = selActividad.selectedOptions[0];
    const precio = opt?.dataset.precio;
    const actividad = actividades.find((a) => String(a.id) === selActividad.value);
    if (!inpPrecio.dataset.tocado && precio !== undefined){
      inpPrecio.value = precioParaInput(precio);
    }
    mostrarSugerencia(actividad);
  });

  precioSugeridoEl.addEventListener('click', () => {
    const actividad = actividades.find((a) => String(a.id) === selActividad.value);
    if (!actividad) return;
    inpPrecio.value = precioParaInput(actividad.precio);
    delete inpPrecio.dataset.tocado;
    precioSugeridoEl.style.display = 'none';
  });

  inpPrecio.addEventListener('input', () => {
    inpPrecio.dataset.tocado = '1';
    precioSugeridoEl.style.display = 'none';
  });

  // Si ya viene una actividad seleccionada (modo edición), no se
  // dispara 'change' solo por eso — perfecto: no debe pisar el
  // precio pactado que ya tiene el cliente.

  // --- Teléfono: normaliza a E.164 al salir del campo, visible
  // y editable — igual criterio que el precio: se sugiere, no se
  // impone en silencio. Ver utils/telefono.js.
  inpTelefono.addEventListener('blur', () => {
    const val = inpTelefono.value.trim();
    if (!val) { telefonoHint.textContent = ''; return; }
    if (esE164Valido(val)) { telefonoHint.textContent = ''; return; }
    const sugerido = sugerirE164(val);
    inpTelefono.value = sugerido;
    telefonoHint.textContent = 'Formato ajustado — revisá que el número quedó bien.';
  });

  // --- Registrar pago hoy ---------------------------------------
  const btnPagoHoy = container.querySelector('#btn-pago-hoy');
  if (btnPagoHoy){
    btnPagoHoy.addEventListener('click', async () => {
      btnPagoHoy.disabled = true;
      try {
        await registrarPagoHoy(dniEdicion);
        container.querySelector('#f-fecha-pago').value = hoyISO();
        mostrarToast('Pago registrado con la fecha de hoy.');
      } catch (err) {
        mostrarError(err);
      } finally {
        btnPagoHoy.disabled = false;
      }
    });
  }

  container.querySelector('#btn-cancelar').addEventListener('click', () => {
    navegarA(esEdicion ? `/cliente/${dniEdicion}` : '/clientes');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const dni = esEdicion ? dniEdicion : Number(container.querySelector('#f-dni').value);
    const nombre = container.querySelector('#f-nombre').value.trim();
    const actividadId = Number(selActividad.value) || null;
    const precio = Number(inpPrecio.value);

    if (!dni || !nombre || !actividadId || !inpPrecio.value){
      mostrarToast('Completá DNI, nombre, actividad y precio.', { error: true });
      return;
    }

    const payload = {
      dni,
      nombre,
      telefono: inpTelefono.value.trim() || null,
      actividad_id: actividadId,
      precio,
      comentarios: container.querySelector('#f-comentarios').value.trim() || null,
      fecha_pago: container.querySelector('#f-fecha-pago').value || null,
      dias_credito: Number(container.querySelector('#f-dias-credito').value) || 0,
    };

    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';
    try {
      if (esEdicion){
        await actualizarCliente(dniEdicion, payload);
        mostrarToast('Cliente actualizado.');
      } else {
        await crearCliente(payload);
        mostrarToast('Cliente creado.');
      }
      setState({ clientes: [] }); // fuerza recarga de la lista con datos frescos
      navegarA(`/cliente/${dni}`);
    } catch (err) {
      mostrarError(err);
    } finally {
      btnGuardar.disabled = false;
      btnGuardar.textContent = 'Guardar';
    }
  });
}

function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}
function escapeAttr(str){
  return escapeHtml(str).replace(/"/g, '&quot;');
}
