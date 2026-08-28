-- ============================================================
-- Milenium Gym — 01_schema.sql
-- Tablas base: ACTIVIDADES y CLIENTES.
-- Correr en el SQL Editor de Supabase, en orden (01, 02, 03, 04).
-- ============================================================

-- ACTIVIDADES ---------------------------------------------------
-- El nombre es un atributo, no la clave: así renombrar una
-- actividad no obliga a tocar cada cliente que la tiene.
create table if not exists actividades (
  id      integer generated always as identity primary key,
  nombre  text   not null unique,
  precio  numeric(12,2) not null default 0,

  -- Orden manual, no alfabético: en AppSheet las actividades están
  -- agrupadas a criterio (variantes de Aparatos, después HIFT
  -- progresivo, después los COMBOs...), no en orden A-Z. Este
  -- campo es lo que se edita con "subir/bajar" en la vista
  -- ACTIVIDADES — ver sql/06_agregar_orden_actividades.sql si ya
  -- habías corrido este script antes de que orden existiera.
  orden   integer not null default 0,

  creado_en timestamptz not null default now()
);

comment on table actividades is 'Catálogo de actividades del gimnasio y su precio vigente.';
comment on column actividades.orden is 'Orden manual de despliegue (deck de ACTIVIDADES y dropdown del formulario de clientes). No es alfabético.';

-- CLIENTES -------------------------------------------------------
-- Nota sobre tipos: dni y actividad_id son integer, no bigint, a
-- propósito. Un DNI argentino no pasa de 9 dígitos y esta tabla
-- nunca va a tener 2.100 millones de actividades, así que integer
-- sobra de rango — y evita un dolor de cabeza concreto: la API
-- de Supabase (PostgREST) serializa bigint como STRING en el JSON
-- (para no perder precisión en números gigantes), mientras que
-- integer viaja como número nativo. Con bigint, cosas como
-- comparar "el DNI de esta fila" contra "el DNI de la URL" se
-- rompen en silencio (string !== number). Con integer, no hay
-- que acordarse de convertir nada del lado del frontend.
create table if not exists clientes (
  dni           integer primary key,
  nombre        text   not null,

  -- Texto, nunca number: un teléfono no es una cantidad. Guardar
  -- en formato E.164 (+549XXXXXXXXXX) para que wa.me y tel: no
  -- tengan que adivinar el formato en tiempo de ejecución.
  telefono      text,

  actividad_id  integer not null references actividades(id) on delete restrict,

  -- El precio se congela en el cliente al momento de cargarlo.
  -- Si fuera un lookup en vivo contra actividades.precio, subir
  -- el precio de una actividad le cambiaría la cuota con efecto
  -- retroactivo a todos los socios, incluidos los que tienen un
  -- precio pactado aparte. Por eso NO hay trigger que lo pise.
  precio        numeric(12,2) not null,

  comentarios   text,
  fecha_pago    date,
  dias_credito  integer not null default 30,

  -- Columna generada: Postgres la recalcula sola cada vez que
  -- cambia fecha_pago o dias_credito. No se puede escribir a mano
  -- ni queda desincronizada.
  fecha_vencimiento date
    generated always as (fecha_pago + dias_credito) stored,

  -- Baja lógica en vez de DELETE: un socio que se da de baja no
  -- pierde su historial ni rompe referencias. La lista principal
  -- filtra activo = true.
  activo        boolean not null default true,

  creado_en     timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

comment on table clientes is 'Socios del gimnasio. ESTADO y FECHA HOY no son columnas: se calculan en la vista v_clientes contra current_date.';
comment on column clientes.telefono is 'Formato E.164, ej: +5493401234567. Se usa para tel: y wa.me.';
comment on column clientes.precio is 'Precio pactado con el cliente. Se sugiere desde actividades.precio al elegir la actividad, pero no se recalcula solo.';
comment on column clientes.fecha_vencimiento is 'fecha_pago + dias_credito. Generada, no editable.';

create index if not exists idx_clientes_actividad on clientes (actividad_id);
create index if not exists idx_clientes_activo on clientes (activo);
create index if not exists idx_clientes_nombre on clientes (lower(nombre));

-- Mantiene actualizado_en al día en cada UPDATE.
create or replace function set_actualizado_en()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

drop trigger if exists trg_clientes_actualizado_en on clientes;
create trigger trg_clientes_actualizado_en
  before update on clientes
  for each row
  execute function set_actualizado_en();
