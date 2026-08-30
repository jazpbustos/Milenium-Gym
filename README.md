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
  01_schema.sql, 02_vistas.sql, 03_rls.sql, 04_rpc_checkin.sql,
  05_seed_actividades.sql, 06_agregar_orden_actividades.sql,
  07_historial_pagos.sql    → correr en ese orden, una sola vez
```

Ninguna vista llama a Supabase directo: siempre pasa por `api/`. Así, el día que quieras cambiar de backend, tocás dos archivos y no quince.

## Puesta en marcha

### 1. Crear el proyecto en Supabase

En [supabase.com](https://supabase.com), creá un proyecto nuevo (plan gratuito alcanza para empezar).

### 2. Correr el SQL

`Panel de Supabase → SQL Editor`, y pegá el contenido de cada archivo de `sql/`, **en orden**, uno por uno:

1. `01_schema.sql` — tablas CLIENTES y ACTIVIDADES
2. `02_vistas.sql` — vistas calculadas (ESTADO, DEUDORES, estadísticas)
3. `03_rls.sql` — seguridad: sin esto, cualquiera con la URL del proyecto podría leer o escribir todo
4. `04_rpc_checkin.sql` — la función que va a usar el check-in de la tablet
5. `05_seed_actividades.sql` (opcional) — carga actividades de ejemplo
6. `06_agregar_orden_actividades.sql` — agrega el orden manual si la base ya existía
7. `07_historial_pagos.sql` — crea el historial y registra automáticamente los pagos nuevos

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

## Migrar los datos desde AppSheet

1. Exportá `ACTIVIDADES` y `CLIENTES` desde tu Google Sheet actual a CSV.
2. En Supabase, `Table Editor → clientes/actividades → Insert → Import from CSV`, o subilos a una tabla de staging y limpiá desde el SQL Editor si hay inconsistencias de nombres de actividad.
3. Antes de dar de baja AppSheet, revisá que el **conteo de filas** en Supabase coincida con el de la planilla — un `join` mal hecho en la migración puede descartar clientes en silencio si el nombre de la actividad no matchea exactamente (espacios, tildes).
4. Normalizá los teléfonos a formato `+549XXXXXXXXXX` durante la migración (o dejá que el formulario los ajuste al editarlos uno por uno — ver `utils/telefono.js`).

## Conectar el check-in

En `Check-in-Milenium/assets/js/script.js`, reemplazá el `fetch` al Apps Script por una llamada a la función `buscar_socio` de Supabase (creada en `sql/04_rpc_checkin.sql`):

```js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const { data, error } = await supabase.rpc('buscar_socio', { p_dni: Number(dni) });
// data es un array; data[0] trae { nombre, fecha_pago, fecha_vencimiento }
```

El resto del archivo (cálculo de días, colores, auto-reset) no cambia.

## Decisiones que vale la pena conocer

- **El precio se guarda en cada cliente**, no se recalcula solo contra `actividades.precio`. Al elegir la actividad en el formulario, el precio se autocompleta como sugerencia (`views/clienteForm.js`); en cuanto tocás el campo, deja de pisarse. Así un precio pactado con un socio no se borra si después le cambiás la actividad.
- **ESTADO no es una columna**: se calcula en `v_clientes` contra la fecha de hoy en cada consulta (`sql/02_vistas.sql`). Guardarlo como columna lo dejaría congelado en la fecha en que se escribió.
- **Baja lógica, no DELETE**: dar de baja a un cliente pone `activo = false`, no borra la fila. Reactivar a alguien es un `update` directo en Supabase si hace falta.
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
