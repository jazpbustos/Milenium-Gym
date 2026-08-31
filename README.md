# Milenium Gym — Gestión

App de gestión de clientes para **Milenium Centro de Entrenamiento**. Incluye socios, historial de movimientos, actividades y estadísticas, con Supabase como base y HTML/CSS/JS plano — sin build, sin framework.

Comparte base de datos con [Check-in-Milenium](../Check-in-Milenium): las dos apps leen y escriben la misma fuente en Supabase, así que un pago cargado acá se ve al instante en la tablet de la entrada.

## Cómo está armado

Sin bundler ni npm: el navegador importa los módulos ES directo (`<script type="module">`). Cada archivo hace una sola cosa:

```
assets/
  css/
    tokens.css       → paleta, tipografía, espaciado (todo sale de acá)
    base.css         → reset
    layout.css       → topbar / bottomnav / login
    components.css   → botones, FAB, tabla, deck, formulario, toast
    views.css        → detalles puntuales (gráfico, modal de confirmación)
  js/
    config.js          → URL y anon key de Supabase, constantes compartidas
    supabaseClient.js  → instancia única del cliente
    auth.js             → login / logout / sesión
    state.js            → store mínimo (sesión, cache y filtros)
    router.js            → ruteo por hash, sin librería
    main.js               → arranque
    api/
      clientes.js       → toda la lectura/escritura de CLIENTES
      pagos.js          → lectura del historial de PAGOS
      actividades.js    → toda la lectura/escritura de ACTIVIDADES
      estadisticas.js   → conteo de clientes por actividad
    components/
      topbar.js, bottomnav.js, icons.js, tablaClientes.js
    views/
      login.js, clientesList.js, movimientos.js, clienteDetail.js,
      clienteForm.js, actividades.js, estadisticas.js
    utils/
      formato.js (fechas/precio/estado), telefono.js, whatsapp.js,
      toast.js, confirm.js
sql/
  schema_actual.sql         → estructura consolidada, sin datos
  README.md                 → reglas para cambios nuevos
```

Ninguna vista llama a Supabase directo: siempre pasa por `api/`. Así, el día que quieras cambiar de backend, tocás dos archivos y no quince.

## Puesta en marcha

### 1. Crear el proyecto en Supabase

En [supabase.com](https://supabase.com), creá un proyecto nuevo (plan gratuito alcanza para empezar).

### 2. Correr el SQL

Para una base completamente nueva, ejecutá `sql/schema_actual.sql`. No lo ejecutes sobre producción: esa base ya tiene la estructura aplicada. Las reglas para cambios futuros están en [`sql/README.md`](sql/README.md).

### 3. Crear los usuarios

`Authentication → Users → Add user`, uno para vos y uno para el dueño del gym. Con email + contraseña alcanza. **No hay pantalla de registro** en la app a propósito: así nadie más se puede crear una cuenta sola.

### 4. Configurar la app

Abrí `assets/js/config.js` y completá:

```js
export const SUPABASE_URL = 'https://tu-proyecto.supabase.co';
export const SUPABASE_ANON_KEY = 'tu-anon-key';
```

Las dos las encontrás en `Project Settings → API` de tu proyecto de Supabase. La anon key es pública por diseño — lo que protege los datos es RLS (paso 2.3), no ocultar esta clave.

### 5. Correrla

Como usa `<script type="module">`, **no la abras con doble clic** (el navegador bloquea los imports por CORS cuando el archivo se abre como `file://`). Serví la carpeta con cualquier servidor local, por ejemplo:

```bash
# con Python (ya viene instalado en la mayoría de los sistemas)
python -m http.server 8080

# o con Node
npx serve .
```

Y abrís `http://localhost:8080`.

### 6. Deploy

Sin build, cualquier hosting estático sirve: [Netlify](https://netlify.com) (arrastrar la carpeta) o GitHub Pages (activarlo en la configuración del repo). No hace falta configurar nada especial — es HTML/CSS/JS plano.

## Conectar el check-in

El check-in consulta la función `buscar_socio` incluida en `sql/schema_actual.sql`:

```js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const { data, error } = await supabase.rpc('buscar_socio', { p_dni: Number(dni) });
// data es un array; data[0] trae { nombre, fecha_pago, fecha_vencimiento }
```

El resto del archivo (cálculo de días, colores, auto-reset) no cambia.

## Decisiones que vale la pena conocer

- **El precio se guarda en cada cliente**, no se recalcula solo contra `actividades.precio`. Al elegir la actividad en el formulario, el precio se autocompleta como sugerencia (`views/clienteForm.js`); en cuanto tocás el campo, deja de pisarse. Así un precio pactado con un socio no se borra si después le cambiás la actividad.
- **ESTADO no es una columna**: se calcula en la vista `v_clientes` contra la fecha de hoy en cada consulta (`sql/schema_actual.sql`). Guardarlo como columna lo dejaría congelado en la fecha en que se escribió.
- **Eliminar archiva y libera el DNI**: el cliente deja de aparecer en Socios y su DNI se puede reutilizar. La fila interna permanece asociada a sus pagos mediante `cliente_id`, por lo que el historial no se mezcla ni se borra.
- **Las deudas se consultan dentro de Socios**: el filtro `Con deuda` muestra `estado < 0`, y la tabla conserva el orden ascendente/descendente habitual.
- **Los pagos tienen historial propio**: `pagos` conserva importe, actividad, crédito y vencimiento de cada movimiento. `clientes.fecha_pago` sigue guardando el último pago para que ESTADO y el check-in sean rápidos.

## Favicon

El ícono de pestaña no es la foto del logo (un wordmark de 512×159 no se lee en 16px) — es una mancuerna generada por `scripts/make_favicon.py` con Pillow, fondo naranja y trazo oscuro, mismo lenguaje visual que el ícono de la pestaña "Milenium Gym" del bottom nav. Si en algún momento cambia el naranja de marca, se regenera con:

```bash
pip install pillow --break-system-packages
python3 scripts/make_favicon.py
```

## Pendientes conocidos

- Backup: el plan gratuito de Supabase no tiene point-in-time recovery. Conviene un export periódico a CSV hasta que se pase a un plan pago.
- El umbral de "por vencer" (3 días) está en `config.js`, alineado con el mismo umbral del check-in — si lo cambiás, cambialo en los dos lados.
- La normalización de teléfono es una heurística (`utils/telefono.js`): el código de área argentino tiene largo variable, así que ante la duda te muestra el resultado para que lo confirmes, no lo fuerza en silencio.
