// Silueta del rival groggy para el golpe de gracia (Task 4.4; reemplazo de
// arte del usuario, v7). Devuelve UN SOLO <svg>: la foto del boxeador y las
// etiquetas de zona (mentón/sien/hígado) viven en el mismo viewBox, unidas
// por una línea al punto anclado sobre el cuerpo. Nada se posiciona con
// CSS/offsets — así ninguna etiqueta puede "descolgarse" de la figura, sea
// cual sea el tamaño en pantalla.
//
// El dibujo del cuerpo (`dibujarCuerpo`) está separado a propósito de la
// lógica de anclas/etiquetas (`grupoZona`/`dibujarSilueta`): antes dibujaba
// paths a mano; ahora inserta una de las tres fotos que trajo el usuario
// (docs/golpedegracia/, recortadas/comprimidas a src/assets/golpe-de-gracia/).
// La separación se mantuvo intacta: este reemplazo no tocó la lógica de
// zonas, solo `dibujarCuerpo` y las constantes de geometría de abajo (que
// tuvieron que remedirse sobre la anatomía de las fotos nuevas).
import cubriendoMenton from '../../assets/golpe-de-gracia/cubriendo-menton.webp';
import cubriendoSien from '../../assets/golpe-de-gracia/cubriendo-sien.webp';
import cubriendoHigado from '../../assets/golpe-de-gracia/cubriendo-higado.webp';

const NS = 'http://www.w3.org/2000/svg';

// El viewBox ahora coincide con la resolución real de las fotos (recortadas
// a 640x487, ver docs/golpedegracia/): así el <image> se dibuja 1:1, sin
// distorsión, y las coordenadas de abajo son directamente píxeles de foto.
const VB_W = 640;
const VB_H = 487;

const COLOR_ESTADO = { abierto: '#8fd694', riesgoso: '#f2c14e', tapado: '#ef4444' };
const TEXTO_ESTADO = { abierto: 'ABIERTO', riesgoso: 'RIESGOSO', tapado: 'TAPADO' };

// Las tres fotos son el mismo boxeador desde la misma cámara (solo cambian
// los brazos/guantes): cabeza, torso y hígado quedan siempre en el mismo
// lugar entre fotos, así que las anclas —igual que antes— son fijas y no
// dependen de la postura. Medidas a mano sobre cubriendo-{menton,sien,
// higado}.webp (640x487): mentón en la base de la mandíbula, sien sobre el
// pómulo/sien derecha (der. de cámara), hígado sobre las costillas bajas del
// lado izquierdo de cámara (el derecho del boxeador, anatómicamente).
const ANCLAS = {
  menton: { x: 322, y: 205 },
  sien: { x: 375, y: 122 },
  higado: { x: 248, y: 358 },
};

// Slots de etiqueta, fijos en el viewBox. La zona "abierta" (la más
// importante de leer) siempre va al slot izquierdo, grande, centrado cerca
// de su propia ancla. Las otras dos zonas van a los dos slots de la derecha,
// ordenadas de arriba a abajo según la altura de su ancla — así el layout
// nunca se recalcula "a mano" por postura y nunca se pisan entre sí.
//
// Con la foto el cuerpo ocupa más ancho relativo que el dibujo viejo (ver
// CUERPO_X_MIN/MAX en el test): los márgenes laterales para las etiquetas
// son más angostos, así que estos slots son más angostos que los de antes
// (104/124 vs 132/122) para no invadir la figura ni salirse del viewBox.
// v17, "acomodá mejor los botones": antes los slots se REPARTÍAN según el
// estado — la zona abierta saltaba al slot izquierdo y las otras dos se
// apilaban arriba a la derecha, así que las tres etiquetas cambiaban de lugar
// entre postura y postura y las líneas cruzaban media figura para llegar a su
// ancla. Ahora cada zona tiene SU lugar, siempre el mismo, a la altura de su
// propia ancla: la sien y el mentón en el margen derecho, el hígado en el
// izquierdo (que es de qué lado cae su ancla). Las líneas quedan cortas y
// casi horizontales, y el jugador aprende dónde mirar en vez de releer el
// cartel cada vez — que es lo que hace jugable una ventana de dos segundos.
//
// Los márgenes libres son angostos (el cuerpo ocupa x=112..508 en el viewBox,
// ver el test): 112px a la izquierda y 132px a la derecha. Estos slots los
// aprovechan casi enteros sin invadir la figura.
const SLOTS = {
  sien: { x: 508, y: 98, w: 128, h: 46, lado: 'derecha' },
  menton: { x: 508, y: 182, w: 128, h: 46, lado: 'derecha' },
  higado: { x: 4, y: 334, w: 104, h: 46, lado: 'izquierda' },
};

// Qué foto va con cada postura: el criterio es la zona que la postura marca
// `tapado` (pedido textual: "que la imagen sea coherente con qué zona está
// tapada"). guardia_alta tapa el mentón y contra_cuerdas tapa el hígado, así
// que cada una tiene su propia foto; manos_abajo y cubre_un_lado tapan las
// dos la sien, así que comparten la foto de sien (no sobran fotos para las
// cuatro posturas, y esto evita mostrar una guardia que contradiga el texto
// "tapado").
const IMAGEN_POR_POSTURA = {
  guardia_alta: cubriendoMenton, // zonas.menton === 'tapado'
  manos_abajo: cubriendoSien, // zonas.sien === 'tapado'
  cubre_un_lado: cubriendoSien, // zonas.sien === 'tapado'
  contra_cuerdas: cubriendoHigado, // zonas.higado === 'tapado'
};

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

let contadorClip = 0;

/**
 * El dibujo del boxeador, aislado de la lógica de anclas/etiquetas: la foto
 * que corresponde según `IMAGEN_POR_POSTURA`, recortada a las esquinas
 * redondeadas del resto de los paneles del juego (12px, ver .panel en
 * theme.css). `aria-hidden` porque la información de la zona ya la da el
 * propio botón accesible (`grupoZona`, más abajo) — la imagen es decorativa.
 */
export function dibujarCuerpo(postura) {
  const src = IMAGEN_POR_POSTURA[postura] ?? IMAGEN_POR_POSTURA.guardia_alta;
  contadorClip += 1;
  const clipId = `silueta-clip-${contadorClip}`;

  const grupo = svgEl('g', { 'data-parte': 'cuerpo', 'aria-hidden': 'true' });
  const defs = svgEl('defs', {}, null);
  const clipPath = svgEl('clipPath', { id: clipId });
  clipPath.appendChild(svgEl('rect', {
    x: 0, y: 0, width: VB_W, height: VB_H, rx: 12,
  }));
  defs.appendChild(clipPath);

  const imagen = svgEl('image', {
    href: src, x: 0, y: 0, width: VB_W, height: VB_H,
    preserveAspectRatio: 'xMidYMid slice', 'clip-path': `url(#${clipId})`,
  });

  return agregar(grupo, [defs, imagen]);
}

// ---- Zonas: anclas, líneas y etiquetas -----------------------------------

function asignarSlots(zonas) {
  const asignaciones = new Map();
  for (const zona of zonas) asignaciones.set(zona.id, SLOTS[zona.id] ?? SLOTS.menton);
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
    // Área de click, invisible y bien más grande que el círculo dibujado: la
    // ventana del golpe dura ~2s, así que fallar el click por un par de
    // píxeles es la peor forma de perder la chance. `pointer-events:all` a
    // pesar de `fill:none` — sin eso un relleno transparente no recibe clicks.
    svgEl('circle', {
      cx: ancla.x, cy: ancla.y, r: 40, fill: 'transparent', 'pointer-events': 'all',
    }),
    // v17, "hacé un poco más grandes los círculos que marcan las zonas":
    // 9/6 quedaban como una marquita sobre una foto de 640px de ancho.
    svgEl('circle', {
      class: esAbierto ? 'silueta-ancla silueta-ancla-abierta' : 'silueta-ancla',
      cx: ancla.x, cy: ancla.y, r: esAbierto ? 20 : 15,
      fill: esAbierto ? color : '#140809', 'fill-opacity': esAbierto ? 0.22 : 0.45,
      stroke: color, 'stroke-width': esAbierto ? 3.5 : 2.6, 'stroke-dasharray': dash,
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
      'font-size': 14, 'font-weight': 800, 'letter-spacing': 1,
    }, zona.nombre.toUpperCase()),
    svgEl('text', {
      x: centroX, y: slot.y + slot.h * 0.82, 'text-anchor': 'middle', fill: color, opacity: 0.85,
      'font-size': 9.5, 'letter-spacing': 1,
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
