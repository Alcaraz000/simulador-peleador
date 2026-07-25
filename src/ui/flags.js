// Banderas dibujadas en SVG inline. Windows no trae los glifos de bandera en su
// fuente de emojis (🇦🇷 se ve como "AR"), así que esto reemplaza todo emoji de
// bandera en la UI. Los demás emojis (🏆) sí renderizan bien y se mantienen.

const NS = 'http://www.w3.org/2000/svg';

// Relación 3:2, en unidades de viewBox.
const ANCHO_VB = 30;
const ALTO_VB = 20;

let contadorClip = 0;

function svgEl(tag, attrs = {}) {
  const nodo = document.createElementNS(NS, tag);
  for (const [clave, valor] of Object.entries(attrs)) {
    nodo.setAttribute(clave, String(valor));
  }
  return nodo;
}

function dibujarAR(g) {
  const celeste = '#75aadb';
  const blanco = '#f4f6f0';
  const franja = ALTO_VB / 3;
  g.appendChild(svgEl('rect', { x: 0, y: 0, width: ANCHO_VB, height: franja, fill: celeste }));
  g.appendChild(svgEl('rect', { x: 0, y: franja, width: ANCHO_VB, height: franja, fill: blanco }));
  g.appendChild(svgEl('rect', { x: 0, y: franja * 2, width: ANCHO_VB, height: franja, fill: celeste }));

  const cx = ANCHO_VB / 2;
  const cy = ALTO_VB / 2;
  for (let i = 0; i < 8; i += 1) {
    const ang = (Math.PI * 2 * i) / 8;
    g.appendChild(svgEl('line', {
      x1: cx + Math.cos(ang) * 3.1,
      y1: cy + Math.sin(ang) * 3.1,
      x2: cx + Math.cos(ang) * 4.7,
      y2: cy + Math.sin(ang) * 4.7,
      stroke: '#e8a838',
      'stroke-width': 0.7,
      'stroke-linecap': 'round',
    }));
  }
  g.appendChild(svgEl('circle', { cx, cy, r: 2.6, fill: '#f2c14e', stroke: '#c78a1e', 'stroke-width': 0.4 }));
}

function dibujarMX(g) {
  const ancho3 = ANCHO_VB / 3;
  g.appendChild(svgEl('rect', { x: 0, y: 0, width: ancho3, height: ALTO_VB, fill: '#2f8a3a' }));
  g.appendChild(svgEl('rect', { x: ancho3, y: 0, width: ancho3, height: ALTO_VB, fill: '#f4f6f0' }));
  g.appendChild(svgEl('rect', { x: ancho3 * 2, y: 0, width: ancho3, height: ALTO_VB, fill: '#c8352f' }));
  g.appendChild(svgEl('circle', {
    cx: ANCHO_VB / 2, cy: ALTO_VB / 2, r: 2.3, fill: '#a56b1e', stroke: '#5a3a10', 'stroke-width': 0.4,
  }));
}

function dibujarUS(g) {
  const franjas = 7;
  const alto = ALTO_VB / franjas;
  for (let i = 0; i < franjas; i += 1) {
    g.appendChild(svgEl('rect', {
      x: 0, y: i * alto, width: ANCHO_VB, height: alto + 0.2,
      fill: i % 2 === 0 ? '#b5342f' : '#f4f6f0',
    }));
  }
  const cantonAncho = ANCHO_VB * 0.42;
  const cantonAlto = alto * 4;
  g.appendChild(svgEl('rect', { x: 0, y: 0, width: cantonAncho, height: cantonAlto, fill: '#2a4a8a' }));
  for (let fila = 0; fila < 2; fila += 1) {
    for (let col = 0; col < 4; col += 1) {
      g.appendChild(svgEl('circle', {
        cx: 2 + (col * (cantonAncho - 4)) / 3,
        cy: 2.4 + fila * (cantonAlto - 4.8),
        r: 0.5,
        fill: '#f4f6f0',
      }));
    }
  }
}

function dibujarES(g) {
  const rojoAlto = ALTO_VB * 0.25;
  g.appendChild(svgEl('rect', { x: 0, y: 0, width: ANCHO_VB, height: rojoAlto, fill: '#aa151b' }));
  g.appendChild(svgEl('rect', {
    x: 0, y: rojoAlto, width: ANCHO_VB, height: ALTO_VB - rojoAlto * 2, fill: '#f1bf00',
  }));
  g.appendChild(svgEl('rect', { x: 0, y: ALTO_VB - rojoAlto, width: ANCHO_VB, height: rojoAlto, fill: '#aa151b' }));
}

function dibujarIT(g) {
  const ancho3 = ANCHO_VB / 3;
  g.appendChild(svgEl('rect', { x: 0, y: 0, width: ancho3, height: ALTO_VB, fill: '#2f8a3a' }));
  g.appendChild(svgEl('rect', { x: ancho3, y: 0, width: ancho3, height: ALTO_VB, fill: '#f4f6f0' }));
  g.appendChild(svgEl('rect', { x: ancho3 * 2, y: 0, width: ancho3, height: ALTO_VB, fill: '#c8352f' }));
}

function dibujarJP(g) {
  g.appendChild(svgEl('rect', { x: 0, y: 0, width: ANCHO_VB, height: ALTO_VB, fill: '#f4f6f0' }));
  g.appendChild(svgEl('circle', {
    cx: ANCHO_VB / 2, cy: ALTO_VB / 2, r: ALTO_VB * 0.3, fill: '#bc2a3a',
  }));
}

function dibujarDesconocida(g) {
  g.appendChild(svgEl('rect', { x: 0, y: 0, width: ANCHO_VB, height: ALTO_VB, fill: '#3a2a2a' }));
  g.appendChild(svgEl('circle', {
    cx: ANCHO_VB / 2, cy: ALTO_VB / 2, r: 3, fill: 'none', stroke: '#8a6a6a', 'stroke-width': 1,
  }));
  g.appendChild(svgEl('path', {
    d: `M${ANCHO_VB / 2 - 2} ${ALTO_VB / 2 - 2} L${ANCHO_VB / 2 + 2} ${ALTO_VB / 2 + 2}`,
    stroke: '#8a6a6a', 'stroke-width': 0.8,
  }));
}

const DIBUJANTES = {
  AR: dibujarAR,
  MX: dibujarMX,
  US: dibujarUS,
  ES: dibujarES,
  IT: dibujarIT,
  JP: dibujarJP,
};

/** Dibuja la bandera del código dado como un <svg> inline, relación 3:2 y esquinas redondeadas. */
export function bandera(codigo, { ancho = 24 } = {}) {
  const alto = Math.round((ancho * ALTO_VB) / ANCHO_VB);

  contadorClip += 1;
  const clipId = `bandera-clip-${contadorClip}`;

  const svg = svgEl('svg', {
    width: ancho,
    height: alto,
    viewBox: `0 0 ${ANCHO_VB} ${ALTO_VB}`,
    class: 'bandera-svg',
    role: 'img',
    'aria-hidden': 'true',
  });

  const defs = svgEl('defs');
  const clip = svgEl('clipPath', { id: clipId });
  clip.appendChild(svgEl('rect', { x: 0, y: 0, width: ANCHO_VB, height: ALTO_VB, rx: 2.4 }));
  defs.appendChild(clip);
  svg.appendChild(defs);

  const g = svgEl('g', { 'clip-path': `url(#${clipId})` });
  svg.appendChild(g);

  const dibujar = DIBUJANTES[codigo] ?? dibujarDesconocida;
  dibujar(g);

  svg.appendChild(svgEl('rect', {
    x: 0.25, y: 0.25, width: ANCHO_VB - 0.5, height: ALTO_VB - 0.5, rx: 2.2,
    fill: 'none', stroke: 'rgba(0,0,0,0.28)', 'stroke-width': 0.5,
  }));

  return svg;
}
