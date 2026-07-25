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
