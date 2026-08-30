// ============================================================
// Milenium Gym — components/icons.js
// SVGs inline como funciones que devuelven markup. Nada de un
// ícono-font ni de un paquete de terceros para esto: son diez
// trazos simples y así queda sin dependencias ni requests extra.
// stroke="currentColor" para heredar el color por CSS.
// ============================================================

const base = (inner, viewBox = '0 0 24 24') =>
  `<svg viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

export const iconos = {
  dumbbell: () => base('<path d="M6.5 7v10M17.5 7v10M3 10v4M21 10v4M6.5 12h11"/>'),

  caraTriste: () => base('<circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01M8.5 16c1-1.3 2.2-2 3.5-2s2.5.7 3.5 2"/>'),

  movimientos: () => base('<path d="M4 7h16M4 12h16M4 17h10"/><path d="M17 15l3 2-3 2"/>'),

  barChart: () => base('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),

  lista: () => base('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>'),

  arrastrar: () => base('<circle cx="9" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.3" fill="currentColor" stroke="none"/>'),

  buscar: () => base('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),

  flecha: () => base('<path d="M9 6l6 6-6 6"/>'),
  flechaIzq: () => base('<path d="M15 6l-6 6 6 6"/>'),
  volver: () => base('<path d="M15 6l-6 6 6 6"/>'),

  telefono: () => base('<path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1.2 1.2 0 0 1 1.2-.3c1.3.4 2.7.6 4.1.6a1.2 1.2 0 0 1 1.2 1.2v3.6A1.2 1.2 0 0 1 20.7 21C10.9 21 3 13.1 3 3.3A1.2 1.2 0 0 1 4.2 2h3.6A1.2 1.2 0 0 1 9 3.2c0 1.4.2 2.8.6 4.1a1.2 1.2 0 0 1-.3 1.2z"/>'),

  // Relleno sólido (no el trazo de las demás), como el logo real —
  // con stroke fino quedaba una mancha ilegible a 15-20px.
  whatsapp: () =>
    '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.35 5.09L2 22l5.09-1.33A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm5.2 13.9c-.22.62-1.28 1.19-1.77 1.24-.45.05-.9.23-3.03-.63-2.56-1.03-4.2-3.63-4.33-3.8-.13-.17-1.03-1.37-1.03-2.6 0-1.23.65-1.84.88-2.09.22-.24.5-.3.66-.3.17 0 .33 0 .48.01.15.01.36-.06.56.43.22.53.73 1.83.8 1.96.06.13.1.28.02.45-.08.17-.13.28-.25.43-.13.15-.27.34-.38.46-.13.13-.26.28-.11.54.15.27.68 1.12 1.46 1.81 1 .89 1.85 1.17 2.11 1.3.27.13.42.11.58-.07.15-.17.65-.76.83-1.02.17-.27.35-.22.58-.13.24.09 1.51.71 1.77.84.27.13.44.2.5.31.07.12.07.68-.15 1.3z"/></svg>',

  lapiz: () => base('<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19 3 20l1-4z"/>'),

  tacho: () => base('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>'),

  mas: () => base('<path d="M12 5v14M5 12h14"/>'),

  cerrar: () => base('<path d="M6 6l12 12M18 6L6 18"/>'),

  refrescar: () => base('<path d="M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16M3 21v-5h5"/>'),

  salir: () => base('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'),

  chevronDown: () => base('<path d="M6 9l6 6 6-6"/>'),

  calendario: () => base('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>'),
};

export function icon(nombre, extraClass = ''){
  const fn = iconos[nombre];
  if (!fn) return '';
  return extraClass ? fn().replace('<svg ', `<svg class="${extraClass}" `) : fn();
}
