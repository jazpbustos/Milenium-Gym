// ============================================================
// Milenium Gym — components/topbar.js
// Barra superior genérica. Cada vista le pide la combinación que
// necesita: logo+título con acciones (listas) o flecha atrás con
// acciones (detalle/formulario) — el mismo patrón que se ve en
// AppSheet (Details / Form siempre con flecha atrás a la izq).
//
// El buscador (opcional, vía `buscador`) vive DENTRO de esta misma
// barra: al tocar la lupa, el título se esconde y en su lugar
// aparece el campo de búsqueda — no una barra aparte debajo.
// ============================================================

import { icon } from './icons.js';

/**
 * @param {HTMLElement} root
 * @param {{
 *   title: string,
 *   onBack?: () => void,
 *   actions?: Array<{ icono: string, onClick: () => void, titulo?: string, claseExtra?: string }>,
 *   buscador?: { placeholder?: string, onBuscar: (texto: string) => void }
 * }} opts
 */
export function renderTopbar(root, opts){
  const { title, onBack, actions = [], buscador } = opts;

  const izquierda = onBack
    ? `<button type="button" class="icon-btn" id="tb-back" title="Volver">${icon('volver')}</button>`
    : `<img class="topbar-logo" src="assets/img/logomile.jpg" alt="">`;

  root.innerHTML = `
    ${izquierda}
    <p class="topbar-title" id="tb-title">${title}</p>
    ${buscador ? `
      <div class="topbar-search" id="tb-search" hidden>
        ${icon('buscar')}
        <input type="text" id="tb-search-input" autocomplete="off" placeholder="${buscador.placeholder || 'Buscar...'}">
        <button type="button" class="icon-btn" id="tb-search-clear" title="Limpiar">${icon('cerrar')}</button>
      </div>
    ` : ''}
    <div class="topbar-actions">
      ${buscador ? `<button type="button" class="icon-btn" id="tb-search-toggle" title="Buscar">${icon('buscar')}</button>` : ''}
      ${actions.map((a, i) => `
        <button type="button" class="icon-btn ${a.claseExtra || ''}" data-idx="${i}" title="${a.titulo || ''}">
          ${icon(a.icono)}
        </button>
      `).join('')}
    </div>
  `;

  if (onBack) root.querySelector('#tb-back').addEventListener('click', onBack);

  root.querySelectorAll('.topbar-actions [data-idx]').forEach((btn) => {
    const a = actions[Number(btn.dataset.idx)];
    btn.addEventListener('click', a.onClick);
  });

  if (buscador){
    const tituloEl = root.querySelector('#tb-title');
    const searchWrap = root.querySelector('#tb-search');
    const searchInput = root.querySelector('#tb-search-input');
    const toggleBtn = root.querySelector('#tb-search-toggle');
    const clearBtn = root.querySelector('#tb-search-clear');

    toggleBtn.addEventListener('click', () => {
      const abrir = searchWrap.hidden;
      searchWrap.hidden = !abrir;
      tituloEl.hidden = abrir;
      if (abrir){
        searchInput.focus();
      } else {
        searchInput.value = '';
        buscador.onBuscar('');
      }
    });

    searchInput.addEventListener('input', () => buscador.onBuscar(searchInput.value));

    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      buscador.onBuscar('');
      searchInput.focus();
    });
  }
}
