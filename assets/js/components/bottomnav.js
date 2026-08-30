// ============================================================
// Milenium Gym — components/bottomnav.js
// Navegación principal de la gestión.
// ============================================================

import { icon } from './icons.js';

const TABS = [
  { id: 'movimientos',  label: 'Movimientos',   icono: 'movimientos', ruta: '/movimientos' },
  { id: 'clientes',     label: 'Socios',        icono: 'dumbbell',   ruta: '/clientes' },
  { id: 'actividades',  label: 'Actividades',   icono: 'lista',      ruta: '/actividades' },
  { id: 'estadisticas', label: 'Estadísticas',  icono: 'barChart',   ruta: '/estadisticas' },
];

export function renderBottomnav(root, tabActivo){
  root.innerHTML = TABS.map((t) => `
    <button type="button" class="nav-tab${t.id === tabActivo ? ' is-active' : ''}" data-ruta="${t.ruta}">
      ${icon(t.icono)}
      <span>${t.label}</span>
    </button>
  `).join('');

  root.querySelectorAll('.nav-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.location.hash = btn.dataset.ruta;
    });
  });
}
