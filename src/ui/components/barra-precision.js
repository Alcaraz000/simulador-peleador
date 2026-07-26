// El paso 2 del golpe de gracia (Task 4.4): una flecha se mueve sobre una
// franja verde y hay que "frenarla" ahí con un click. La dificultad viene de
// la zona elegida en el paso 1 (silueta-rival.js): a más difícil, franja más
// finita y flecha más rápida — el hígado abierto perdona, el mentón tapado
// no. Resuelve una sola vez y limpia sus propios timers (mismo patrón que
// narrador.js/roll.js/animar-numero.js: recursión de setTimeout, nunca
// setInterval, para poder cancelar con un único clearTimeout).
//
// Pedido v6 ("hacer algún efecto al intentar pelear... que varíe según si
// clickeaste en el verde, amarillo o si erraste"): al frenar la flecha ya no
// se llama a `onResultado` en el mismo instante del click. Primero se pinta
// el desenlace (clase + texto, ver TEXTO_RESULTADO/PAUSA_RESULTADO_MS más
// abajo) y recién después de una pausa breve —bien corta, pensada para que
// se ALCANCE A VER antes de que la pantalla pase a narrar el golpe— se avisa
// hacia afuera. Sin esa pausa el efecto nunca llegaría a pintarse: quien
// llama a esto (fight.js) reemplaza este nodo apenas llega `onResultado`.
import { el } from '../dom.js';

const INTERVALO_MS = 30;

// Cuánto se deja puesto el desenlace antes de avisar hacia afuera. El
// impacto limpio (verde) se gana un instante más que el resto — es el
// momento grande de todo el minijuego — pero los tres se mantienen bien por
// debajo de medio segundo: esto es feedback, no una cinemática.
const PAUSA_RESULTADO_MS = { verde: 420, roza: 300, errado: 320 };

const TEXTO_RESULTADO = { verde: '¡CLAVADO!', roza: 'ROZÓ APENAS', errado: 'ERRASTE' };

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

function limitesDe(dificultad) {
  const anchoVerde = anchoVerdeDe(dificultad);
  const inicioVerde = (100 - anchoVerde) / 2;
  const finVerde = inicioVerde + anchoVerde;
  const anchoRoza = Math.min(9, inicioVerde);
  const inicioRoza = inicioVerde - anchoRoza;
  const finRoza = finVerde + anchoRoza;
  return {
    anchoVerde, inicioVerde, finVerde, anchoRoza, inicioRoza, finRoza,
  };
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
 * En qué franja cayó la flecha — la MISMA lectura de límites que
 * `precisionEn`, expuesta aparte porque decide el efecto visual (no un
 * número de precisión continuo, sino uno de tres desenlaces discretos).
 *
 * @param {number} dificultad
 * @param {number} pos - posición 0-100
 * @returns {'verde'|'roza'|'errado'}
 */
export function zonaResultado(dificultad, pos) {
  const limites = limitesDe(dificultad);
  if (pos >= limites.inicioVerde && pos <= limites.finVerde) return 'verde';
  if (pos >= limites.inicioRoza && pos <= limites.finRoza) return 'roza';
  return 'errado';
}

/**
 * @param {{dificultad:number, onResultado:(r:{precision:number})=>void, onCuadro?:(pos:number)=>void}} opciones
 *   `dificultad` 0..1 (ver ZONAS_GOLPE en core/fight-interactive.js). `onCuadro`
 *   es un hook opcional para tests/telemetría, no hace falta en producción.
 * @returns {{nodo: HTMLElement, detener: () => void}} `detener` cancela sin
 *   disparar `onResultado` (para limpiar si el jugador se va de la pantalla).
 */
export function crearBarraPrecision({ dificultad, onResultado = () => {}, onCuadro = () => {} }) {
  const limites = limitesDe(dificultad);
  const { anchoVerde, inicioVerde, finVerde, anchoRoza, inicioRoza, finRoza } = limites;
  const velocidad = velocidadDe(dificultad);

  let resuelto = false;
  // Distinto de `resuelto`: `resuelto` bloquea clicks/tick repetidos apenas
  // se clasifica el golpe; `avisado` marca si `onResultado` YA se llamó (o
  // sea, si ya no hay nada que cancelar). Sin esta separación, `detener()`
  // llamado durante la pausa de feedback (resuelto=true, pero onResultado
  // todavía no se llamó) quedaba de brazos cruzados por el mismo guard que
  // usa `resolver()` para no reprocesar un segundo click — el timer de la
  // pausa seguía corriendo y terminaba avisando igual, tarde (bug atrapado
  // por el propio test de este archivo).
  let avisado = false;
  let timerMovimiento = null;
  let timerResultado = null;
  let posicion = (inicioVerde + finVerde) / 2;
  let direccion = 1;

  const flecha = el('div', { class: 'barra-precision-flecha', style: `left:${posicion}%` });
  const marcaCentro = el('div', { class: 'barra-precision-marca', style: `left:${posicion}%` });

  // <button> (no <div>): antes no había forma de "frenar la flecha" con
  // teclado, solo con click/touch sobre la pista.
  const pista = el('button', { type: 'button', class: 'barra-precision-pista', 'aria-label': 'Frenar el golpe' }, [
    el('div', { class: 'franja al-aire', style: `left:0%;width:${inicioRoza}%` }),
    el('div', { class: 'franja roza', style: `left:${inicioRoza}%;width:${anchoRoza}%` }),
    el('div', { class: 'franja-verde', style: `left:${inicioVerde}%;width:${anchoVerde}%` }),
    el('div', { class: 'franja roza', style: `left:${finVerde}%;width:${anchoRoza}%` }),
    el('div', { class: 'franja al-aire', style: `left:${finRoza}%;width:${100 - finRoza}%` }),
    marcaCentro,
    flecha,
  ]);

  // Fila de resultado con alto fijo (ver theme.css): arranca vacía y solo se
  // completa al resolver — así nunca empuja nada de abajo al aparecer.
  const resultadoTexto = el('div', { class: 'barra-precision-resultado', 'aria-live': 'polite' });

  const nodo = el('div', { class: 'barra-precision' }, [pista, resultadoTexto]);

  function limpiarTimers() {
    if (timerMovimiento !== null) {
      clearTimeout(timerMovimiento);
      timerMovimiento = null;
    }
    if (timerResultado !== null) {
      clearTimeout(timerResultado);
      timerResultado = null;
    }
  }

  function resolver() {
    if (resuelto) return;
    resuelto = true;
    if (timerMovimiento !== null) {
      clearTimeout(timerMovimiento);
      timerMovimiento = null;
    }

    const resultado = { precision: precisionEn(posicion, limites) };
    const tier = zonaResultado(dificultad, posicion);

    // El desenlace se pinta YA, sincrónico con el click: "que se lea de
    // inmediato si la clavaste o la erraste" — solo se demora el AVISO hacia
    // afuera (onResultado), no la lectura del propio resultado.
    nodo.classList.add(`resultado-${tier}`);
    resultadoTexto.textContent = TEXTO_RESULTADO[tier];

    if (prefiereMovimientoReducido()) {
      avisado = true;
      onResultado(resultado);
      return;
    }

    timerResultado = setTimeout(() => {
      timerResultado = null;
      avisado = true;
      onResultado(resultado);
    }, PAUSA_RESULTADO_MS[tier]);
  }

  // A diferencia de `resolver()`, esto tiene que poder cortar en seco
  // incluso DESPUÉS de un click (a mitad de la pausa de feedback, con
  // `resuelto` ya en true): revisa `avisado`, no `resuelto` — si
  // `onResultado` todavía no se llamó, siempre hay algo para cancelar.
  function detener() {
    resuelto = true;
    if (avisado) return;
    limpiarTimers();
  }

  function tick() {
    if (resuelto) return;
    posicion += velocidad * direccion;
    if (posicion >= 100) { posicion = 100; direccion = -1; }
    else if (posicion <= 0) { posicion = 0; direccion = 1; }
    flecha.style.left = `${posicion}%`;
    onCuadro(posicion);
    timerMovimiento = setTimeout(tick, INTERVALO_MS);
  }

  pista.addEventListener('click', resolver);

  // Con movimiento reducido, la flecha queda quieta justo en el centro del
  // verde: cualquier click resuelve con buena precisión (no se penaliza a
  // quien desactivó la animación) y no hay timers de movimiento corriendo.
  if (!prefiereMovimientoReducido()) {
    timerMovimiento = setTimeout(tick, INTERVALO_MS);
  }

  return { nodo, detener };
}
