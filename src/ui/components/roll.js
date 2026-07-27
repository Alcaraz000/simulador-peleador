// El roll con suspenso: ilumina alternadamente los labels de efecto de una
// tarjeta de azar, yendo y viniendo, acelerando y frenando, y termina fijo en
// el resultado ganador. Sin pantalla de confirmación posterior: el estado
// final queda pintado en la propia tarjeta.

const DURACION_MS = 1500; // dentro de la ventana 1200-1800ms pedida
const ESPERA_MIN = 55;
const ESPERA_MAX = 210;

function prefiereMovimientoReducido() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Curva en U: arranca lento, acelera en el medio, frena hacia el final. */
function esperaSegun(progreso) {
  const curva = Math.sin(Math.PI * Math.min(Math.max(progreso, 0), 1));
  return Math.round(ESPERA_MAX - (ESPERA_MAX - ESPERA_MIN) * curva);
}

/**
 * Anima el sorteo de una tarjeta con varios resultados posibles.
 *
 * @param {HTMLElement} nodoTarjeta - contiene los `.tarjeta-efecto` a iluminar.
 * @param {{indiceGanador:number, cantidad?:number, onFin?:()=>void}} opciones
 * @returns {{detener: () => void}} - `detener` cancela sin disparar `onFin`
 *   (para limpiar si el panel se re-renderiza antes de que termine el roll).
 */
export function animarRoll(nodoTarjeta, { indiceGanador, cantidad, onFin = () => {} } = {}) {
  const labels = [...nodoTarjeta.querySelectorAll('.tarjeta-efecto')];
  const n = cantidad ?? labels.length;

  let terminado = false;
  let timerId = null;

  function iluminar(indice) {
    labels.forEach((nodo, i) => nodo.classList.toggle('iluminado', i === indice));
  }

  function limpiarTimer() {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  function finalizar() {
    if (terminado) return;
    terminado = true;
    limpiarTimer();
    iluminar(indiceGanador);
    onFin();
  }

  function detener() {
    if (terminado) return;
    terminado = true;
    limpiarTimer();
  }

  if (n <= 1 || prefiereMovimientoReducido()) {
    finalizar();
    return { detener };
  }

  let indiceActual = 0;
  let direccion = 1;
  let transcurrido = 0;

  function paso() {
    if (terminado) return;

    if (transcurrido >= DURACION_MS) {
      finalizar();
      return;
    }

    iluminar(indiceActual);

    indiceActual += direccion;
    if (indiceActual >= n - 1) {
      indiceActual = n - 1;
      direccion = -1;
    } else if (indiceActual <= 0) {
      indiceActual = 0;
      direccion = 1;
    }

    const espera = esperaSegun(transcurrido / DURACION_MS);
    transcurrido += espera;
    timerId = setTimeout(paso, espera);
  }

  paso();

  return { detener };
}

// ===== Barajado del minijuego de trámite (v8, "que se vea cómo se rollea") =
//
// Distinto caso de uso que `animarRoll`: ahí el roll se resuelve ANTES de
// animar (resolverOpcion ya decidió `indiceGanador`), así que la animación
// solo tiene que ir a buscarlo. Acá, en cambio, main.js recién sabe qué
// eligió el rival cuando la ronda del minijuego se resuelve — y ESO tiene
// que quedar mostrado de inmediato en la pantalla siguiente (texto +
// marcador), no adelantado por este barajado. Por eso `animarBarajado` no
// recibe ningún `indiceGanador`: es puro clima mientras tanto, viaja entre
// los nodos que le pasen (las 3 tarjetas de acción táctica) sin
// comprometerse a ninguno, y siempre termina en neutro (nada resaltado).
//
// Duración bien más corta que `animarRoll` (900ms contra 1200-1800ms):
// esto se repite hasta 5 veces por combate de trámite, así que tiene que
// sentirse ágil ronda tras ronda, no una pausa larga cada vez.
export const DURACION_BARAJADO_MS = 900;

/**
 * Cicla un resaltado entre varios nodos (p.ej. las 3 tarjetas del minijuego
 * de trámite) durante `duracionMs` y frena en `indiceFinal`.
 *
 * `indiceFinal` es la jugada que eligió el rival: el pedido del usuario fue
 * "quiero que se vea cómo se rollea", y lo que hace satisfactorio un rolleo
 * es ver DÓNDE cae. Sin él (o con -1) el barajado termina en neutro, que es
 * el comportamiento correcto cuando no hay nada que revelar.
 *
 * @param {HTMLElement[]} nodos - los nodos a resaltar en secuencia (se les
 *   alterna la clase `claseActiva`).
 * @param {{duracionMs?:number, claseActiva?:string, indiceFinal?:number,
 *   claseFinal?:string, onFin?:()=>void}} opciones
 * @returns {{detener: () => void}} - a diferencia de `animarRoll.detener()`,
 *   acá "cancelar" significa "resolvé ya": limpia el nodo, dispara `onFin`
 *   de inmediato (una sola vez) y no deja timers vivos. No hay, para este
 *   caso, ningún otro lugar que sepa qué hacer con una ronda pendiente si el
 *   jugador se va a mitad del barajado — mismo criterio de "nunca perder ni
 *   duplicar" que el resto del proyecto, resuelto acá adentro.
 */
export function animarBarajado(nodos, {
  duracionMs = DURACION_BARAJADO_MS,
  claseActiva = 'tarjeta-rolleo',
  indiceFinal = -1,
  claseFinal = 'tarjeta-rival',
  onFin = () => {},
} = {}) {
  const n = nodos.length;
  const aterriza = indiceFinal >= 0 && indiceFinal < n;

  let terminado = false;
  let timerId = null;

  function marcar(indice) {
    nodos.forEach((nodo, i) => nodo.classList.toggle(claseActiva, i === indice));
  }

  function limpiarTimer() {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  function finalizar() {
    if (terminado) return;
    terminado = true;
    limpiarTimer();
    // Con `indiceFinal` el barajado aterriza: la tarjeta que eligió el rival
    // queda marcada (clase propia, distinta de la del ciclo) para que el
    // jugador vea dónde cayó antes de leer el texto de la ronda. Sin él,
    // neutro: ninguno queda resaltado.
    marcar(-1);
    if (aterriza) nodos[indiceFinal].classList.add(claseFinal);
    onFin();
  }

  function detener() {
    finalizar();
  }

  if (n <= 1 || prefiereMovimientoReducido()) {
    finalizar();
    return { detener };
  }

  let indiceActual = 0;
  let direccion = 1;
  let transcurrido = 0;

  function paso() {
    if (terminado) return;

    if (transcurrido >= duracionMs) {
      finalizar();
      return;
    }

    marcar(indiceActual);

    indiceActual += direccion;
    if (indiceActual >= n - 1) {
      indiceActual = n - 1;
      direccion = -1;
    } else if (indiceActual <= 0) {
      indiceActual = 0;
      direccion = 1;
    }

    const espera = esperaSegun(transcurrido / duracionMs);
    transcurrido += espera;
    timerId = setTimeout(paso, espera);
  }

  paso();

  return { detener };
}
