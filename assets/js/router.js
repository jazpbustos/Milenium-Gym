// ============================================================
// Milenium Gym — router.js
// Ruteo por hash, sin librería: la app tiene un puñado de
// pantallas fijas, no vale la pena sumar una dependencia para
// esto. Cada ruta declara qué vista monta y cómo se ve el marco
// (topbar/bottomnav) alrededor de ella.
// ============================================================

import { getState } from './state.js';
import { renderTopbar } from './components/topbar.js';
import { renderBottomnav } from './components/bottomnav.js';

import { renderLogin } from './views/login.js';
import { renderClientesList } from './views/clientesList.js';
import { renderDeudasList } from './views/deudasList.js';
import { renderActividades } from './views/actividades.js';
import { renderEstadisticas } from './views/estadisticas.js';
import { renderClienteDetail } from './views/clienteDetail.js';
import { renderClienteForm } from './views/clienteForm.js';
import { renderActividadForm } from './views/actividadForm.js';

const viewRoot = document.getElementById('view-root');
const topbarRoot = document.getElementById('topbar');
const bottomnavRoot = document.getElementById('bottomnav');

let cleanupActual = null;

// Cada ruta: patrón con :params, tab activo (o null si no aplica),
// y la función de render de la vista.
const rutas = [
  { patron: '/login',                render: renderLogin,        tab: null,             nav: false, topbar: false },
  { patron: '/clientes',             render: renderClientesList, tab: 'clientes',        nav: true,  topbar: true  },
  { patron: '/deudas',               render: renderDeudasList,   tab: 'deudas',          nav: true,  topbar: true  },
  { patron: '/actividades',          render: renderActividades,  tab: 'actividades',     nav: true,  topbar: true  },
  { patron: '/estadisticas',         render: renderEstadisticas, tab: 'estadisticas',    nav: true,  topbar: true  },
  { patron: '/cliente/nuevo',        render: renderClienteForm,  tab: null,              nav: false, topbar: true  },
  { patron: '/cliente/:dni',         render: renderClienteDetail,tab: null,              nav: false, topbar: true  },
  { patron: '/cliente/:dni/editar',  render: renderClienteForm,  tab: null,              nav: false, topbar: true  },
  { patron: '/actividad/nueva',      render: renderActividadForm,tab: null,              nav: false, topbar: true  },
  { patron: '/actividad/:id/editar', render: renderActividadForm,tab: null,              nav: false, topbar: true  },
];

function matchRuta(hash){
  const path = hash.replace(/^#/, '') || '/clientes';
  const partesPath = path.split('/').filter(Boolean);

  for (const ruta of rutas){
    const partesPatron = ruta.patron.split('/').filter(Boolean);
    if (partesPatron.length !== partesPath.length) continue;

    const params = {};
    let ok = true;
    for (let i = 0; i < partesPatron.length; i++){
      const p = partesPatron[i];
      if (p.startsWith(':')){
        params[p.slice(1)] = decodeURIComponent(partesPath[i]);
      } else if (p !== partesPath[i]){
        ok = false;
        break;
      }
    }
    if (ok) return { ruta, params };
  }
  return null;
}

export function navegarA(path){
  window.location.hash = path;
}

async function resolver(){
  const match = matchRuta(window.location.hash);
  const { session } = getState();

  // Guard de autenticación: sin sesión, todo cae a /login.
  if (!session && (!match || match.ruta.patron !== '/login')){
    if (window.location.hash !== '#/login') { navegarA('/login'); return; }
  }
  if (session && match && match.ruta.patron === '/login'){
    navegarA('/clientes');
    return;
  }

  const resuelto = match || { ruta: rutas.find(r => r.patron === '/clientes'), params: {} };
  const { ruta, params } = resuelto;

  if (typeof cleanupActual === 'function'){
    try { cleanupActual(); } catch (_e) { /* no-op */ }
    cleanupActual = null;
  }

  bottomnavRoot.style.display = ruta.nav ? '' : 'none';
  renderBottomnav(bottomnavRoot, ruta.tab);

  topbarRoot.style.display = ruta.topbar ? '' : 'none';

  viewRoot.scrollTop = 0;
  viewRoot.innerHTML = '';
  const contenedor = document.createElement('div');
  contenedor.className = 'view';
  viewRoot.appendChild(contenedor);

  try {
    const resultado = await ruta.render(contenedor, params, { renderTopbar: (opts) => renderTopbar(topbarRoot, opts) });
    if (typeof resultado === 'function') cleanupActual = resultado;
  } catch (err) {
    console.error('Error renderizando vista', ruta.patron, err);
    contenedor.innerHTML = `<div class="estado-vacio"><p>Ocurrió un error cargando esta pantalla. Probá recargar.</p></div>`;
  }
}

export function iniciarRouter(){
  window.addEventListener('hashchange', resolver);
  resolver();
}

export function refrescarRuta(){
  resolver();
}
