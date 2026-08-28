// ============================================================
// Milenium Gym — components/bottomnav.js
// Los mismos 4 tabs que la app de AppSheet (DEUDAS, MILENIUM GYM,
// ACTIVIDADES, ESTADISTICAS), mismos íconos, con el naranja del
// gimnasio en vez del amarillo de AppSheet para marcar el activo.
// ============================================================

import { icon } from './icons.js';

const TABS = [
  { id: 'deudas',       label: 'Deudas',        icono: 'caraTriste', ruta: '/deudas' },
  { id: 'clientes',     label: 'Milenium Gym',  icono: 'dumbbell',   ruta: '/clientes' },
  { id: 'actividades',  label: 'Actividades',   icono: 'barChart',   ruta: '/actividades' },
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
