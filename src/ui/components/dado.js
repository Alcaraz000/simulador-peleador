import { icono } from '../icons.js';

// La animación de "tirar el dado" al tocar Continuar (pedido v3): el juego
// se llama así por el dado, así que es su gesto de transición entre beats.
// Corta (600-900ms, pedido textual) para no molestar al repetirse decenas de
// veces en una carrera larga, y respeta prefers-reduced-motion — mismo
// patrón que animarRoll/animarNumero (roll.js, animar-numero.js): con motion
// reducido resuelve directo, sin animar.

const DURACION_MS = 750; // dentro de la ventana 600-900ms pedida

function prefiereMovimientoReducido() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * @param {HTMLButtonElement} nodoBoton - su contenido se reemplaza por un
 *   dado (girando vía CSS) mientras dura la animación.
 * @param {{onFin?: () => void, duracion?: number}} opciones
 * @returns {{detener: () => void}} - cancela sin disparar `onFin` y
 *   restaura el contenido original del botón (el llamador decide qué hacer
 *   con la transición pendiente, mismo patrón que animarRoll).
 */
export function animarDado(nodoBoton, { onFin = () => {}, duracion = DURACION_MS } = {}) {
  let terminado = false;
  let timerId = null;
  const hijosOriginales = [...nodoBoton.childNodes];
  const disabledOriginal = nodoBoton.disabled;

  function restaurar() {
    nodoBoton.replaceChildren(...hijosOriginales);
    nodoBoton.classList.remove('boton-tirando-dado');
    nodoBoton.disabled = disabledOriginal;
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
    restaurar();
    onFin();
  }

  function detener() {
    if (terminado) return;
    terminado = true;
    limpiarTimer();
    restaurar();
  }

  if (prefiereMovimientoReducido()) {
    finalizar();
    return { detener };
  }

  nodoBoton.disabled = true;
  nodoBoton.classList.add('boton-tirando-dado');
  nodoBoton.replaceChildren(icono('dado', { tamano: 22 }));

  timerId = setTimeout(finalizar, duracion);

  return { detener };
}
