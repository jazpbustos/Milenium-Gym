// ============================================================
// Milenium Gym — api/backup.js
// Copia de seguridad descargable desde la app. El plan gratis de
// Supabase no hace backups automáticos, así que esto es lo que nos
// cubre: baja TODAS las filas de las tres tablas (incluidos socios
// archivados) en un único .json con lo necesario para restaurar.
// ============================================================

import { supabase } from '../supabaseClient.js';
import { hoyISO } from '../utils/formato.js';

const TAMANIO_PAGINA = 1000;
const CLAVE_ULTIMO = 'milenium:ultimoBackup';

async function traerTodo(tabla, ordenarPor){
  let desde = 0;
  let todo = [];
  for (;;) {
    const { data, error } = await supabase
      .from(tabla)
      .select('*')
      .order(ordenarPor, { ascending: true })
      .range(desde, desde + TAMANIO_PAGINA - 1);
    if (error) throw error;
    todo = todo.concat(data);
    if (data.length < TAMANIO_PAGINA) break;
    desde += TAMANIO_PAGINA;
  }
  return todo;
}

export async function descargarBackup(){
  const [actividades, clientes, pagos] = await Promise.all([
    traerTodo('actividades', 'id'),
    traerTodo('clientes', 'id'),
    traerTodo('pagos', 'id'),
  ]);

  const backup = {
    app: 'milenium-gym',
    formato: 1,
    generado_en: new Date().toISOString(),
    conteos: { actividades: actividades.length, clientes: clientes.length, pagos: pagos.length },
    tablas: { actividades, clientes, pagos },
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `milenium-backup-${hoyISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  try { localStorage.setItem(CLAVE_ULTIMO, new Date().toISOString()); } catch (_e) { /* sin storage */ }
  return backup.conteos;
}

// Fecha del último backup hecho DESDE ESTE NAVEGADOR (o null).
export function ultimoBackup(){
  try {
    const v = localStorage.getItem(CLAVE_ULTIMO);
    return v ? new Date(v) : null;
  } catch (_e) {
    return null;
  }
}
