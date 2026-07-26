// Anima un número cambiando de "desde" a "hasta", con easing, coloreando
// verde si sube / rojo si baja mientras dura la animación. Los cambios se
// ven ocurrir en vez de saltar de golpe.

const DURACION_DEFECTO = 700;
const PASO_MS = 32; // ~30fps, de sobra para que un contador de números se vea fluido

function prefiereMovimientoReducido() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Ease-out cúbico: arranca rápido y llega suave. */
function facilitar(t) {
  return 1 - (1 - t) ** 3;
}

/**
 * @param {HTMLElement} nodo - su textContent se sobreescribe con cada paso.
 * @param {{desde:number, hasta:number, duracion?:number}} opciones
 * @returns {{detener: () => void}} - cancela sin forzar el valor final.
 */
export function animarNumero(nodo, { desde, hasta, duracion = DURACION_DEFECTO } = {}) {
  let terminado = false;
  let timerId = null;

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
    nodo.textContent = String(hasta);
    nodo.classList.remove('verde', 'rojo');
  }

  function detener() {
    if (terminado) return;
    terminado = true;
    limpiarTimer();
  }

  if (desde === hasta || prefiereMovimientoReducido()) {
    finalizar();
    return { detener };
  }

  nodo.classList.add(hasta > desde ? 'verde' : 'rojo');

  const inicio = Date.now();

  function paso() {
    if (terminado) return;
    const t = Math.min((Date.now() - inicio) / duracion, 1);
    nodo.textContent = String(Math.round(desde + (hasta - desde) * facilitar(t)));

    if (t >= 1) {
      finalizar();
      return;
    }
    timerId = setTimeout(paso, PASO_MS);
  }

  paso();

  return { detener };
}

/**
 * Aplica animarNumero a varios atributos a la vez. `contenedor` ya debe estar
 * pintado con los valores FINALES (p. ej. después de re-renderizar el panel
 * tras aplicar un efecto): esta función lee ese valor final, retrocede al
 * valor previo usando el delta, y anima desde ahí hasta el que ya está en
 * pantalla — así no hace falta demorar el render para animar.
 *
 * @param {HTMLElement} contenedor - contiene `[data-atributo="clave"] .valor`.
 * @param {Record<string, number>} deltas - cuánto cambió cada atributo.
 * @returns {Array<{detener: () => void}>}
 */
export function animarAtributos(contenedor, deltas = {}) {
  const controladores = [];
  for (const [clave, delta] of Object.entries(deltas)) {
    if (!delta) continue;
    const nodoValor = contenedor.querySelector(`[data-atributo="${clave}"] .valor`);
    if (!nodoValor) continue;
    const hasta = Number.parseInt(nodoValor.textContent, 10);
    if (Number.isNaN(hasta)) continue;
    controladores.push(animarNumero(nodoValor, { desde: hasta - delta, hasta }));
  }
  return controladores;
}

/**
 * Resalta un momento SOLO las filas de atributo que cambiaron — verde si
 * subieron, rojo si bajaron — en vez de todo el módulo (pedido v3: antes
 * `shell.destacar('izquierda')` hacía brillar TODA la columna izquierda por
 * cualquier cambio, sin importar cuál atributo se tocó).
 *
 * A diferencia de `animarNumero`, esto no usa temporizadores: las clases
 * `destaque-positivo`/`destaque-negativo` disparan un `@keyframes` (theme.css)
 * que arranca y termina solo en "sin brillo" — no hace falta sacarlas a mano
 * ni cancelar nada si el jugador navega a mitad de camino.
 *
 * @param {HTMLElement} contenedor - contiene `[data-atributo="clave"]`.
 * @param {Record<string, number>} deltas - cuánto cambió cada atributo.
 */
export function destacarAtributos(contenedor, deltas = {}) {
  for (const [clave, delta] of Object.entries(deltas)) {
    if (!delta) continue;
    const fila = contenedor.querySelector(`[data-atributo="${clave}"]`);
    if (!fila) continue;
    fila.classList.add(delta > 0 ? 'destaque-positivo' : 'destaque-negativo');
  }
}
