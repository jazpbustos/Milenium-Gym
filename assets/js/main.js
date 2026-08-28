// ============================================================
// Milenium Gym — main.js
// Punto de entrada. Se carga como <script type="module">, así
// que todos los imports de arriba se resuelven antes de correr
// esto, sin necesidad de bundler.
// ============================================================

import { obtenerSesionActual, onCambioAuth } from './auth.js';
import { iniciarRouter, refrescarRuta } from './router.js';

async function iniciar(){
  await obtenerSesionActual();
  iniciarRouter();

  // Si la sesión expira (o se cierra en otra pestaña), el router
  // decide solo si hay que mandar a /login.
  onCambioAuth(() => refrescarRuta());
}

iniciar();
