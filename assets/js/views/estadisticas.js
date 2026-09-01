// ============================================================
// Milenium Gym — views/estadisticas.js
// Vista "ESTADISTICAS": barras de clientes por actividad, mismo
// look que el gráfico de AppSheet (fondo oscuro, grilla punteada,
// etiquetas rotadas) pero con el naranja del gimnasio. SVG a
// mano: es una sola serie, no vale la pena sumar una librería de
// gráficos para esto.
// ============================================================

import { listarClientesPorActividad, obtenerResumenDashboard } from '../api/estadisticas.js';
import { formatearPrecio } from '../utils/formato.js';
import { mostrarError } from '../utils/toast.js';
import { cerrarSesion } from '../auth.js';
import { navegarA } from '../router.js';

export async function renderEstadisticas(container, params, { renderTopbar }){
  renderTopbar({
    title: 'Estadísticas',
    actions: [
      { icono: 'refrescar', titulo: 'Actualizar', onClick: () => cargar() },
      { icono: 'salir', titulo: 'Cerrar sesión', onClick: async () => { await cerrarSesion(); navegarA('/login'); } },
    ],
  });

  container.innerHTML = `<div class="stats-view"><div class="loading-bar"></div></div>`;
  const host = container.querySelector('.stats-view');

  async function cargar(){
    host.innerHTML = '<div class="loading-bar"></div>';
    try {
      const [resumen, datos] = await Promise.all([
        obtenerResumenDashboard(),
        listarClientesPorActividad(),
      ]);
      pintar(resumen, datos.filter((d) => d.cantidad > 0));
    } catch (err) {
      mostrarError(err);
      host.innerHTML = `<div class="estado-vacio"><p>No se pudieron cargar las estadísticas.</p></div>`;
    }
  }

  function pintar(resumen, datos){
    host.innerHTML = `
      <section class="dashboard-section" aria-labelledby="dashboard-title">
        <p class="stats-title" id="dashboard-title">Resumen del mes</p>
        <div class="dashboard-grid">
          ${tarjeta('Socios activos', resumen.sociosActivos, 'is-highlight', 'Total con cuota vigente')}
          ${tarjeta('Socios al día', resumen.sociosAlDia, 'is-positive', 'Más de 3 días restantes')}
          ${tarjeta('Por vencer', resumen.cuotasPorVencer, 'is-warning', 'Próximos 3 días')}
          ${tarjeta('Vencidos', resumen.sociosVencidos, 'is-danger', 'Últimos 30 días')}
          ${tarjeta('Ingresos del mes', formatearPrecio(resumen.ingresosMes), 'is-money')}
          ${tarjeta('Nuevos clientes', resumen.nuevosSociosMes, '', 'Último mes')}
        </div>
      </section>

      <section class="stats-activity-section" aria-labelledby="activity-title">
        <p class="stats-title" id="activity-title">Socios por actividad</p>
        ${datos.length ? `
          <div class="stats-legend"><span class="swatch"></span> Cantidad de socios activos</div>
          <div class="stats-chart-wrap">${construirBarChart(datos)}</div>
        ` : '<p class="stats-empty">Todavía no hay socios activos para graficar.</p>'}
      </section>
    `;
  }

  await cargar();
}

function tarjeta(label, valor, clase = '', detalle = ''){
  return `
    <article class="dashboard-card ${clase}">
      <p class="dashboard-card-label">${label}</p>
      <p class="dashboard-card-value">${valor}</p>
      ${detalle ? `<p class="dashboard-card-detail">${detalle}</p>` : ''}
    </article>
  `;
}

function construirBarChart(datos){
  const anchoBarra = 46;
  const gap = 14;
  const margenIzq = 44;
  const margenDer = 16;
  const margenSup = 16;
  const margenInf = 120; // espacio para etiquetas rotadas
  const altoChart = 280;

  const max = Math.max(...datos.map((d) => d.cantidad), 1);
  const anchoPlot = datos.length * (anchoBarra + gap);
  const ancho = anchoPlot + margenIzq + margenDer;
  const alto = altoChart + margenSup + margenInf;

  // 4 líneas de grilla horizontales, en valores redondos.
  const pasos = 4;
  const gridLines = [];
  for (let i = 0; i <= pasos; i++){
    const valor = Math.round((max * i) / pasos);
    const y = margenSup + altoChart - (altoChart * i) / pasos;
    gridLines.push(`
      <line class="grid-line" x1="${margenIzq}" y1="${y}" x2="${ancho - margenDer}" y2="${y}"/>
      <text class="axis-label" x="${margenIzq - 8}" y="${y + 4}" text-anchor="end">${valor}</text>
    `);
  }

  const barras = datos.map((d, i) => {
    const x = margenIzq + i * (anchoBarra + gap);
    const h = Math.max((d.cantidad / max) * altoChart, 1);
    const y = margenSup + altoChart - h;
    const labelX = x + anchoBarra / 2;
    const labelY = margenSup + altoChart + 14;
    return `
      <rect class="bar" x="${x}" y="${y}" width="${anchoBarra}" height="${h}" rx="3">
        <title>${escapeXml(d.actividad)}: ${d.cantidad}</title>
      </rect>
      <text class="bar-value" x="${labelX}" y="${y - 6}" text-anchor="middle">${d.cantidad}</text>
      <text class="axis-label" x="0" y="0" text-anchor="end"
        transform="translate(${labelX}, ${labelY}) rotate(-40)">${truncar(d.actividad, 22)}</text>
    `;
  }).join('');

  return `
    <svg class="stats-chart" viewBox="0 0 ${ancho} ${alto}" width="${ancho}" height="${alto}" role="img" aria-label="Clientes por actividad">
      ${gridLines.join('')}
      ${barras}
      <line class="baseline" x1="${margenIzq}" y1="${margenSup + altoChart}" x2="${ancho - margenDer}" y2="${margenSup + altoChart}"/>
    </svg>
  `;
}

function truncar(str, n){
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

function escapeXml(str){
  return String(str).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
}
