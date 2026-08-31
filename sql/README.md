# SQL de Milenium Gym

Esta carpeta contiene únicamente la estructura y la evolución de la base. No debe contener exportaciones ni datos reales de clientes.

## Orden de ejecución

Los archivos numerados son migraciones y se ejecutan una sola vez, en orden ascendente.

### Base inicial

1. `01_schema.sql` — tablas iniciales.
2. `02_vistas.sql` — vistas de clientes y estadísticas.
3. `03_rls.sql` — seguridad para usuarios autenticados.
4. `04_rpc_checkin.sql` — consulta pública y limitada del check-in.
5. `05_seed_actividades.sql` — catálogo inicial de actividades.

### Evolución funcional

6. `06_agregar_orden_actividades.sql`
7. `07_historial_pagos.sql`
8. `08_dias_credito_actividades.sql`
9. `09_pago_unico_cliente_fecha.sql`
10. `10_dni_editable.sql`
11. `11_dashboard_estadisticas.sql`
12. `12_edicion_sin_pago.sql`
13. `13_horario_argentina.sql`

### Identidad interna e historial estable

14. `14_agregar_cliente_id.sql`
15. `15_agregar_cliente_id_a_pagos.sql`
16. `16_historial_estable.sql`
17. `17_dejar_de_usar_registrar_pago.sql`
18. `18_eliminar_registrar_pago.sql`
19. `19_cliente_id_primary_key.sql`
20. `20_archivar_cliente_y_liberar_dni.sql`

## Base existente

La base de producción ya tiene aplicadas estas migraciones. No hay que volver a ejecutarlas. Para un cambio nuevo se agrega `21_nombre_del_cambio.sql`; no se modifican migraciones que ya fueron aplicadas.

## Datos privados

Los CSV, exportaciones, diagnósticos con DNI y scripts SQL con clientes deben guardarse fuera del repositorio. La regla `*.csv` del `.gitignore` evita subir exportaciones accidentalmente.
