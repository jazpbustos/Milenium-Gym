// ============================================================
// Milenium Gym — views/login.js
// Pantalla completa, sin topbar ni bottomnav — mismo criterio
// visual que la pantalla de bienvenida del check-in. Sin registro:
// los 2-3 usuarios se crean a mano desde el panel de Supabase.
// ============================================================

import { iniciarSesion } from '../auth.js';
import { navegarA } from '../router.js';

export function renderLogin(container){
  container.innerHTML = `
    <div class="login-screen">
      <img class="login-logo" src="assets/img/logomile.jpg" alt="Milenium Centro de Entrenamiento">
      <p class="login-title">Panel de Gestión</p>
      <form class="login-form" id="login-form" novalidate>
        <div class="form-field">
          <label for="login-email">Email</label>
          <input id="login-email" type="email" autocomplete="username" required>
        </div>
        <div class="form-field">
          <label for="login-pass">Contraseña</label>
          <input id="login-pass" type="password" autocomplete="current-password" required>
        </div>
        <p class="login-error" id="login-error" role="alert"></p>
        <button type="submit" class="btn btn-primary btn-block" id="login-submit">Ingresar</button>
      </form>
    </div>
  `;

  const form = container.querySelector('#login-form');
  const errorEl = container.querySelector('#login-error');
  const submitBtn = container.querySelector('#login-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Ingresando...';

    const email = container.querySelector('#login-email').value.trim();
    const password = container.querySelector('#login-pass').value;

    try {
      await iniciarSesion(email, password);
      navegarA('/clientes');
    } catch (err) {
      errorEl.textContent = err.message === 'Invalid login credentials'
        ? 'Email o contraseña incorrectos.'
        : 'No se pudo iniciar sesión. Probá de nuevo.';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Ingresar';
    }
  });
}
