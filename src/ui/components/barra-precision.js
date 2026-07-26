// El paso 2 del golpe de gracia (Task 4.4): una flecha se mueve sobre una
// franja verde y hay que "frenarla" ahí con un click. La dificultad viene de
// la zona elegida en el paso 1 (silueta-rival.js): a más difícil, franja más
// finita y flecha más rápida — el hígado abierto perdona, el mentón tapado
// no. Resuelve una sola vez y limpia sus propios timers (mismo patrón que
// narrador.js/roll.js/animar-numero.js: recursión de setTimeout, nunca
// setInterval, para poder cancelar con un único clearTimeout).
import { el } from '../dom.js';

const INTERVALO_MS = 30;

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function prefiereMovimientoReducido() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

// Ancho de la franja verde (%): dificultad 0 (fácil, hígado) → franja ancha;
// dificultad 1 (mentón tapado) → franja finita.
function anchoVerdeDe(dificultad) {
  return clamp(28 - dificultad * 24, 6, 30);
}

// Velocidad de la flecha (% de recorrido por tick): más dificultad, más rápido.
function velocidadDe(dificultad) {
  return 1.2 + dificultad * 2.6;
}

function precisionEn(pos, { inicioVerde, finVerde, inicioRoza, finRoza }) {
  if (pos >= inicioVerde && pos <= finVerde) {
    const centro = (inicioVerde + finVerde) / 2;
    const mitad = (finVerde - inicioVerde) / 2 || 1;
    const distancia = Math.abs(pos - centro) / mitad; // 0 en el centro, 1 en el borde
    return clamp(1 - distancia * 0.3, 0.7, 1);
  }
  if (pos >= inicioRoza && pos <= finRoza) return 0.4;
  return 0.1;
}

/**
 * @param {{dificultad:number, onResultado:(r:{precision:number})=>void, onCuadro?:(pos:number)=>void}} opciones
 *   `dificultad` 0..1 (ver ZONAS_GOLPE en core/fight-interactive.js). `onCuadro`
 *   es un hook opcional para tests/telemetría, no hace falta en producción.
 * @returns {{nodo: HTMLElement, detener: () => void}} `detener` cancela sin
 *   disparar `onResultado` (para limpiar si el jugador se va de la pantalla).
 */
export function crearBarraPrecision({ dificultad, onResultado = () => {}, onCuadro = () => {} }) {
  const anchoVerde = anchoVerdeDe(dificultad);
  const inicioVerde = (100 - anchoVerde) / 2;
  const finVerde = inicioVerde + anchoVerde;
  const anchoRoza = Math.min(9, inicioVerde);
  const inicioRoza = inicioVerde - anchoRoza;
  const finRoza = finVerde + anchoRoza;
  const velocidad = velocidadDe(dificultad);
  const limites = { inicioVerde, finVerde, inicioRoza, finRoza };

  let resuelto = false;
  let timerId = null;
  let posicion = (inicioVerde + finVerde) / 2;
  let direccion = 1;

  const flecha = el('div', { class: 'barra-precision-flecha', style: `left:${posicion}%` });

  // <button> (no <div>): antes no había forma de "frenar la flecha" con
  // teclado, solo con click/touch sobre la pista.
  const pista = el('button', { type: 'button', class: 'barra-precision-pista', 'aria-label': 'Frenar el golpe' }, [
    el('div', { class: 'franja al-aire', style: `left:0%;width:${inicioRoza}%` }),
    el('div', { class: 'franja roza', style: `left:${inicioRoza}%;width:${anchoRoza}%` }),
    el('div', { class: 'franja-verde', style: `left:${inicioVerde}%;width:${anchoVerde}%` }),
    el('div', { class: 'franja roza', style: `left:${finVerde}%;width:${anchoRoza}%` }),
    el('div', { class: 'franja al-aire', style: `left:${finRoza}%;width:${100 - finRoza}%` }),
    flecha,
  ]);

  const nodo = el('div', { class: 'barra-precision' }, [pista]);

  function limpiarTimer() {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  function resolver() {
    if (resuelto) return;
    resuelto = true;
    limpiarTimer();
    onResultado({ precision: precisionEn(posicion, limites) });
  }

  function detener() {
    if (resuelto) return;
    resuelto = true;
    limpiarTimer();
  }

  function tick() {
    if (resuelto) return;
    posicion += velocidad * direccion;
    if (posicion >= 100) { posicion = 100; direccion = -1; }
    else if (posicion <= 0) { posicion = 0; direccion = 1; }
    flecha.style.left = `${posicion}%`;
    onCuadro(posicion);
    timerId = setTimeout(tick, INTERVALO_MS);
  }

  pista.addEventListener('click', resolver);

  // Con movimiento reducido, la flecha queda quieta justo en el centro del
  // verde: cualquier click resuelve con buena precisión (no se penaliza a
  // quien desactivó la animación) y no hay timers de movimiento corriendo.
  if (!prefiereMovimientoReducido()) {
    timerId = setTimeout(tick, INTERVALO_MS);
  }

  return { nodo, detener };
}
