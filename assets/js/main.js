// ============================================================
// Milenium Gym — main.js
// Punto de entrada. Se carga como <script type="module">, así
// que todos los imports de arriba se resuelven antes de correr
// esto, sin necesidad de bundler.
// ============================================================

import { obtenerSesionActual, onCambioAuth } from './auth.js';
import { iniciarRouter, refrescarRuta } from './router.js';

async function iniciar(){
  const sesionInicial = await obtenerSesionActual();
  iniciarRouter();

  // Si la sesión expira (o se cierra en otra pestaña), el router
  // decide solo si hay que mandar a /login.
  //
  // Ojo: Supabase dispara este evento también cuando renueva el token
  // (TOKEN_REFRESHED) y cuando la pestaña vuelve a estar visible
  // (SIGNED_IN repetido). Con la app abierta 24/7 eso pasaba al volver
  // a la pestaña después de un rato (~1 h, lo que dura el token) y se
  // volvía a montar la vista entera en medio del uso: se pisaban la
  // topbar y el buscador y había que hacer F5. Por eso solo se refresca
  // cuando de verdad cambia "hay sesión / no hay sesión".
  let teniaSesion = Boolean(sesionInicial);
  onCambioAuth((session) => {
    const tieneSesion = Boolean(session);
    if (tieneSesion === teniaSesion) return;
    teniaSesion = tieneSesion;
    // Fuera del callback: Supabase recomienda no llamar a su propia
    // API (y las vistas lo hacen al montarse) desde adentro del evento.
    setTimeout(() => refrescarRuta(), 0);
  });
}

iniciar();
