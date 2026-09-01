# SQL de Milenium Gym

- `schema_actual.sql` describe la estructura consolidada actual, sin clientes, pagos ni actividades.
- Se usa únicamente para crear una base nueva. La base de producción ya existe y no debe ejecutar este archivo.
- Los cambios ya aplicados se incorporan a `schema_actual.sql`. Si un cambio futuro requiere ejecutar SQL en producción, se prepara temporalmente como una migración y, una vez verificado, se consolida nuevamente en este archivo.
- Nunca se guardan aquí CSV, exportaciones, DNI, teléfonos ni sentencias con datos reales.

Las antiguas migraciones `01` a `20` ya fueron aplicadas y permanecen disponibles en el historial de Git; no hace falta conservarlas mezcladas con el esquema vigente.
