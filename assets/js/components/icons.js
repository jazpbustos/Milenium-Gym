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

  barChart: () => base('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),

  lista: () => base('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>'),

  arrastrar: () => base('<circle cx="9" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.3" fill="currentColor" stroke="none"/>'),

  buscar: () => base('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),

  flecha: () => base('<path d="M9 6l6 6-6 6"/>'),
  flechaIzq: () => base('<path d="M15 6l-6 6 6 6"/>'),
  volver: () => base('<path d="M15 6l-6 6 6 6"/>'),

  telefono: () => base('<path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1.2 1.2 0 0 1 1.2-.3c1.3.4 2.7.6 4.1.6a1.2 1.2 0 0 1 1.2 1.2v3.6A1.2 1.2 0 0 1 20.7 21C10.9 21 3 13.1 3 3.3A1.2 1.2 0 0 1 4.2 2h3.6A1.2 1.2 0 0 1 9 3.2c0 1.4.2 2.8.6 4.1a1.2 1.2 0 0 1-.3 1.2z"/>'),

  whatsapp: () => base('<path d="M6.5 17.5 5 21l3.6-1.4A8.5 8.5 0 1 0 5.5 15z"/><path d="M9 9.5c0 3.3 2.7 6 6 6 .5 0 .8-.5.6-1l-1-2a.7.7 0 0 0-.9-.3l-1 .4a5 5 0 0 1-2.3-2.3l.4-1a.7.7 0 0 0-.3-.9l-2-1c-.5-.2-1 .1-1 .6z"/>', '0 0 22 22'),

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
