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
// wrappers finos que solo aportan lo que cambia entre uno y otro.
//
// v9 (feedback del usuario sobre la ronda anterior, CON CAPTURA DE PANTALLA
// en mano — "el pase anterior dijo haberlo hecho y en la captura sigue
// yendo de Ene a Abr"): tres problemas reales que el v8 no resolvía del
// todo:
//   1) El DOMINIO del eje X ya abarcaba el año completo (limitesAnio, sigue
//      igual más abajo), pero la LÍNEA VISIBLE se cortaba donde terminaba el
//      último dato real — si la media no cambió después de marzo, el
//      usuario veía la mitad derecha de la caja completamente vacía. Ahora
//      la línea se EXTIENDE (proyectada, con opacidad reducida para que se
//      lea distinta de un dato real — nunca inventa un valor nuevo, solo
//      continúa el último conocido) hasta los dos bordes del año.
//   2) No había eje Y: los valores flotaban pegados a cada punto. Ahora hay
//      gridlines horizontales (recesivas, ver la skill dataviz) con sus
//      valores a la izquierda — y de paso, para el ranking, ESO reemplaza el
//      cartel "Más arriba, mejor puesto" (pedido explícito: sacarlo): los
//      propios valores del eje, en orden decreciente de arriba hacia abajo,
//      hacen evidente que el puesto chico (mejor) vive arriba.
//   3) El fallback de texto para "poco dato" ("Media estable en 75 durante
//      todo el año.") se ELIMINA por completo — pedido explícito: "el
//      gráfico se muestra SIEMPRE, aunque la media no haya cambiado: una
//      línea plana también es información". Con un solo valor real (o varios
//      idénticos) se dibuja una línea PLANA de punta a punta del año, nunca
//      una oración. El único texto de respaldo que sigue existiendo es
//      para el caso genuinamente vacío (CERO muestras válidas — ni un solo
//      dato, nada que graficar), que no es el caso que reportó el usuario.
import {
  fechaDe, SEMANAS_POR_ANIO, mesesDelAnio,
} from '../../core/calendario.js';
import { ANIO_INICIAL } from '../../core/world.js';
import { el } from '../dom.js';

const NS = 'http://www.w3.org/2000/svg';
const DORADO = '#f2c14e';
const FONDO = '#0d0708';
// Mismos tokens que theme.css (--borde / --texto-sutil / --texto): el SVG se
// arma con atributos planos (no puede leer custom properties de CSS), así
// que se copian los hex una sola vez acá — ver la skill dataviz, "gridlines
// recesivas, un paso apenas fuera de la superficie".
const GRIS_EJE = '#241416';
const GRIS_TEXTO = '#957777';
const TEXTO_CLARO = '#f1e2e2';

// v10 (pedido textual: "se ven demasiado grandes los gráficos... achicá lo
// que haga falta, los gráficos son lo que más sobra"): con `width:100%` fijo
// por CSS (ver .grafico-media-svg, theme.css) el ALTO renderizado en pantalla
// es `anchoDelModulo / (VB_W/VB_H)` — el viewBox de antes (320×150, casi
// 2:1) hacía que un módulo central ancho (la columna del medio se lleva la
// mayor parte del tablero) dibujara un gráfico altísimo. Achatar la relación
// de aspecto a ~4:1 es lo que baja el alto a menos de la mitad sin
// sacrificar "ocupa el ancho del módulo" (pedido que no se puede perder).
//
// OJO con pasarse de flaco: un primer intento acható esto mucho más (5:1) y
// rompió la legibilidad del eje Y del Pedido 2 — el texto de las gridlines
// (en unidades del viewBox) escala con el MISMO factor que todo el gráfico,
// así que un alto útil más chico con la MISMA cantidad de marcas las deja
// apenas separadas por menos que su propia altura de línea: se superponen.
// El equilibrio real de este pedido está en el alto útil (`VB_H - PAD_TOP -
// PAD_BOTTOM`) contra la cantidad de marcas del eje Y (ver `ticksEjeY` y
// `MAX_TICKS_EJE_Y`, más abajo), no solo en el viewBox: por eso el achique
// se hizo en varios pasos chicos en vez de uno solo agresivo, verificando
// con Playwright real en cada paso, y el tamaño de fuente también baja uno
// (ver más abajo).
const VB_W = 340;
// Alto por defecto del viewBox. Achatado a propósito en v10 ("los gráficos
// son lo que más lugar ocupa"), y ahora además FLEXIBLE: cuando el resumen de
// un año flaco deja lugar de sobra, `graficoMedia`/`graficoRanking` reciben un
// `alto` mayor y el gráfico se dibuja más alto de verdad —más resolución
// vertical, no una imagen estirada— en vez de dejar el hueco. Cuando el año
// viene cargado se queda en este mínimo, que es el que se calibró.
const VB_H = 84;
export const ALTO_GRAFICO_MIN = VB_H;
// El ancho del viewBox, para poder convertir píxeles de pantalla a unidades
// de viewBox: un SVG con viewBox y sin alto explícito se dibuja con
// `altoEnPx = anchoEnPx * (vbAlto / VB_W)`, así que para que ocupe N píxeles
// de alto hay que pedirle `vbAlto = N * VB_W / anchoEnPx`.
export const ANCHO_GRAFICO = VB_W;
// Techo del crecimiento. 190 daba gráficos de ~210px de alto cada uno: se
// comían media pantalla del resumen y por eso las listas no entraban apiladas
// ("los gráficos ocupan más espacio del que deberían", v17.7). 118 los deja
// crecer lo justo para aprovechar el aire sobrante sin pasar a ser el
// protagonista de una pantalla que es, sobre todo, dos listas.
export const ALTO_GRAFICO_MAX = 118;
const PAD_LEFT = 30;
const PAD_RIGHT = 6;
const PAD_TOP = 11;
const PAD_BOTTOM = 19;

// Opacidad de la PROYECCIÓN (el tramo de línea que continúa el último valor
// conocido hasta el borde del año, sin inventar un dato nuevo): bien por
// debajo de la línea real, para que se lea como "esto es continuidad
// asumida", nunca como si fuera otro dato medido.
const OPACIDAD_PROYECCION = 0.38;

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
// varias decisiones resueltas "en el mismo instante" del calendario no son
// puntos distintos en el tiempo, son el mismo instante con el valor ya
// actualizado). Cada muestra trae media Y ranking (year-summary.js, v8):
// `obtenerValor` elige cuál de los dos mira este gráfico en particular, y una
// muestra sin ese dato (p. ej. `ranking:null` en una partida vieja sin mundo
// a mano) se descarta en vez de romper el gráfico.
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

// Paso "lindo" para los ticks del eje Y (algoritmo estándar tipo d3): nunca
// un número pelado como 63.333 — redondea a 1/2/5 × una potencia de 10, así
// los valores del eje siempre se leen como algo que un humano escribiría.
function pasoLindo(rangoBruto, cantidadObjetivo) {
  if (!(rangoBruto > 0)) return 1;
  const bruto = rangoBruto / cantidadObjetivo;
  const magnitud = 10 ** Math.floor(Math.log10(bruto));
  const normalizado = bruto / magnitud;
  let paso;
  if (normalizado < 1.5) paso = 1;
  else if (normalizado < 3) paso = 2;
  else if (normalizado < 7) paso = 5;
  else paso = 10;
  return paso * magnitud;
}

// Techo de marcas del eje Y (v10): con el gráfico más bajo (Pedido 1) hay
// menos alto útil para repartir — pasado este número, las etiquetas quedan
// más juntas que su propia altura de línea y se pisan entre sí. Ver el
// bucle de `ticksEjeY` más abajo: nunca se agregan marcas de más allá de
// esto, sea cual sea el rango de datos.
const MAX_TICKS_EJE_Y = 5;

function ticksDeRango(valorMin, valorMax, cantidadObjetivo) {
  const paso = pasoLindo(valorMax - valorMin, cantidadObjetivo);
  const desde = Math.floor(valorMin / paso) * paso;
  const hasta = Math.ceil(valorMax / paso) * paso;
  const ticks = [];
  for (let v = desde; v <= hasta + paso / 1000; v += paso) {
    ticks.push(Math.round(v * 1000) / 1000);
  }
  return ticks;
}

// Ticks del eje Y a partir del rango REAL de los datos. Con el valor
// completamente plano (todas las muestras iguales) no hay rango: se arma uno
// artificial alrededor del valor único, para que la línea plana quede
// centrada en la caja con aire arriba y abajo — nunca pegada a un borde.
//
// v10 (pedido textual: "los gráficos están demasiado simples, agregá más
// datos en el eje Y" — el propio ejemplo que dio el usuario, "55/75/95" en
// media y "#18/#13/#8" en ranking, es justo ESTE caso: una sola muestra real,
// o todas iguales). Antes se armaba un único paso alrededor del valor con
// `pasoLindo(...,1)`, así que SIEMPRE daba exactamente 3 marcas (min/valor/
// max), sin importar cuántas se pidieran. Ahora reparte `cantidadObjetivo`
// marcas (impar: el valor real queda siempre exactamente al medio) a paso
// constante alrededor del valor — más contexto para leer una línea plana,
// mismo criterio de "paso lindo" (1/2/5 × potencia de 10) que el resto del
// eje.
function ticksEjeY(valorMin, valorMax, cantidadObjetivo = 4) {
  if (valorMax === valorMin) {
    // Mismo margen "objetivo" de siempre (30% del valor, con un piso de 1
    // para que un valor chico no dé un margen inservible) — lo único que
    // cambia es que ahora se REPARTE en `mitad` pasos en vez de uno solo, así
    // el rango visible del eje queda igual de angosto que antes (mismo
    // "35/75/95" de siempre en el caso ×1), pero con más marcas adentro.
    const mitad = Math.max(1, Math.floor((cantidadObjetivo + 1) / 2));
    const margen = Math.max(Math.abs(valorMin), 1) * 0.3;
    const paso = pasoLindo(margen, mitad);
    const ticks = [];
    for (let i = -mitad; i <= mitad; i += 1) {
      ticks.push(Math.round((valorMin + i * paso) * 1000) / 1000);
    }
    return ticks;
  }

  // v10 (Pedido 1 y 2 en tensión: gráfico más bajo, pero con más marcas):
  // `pasoLindo` apunta a `cantidadObjetivo` marcas pero puede pasarse bastante
  // (un rango de 60 a 71, por ejemplo, termina con 7 marcas, no 4-5) — con
  // menos alto útil que antes eso ya no entra sin pisarse. Si el resultado
  // supera `MAX_TICKS_EJE_Y`, se vuelve a intentar con un objetivo más chico
  // (menos subdivisiones, un paso más grande) hasta que entre. Nunca al
  // revés: si el primer intento ya dio pocas marcas, se dejan tal cual.
  let objetivo = cantidadObjetivo;
  let ticks = ticksDeRango(valorMin, valorMax, objetivo);
  while (ticks.length > MAX_TICKS_EJE_Y && objetivo > 2) {
    objetivo -= 1;
    ticks = ticksDeRango(valorMin, valorMax, objetivo);
  }
  return ticks;
}

// Meses con etiqueta en el eje X (los otros 7 solo llevan una marca corta sin
// texto, para no amontonar 12 palabras en 320 unidades de ancho): siempre
// Enero y Diciembre —el pedido puntual del usuario ("va de enero a
// diciembre")— más un par de referencias intermedias.
const MESES_CON_ETIQUETA = new Set([1, 4, 7, 10, 12]);

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
 *   claseContenedor: string,
 *   claseSvg: string,
 *   claseVacio: string,
 * }} config
 */
function construirGraficoLinea({
  muestras, anio, obtenerValor, invertido, formatoValor, tituloDe, ariaDe, textoVacio,
  claseContenedor, claseSvg, claseVacio, alto = VB_H,
}) {
  // El alto pedido, acotado: por debajo del mínimo las etiquetas del eje se
  // pisan (ver MAX_TICKS_EJE_Y) y por encima del máximo el gráfico deja de
  // ser una franja y pasa a competir con el resto del resumen.
  const vbAlto = Math.round(Math.min(Math.max(alto, ALTO_GRAFICO_MIN), ALTO_GRAFICO_MAX));
  const puntosReales = puntosDe(muestras, obtenerValor);

  // Único caso legítimo de "sin gráfico": CERO muestras con dato válido (ni
  // un solo valor medido en todo el año) — no hay nada, ni siquiera una
  // línea plana, que dibujar. Distinto del caso "un solo valor" (más abajo),
  // que SÍ es un gráfico (una línea plana), por pedido explícito del
  // usuario.
  if (puntosReales.length === 0) {
    return el('div', { class: claseContenedor }, [el('p', { class: `medio ${claseVacio}`, text: textoVacio })]);
  }

  const limites = anio !== null && anio !== undefined ? limitesAnio(anio) : null;
  const semanas = puntosReales.map((p) => p.semana);
  const semanaMin = limites ? limites.inicio : Math.min(...semanas);
  const semanaMax = limites ? limites.fin : Math.max(...semanas);

  const valores = puntosReales.map((p) => p.valor);
  const ticks = ticksEjeY(Math.min(...valores), Math.max(...valores));
  const valorMin = ticks[0];
  const valorMax = ticks[ticks.length - 1];
  const rango = valorMax - valorMin || 2;

  const anchoUtil = VB_W - PAD_LEFT - PAD_RIGHT;
  const altoUtil = vbAlto - PAD_TOP - PAD_BOTTOM;

  function xDe(semana) {
    if (semanaMax === semanaMin) return PAD_LEFT + anchoUtil / 2;
    const acotada = Math.min(semanaMax, Math.max(semanaMin, semana));
    return PAD_LEFT + ((acotada - semanaMin) / (semanaMax - semanaMin)) * anchoUtil;
  }

  // `invertido` (ranking): el puesto #1 es el MEJOR, así que un valor más
  // CHICO tiene que quedar más ARRIBA — al revés que la media. En vez de
  // dejar que el número más alto (el peor puesto) quede arriba solo porque es
  // más grande, se invierte qué extremo del rango mapea a "arriba" del SVG.
  function yDe(valor) {
    const fraccion = (valor - valorMin) / rango;
    const fraccionArriba = invertido ? fraccion : 1 - fraccion;
    return PAD_TOP + fraccionArriba * altoUtil;
  }

  const coords = puntosReales.map((p) => ({ ...p, x: xDe(p.semana), y: yDe(p.valor) }));
  const primero = coords[0];
  const ultimo = coords[coords.length - 1];

  const svg = svgEl('svg', {
    viewBox: `0 0 ${VB_W} ${vbAlto}`,
    class: claseSvg,
    role: 'img',
    'aria-label': ariaDe(primero, ultimo),
    preserveAspectRatio: 'xMidYMid meet',
  });

  // --- Eje Y: gridlines + valores (v9, pedido: "faltan el eje Y") --------
  // Recesivas (hairline, un tono apenas fuera de la superficie — ver la
  // skill dataviz): dan escala sin competir con la línea de datos.
  //
  // v10 (bug encontrado al achicar el gráfico, Pedido 1: con más marcas
  // (Pedido 2) empaquetadas en menos alto útil, el valor del primer/último
  // punto casi siempre CAE muy cerca de una de estas marcas — y ahí su
  // etiqueta directa en negrita, ver más abajo, terminaba pisando el número
  // de la gridline en el mismo lugar). En vez de separarlas a la fuerza (no
  // hay buen lugar donde poner dos números al lado del mismo punto), se
  // suprime el TEXTO de la gridline que quedaría pegado a una etiqueta
  // directa — la línea de la marca se deja (sigue dando escala), solo el
  // número se calla ahí porque el propio punto ya lo dice, más grande.
  const UMBRAL_COLISION_ETIQUETA = 11;
  const yEtiquetados = primero !== ultimo ? [primero.y, ultimo.y] : [];
  const grupoEjeY = svgEl('g', { 'aria-hidden': 'true' });
  ticks.forEach((tick) => {
    const y = yDe(tick);
    grupoEjeY.appendChild(svgEl('line', {
      class: 'grafico-linea-grilla',
      x1: PAD_LEFT.toFixed(1),
      y1: y.toFixed(1),
      x2: (PAD_LEFT + anchoUtil).toFixed(1),
      y2: y.toFixed(1),
      stroke: GRIS_EJE,
      'stroke-width': 1,
    }));
    const chocaConEtiquetaDirecta = yEtiquetados.some((yPunto) => Math.abs(y - yPunto) < UMBRAL_COLISION_ETIQUETA);
    if (chocaConEtiquetaDirecta) return;
    const etiqueta = svgEl('text', {
      x: (PAD_LEFT - 6).toFixed(1),
      y: (y + 2.6).toFixed(1),
      'text-anchor': 'end',
      fill: GRIS_TEXTO,
      // v10: un paso más chico que antes (9 -> 8): con más marcas en el eje
      // (Pedido 2) y un alto útil más chico (Pedido 1), el mismo tamaño de
      // antes dejaba las etiquetas casi pegadas entre sí.
      'font-size': 8,
    });
    etiqueta.textContent = formatoValor(tick);
    grupoEjeY.appendChild(etiqueta);
  });
  svg.appendChild(grupoEjeY);

  // --- Eje X: los 12 meses del año, siempre (v9, pedido: "sigue sin
  // mostrar de enero a diciembre") — nunca solo el mes del primer/último
  // dato real. Sin `anio` (llamador defensivo, dominio dinámico) no hay un
  // año calendario que recorrer: se cae al comportamiento de antes, marcar
  // solo el mes del primero y el último punto real. -------------------------
  const grupoEjeX = svgEl('g', { 'aria-hidden': 'true' });
  const yBase = PAD_TOP + altoUtil;
  grupoEjeX.appendChild(svgEl('line', {
    x1: PAD_LEFT.toFixed(1),
    y1: yBase.toFixed(1),
    x2: (PAD_LEFT + anchoUtil).toFixed(1),
    y2: yBase.toFixed(1),
    stroke: GRIS_EJE,
    'stroke-width': 1,
  }));
  if (limites) {
    mesesDelAnio(anio, ANIO_INICIAL).forEach((m) => {
      const x = xDe(m.semanaGlobal);
      grupoEjeX.appendChild(svgEl('line', {
        x1: x.toFixed(1), y1: yBase.toFixed(1), x2: x.toFixed(1), y2: (yBase + 4).toFixed(1), stroke: GRIS_EJE, 'stroke-width': 1,
      }));
      if (MESES_CON_ETIQUETA.has(m.mes)) {
        const texto = svgEl('text', {
          x: x.toFixed(1),
          y: (yBase + 14).toFixed(1),
          'text-anchor': m.mes === 1 ? 'start' : 'middle',
          fill: GRIS_TEXTO,
          'font-size': 9.5,
        });
        texto.textContent = m.nombreMes.slice(0, 3);
        grupoEjeX.appendChild(texto);
      }
    });
  } else {
    const etiquetaMes = (punto, anchor) => {
      const texto = svgEl('text', {
        x: punto.x.toFixed(1), y: (yBase + 14).toFixed(1), 'text-anchor': anchor, fill: GRIS_TEXTO, 'font-size': 9.5,
      });
      texto.textContent = mesCortoDe(punto.semana);
      return texto;
    };
    grupoEjeX.appendChild(etiquetaMes(primero, 'start'));
    if (ultimo.semana !== primero.semana) grupoEjeX.appendChild(etiquetaMes(ultimo, 'end'));
  }
  svg.appendChild(grupoEjeX);

  // --- Proyección: continúa el último valor conocido hasta los bordes del
  // año cuando el dato real no llega hasta ahí (v9, bug con captura: "sigue
  // yendo de Ene a Abr, ocupa media caja"). NUNCA inventa un valor nuevo —
  // solo repite, en horizontal, el último punto real conocido de ese lado.
  // Opacidad reducida (`OPACIDAD_PROYECCION`) para que se lea distinto de un
  // dato medido de verdad. Requiere `limites` (año conocido): sin año no hay
  // "borde" al que proyectar. --------------------------------------------
  if (limites) {
    if (primero.semana > semanaMin) {
      svg.appendChild(svgEl('polyline', {
        class: 'grafico-linea-proyeccion',
        points: `${PAD_LEFT.toFixed(1)},${primero.y.toFixed(1)} ${primero.x.toFixed(1)},${primero.y.toFixed(1)}`,
        fill: 'none',
        stroke: DORADO,
        opacity: OPACIDAD_PROYECCION,
        'stroke-width': 2,
        'stroke-linecap': 'round',
      }));
    }
    if (ultimo.semana < semanaMax) {
      svg.appendChild(svgEl('polyline', {
        class: 'grafico-linea-proyeccion',
        points: `${ultimo.x.toFixed(1)},${ultimo.y.toFixed(1)} ${(PAD_LEFT + anchoUtil).toFixed(1)},${ultimo.y.toFixed(1)}`,
        fill: 'none',
        stroke: DORADO,
        opacity: OPACIDAD_PROYECCION,
        'stroke-width': 2,
        'stroke-linecap': 'round',
      }));
    }
  }

  // --- Línea real (solo si hay 2+ puntos reales — con uno solo no hay nada
  // que conectar, ya lo cubre la proyección de arriba, que con años
  // conocidos forma una única línea plana continua). ----------------------
  if (coords.length >= 2) {
    svg.appendChild(svgEl('polyline', {
      points: coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' '),
      fill: 'none',
      stroke: DORADO,
      'stroke-width': 2,
      'stroke-linejoin': 'round',
      'stroke-linecap': 'round',
    }));
  }

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
  circulos.forEach((c) => svg.appendChild(c));

  // Etiquetado directo selectivo (nunca un número en cada punto): solo el
  // primero y el último — "de dónde a dónde" es la lectura que más importa
  // en un vistazo rápido.
  //
  // v10: con un solo punto real (línea 100% plana, `primero === ultimo`) se
  // deja de dibujar esta etiqueta directa. No es un recorte porque falte
  // lugar: es que pasa a ser REDUNDANTE con el propio eje Y — con un solo
  // valor, `ticksEjeY` arma su rango artificial CENTRADO en ese valor (ver
  // más arriba), así que el número ya aparece, letra por letra, como una de
  // las marcas del eje — justo a la altura del punto, que además queda
  // ENCIMA de esa misma gridline. Dibujar la etiqueta directa ahí también
  // (pedido 1, gráficos más chicos: menos aire vertical entre marcas) los
  // hacía competir por el mismo lugar y se superponían. La lista accesible
  // de respaldo (más abajo) sigue trayendo el valor igual, por las dudas.
  if (primero !== ultimo) {
    const etiquetaValor = (punto, arriba, anchor) => {
      const texto = svgEl('text', {
        x: punto.x.toFixed(1),
        y: (arriba ? punto.y - 8 : punto.y + 15).toFixed(1),
        'text-anchor': anchor,
        fill: TEXTO_CLARO,
        'font-size': 10.5,
        'font-weight': 700,
      });
      return texto;
    };
    const textoPrimero = etiquetaValor(primero, primero.y > vbAlto / 2, 'start');
    textoPrimero.textContent = formatoValor(primero.valor);
    svg.appendChild(textoPrimero);
    const textoUltimo = etiquetaValor(ultimo, ultimo.y > vbAlto / 2, 'end');
    textoUltimo.textContent = formatoValor(ultimo.valor);
    svg.appendChild(textoUltimo);
  }

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
 * @returns {HTMLElement} un <div> con el SVG (o la lectura simple SOLO si no
 *   hay ni un solo dato) y una lista accesible de respaldo.
 */
export function graficoMedia({ muestras = [], anio = null, alto } = {}) {
  return construirGraficoLinea({
    muestras,
    anio,
    alto,
    obtenerValor: (m) => m.media,
    invertido: false,
    formatoValor: (valor) => String(redondearMedia(valor)),
    tituloDe: (punto) => `${fechaTextoDe(punto.semana)}: ${redondearMedia(punto.valor)}`,
    ariaDe: (primero, ultimo) => `Evolución de la media: de ${redondearMedia(primero.valor)} en ${fechaTextoDe(primero.semana)} a ${redondearMedia(ultimo.valor)} en ${fechaTextoDe(ultimo.semana)}.`,
    textoVacio: 'Sin datos de media para este año.',
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
 * más chico se dibuja más arriba) y los valores formateados como "#N". v9:
 * la inversión se lee en los propios VALORES del eje Y (decrecientes de
 * arriba hacia abajo) — ya no hace falta un cartel aparte explicándolo.
 * @param {{ muestras: Array<{semana:number, ranking:number|null}>, anio?: number }} opciones
 */
export function graficoRanking({ muestras = [], anio = null, alto } = {}) {
  return construirGraficoLinea({
    muestras,
    anio,
    alto,
    obtenerValor: (m) => m.ranking,
    invertido: true,
    formatoValor: formatoPuesto,
    tituloDe: (punto) => `${fechaTextoDe(punto.semana)}: puesto ${formatoPuesto(punto.valor)}`,
    ariaDe: (primero, ultimo) => `Evolución del ranking (más arriba es mejor puesto): de ${formatoPuesto(primero.valor)} en ${fechaTextoDe(primero.semana)} a ${formatoPuesto(ultimo.valor)} en ${fechaTextoDe(ultimo.semana)}.`,
    textoVacio: 'Sin datos de ranking para este año.',
    claseContenedor: 'grafico-ranking',
    claseSvg: 'grafico-ranking-svg',
    claseVacio: 'grafico-ranking-vacio',
  });
}
