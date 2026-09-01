// ============================================================
// Milenium Gym — views/clienteForm.js
// Alta y edición de clientes en un solo formulario. El corazón
// de esta vista es el campo PRECIO: se autocompleta como sugerencia
// al elegir ACTIVIDAD, siempre formateado como plata ($42.000). No
// es un campo de texto — es un botón: no se tipea, no se selecciona,
// un solo click lo confirma (naranja fuerte) y recién ahí se habilita
// Guardar. Elegir una actividad distinta vuelve a poner el precio
// como sugerencia sin confirmar.
//
// Lo cargado se guarda como borrador en el state (ver state.js)
// mientras se completa el form: si la persona sale de la vista y
// vuelve sin guardar, lo recupera tal cual lo dejó. El borrador
// solo se borra al guardar o al cancelar explícitamente — no se
// pierde por navegar, y como vive en memoria, un F5 real sí lo
// limpia (eso es lo esperado).
// ============================================================

import { listarActividades } from '../api/actividades.js';
import { obtenerCliente, crearCliente, actualizarCliente } from '../api/clientes.js';
import { icon } from '../components/icons.js';
import { elegirActividad } from '../components/pickerActividad.js';
import { mostrarError, mostrarToast } from '../utils/toast.js';
import { hoyISO, formatearPrecio } from '../utils/formato.js';
import { soloDigitos, soloTexto, soloTelefono, marcarError, limpiarErrores } from '../utils/validacion.js';
import { getState, setState, guardarBorrador, obtenerBorrador, borrarBorrador } from '../state.js';
import { navegarA } from '../router.js';

export async function renderClienteForm(container, params, { renderTopbar }){
  const dniEdicion = params.dni ? Number(params.dni) : null;
  const esEdicion = dniEdicion !== null;
  const esSoloDatos = esEdicion && params.modo === 'datos';
  const registrarPago = !esEdicion || !esSoloDatos;
  const clave = esEdicion
    ? `cliente-${esSoloDatos ? 'datos' : 'pago'}-${dniEdicion}`
    : 'cliente-nuevo';

  renderTopbar({
    title: !esEdicion ? 'Nuevo cliente' : (esSoloDatos ? 'Editar datos' : 'Registrar pago'),
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

  const borrador = obtenerBorrador(clave);

  const actividadDesdeBorrador = borrador?.actividadId
    ? actividades.find((a) => String(a.id) === borrador.actividadId)
    : null;
  const actividadInicial = actividadDesdeBorrador
    || (esEdicion ? actividades.find((a) => a.id === cliente.actividad_id) : null);

  const precioVigente = actividadInicial ? Number(actividadInicial.precio) : null;
  const transferenciaInicial = Boolean(
    borrador?.transferencia && actividadInicial && esActividadAparatos(actividadInicial)
  );

  // Borrador > dato guardado > default — en ese orden de prioridad.
  const valores = {
    dni: esEdicion
      ? (borrador?.dni || String(cliente.dni))
      : (borrador?.dni ?? ''),
    nombre: borrador?.nombre ?? (esEdicion ? cliente.nombre : ''),
    telefono: borrador?.telefono ?? (esEdicion ? (cliente.telefono || '') : ''),
    // En edición se propone siempre el precio vigente del catálogo. Así un
    // socio con una cuota histórica no puede guardarse otra vez con el monto
    // viejo por olvidar volver a elegir la misma actividad.
    precio: esEdicion
      ? formatearPrecio(calcularPrecio(precioVigente ?? cliente.precio, transferenciaInicial))
      : (actividadInicial
          ? formatearPrecio(calcularPrecio(precioVigente, transferenciaInicial))
          : (borrador?.precio ?? '')),
    comentarios: borrador?.comentarios ?? (esEdicion ? (cliente.comentarios || '') : ''),
    fechaPago: borrador?.fechaPago ?? (esEdicion ? (cliente.fecha_pago || '') : hoyISO()),
    diasCredito: actividadInicial?.dias_credito != null
      ? String(actividadInicial.dias_credito)
      : (borrador?.diasCredito ?? (esEdicion ? String(cliente.dias_credito ?? '') : '')),
  };

  container.innerHTML = `
    <form id="cliente-form" novalidate class="form-shell">
      <div class="form-shell-fields">

        <div class="form-field" ${esEdicion && !esSoloDatos ? 'hidden' : ''}>
          <label for="f-dni">DNI<span class="req">*</span></label>
          <input id="f-dni" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="10" autocomplete="off"
            value="${escapeAttr(valores.dni)}" required>
        </div>

        <div class="form-field" ${esEdicion && !esSoloDatos ? 'hidden' : ''}>
          <label for="f-nombre">Nombre<span class="req">*</span></label>
          <input id="f-nombre" type="text" autocomplete="off" value="${escapeAttr(valores.nombre)}" required>
        </div>

        <div class="form-field" ${esEdicion && !esSoloDatos ? 'hidden' : ''}>
          <label for="f-telefono">Teléfono<span class="req">*</span></label>
          <input id="f-telefono" type="tel" autocomplete="off" value="${escapeAttr(valores.telefono)}" required>
        </div>

        <div class="form-field" ${esSoloDatos ? 'hidden' : ''}>
          <label for="f-actividad-trigger">Actividad<span class="req">*</span></label>
          <button type="button" class="select-trigger" id="f-actividad-trigger">
            <span id="f-actividad-trigger-label" class="${actividadInicial ? '' : 'is-placeholder'}">${actividadInicial ? escapeHtml(actividadInicial.nombre) : 'Elegí una actividad'}</span>
            ${icon('chevronDown')}
          </button>
          <input type="hidden" id="f-actividad" value="${actividadInicial ? actividadInicial.id : ''}" required>
        </div>

        <div class="form-field precio-field" ${esSoloDatos ? 'hidden' : ''}>
          <label for="f-precio">Precio<span class="req">*</span></label>
          <input id="f-precio" type="text" readonly tabindex="-1" autocomplete="off" value="${escapeAttr(valores.precio)}" required>
          <label class="transferencia-check" id="transferencia-check" ${actividadInicial && esActividadAparatos(actividadInicial) ? '' : 'hidden'}>
            <input id="f-transferencia" type="checkbox" ${transferenciaInicial ? 'checked' : ''}>
            <span>Pago con transferencia (+10%)</span>
          </label>
        </div>

        <div class="form-field" ${esEdicion && !esSoloDatos ? 'hidden' : ''}>
          <label for="f-comentarios">Comentarios</label>
          <input id="f-comentarios" type="text" autocomplete="off" value="${escapeAttr(valores.comentarios)}">
        </div>

        <div class="form-row-2" ${esSoloDatos ? 'hidden' : ''}>
          <div class="form-field">
            <label for="f-fecha-pago">Fecha de pago<span class="req">*</span></label>
            <input id="f-fecha-pago" type="date" value="${escapeAttr(valores.fechaPago)}" required>
          </div>
          <div class="form-field">
            <label for="f-dias-credito">Días de crédito<span class="req">*</span></label>
            <input id="f-dias-credito" type="number" min="1" step="1" readonly tabindex="-1"
              value="${escapeAttr(valores.diasCredito)}" required>
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
  const inpDni = container.querySelector('#f-dni');
  const inpNombre = container.querySelector('#f-nombre');
  const inpActividad = container.querySelector('#f-actividad');
  const triggerActividad = container.querySelector('#f-actividad-trigger');
  const triggerActividadLabel = container.querySelector('#f-actividad-trigger-label');
  const inpPrecio = container.querySelector('#f-precio');
  const checkTransferencia = container.querySelector('#f-transferencia');
  const transferenciaHost = container.querySelector('#transferencia-check');
  const inpTelefono = container.querySelector('#f-telefono');
  const inpComentarios = container.querySelector('#f-comentarios');
  const inpFechaPago = container.querySelector('#f-fecha-pago');
  const inpDiasCredito = container.querySelector('#f-dias-credito');
  const btnGuardar = container.querySelector('#btn-guardar');

  let actividadElegida = actividadInicial || null;

  // --- Borrador: se guarda en cada cambio, se borra al guardar o
  // al cancelar. Así, salir de la vista y volver no pierde nada.
  function guardarBorradorActual(){
    guardarBorrador(clave, {
      dni: inpDni.value,
      nombre: inpNombre.value,
      telefono: inpTelefono.value,
      actividadId: inpActividad.value,
      precio: inpPrecio.value,
      transferencia: checkTransferencia.checked,
      comentarios: inpComentarios.value,
      fechaPago: inpFechaPago.value,
      diasCredito: inpDiasCredito.value,
    });
  }
  form.addEventListener('input', guardarBorradorActual);

  // --- Saneo de campos mientras se tipea ------------------------
  inpDni.addEventListener('input', () => { inpDni.value = soloDigitos(inpDni.value).slice(0, 10); });
  inpNombre.addEventListener('input', () => { inpNombre.value = soloTexto(inpNombre.value); });
  inpTelefono.addEventListener('input', () => { inpTelefono.value = soloTelefono(inpTelefono.value); });

  // --- Precio: no es un campo de texto, es un botón -------------
  // Al elegir actividad aparece la sugerencia con pinta de label,
  // apagada y centrada — no se tipea ni se selecciona, un solo click
  // la confirma y ahí se pone naranja fuerte y recién ahí se habilita
  // Guardar. Siempre arranca sin marcar (aunque ya traiga un valor
  // cargado, de un cliente existente o de un borrador): hay que
  // clickearla para poder guardar. Formateada como plata ($42.000)
  // siempre, en los dos estados.
  function marcarPrecioSugerido(){
    inpPrecio.classList.remove('is-confirmado');
    inpPrecio.classList.add('is-sugerido');
    actualizarEstadoGuardar();
  }
  function marcarPrecioConfirmado(){
    inpPrecio.classList.remove('is-sugerido');
    inpPrecio.classList.add('is-confirmado');
    actualizarEstadoGuardar();
  }
  function actualizarEstadoGuardar(){
    btnGuardar.disabled = registrarPago && inpPrecio.classList.contains('is-sugerido');
    if (inpFechaPago) inpFechaPago.disabled = esSoloDatos;
    if (triggerActividad) triggerActividad.disabled = esSoloDatos;
  }

  if (inpPrecio.value) marcarPrecioSugerido();

  function aplicarActividad(actividad, { forzarPrecio = false } = {}){
    const cambioDeActividad = !actividadElegida || !actividad || actividadElegida.id !== actividad.id;
    actividadElegida = actividad;
    const admiteTransferencia = actividad && esActividadAparatos(actividad);
    if (cambioDeActividad || !admiteTransferencia) checkTransferencia.checked = false;
    transferenciaHost.hidden = !admiteTransferencia;
    inpActividad.value = actividad ? actividad.id : '';
    triggerActividadLabel.textContent = actividad ? actividad.nombre : 'Elegí una actividad';
    triggerActividadLabel.classList.toggle('is-placeholder', !actividad);
    // Elegir explícitamente una actividad desde el popup vuelve a tomar
    // su precio vigente aunque sea la misma que el cliente ya tenía.
    if (actividad && (cambioDeActividad || forzarPrecio)){
      inpPrecio.value = formatearPrecio(calcularPrecio(actividad.precio, checkTransferencia.checked));
      marcarPrecioSugerido();
    }
    if (actividad){
      inpDiasCredito.value = actividad.dias_credito;
    }
    guardarBorradorActual(); // el hidden y el precio no disparan 'input' solos
  }

  triggerActividad.addEventListener('click', async () => {
    const elegida = await elegirActividad(actividades, actividadElegida?.id ?? null);
    if (elegida) aplicarActividad(elegida, { forzarPrecio: true });
  });

  // Un solo click confirma. El campo es readonly y no seleccionable
  // (ver components.css), así que no hay nada más que pueda pasar:
  // clicks de más, una vez confirmado, no hacen nada.
  inpPrecio.addEventListener('click', () => {
    if (esSoloDatos) return;
    if (!inpPrecio.classList.contains('is-sugerido')) return;
    marcarPrecioConfirmado();
    inpPrecio.blur();
    guardarBorradorActual();
  });

  checkTransferencia.addEventListener('change', () => {
    if (!actividadElegida || !esActividadAparatos(actividadElegida)) return;
    inpPrecio.value = formatearPrecio(
      calcularPrecio(actividadElegida.precio, checkTransferencia.checked)
    );
    marcarPrecioSugerido();
    guardarBorradorActual();
  });

  container.querySelector('#btn-cancelar').addEventListener('click', () => {
    borrarBorrador(clave);
    navegarA(esEdicion ? `/cliente/${dniEdicion}` : '/clientes');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    limpiarErrores(container);

    const dniLimpio = inpDni.value.trim();
    const dni = Number(dniLimpio);
    const nombre = inpNombre.value.trim();
    const telefono = inpTelefono.value.trim();
    const actividadId = Number(inpActividad.value) || null;
    // El precio siempre se muestra formateado como plata ("$42.000")
    // — se limpia antes de mandarlo a Supabase.
    const precio = Number(inpPrecio.value.replace(/[^0-9]/g, ''));
    const fechaPago = inpFechaPago.value;
    const diasCredito = inpDiasCredito.value;

    let huboError = false;
    const marcar = (el, msg) => { marcarError(el, msg); huboError = true; };

    if (!dniLimpio) marcar(inpDni, 'El DNI es obligatorio.');
    else if (!/^[0-9]{1,10}$/.test(dniLimpio)) marcar(inpDni, 'Solo números, hasta 10 dígitos.');
    if (!nombre) marcar(inpNombre, 'El nombre es obligatorio.');
    if (!telefono) marcar(inpTelefono, 'El teléfono es obligatorio.');
    if (registrarPago && !actividadId) marcar(triggerActividad, 'Elegí una actividad.');
    if (registrarPago && (!inpPrecio.value || !(precio > 0))) marcar(inpPrecio, 'El precio es obligatorio.');
    if (registrarPago && !fechaPago) marcar(inpFechaPago, 'La fecha de pago es obligatoria.');
    if (registrarPago && !diasCredito) marcar(inpDiasCredito, 'Los días de crédito son obligatorios.');

    if (huboError){
      mostrarToast('Revisá los campos marcados en rojo.', { error: true });
      return;
    }

    const payload = {
      dni,
      nombre,
      telefono,
      actividad_id: actividadId,
      precio,
      comentarios: inpComentarios.value.trim() || null,
      fecha_pago: fechaPago,
      dias_credito: Number(diasCredito),
    };

    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';
    try {
      if (esEdicion){
        await actualizarCliente(dniEdicion, payload, { registrarPago });
        mostrarToast(registrarPago ? 'Pago registrado.' : 'Datos del cliente actualizados.');
      } else {
        await crearCliente(payload);
        mostrarToast('Cliente creado.');
      }
      borrarBorrador(clave);
      setState({ clientes: [] }); // fuerza recarga de la lista con datos frescos
      navegarA(`/cliente/${dni}`);
    } catch (err) {
      mostrarError(err);
    } finally {
      btnGuardar.textContent = 'Guardar';
      actualizarEstadoGuardar();
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

function esActividadAparatos(actividad){
  return actividad?.nombre?.toLocaleLowerCase('es-AR').includes('aparatos');
}

function calcularPrecio(precioBase, conTransferencia){
  const base = Number(precioBase) || 0;
  return conTransferencia ? Math.round(base * 1.10) : base;
}
