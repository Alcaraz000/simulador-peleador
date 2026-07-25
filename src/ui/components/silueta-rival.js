// Silueta del rival groggy para el golpe de gracia (Task 4.4). Devuelve UN
// SOLO <svg>: el cuerpo del boxeador y las etiquetas de zona (mentón/sien/
// hígado) viven en el mismo viewBox, unidas por una línea al punto anclado
// sobre el cuerpo. Nada se posiciona con CSS/offsets — así ninguna etiqueta
// puede "descolgarse" de la figura, sea cual sea el tamaño en pantalla.
//
// El dibujo del cuerpo (`dibujarCuerpo`) está separado a propósito de la
// lógica de anclas/etiquetas (`grupoZona`/`dibujarSilueta`): el usuario ya
// avisó que más adelante va a traer su propio dibujo del boxeador, y con
// esta separación ese reemplazo no toca un solo píxel de la lógica de zonas.

const NS = 'http://www.w3.org/2000/svg';

const VB_W = 520;
const VB_H = 330;

const COLOR_ESTADO = { abierto: '#8fd694', riesgoso: '#f2c14e', tapado: '#ef4444' };
const TEXTO_ESTADO = { abierto: 'ABIERTO', riesgoso: 'RIESGOSO', tapado: 'TAPADO' };

// Puntos anclados sobre el cuerpo. Son fijos entre posturas: lo que cambia
// con la postura son los brazos (ver dibujarCuerpo), no dónde está la cara
// o el hígado.
const ANCLAS = {
  menton: { x: 261, y: 85 },
  sien: { x: 286, y: 54 },
  higado: { x: 236, y: 172 },
};

// Slots de etiqueta, fijos en el viewBox. La zona "abierta" (la más
// importante de leer) siempre va al slot izquierdo, grande, centrado cerca
// de su propia ancla. Las otras dos zonas van a los dos slots de la derecha,
// ordenadas de arriba a abajo según la altura de su ancla — así el layout
// nunca se recalcula "a mano" por postura y nunca se pisan entre sí.
const SLOT_IZQUIERDA = { x: 40, w: 132, h: 38 };
const SLOTS_DERECHA = [
  { x: 352, y: 26, w: 122, h: 36 },
  { x: 352, y: 114, w: 122, h: 36 },
];

function svgEl(tag, attrs = {}, texto = null) {
  const nodo = document.createElementNS(NS, tag);
  for (const [clave, valor] of Object.entries(attrs)) {
    if (valor === null || valor === undefined) continue;
    nodo.setAttribute(clave, String(valor));
  }
  if (texto !== null) nodo.textContent = texto;
  return nodo;
}

function agregar(padre, hijos) {
  for (const hijo of hijos) padre.appendChild(hijo);
  return padre;
}

// ---- El cuerpo: aislado, fácil de sustituir -----------------------------

function piernas() {
  return [
    svgEl('path', { d: 'M234 232 L216 318 L242 318 L250 238 Z', fill: '#2b1a1c' }),
    svgEl('path', { d: 'M282 234 L304 314 L280 318 L268 240 Z', fill: '#241618' }),
  ];
}

function shortYTorso() {
  return [
    svgEl('path', { d: 'M224 200 L294 200 L300 242 L218 242 Z', fill: '#8f2530' }),
    svgEl('path', { d: 'M224 219 L298 219', stroke: '#c03040', 'stroke-width': 3 }),
    svgEl('path', {
      d: 'M220 112 Q216 99 232 93 L290 93 Q306 99 302 112 L296 204 Q258 216 226 204 Z', fill: '#43292a',
    }),
    svgEl('path', { d: 'M258 128 L258 196', stroke: '#2f1c1b', 'stroke-width': 2.5, opacity: 0.8 }),
    svgEl('path', { d: 'M234 136 Q258 147 282 136', stroke: '#2f1c1b', 'stroke-width': 2.5, fill: 'none', opacity: 0.8 }),
    svgEl('path', { d: 'M240 160 L276 160', stroke: '#2f1c1b', 'stroke-width': 2, opacity: 0.55 }),
    svgEl('path', { d: 'M242 178 L274 178', stroke: '#2f1c1b', 'stroke-width': 2, opacity: 0.55 }),
  ];
}

function cabeza() {
  return [
    svgEl('ellipse', { cx: 261, cy: 62, rx: 27, ry: 31, fill: '#4d3130' }),
    svgEl('path', { d: 'M234 52 Q261 28 288 52 Q278 40 261 38 Q244 40 234 52 Z', fill: '#1e1210' }),
    svgEl('path', { d: 'M248 58 L256 60', stroke: '#1e1210', 'stroke-width': 2.5 }),
    svgEl('path', { d: 'M266 60 L274 58', stroke: '#1e1210', 'stroke-width': 2.5 }),
    svgEl('path', { d: 'M252 78 Q261 84 270 78', stroke: '#d8d0c0', 'stroke-width': 3, fill: 'none' }),
  ];
}

function brazoIzquierdoArriba() {
  return [
    svgEl('path', { d: 'M222 115 Q198 130 196 99 L210 87 Q218 108 232 110 Z', fill: '#4d3130' }),
    svgEl('ellipse', { cx: 204, cy: 76, rx: 24, ry: 21, fill: '#5f2027' }),
    svgEl('path', { d: 'M188 83 L220 83', stroke: '#331014', 'stroke-width': 3 }),
  ];
}

function brazoDerechoArriba() {
  return [
    svgEl('path', { d: 'M300 115 Q324 130 326 99 L312 87 Q304 108 290 110 Z', fill: '#4d3130' }),
    svgEl('ellipse', { cx: 318, cy: 76, rx: 24, ry: 21, fill: '#5f2027' }),
    svgEl('path', { d: 'M302 83 L334 83', stroke: '#331014', 'stroke-width': 3 }),
  ];
}

function brazoIzquierdoCaido() {
  return [
    svgEl('path', { d: 'M222 115 Q198 156 202 200 L220 202 Q216 158 232 122 Z', fill: '#4d3130' }),
    svgEl('ellipse', { cx: 210, cy: 216, rx: 22, ry: 19, fill: '#5f2027' }),
  ];
}

function brazoDerechoCaido() {
  return [
    svgEl('path', { d: 'M300 115 Q324 156 320 200 L302 202 Q306 158 290 122 Z', fill: '#4d3130' }),
    svgEl('ellipse', { cx: 312, cy: 216, rx: 22, ry: 19, fill: '#5f2027' }),
  ];
}

function brazoIzquierdoAlCuerpo() {
  return [
    svgEl('path', { d: 'M222 115 Q206 145 224 175 L238 168 Q226 142 232 118 Z', fill: '#4d3130' }),
    svgEl('ellipse', { cx: 228, cy: 182, rx: 20, ry: 17, fill: '#5f2027' }),
  ];
}

function brazoDerechoAlCuerpo() {
  return [
    svgEl('path', { d: 'M300 115 Q316 145 298 175 L284 168 Q296 142 290 118 Z', fill: '#4d3130' }),
    svgEl('ellipse', { cx: 294, cy: 182, rx: 20, ry: 17, fill: '#5f2027' }),
  ];
}

// Guantes y brazos por postura. Cabeza, torso y piernas no cambian: solo la
// guardia se mueve, que es lo que realmente abre o cierra cada zona.
const BRAZOS_POR_POSTURA = {
  guardia_alta: () => [...brazoIzquierdoArriba(), ...brazoDerechoArriba()],
  manos_abajo: () => [...brazoIzquierdoCaido(), ...brazoDerechoCaido()],
  cubre_un_lado: () => [...brazoIzquierdoArriba(), ...brazoDerechoCaido()],
  contra_cuerdas: () => [...brazoIzquierdoAlCuerpo(), ...brazoDerechoAlCuerpo()],
};

/** El dibujo del boxeador, aislado de la lógica de anclas/etiquetas. */
export function dibujarCuerpo(postura) {
  const brazos = BRAZOS_POR_POSTURA[postura] ?? BRAZOS_POR_POSTURA.guardia_alta;
  const grupo = svgEl('g', { 'data-parte': 'cuerpo' });
  return agregar(grupo, [...piernas(), ...shortYTorso(), ...brazos(), ...cabeza()]);
}

// ---- Zonas: anclas, líneas y etiquetas -----------------------------------

function asignarSlots(zonas) {
  const abierta = zonas.find((z) => z.estado === 'abierto') ?? zonas[0];
  const resto = zonas.filter((z) => z.id !== abierta.id).sort((a, b) => ANCLAS[a.id].y - ANCLAS[b.id].y);

  const asignaciones = new Map();
  const anclaAbierta = ANCLAS[abierta.id];
  const yIzquierda = Math.min(Math.max(anclaAbierta.y - 19, 4), VB_H - SLOT_IZQUIERDA.h - 4);
  asignaciones.set(abierta.id, { ...SLOT_IZQUIERDA, y: yIzquierda, lado: 'izquierda' });

  resto.forEach((zona, i) => {
    asignaciones.set(zona.id, { ...SLOTS_DERECHA[i] ?? SLOTS_DERECHA[SLOTS_DERECHA.length - 1], lado: 'derecha' });
  });

  return asignaciones;
}

function puntoDeBorde(slot, ancla) {
  const y = Math.min(Math.max(ancla.y, slot.y + 4), slot.y + slot.h - 4);
  return slot.lado === 'izquierda'
    ? { x: slot.x + slot.w, y }
    : { x: slot.x, y };
}

function grupoZona(zona, slot, onElegirZona) {
  const ancla = ANCLAS[zona.id];
  const color = COLOR_ESTADO[zona.estado] ?? COLOR_ESTADO.riesgoso;
  const esAbierto = zona.estado === 'abierto';
  const esTapado = zona.estado === 'tapado';
  const dash = esTapado ? '4 3' : null;
  const borde = puntoDeBorde(slot, ancla);

  const grupo = svgEl('g', {
    class: 'silueta-zona',
    'data-zona': zona.id,
    'data-estado': zona.estado,
    tabindex: '0',
    role: 'button',
    'aria-label': `${zona.nombre}: ${TEXTO_ESTADO[zona.estado] ?? zona.estado}`,
    opacity: esTapado ? 0.7 : 1,
  });

  const activar = () => onElegirZona(zona.id);
  grupo.addEventListener('click', activar);
  grupo.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); activar(); }
  });

  const centroX = slot.x + slot.w / 2;

  agregar(grupo, [
    svgEl('circle', {
      cx: ancla.x, cy: ancla.y, r: esAbierto ? 9 : 6,
      fill: esAbierto ? color : 'none', 'fill-opacity': esAbierto ? 0.2 : null,
      stroke: color, 'stroke-width': esAbierto ? 2.5 : 2, 'stroke-dasharray': dash,
    }),
    svgEl('path', {
      d: `M${ancla.x} ${ancla.y} L${borde.x} ${borde.y}`,
      stroke: color, 'stroke-width': 1.4, opacity: 0.8, 'stroke-dasharray': dash,
    }),
    svgEl('rect', {
      x: slot.x, y: slot.y, width: slot.w, height: slot.h, rx: slot.h / 2,
      fill: '#140809', stroke: color, 'stroke-width': 1.6, 'stroke-dasharray': dash,
    }),
    svgEl('text', {
      x: centroX, y: slot.y + slot.h * 0.42, 'text-anchor': 'middle', fill: color,
      'font-size': 12.5, 'font-weight': 800, 'letter-spacing': 1,
    }, zona.nombre.toUpperCase()),
    svgEl('text', {
      x: centroX, y: slot.y + slot.h * 0.82, 'text-anchor': 'middle', fill: color, opacity: 0.85,
      'font-size': 8.5, 'letter-spacing': 1,
    }, TEXTO_ESTADO[zona.estado] ?? ''),
  ]);

  return grupo;
}

/**
 * Dibuja al rival groggy: el cuerpo con la postura dada, y las tres zonas
 * (mentón/sien/hígado) ancladas sobre el cuerpo, con su etiqueta dentro del
 * mismo SVG. Clickear (o Enter/Espacio) una zona llama a `onElegirZona(id)`.
 *
 * @param {{postura: string, zonas: Array<{id:string, nombre:string, estado:string}>, onElegirZona: (id:string) => void}} opciones
 * @returns {SVGSVGElement}
 */
export function dibujarSilueta({ postura, zonas, onElegirZona = () => {} }) {
  const svg = svgEl('svg', {
    viewBox: `0 0 ${VB_W} ${VB_H}`,
    class: 'silueta-rival',
    role: 'group',
    'aria-label': 'Silueta del rival: elegí dónde pegar',
  });

  svg.appendChild(dibujarCuerpo(postura));

  const slots = asignarSlots(zonas);
  const grupoZonas = svgEl('g', { 'data-parte': 'zonas' });
  for (const zona of zonas) {
    grupoZonas.appendChild(grupoZona(zona, slots.get(zona.id), onElegirZona));
  }
  svg.appendChild(grupoZonas);

  return svg;
}
