-- ATENCIÓN: utilidad destructiva para finalizar las pruebas iniciales.
-- Borra únicamente todos los movimientos del historial de pagos.
-- No elimina socios, actividades ni usuarios.
-- No incluir este archivo en una migración automática de producción.

truncate table pagos restart identity;
