// ============================================================
// Milenium Gym — views/actividadForm.js
// Alta y edición de actividades como página completa, con el
// mismo formato que "Nuevo cliente" (topbar con flecha atrás,
// columna centrada, barra de Cancelar/Guardar abajo) — ya no un
// popup chico.
//
// Mismo criterio que clienteForm.js: lo tipeado se guarda como
// borrador mientras se completa el form (ver state.js) y solo se
// borra al guardar o cancelar — no se pierde por navegar, solo
// con un F5 real.
//
// Nota sobre "nombre": no se restringe a solo letras. Actividades
// reales de este gimnasio incluyen números y paréntesis en el
// nombre (ej. "HIFT X2", "COMBO X2 (apa + cross)", "3 semanas
// aparatos"), así que un filtro solo-texto rompería esos casos.
// Sigue siendo obligatorio, eso sí.
// ============================================================

import { listarActividades, crearActividad, actualizarActividad } from '../api/actividades.js';
import { precioParaInput } from '../utils/formato.js';
import { mostrarError, mostrarToast } from '../utils/toast.js';
import { soloDecimal, soloDigitos, marcarError, limpiarErrores } from '../utils/validacion.js';
import { getState, setState, guardarBorrador, obtenerBorrador, borrarBorrador } from '../state.js';
import { navegarA } from '../router.js';

export async function renderActividadForm(container, params, { renderTopbar }){
  const idEdicion = params.id ? Number(params.id) : null;
  const esEdicion = idEdicion !== null;
  const clave = esEdicion ? `actividad-editar-${idEdicion}` : 'actividad-nueva';

  renderTopbar({
    title: esEdicion ? 'Editar actividad' : 'Nueva actividad',
    onBack: () => navegarA('/actividades'),
  });

  container.innerHTML = `<div class="loading-bar"></div>`;

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

  let actividad = null;
  if (esEdicion){
    actividad = actividades.find((a) => a.id === idEdicion) || null;
    if (!actividad){
      container.innerHTML = `<div class="estado-vacio"><p>No encontramos esta actividad.</p></div>`;
      return;
    }
  }

  const borrador = obtenerBorrador(clave);
  const valores = {
    nombre: borrador?.nombre ?? (esEdicion ? actividad.nombre : ''),
    precio: borrador?.precio ?? (esEdicion ? precioParaInput(actividad.precio) : ''),
    diasCredito: borrador?.diasCredito ?? (esEdicion ? String(actividad.dias_credito) : '30'),
  };

  container.innerHTML = `
    <form id="actividad-form" novalidate class="form-shell">
      <div class="form-shell-fields">

        <div class="form-field">
          <label for="f-nombre">Nombre<span class="req">*</span></label>
          <input id="f-nombre" type="text" autocomplete="off" value="${escapeAttr(valores.nombre)}" required>
        </div>

        <div class="form-field precio-field">
          <label for="f-precio">Precio<span class="req">*</span></label>
          <input id="f-precio" type="text" inputmode="decimal" autocomplete="off"
            value="${escapeAttr(valores.precio)}" required>
        </div>

        <div class="form-field">
          <label for="f-dias-credito">Días de crédito<span class="req">*</span></label>
          <input id="f-dias-credito" type="number" inputmode="numeric" min="1" step="1"
            value="${escapeAttr(valores.diasCredito)}" required>
        </div>

      </div>

      <div class="form-actions-bar">
        <button type="button" class="btn btn-ghost" id="btn-cancelar">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="btn-guardar">Guardar</button>
      </div>
    </form>
  `;

  const form = container.querySelector('#actividad-form');
  const inpNombre = container.querySelector('#f-nombre');
  const inpPrecio = container.querySelector('#f-precio');
  const inpDiasCredito = container.querySelector('#f-dias-credito');
  const btnGuardar = container.querySelector('#btn-guardar');

  // --- Borrador: se guarda en cada cambio, se borra al guardar o
  // al cancelar. Así, salir de la vista y volver no pierde nada.
  function guardarBorradorActual(){
    guardarBorrador(clave, {
      nombre: inpNombre.value,
      precio: inpPrecio.value,
      diasCredito: inpDiasCredito.value,
    });
  }
  form.addEventListener('input', guardarBorradorActual);

  // --- Saneo de campos mientras se tipea ------------------------
  inpPrecio.addEventListener('input', () => { inpPrecio.value = soloDecimal(inpPrecio.value); });
  inpDiasCredito.addEventListener('input', () => { inpDiasCredito.value = soloDigitos(inpDiasCredito.value); });

  container.querySelector('#btn-cancelar').addEventListener('click', () => {
    borrarBorrador(clave);
    navegarA('/actividades');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    limpiarErrores(container);

    const nombre = inpNombre.value.trim();
    const precio = Number(inpPrecio.value);
    const diasCredito = Number(inpDiasCredito.value);

    let huboError = false;
    const marcar = (el, msg) => { marcarError(el, msg); huboError = true; };

    if (!nombre) marcar(inpNombre, 'El nombre es obligatorio.');
    if (!inpPrecio.value || !(precio > 0)) marcar(inpPrecio, 'El precio es obligatorio.');
    if (!Number.isInteger(diasCredito) || diasCredito < 1) marcar(inpDiasCredito, 'Ingresá al menos 1 día.');

    if (huboError){
      mostrarToast('Revisá los campos marcados en rojo.', { error: true });
      return;
    }

    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';
    try {
      if (esEdicion){
        await actualizarActividad(idEdicion, { nombre, precio, dias_credito: diasCredito });
        mostrarToast('Actividad actualizada.');
      } else {
        await crearActividad({ nombre, precio, dias_credito: diasCredito });
        mostrarToast('Actividad creada.');
      }
      borrarBorrador(clave);
      setState({ actividades: [] }); // fuerza recarga con datos frescos
      navegarA('/actividades');
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
