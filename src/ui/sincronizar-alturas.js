// Pedido 1 (v10, pedido textual del usuario): "lo más bajo que puede estar
// la sección del resumen es el piso del módulo del ranking [el último panel
// de la columna izquierda] — lo mismo el módulo de noticias, tiene que
// tener de 'piso' la misma altura que el 'piso' del módulo de ranking". La
// columna izquierda (panel-peleador.js) marca el alto de referencia; el
// resumen del año (columna central) y el módulo de noticias (columna
// derecha) nunca pueden terminar más abajo.
//
// La izquierda NO tiene una altura constante durante toda la carrera: el
// panel de historial (bloqueHistorial, panel-peleador.js) agrega una fila de
// "rachita" + hasta 3 peleas recientes recién cuando el jugador ya peleó al
// menos una vez — su alto real da un salto la primera vez que hay historial,
// y se mantiene desde ahí. Copiar un número fijo (una captura de pantalla en
// un momento puntual de la carrera) se habría roto apenas la izquierda
// cambiara de alto — así que "el piso de la izquierda" es un valor que hay
// que MEDIR en cada partida, nunca una constante.
//
// Esto es EL MISMO criterio que ya usa panel-noticias.js para su lista
// (`height` fijo, nunca `max-height` que crezca con el contenido) llevado un
// nivel más arriba: acá el "contenido" que nunca puede estirar el módulo no
// son las propias noticias/gráficos, es la ALTURA DE LA COLUMNA VECINA. La
// solución es la misma: medir, y acotar con un `max-height` fijo (nunca un
// `height` que dependa de cuánto mida el vecino en cada re-render futuro) +
// scroll interno — jamás estirar nada, jamás tocar la izquierda.
//
// El cálculo es SIMÉTRICO a propósito (no solo "si sobra, recorta"): agranda
// el elemento cuando hay lugar de sobra (hasta su alto natural, nunca más) y
// lo achica cuando no entra — así siempre se aprovecha TODO el piso
// disponible, en vez de quedarse corto por culpa de un resguardo estático
// (el `max-height:60vh` de `.resumen-anio-cuerpo`, ver theme.css) que no
// sabe nada de la izquierda real de esta partida.
//
// Función pura (`alturaLimitada`) + función que toca el DOM
// (`limitarAlAltoDeIzquierda`), separadas a propósito: happy-dom (Vitest) no
// calcula layout real, así que `getBoundingClientRect()` no sirve para
// testear la LÓGICA del cálculo — mismo motivo por el que ranking.test.js
// stubea `scrollIntoView` en vez de confiar en un layout real.

const ALTO_MINIMO_PX = 120;

/**
 * Calcula el alto (px) que necesita `elemento` para que, sumado al resto de
 * su columna, el total quede EXACTO al alto de referencia (la izquierda) —
 * ni más (se pasaría del piso) ni menos (desaprovecharía lugar que sí hay).
 *
 * @param {{
 *   altoReferencia: number, altoColumna: number, altoElemento: number,
 *   minimo?: number, maximo?: number,
 * }} datos
 * @returns {number} el nuevo alto, siempre acotado entre `minimo` y `maximo`
 *   (el alto natural sin recortar de `elemento`: no tiene sentido crecerlo
 *   más allá de todo su contenido).
 */
export function alturaLimitada({
  altoReferencia, altoColumna, altoElemento, minimo = ALTO_MINIMO_PX, maximo = Infinity,
}) {
  const ideal = altoElemento + (altoReferencia - altoColumna);
  return Math.min(maximo, Math.max(minimo, ideal));
}

// La regla "el piso de la izquierda es la referencia" es de ESCRITORIO: en
// celular las tres columnas se apilan (ver shell.js, `@media (min-width:
// 960px)` en theme.css) — ahí cada una ocupa el ancho completo, una debajo
// de la otra, y "no pasarse del piso de la izquierda" no significa nada
// (la izquierda ya quedó arriba de todo, con su propio piso fijo).
function esEscritorio() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(min-width: 960px)').matches;
  } catch {
    return false;
  }
}

/**
 * Mide el alto real de `izquierda` (la referencia) y de `columna` (derecha o
 * centro), y ajusta el alto de `elemento` (el único trozo con scroll propio
 * de esa columna: la lista de noticias, o el cuerpo scrollable del resumen
 * del año) para que la columna termine EXACTO al piso de la izquierda —
 * nunca más abajo, y usando todo el lugar disponible si hay de sobra.
 *
 * @param {{
 *   izquierda: HTMLElement|null, columna: HTMLElement|null, elemento: HTMLElement|null,
 *   escritorio?: () => boolean, minimo?: number,
 *   propiedad?: 'maxHeight'|'height',
 * }} args
 *
 * `propiedad` (v14, bug real encontrado con Playwright — "el panel de
 * noticias no cierra a la misma altura que la columna izquierda"): por
 * default sigue tocando `max-height` (`.resumen-anio-cuerpo` quiere
 * CONTENT-HUGGING — si el contenido real no llena el piso disponible, se
 * queda en su alto natural, nunca inventa aire vacío abajo; `max-height` da
 * exactamente eso, dejando además el resguardo estático de la hoja de
 * estilos como red de seguridad detrás). `panel-noticias-lista` en cambio
 * quiere un alto FORZADO de verdad (ver panel-noticias.js: "no es lo
 * suficientemente alto... siempre el mismo, con o sin noticias") — y ahí es
 * donde `max-height` se queda corto: CSS nunca deja que `max-height` haga
 * CRECER un elemento por encima de su propio `height` ya fijado (probado a
 * mano: `height:480px` + `max-height:600px` sigue midiendo 480, nunca 600).
 * Con `propiedad:'height'` esta función pisa esa altura fija directo, en
 * vez de agregarle un techo que nunca gana cuando hace falta CRECER —
 * `.panel-noticias-lista` trae su alto por defecto (480px) en la hoja de
 * estilos (no inline, ver theme.css), así que resetear esta propiedad
 * también revela ese default al medir, igual que el resguardo estático de
 * `.resumen-anio-cuerpo`.
 */
/**
 * `estirarPorEncimaDelContenido` (v15): por defecto el elemento nunca crece
 * más allá de su alto natural — para el módulo de noticias eso es lo
 * correcto (no tiene sentido reservar aire debajo de la última noticia).
 * Pero el panel de decisión sí tiene que LLENAR el hueco aunque su contenido
 * mida menos: el pedido fue "nunca más y nunca menos tampoco", y ahí el
 * espacio sobrante se reparte adentro, entre las tarjetas (ver theme.css,
 * bloque v15).
 */
export function limitarAlAltoDeIzquierda({
  izquierda, columna, elemento, escritorio = esEscritorio, minimo = ALTO_MINIMO_PX,
  propiedad = 'maxHeight', estirarPorEncimaDelContenido = false,
}) {
  if (!izquierda || !columna || !elemento) return;
  if (!escritorio()) { elemento.style[propiedad] = ''; return; }

  // Se resetea ANTES de medir: si una pasada anterior ya había recortado
  // `elemento` (p. ej. la izquierda medía menos en un beat previo), medir
  // con ese recorte todavía puesto arrastraría el número viejo para
  // siempre — nunca podría CRECER de vuelta si la izquierda después mide
  // más. Sacarlo primero deja que esta pasada mida el tamaño de verdad, sin
  // memoria de la pasada anterior (la sincronización es idempotente: correr
  // esto dos veces seguidas dá el mismo resultado las dos veces).
  elemento.style[propiedad] = '';

  const altoReferencia = izquierda.getBoundingClientRect().height;
  const altoColumna = columna.getBoundingClientRect().height;
  const altoElemento = elemento.getBoundingClientRect().height;
  // El techo real (cuánto ocuparía `elemento` con TODO su contenido, sin
  // ningún recorte) no siempre se ve en el rect recién medido: un
  // `max-height` de HOJA DE ESTILOS (no inline — el resguardo estático de
  // `.resumen-anio-cuerpo`, ver theme.css) lo sigue achicando aunque el
  // inline ya se haya sacado arriba. `scrollHeight` es el único valor que
  // de verdad ignora cualquier recorte por overflow y refleja el contenido
  // completo.
  const techo = estirarPorEncimaDelContenido
    ? Infinity
    : Math.max(altoElemento, elemento.scrollHeight);

  const nuevo = alturaLimitada({
    altoReferencia, altoColumna, altoElemento, minimo, maximo: techo,
  });
  elemento.style[propiedad] = `${nuevo}px`;
}
