// ============================================================
// Milenium Gym — components/topbar.js
// Barra superior genérica. Cada vista le pide la combinación que
// necesita: logo+título con acciones (listas) o flecha atrás con
// acciones (detalle/formulario) — el mismo patrón que se ve en
// AppSheet (Details / Form siempre con flecha atrás a la izq).
// ============================================================

import { icon } from './icons.js';

/**
 * @param {HTMLElement} root
 * @param {{
 *   title: string,
 *   onBack?: () => void,
 *   actions?: Array<{ icono: string, onClick: () => void, titulo?: string, claseExtra?: string }>
 * }} opts
 */
export function renderTopbar(root, opts){
  const { title, onBack, actions = [] } = opts;

  const izquierda = onBack
    ? `<button type="button" class="icon-btn" id="tb-back" title="Volver">${icon('volver')}</button>`
    : `<img class="topbar-logo" src="assets/img/logomile.jpg" alt="">`;

  root.innerHTML = `
    ${izquierda}
    <p class="topbar-title">${title}</p>
    <div class="topbar-spacer"></div>
    <div class="topbar-actions">
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
}
