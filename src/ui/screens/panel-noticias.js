import { el, mount } from '../dom.js';
import { etiquetaTipo, marcarLeidas } from '../../core/news.js';

// Panel de noticias en la columna derecha: alto fijo con scroll interno (no
// crece indefinidamente con la carrera). El botón de cabecera hace doble
// función: en PC simplemente abre/cierra el acordeón; en celular es lo único
// visible de esta región hasta que el jugador lo toca (el resto de la región
// derecha ya se colapsa detrás del botón del shell — ver shell.js — pero acá
// además se marcan las noticias como leídas recién cuando el jugador las abre).
//
// Más alto (revisión v3, feedback textual del usuario: "el módulo, al menos
// en PC, no es lo suficientemente alto como para acompañar al resto de la
// interfaz"): antes 320px, muy corto comparado con la columna izquierda.
const ALTO_LISTA_PX = 480;

// Intervalo entre una noticia y la siguiente al entrar (pedido: "que se
// vayan sumando", no todas de golpe). Dentro de la ventana 250-400ms pedida.
const INTERVALO_ENTRADA_MS = 320;

function prefiereMovimientoReducido() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

// `n.propia` (Pedido v6, "las noticias también deberían nombrar al
// jugador... que se distinga de una noticia del mundo: es tu carrera, tiene
// que resaltar"): la arma cerrarPelea (main.js) con la misma máquina que las
// noticias del mundo (generarNoticia/PLANTILLAS), pero marcada aparte — acá
// solo se traduce esa marca a un look distinto (borde y chip dorados, ver
// theme.css), nunca a una estructura de datos distinta.
function itemNoticia(n, { oculta }) {
  return el('div', {
    class: `panel noticia-item${n.nueva ? ' nueva' : ''}${n.propia ? ' propia' : ''}${oculta ? ' noticia-oculta' : ''}`,
    dataset: { noticia: n.id },
  }, [
    n.propia ? el('span', { class: 'chip dorado', style: 'margin-bottom:4px', text: 'TU CARRERA' }) : null,
    n.nueva ? el('span', { class: 'chip rojo', style: 'margin-bottom:4px', text: 'ÚLTIMO MOMENTO' }) : null,
    el('div', { class: 'etiqueta', text: etiquetaTipo(n.tipo) }),
    el('div', { style: 'font-weight:800;margin-top:3px;font-size:12.5px', text: n.titular }),
    n.cuerpo ? el('p', { class: 'medio', style: 'margin:4px 0 0;font-size:11.5px', text: n.cuerpo }) : null,
  ]);
}

/**
 * @param {HTMLElement} region
 * @param {{
 *   noticias?: Array,
 *   onLeidas?: (feed: Array) => void,
 *   noticiasAnimadas?: Set<string>,
 * }} props - `noticiasAnimadas` es un Set (sostenido por el llamador ENTRE
 *   renders, ver main.js) de ids que ya jugaron su animación de entrada: el
 *   panel se vuelve a montar en cada beat (montarTablero), así que sin esto
 *   la entrada escalonada se repetiría durante todo el bloque, mientras la
 *   noticia siga marcada "nueva" — no solo la primera vez que aparece. Sin
 *   pasar uno propio, cada llamada arranca "en blanco" (útil para tests
 *   aislados de este panel).
 * @returns {{ detener: () => void }} - cancela los timers de entrada
 *   pendientes y deja todo visible ya (mismo patrón que animarRoll en
 *   ui/components/): el llamador lo invoca si el jugador navega a otra
 *   pantalla mientras las noticias siguen entrando.
 */
export function renderPanelNoticias(region, {
  noticias = [], onLeidas = () => {}, noticiasAnimadas = new Set(),
} = {}) {
  const hayNuevas = noticias.some((n) => n.nueva);
  const reducido = prefiereMovimientoReducido();

  const pendientesDeEntrada = reducido
    ? []
    : noticias.filter((n) => n.nueva && !noticiasAnimadas.has(n.id));

  // Con movimiento reducido entran todas juntas, sin animación (pedido
  // explícito): se marcan como "ya vistas" de una para no quedar en un
  // estado raro si más adelante se activa/desactiva el motion reducido.
  if (reducido) {
    noticias.filter((n) => n.nueva).forEach((n) => noticiasAnimadas.add(n.id));
  }

  const idsPendientes = new Set(pendientesDeEntrada.map((n) => n.id));

  const lista = el('div', {
    class: 'panel-noticias-lista',
    style: `max-height:${ALTO_LISTA_PX}px;overflow-y:auto`,
  }, noticias.length > 0
    ? noticias.map((n) => itemNoticia(n, { oculta: idsPendientes.has(n.id) }))
    : [el('p', { class: 'medio', style: 'font-size:12px', text: 'Semana tranquila. Nadie habló de nadie.' })]);

  const raiz = el('div', { class: 'panel panel-noticias' });

  const boton = el('button', {
    class: 'panel-noticias-boton',
    type: 'button',
    dataset: { accion: 'abrir-noticias' },
  }, [
    el('span', { class: 'etiqueta', text: 'Noticias' }),
    hayNuevas ? el('span', { class: 'chip rojo', text: 'ÚLTIMO MOMENTO' }) : null,
  ]);

  boton.addEventListener('click', () => {
    raiz.classList.toggle('panel-noticias-abierta');
    if (hayNuevas) onLeidas(marcarLeidas(noticias));
  });

  raiz.appendChild(boton);
  raiz.appendChild(lista);
  mount(region, raiz);

  // Entrada escalonada: cada noticia pendiente se revela INTERVALO_ENTRADA_MS
  // después de la anterior, con una transición (CSS: .noticia-oculta ->
  // .noticia-aparece, ver theme.css). Sin timers colgados: `detener()` los
  // cancela todos y deja lo pendiente visible ya, sin terminar de animar.
  let cancelado = false;
  const timers = pendientesDeEntrada.map((n, i) => setTimeout(() => {
    noticiasAnimadas.add(n.id);
    const nodo = lista.querySelector(`[data-noticia="${n.id}"]`);
    if (nodo) {
      nodo.classList.remove('noticia-oculta');
      nodo.classList.add('noticia-aparece');
    }
  }, i * INTERVALO_ENTRADA_MS));

  function detener() {
    if (cancelado) return;
    cancelado = true;
    timers.forEach(clearTimeout);
    pendientesDeEntrada.forEach((n) => {
      noticiasAnimadas.add(n.id);
      const nodo = lista.querySelector(`[data-noticia="${n.id}"]`);
      if (nodo) nodo.classList.remove('noticia-oculta');
    });
  }

  return { detener };
}
