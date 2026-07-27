// Gráficos de línea del resumen de fin de año: media (pedido textual del
// usuario: "gráficos que muestren cómo fueron cambiando con los meses la
// media") y ranking (v8, pedido textual: "un gráfico nuevo, cómo escalaste
// en el ranking"). SVG a mano, sin librerías (mismo criterio que
// silueta-rival.js) — una sola serie cada uno, así que sin leyenda (el
// título del bloque que la monta ya la nombra — ver la skill dataviz, "un
// solo color no necesita leyenda, el título ya dice qué es"): línea fina,
// puntos con tooltip nativo y etiquetado directo selectivo (solo primer/
// último valor, no todos).
//
// v8: en vez de dos motores de gráfico separados, `construirGraficoLinea`
// (más abajo) es el ÚNICO motor SVG — `graficoMedia` y `graficoRanking` son
// wrappers finos que solo aportan lo que cambia entre uno y otro:
//   - qué campo de la muestra leer (`.media` vs `.ranking`),
//   - cómo formatear un valor (un decimal vs entero con "#"),
//   - la ORIENTACIÓN del eje Y: en la media, más alto es mejor (arriba); en
//     el ranking es AL REVÉS — el puesto #1 es el mejor, así que para que
//     "mejorar" siga leyéndose "hacia arriba" el motor invierte el mapeo
//     (ver `invertido`, más abajo) en vez de dejar que el puesto más alto
//     (peor) quede arriba solo porque es un número más grande.
//   - el texto en español de cada caso (título, aria-label, lectura simple).
// Los dos comparten el mismo color de acento (dorado, la identidad visual
// gótica-fría) — son dos vistazos de UNA sola serie cada uno, nunca se
// muestran superpuestos como para necesitar distinguirse por color (ver la
// skill dataviz: "un solo color no necesita leyenda"); reservar rojo/verde
// para esto hubiera reusado un color de ESTADO (ganó/perdió, ver
// RESULTADO_CLASE en toda la UI) para una serie que no es un estado, así que
// se evitó a propósito.
import { fechaDe, SEMANAS_POR_ANIO } from '../../core/calendario.js';
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

// Límites (semanaGlobal) de un año calendario completo: en este juego un
// bloque SIEMPRE dura 1 año (52 semanas, ver ETAPAS en career.js — todas con
// `aniosPorBloque:1`), así que el año arranca y termina siempre en el mismo
// punto del calendario, nunca a mitad de semana.
function limitesAnio(anio) {
  const inicio = (anio - ANIO_INICIAL) * SEMANAS_POR_ANIO + 1;
  return { inicio, fin: inicio + SEMANAS_POR_ANIO - 1 };
}

// Colapsa muestras de la MISMA semana en una sola (se queda con la última:
// varias decisiones resueltas "en el mismo instante" del calendario — ver el
// comentario grande en year-summary.js — no son puntos distintos en el
// tiempo, son el mismo instante con el valor ya actualizado). Cada muestra
// trae media Y ranking (year-summary.js, v8): `obtenerValor` elige cuál de
// los dos mira este gráfico en particular, y una muestra sin ese dato (p.
// ej. `ranking:null` en una partida vieja sin mundo a mano) se descarta en
// vez de romper el gráfico.
function puntosDe(muestras, obtenerValor) {
  const porSemana = new Map();
  for (const m of muestras) {
    const valor = obtenerValor(m);
    if (valor === null || valor === undefined) continue;
    porSemana.set(m.semana, valor);
  }
  return [...porSemana.entries()]
    .map(([semana, valor]) => ({ semana, valor }))
    .sort((a, b) => a.semana - b.semana);
}

function mesCortoDe(semana) {
  return fechaDe(semana, ANIO_INICIAL).nombreMes.slice(0, 3);
}

/**
 * @param {{
 *   muestras: Array<object>,
 *   anio: number|null,
 *   obtenerValor: (muestra: object) => number|null,
 *   invertido: boolean,
 *   formatoValor: (valor: number) => string,
 *   tituloDe: (punto: {semana:number, valor:number}) => string,
 *   ariaDe: (primero: object, ultimo: object) => string,
 *   textoVacio: string,
 *   textoEstable: (punto: {semana:number, valor:number}) => string,
 *   claseContenedor: string,
 *   claseSvg: string,
 *   claseVacio: string,
 * }} config
 */
function construirGraficoLinea({
  muestras, anio, obtenerValor, invertido, formatoValor, tituloDe, ariaDe, textoVacio, textoEstable,
  claseContenedor, claseSvg, claseVacio,
}) {
  const puntos = puntosDe(muestras, obtenerValor);

  // Lectura simple (sin gráfico) para el caso degenerado: sin muestras, una
  // sola, o todas cayeron en la misma semana (ver la skill dataviz, "¿es
  // esto siquiera un gráfico?" — con un solo punto no hay evolución que
  // dibujar, mejor un número directo que una línea sin sentido).
  if (puntos.length < 2) {
    const texto = puntos.length === 0 ? textoVacio : textoEstable(puntos[0]);
    return el('div', { class: claseContenedor }, [el('p', { class: `medio ${claseVacio}`, text: texto })]);
  }

  const semanas = puntos.map((p) => p.semana);
  const valores = puntos.map((p) => p.valor);
  // Dominio X: el año calendario COMPLETO (enero a diciembre) si se conoce el
  // año — nunca solo el tramo entre la primera y la última muestra (v8, bug
  // reportado: "en la captura va de Ene a Mar y queda raro" — antes el eje
  // estiraba las semanas CON DATOS a todo el ancho, como si el año hubiera
  // durado 3 meses). Sin año (llamador defensivo), se cae al rango real de
  // las muestras — mejor eso que reventar.
  const limites = anio !== null && anio !== undefined ? limitesAnio(anio) : null;
  const semanaMin = limites ? limites.inicio : Math.min(...semanas);
  const semanaMax = limites ? limites.fin : Math.max(...semanas);
  const valorMin = Math.min(...valores);
  const valorMax = Math.max(...valores);
  // Con el valor completamente plano (valorMax === valorMin), un rango
  // artificial de 2 puntos evita dividir por cero y deja la línea centrada
  // en vez de pegada a un borde.
  const rango = valorMax - valorMin || 2;

  const anchoUtil = VB_W - PAD_X * 2;
  const altoUtil = VB_H - PAD_TOP - PAD_BOTTOM;
  const VB_X_MEDIO = PAD_X + anchoUtil / 2;

  function xDe(semana) {
    if (semanaMax === semanaMin) return VB_X_MEDIO;
    return PAD_X + ((semana - semanaMin) / (semanaMax - semanaMin)) * anchoUtil;
  }

  // `invertido` (v8, gráfico de ranking): el puesto #1 es el MEJOR, así que
  // un valor más CHICO tiene que quedar más ARRIBA — al revés que la media,
  // donde un valor más grande es mejor y va arriba. En vez de dejar que el
  // número más alto (el peor puesto) quede arriba solo porque es más grande,
  // se invierte qué extremo del rango mapea a "arriba" del SVG (y chico).
  function yDe(valor) {
    const fraccion = rango === 0 ? 0 : (valor - valorMin) / rango;
    const fraccionArriba = invertido ? fraccion : 1 - fraccion;
    return PAD_TOP + fraccionArriba * altoUtil;
  }

  const coords = puntos.map((p) => ({ ...p, x: xDe(p.semana), y: yDe(p.valor) }));

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
      cx: c.x.toFixed(1), cy: c.y.toFixed(1), r: 4, fill: DORADO, stroke: FONDO, 'stroke-width': 2,
    });
    const titulo = svgEl('title');
    titulo.textContent = tituloDe(c);
    circulo.appendChild(titulo);
    circulo.dataset.puntoIndice = String(i);
    return circulo;
  });

  // Etiquetado directo selectivo (nunca un número en cada punto): solo el
  // primero y el último — "de dónde a dónde" es la lectura que más importa
  // en un vistazo rápido.
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
  textoPrimero.textContent = formatoValor(primero.valor);
  const textoUltimo = etiquetaValor(ultimo, ultimo.y > VB_H / 2);
  textoUltimo.textContent = formatoValor(ultimo.valor);

  // Meses en el eje: solo el del primer y el del último punto (recesivo, sin
  // amontonar etiquetas si hay varios puntos en semanas cercanas — el detalle
  // exacto de cada punto ya vive en su <title>).
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

  const svg = svgEl('svg', {
    viewBox: `0 0 ${VB_W} ${VB_H}`,
    class: claseSvg,
    role: 'img',
    'aria-label': ariaDe(primero, ultimo),
    preserveAspectRatio: 'xMidYMid meet',
  });
  svg.appendChild(linea);
  svg.appendChild(ejeMeses);
  circulos.forEach((c) => svg.appendChild(c));
  svg.appendChild(textoPrimero);
  svg.appendChild(textoUltimo);

  const listaAccesible = el('ul', { class: 'sr-only' }, coords.map((p) => el('li', { text: tituloDe(p) })));

  return el('div', { class: claseContenedor }, [svg, listaAccesible]);
}

function redondearMedia(media) {
  return Math.round(media * 10) / 10;
}

function fechaTextoDe(semana) {
  const { anio, nombreMes } = fechaDe(semana, ANIO_INICIAL);
  return `${nombreMes} ${anio}`;
}

/**
 * @param {{ muestras: Array<{semana:number, media:number}>, anio?: number }} opciones
 * @returns {HTMLElement} un <div> con el SVG (o la lectura simple, si no hay
 *   suficientes puntos distintos) y una lista accesible de respaldo.
 */
export function graficoMedia({ muestras = [], anio = null } = {}) {
  return construirGraficoLinea({
    muestras,
    anio,
    obtenerValor: (m) => m.media,
    invertido: false,
    formatoValor: (valor) => String(redondearMedia(valor)),
    tituloDe: (punto) => `${fechaTextoDe(punto.semana)}: ${redondearMedia(punto.valor)}`,
    ariaDe: (primero, ultimo) => `Evolución de la media: de ${redondearMedia(primero.valor)} en ${fechaTextoDe(primero.semana)} a ${redondearMedia(ultimo.valor)} en ${fechaTextoDe(ultimo.semana)}.`,
    textoVacio: 'Sin datos de media para este año.',
    textoEstable: (punto) => `Media estable en ${redondearMedia(punto.valor)} durante todo el año.`,
    claseContenedor: 'grafico-media',
    claseSvg: 'grafico-media-svg',
    claseVacio: 'grafico-media-vacio',
  });
}

function formatoPuesto(valor) {
  return `#${Math.round(valor)}`;
}

/**
 * Gráfico de ranking (v8, pedido textual: "un gráfico nuevo, cómo escalaste
 * en el ranking [...] el ranking es al revés que la media, el puesto 1 es lo
 * mejor"): mismo motor que `graficoMedia`, con el eje Y invertido (un puesto
 * más chico se dibuja más arriba) y los valores formateados como "#N".
 * @param {{ muestras: Array<{semana:number, ranking:number|null}>, anio?: number }} opciones
 */
export function graficoRanking({ muestras = [], anio = null } = {}) {
  return construirGraficoLinea({
    muestras,
    anio,
    obtenerValor: (m) => m.ranking,
    invertido: true,
    formatoValor: formatoPuesto,
    tituloDe: (punto) => `${fechaTextoDe(punto.semana)}: puesto ${formatoPuesto(punto.valor)}`,
    ariaDe: (primero, ultimo) => `Evolución del ranking (más arriba es mejor puesto): de ${formatoPuesto(primero.valor)} en ${fechaTextoDe(primero.semana)} a ${formatoPuesto(ultimo.valor)} en ${fechaTextoDe(ultimo.semana)}.`,
    textoVacio: 'Sin datos de ranking para este año.',
    textoEstable: (punto) => `Te mantuviste en el puesto ${formatoPuesto(punto.valor)} durante todo el año.`,
    claseContenedor: 'grafico-ranking',
    claseSvg: 'grafico-ranking-svg',
    claseVacio: 'grafico-ranking-vacio',
  });
}
