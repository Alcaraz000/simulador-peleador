// Gráfico de la media a lo largo del año (resumen de fin de año, pedido
// textual del usuario: "gráficos que muestren cómo fueron cambiando con los
// meses la media"). SVG a mano, sin librerías (mismo criterio que
// silueta-rival.js) — una sola serie, así que sin leyenda (el título del
// bloque que la monta ya la nombra): dorado, el color de acento del tema
// gótico-frío, línea fina, puntos con tooltip nativo y etiquetado directo
// selectivo (solo primer/último valor, no todos — ver la skill dataviz).
import { fechaDe } from '../../core/calendario.js';
import { ANIO_INICIAL } from '../../core/world.js';
import { el } from '../dom.js';

const NS = 'http://www.w3.org/2000/svg';
const DORADO = '#f2c14e';
const FONDO = '#0d0708';

const VB_W = 320;
const VB_H = 120;
const PAD_X = 14;
const PAD_TOP = 26;
const PAD_BOTTOM = 22;

function svgEl(tag, attrs = {}) {
  const nodo = document.createElementNS(NS, tag);
  for (const [clave, valor] of Object.entries(attrs)) {
    if (valor === null || valor === undefined) continue;
    nodo.setAttribute(clave, String(valor));
  }
  return nodo;
}

function redondear(media) {
  return Math.round(media * 10) / 10;
}

// Colapsa muestras de la MISMA semana en una sola (se queda con la última:
// varias decisiones resueltas "en el mismo instante" del calendario — ver el
// comentario grande en year-summary.js — no son puntos distintos en el
// tiempo, son el mismo instante con el valor ya actualizado).
function deduplicarPorSemana(muestras) {
  const porSemana = new Map();
  for (const m of muestras) porSemana.set(m.semana, m.media);
  return [...porSemana.entries()].map(([semana, media]) => ({ semana, media }));
}

function mesCortoDe(semana) {
  return fechaDe(semana, ANIO_INICIAL).nombreMes.slice(0, 3);
}

function tituloDe(punto) {
  const { anio, nombreMes } = fechaDe(punto.semana, ANIO_INICIAL);
  return `${nombreMes} ${anio}: ${redondear(punto.media)}`;
}

// Lectura simple (sin gráfico) para el caso degenerado: una sola muestra, o
// todas las muestras cayeron en la misma semana (ver la skill dataviz, "¿es
// esto siquiera un gráfico?" — con un solo punto no hay evolución que
// dibujar, mejor un número directo que una línea sin sentido).
function lecturaSimple(puntos) {
  if (puntos.length === 0) {
    return el('p', { class: 'medio grafico-media-vacio', text: 'Sin datos de media para este año.' });
  }
  const [punto] = puntos;
  return el('p', { class: 'medio grafico-media-vacio', text: `Media estable en ${redondear(punto.media)} durante todo el año.` });
}

function listaAccesible(puntos) {
  return el('ul', { class: 'sr-only' }, puntos.map((p) => el('li', { text: tituloDe(p) })));
}

/**
 * @param {{ muestras: Array<{semana:number, media:number}> }} opciones
 * @returns {HTMLElement} un <div> con el SVG (o la lectura simple, si no hay
 *   suficientes puntos distintos) y una lista accesible de respaldo.
 */
export function graficoMedia({ muestras = [] }) {
  const puntos = deduplicarPorSemana(muestras).sort((a, b) => a.semana - b.semana);

  if (puntos.length < 2) {
    return el('div', { class: 'grafico-media' }, [lecturaSimple(puntos)]);
  }

  const semanas = puntos.map((p) => p.semana);
  const medias = puntos.map((p) => p.media);
  const semanaMin = Math.min(...semanas);
  const semanaMax = Math.max(...semanas);
  const mediaMin = Math.min(...medias);
  const mediaMax = Math.max(...medias);
  // Con la media completamente plana (mediaMax === mediaMin), un rango
  // artificial de 2 puntos evita dividir por cero y deja la línea centrada
  // en vez de pegada a un borde.
  const rango = mediaMax - mediaMin || 2;

  const anchoUtil = VB_W - PAD_X * 2;
  const altoUtil = VB_H - PAD_TOP - PAD_BOTTOM;

  function xDe(semana) {
    if (semanaMax === semanaMin) return VB_X_MEDIO;
    return PAD_X + ((semana - semanaMin) / (semanaMax - semanaMin)) * anchoUtil;
  }
  const VB_X_MEDIO = PAD_X + anchoUtil / 2;

  function yDe(media) {
    return PAD_TOP + altoUtil - ((media - mediaMin) / rango) * altoUtil;
  }

  const coords = puntos.map((p) => ({ ...p, x: xDe(p.semana), y: yDe(p.media) }));

  const linea = svgEl('polyline', {
    points: coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' '),
    fill: 'none',
    stroke: DORADO,
    'stroke-width': 2,
    'stroke-linejoin': 'round',
    'stroke-linecap': 'round',
  });

  const circulos = coords.map((c, i) => {
    const circulo = svgEl('circle', {
      cx: c.x.toFixed(1), cy: c.y.toFixed(1), r: 3.5, fill: DORADO, stroke: FONDO, 'stroke-width': 1.5,
    });
    const titulo = svgEl('title');
    titulo.textContent = tituloDe(c);
    circulo.appendChild(titulo);
    circulo.dataset.puntoIndice = String(i);
    return circulo;
  });

  // Etiquetado directo selectivo (nunca un número en cada punto): solo el
  // primero y el último — "de dónde a dónde" es la lectura que más importa
  // en un vistazo rápido. Si coinciden (2 puntos con valores redondeados
  // iguales, por ej.), igual se muestran los dos: son semanas distintas.
  const primero = coords[0];
  const ultimo = coords[coords.length - 1];
  const etiquetaValor = (punto, arriba) => svgEl('text', {
    x: punto.x.toFixed(1),
    y: (arriba ? punto.y - 9 : punto.y + 16).toFixed(1),
    'text-anchor': punto === primero ? 'start' : 'end',
    fill: '#f1e2e2',
    'font-size': 12,
    'font-weight': 700,
  });
  const textoPrimero = etiquetaValor(primero, primero.y > VB_H / 2);
  textoPrimero.textContent = String(redondear(primero.media));
  const textoUltimo = etiquetaValor(ultimo, ultimo.y > VB_H / 2);
  textoUltimo.textContent = String(redondear(ultimo.media));

  // Meses en el eje: solo el del primer y el del último punto (recessive,
  // sin amontonar etiquetas si hay varios puntos en semanas cercanas — el
  // detalle exacto de cada punto ya vive en su <title>).
  const ejeMeses = svgEl('g', { 'aria-hidden': 'true' });
  const etiquetaMes = (punto, anchor) => {
    const texto = svgEl('text', {
      x: punto.x.toFixed(1), y: VB_H - 4, 'text-anchor': anchor, fill: '#957777', 'font-size': 10,
    });
    texto.textContent = mesCortoDe(punto.semana);
    return texto;
  };
  ejeMeses.appendChild(etiquetaMes(primero, 'start'));
  if (ultimo.semana !== primero.semana) ejeMeses.appendChild(etiquetaMes(ultimo, 'end'));

  const aria = `Evolución de la media: de ${redondear(primero.media)} en ${tituloDe(primero)} a ${redondear(ultimo.media)} en ${tituloDe(ultimo)}.`;

  const svg = svgEl('svg', {
    viewBox: `0 0 ${VB_W} ${VB_H}`,
    class: 'grafico-media-svg',
    role: 'img',
    'aria-label': aria,
    preserveAspectRatio: 'xMidYMid meet',
  });
  svg.appendChild(linea);
  svg.appendChild(ejeMeses);
  circulos.forEach((c) => svg.appendChild(c));
  svg.appendChild(textoPrimero);
  svg.appendChild(textoUltimo);

  return el('div', { class: 'grafico-media' }, [svg, listaAccesible(coords)]);
}
