// El emblema del desenlace de una pelea (pedido v17.5, punto 3: "esto cumple
// con ocupar el espacio, pero podría hacerse más estético, ¿no?").
//
// Antes el desenlace era un panel con dos líneas de texto. Ahora arriba va un
// emblema dibujado POR CÓDIGO —mismo criterio que el resto del arte del
// proyecto: SVG, sin imágenes que pesen ni que haya que mantener— distinto
// según CÓMO terminó la pelea, y el color lo pone el resultado.
//
// El dibujo dice el método y el color dice el veredicto. Los dos ejes son
// independientes a propósito: un KO ganado y uno perdido comparten la misma
// estrella de impacto (es el mismo hecho: alguien se durmió) y se distinguen
// por el verde o el rojo, igual que en el resto del juego. Así se lee de un
// vistazo sin tener que aprender diez símbolos.
//
// El juego, hoy, distingue estos métodos: ko, tko, decision, sumision y
// descalificacion. No separa decisión unánime de dividida — si esa distinción
// se agrega alguna vez al núcleo, acá alcanza con sumar una entrada más a
// `DIBUJOS`.

const NS = 'http://www.w3.org/2000/svg';

const COLOR_RESULTADO = {
  v: { trazo: '#8fd694', halo: 'rgba(143, 214, 148, 0.22)' },
  d: { trazo: '#ef4444', halo: 'rgba(239, 68, 68, 0.20)' },
  e: { trazo: '#f2c14e', halo: 'rgba(242, 193, 78, 0.20)' },
};

const VEREDICTO = { v: 'Ganaste', d: 'Perdiste', e: 'Empate' };

export const NOMBRE_METODO = {
  ko: 'Nocaut',
  tko: 'Nocaut técnico',
  decision: 'Por puntos',
  sumision: 'Sumisión',
  descalificacion: 'Descalificación',
};

function svgEl(tag, attrs = {}) {
  const nodo = document.createElementNS(NS, tag);
  for (const [clave, valor] of Object.entries(attrs)) {
    if (valor === null || valor === undefined) continue;
    nodo.setAttribute(clave, String(valor));
  }
  return nodo;
}

function agregar(padre, hijos) {
  for (const hijo of hijos) if (hijo) padre.appendChild(hijo);
  return padre;
}

// --- Un dibujo por método -------------------------------------------------
//
// Todos comparten el mismo lienzo de 120x120 y el mismo grosor de trazo, para
// que al cambiar de método no cambie el "peso" visual de la pantalla.

/** Estrella de impacto: alguien se durmió. */
function dibujoNocaut(color) {
  const grupo = svgEl('g');
  const puntas = 12;
  for (let i = 0; i < puntas; i += 1) {
    const angulo = (i / puntas) * Math.PI * 2;
    const largo = i % 2 === 0 ? 52 : 34;
    agregar(grupo, [svgEl('line', {
      x1: 60 + Math.cos(angulo) * 20,
      y1: 60 + Math.sin(angulo) * 20,
      x2: 60 + Math.cos(angulo) * largo,
      y2: 60 + Math.sin(angulo) * largo,
      stroke: color, 'stroke-width': i % 2 === 0 ? 4 : 2.5, 'stroke-linecap': 'round',
    })]);
  }
  agregar(grupo, [svgEl('circle', {
    cx: 60, cy: 60, r: 17, fill: color, 'fill-opacity': 0.25, stroke: color, 'stroke-width': 3.5,
  })]);
  return grupo;
}

/** La misma estrella, pero cortada por la señal de "se terminó": el rincón
 *  o el árbitro pararon la pelea antes de que alguien quedara dormido. */
function dibujoNocautTecnico(color) {
  const grupo = dibujoNocaut(color);
  agregar(grupo, [svgEl('line', {
    x1: 26, y1: 94, x2: 94, y2: 26, stroke: color, 'stroke-width': 5, 'stroke-linecap': 'round',
  })]);
  return grupo;
}

/** Tres tarjetas de jurado: la pelea llegó al final y la definieron ellos. */
function dibujoPuntos(color) {
  const grupo = svgEl('g');
  [22, 47, 72].forEach((x, i) => {
    agregar(grupo, [svgEl('rect', {
      x, y: 32 + (i === 1 ? -6 : 0), width: 26, height: 56, rx: 4,
      fill: color, 'fill-opacity': i === 1 ? 0.28 : 0.12,
      stroke: color, 'stroke-width': i === 1 ? 3.5 : 2.5,
    })]);
  });
  return grupo;
}

/** Un brazo rendido: la mano que golpea la lona. */
function dibujoSumision(color) {
  const grupo = svgEl('g');
  agregar(grupo, [
    svgEl('path', {
      d: 'M32 84 L58 44 L74 60 L92 38',
      fill: 'none', stroke: color, 'stroke-width': 4.5,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    }),
    svgEl('circle', { cx: 92, cy: 38, r: 8, fill: color, 'fill-opacity': 0.3, stroke: color, 'stroke-width': 3 }),
    svgEl('line', { x1: 24, y1: 92, x2: 96, y2: 92, stroke: color, 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.55 }),
  ]);
  return grupo;
}

/** La pelea no terminó como una pelea: alguien se fue por la puerta chica. */
function dibujoDescalificacion(color) {
  const grupo = svgEl('g');
  agregar(grupo, [
    svgEl('circle', { cx: 60, cy: 60, r: 36, fill: 'none', stroke: color, 'stroke-width': 4, 'stroke-dasharray': '8 6' }),
    svgEl('line', { x1: 38, y1: 38, x2: 82, y2: 82, stroke: color, 'stroke-width': 5, 'stroke-linecap': 'round' }),
    svgEl('line', { x1: 82, y1: 38, x2: 38, y2: 82, stroke: color, 'stroke-width': 5, 'stroke-linecap': 'round' }),
  ]);
  return grupo;
}

const DIBUJOS = {
  ko: dibujoNocaut,
  tko: dibujoNocautTecnico,
  decision: dibujoPuntos,
  sumision: dibujoSumision,
  descalificacion: dibujoDescalificacion,
};

/**
 * El emblema completo: el dibujo del método, con el color del veredicto.
 *
 * `metodo` desconocido cae en el de puntos, que es el desenlace más común y
 * el más neutro de los cinco — nunca se devuelve `null`, para que la pantalla
 * no cambie de forma por un método que el núcleo agregue mañana.
 *
 * @param {{resultado?: 'v'|'d'|'e', metodo?: string}} opciones
 * @returns {SVGSVGElement}
 */
export function emblemaResultado({ resultado = 'v', metodo = 'decision' } = {}) {
  const color = COLOR_RESULTADO[resultado] ?? COLOR_RESULTADO.e;
  const dibujar = DIBUJOS[metodo] ?? DIBUJOS.decision;

  const svg = svgEl('svg', {
    viewBox: '0 0 120 120',
    class: `emblema-resultado emblema-${resultado}`,
    role: 'img',
    'aria-label': `${VEREDICTO[resultado] ?? ''} por ${(NOMBRE_METODO[metodo] ?? metodo).toLowerCase()}`,
  });

  agregar(svg, [
    svgEl('circle', { cx: 60, cy: 60, r: 56, fill: color.halo }),
    dibujar(color.trazo),
  ]);
  return svg;
}

export { VEREDICTO };
