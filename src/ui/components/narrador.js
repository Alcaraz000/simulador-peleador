// Narra una lista de momentos de a uno, con ritmo (no letra por letra): cada
// momento aparece cada ~700ms y dispara `onPaso` para que quien llama pueda
// mover el marcador en vivo con el snapshot que trae cada momento (ver
// `simularRound` en core/fight.js). `saltar()` completa todo de inmediato.
//
// El contenedor recibe un `<p>` por momento revelado (con la clase
// "destacado" para caida/ko/tko/sumision, igual que ya hacía el log de la
// v1) — quien monta este componente es responsable de darle al contenedor
// la clase/estilo de crónica (p. ej. "log") que corresponda.
import { el, clear } from '../dom.js';

const INTERVALO_MS = 700;
const CLAVE_PREFERENCIA = 'simpeleador:narracion:v1';
const DESTACADOS = ['ko', 'tko', 'sumision', 'caida'];

function storagePorDefecto() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Lee la preferencia guardada ('depoco' | 'todo'). Nunca tira. */
export function leerPreferenciaNarracion(storage = storagePorDefecto()) {
  if (!storage) return 'depoco';
  try {
    return storage.getItem(CLAVE_PREFERENCIA) === 'todo' ? 'todo' : 'depoco';
  } catch {
    return 'depoco';
  }
}

/** Guarda la preferencia ('depoco' | 'todo'). Nunca tira. */
export function guardarPreferenciaNarracion(modo, storage = storagePorDefecto()) {
  if (!storage) return;
  try {
    storage.setItem(CLAVE_PREFERENCIA, modo === 'todo' ? 'todo' : 'depoco');
  } catch {
    /* sin storage utilizable: la preferencia simplemente no persiste */
  }
}

function prefiereMovimientoReducido() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function pintarMomento(contenedor, momento) {
  contenedor.appendChild(el('p', {
    class: DESTACADOS.includes(momento.tipo) ? 'destacado' : '',
    text: momento.texto,
  }));
}

/**
 * @param {HTMLElement} contenedor - se limpia y recibe un <p> por momento.
 * @param {Array<{round:number, tipo:string, texto:string, snapshot?:object}>} momentos
 * @param {{modo?: 'depoco'|'todo', onPaso?: (momento, indice) => void, onFin?: () => void}} opciones
 *   `modo` por defecto usa la preferencia guardada. `onPaso` se llama con
 *   cada momento en el orden en que se revela (también en modo 'todo', para
 *   que el marcador termine reflejando el estado final).
 * @returns {{saltar: () => void}} - `saltar` completa todo de inmediato y
 *   llama a `onFin` (una sola vez, sea que se llegue por tiempo o por salto).
 */
export function narrar(contenedor, momentos, { modo, onPaso = () => {}, onFin = () => {} } = {}) {
  clear(contenedor);
  const lista = momentos ?? [];
  const modoEfectivo = modo ?? leerPreferenciaNarracion();
  const instantaneo = modoEfectivo === 'todo' || prefiereMovimientoReducido();

  let indice = 0;
  let terminado = false;
  let timerId = null;

  function limpiarTimer() {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  function emitir(momento, i) {
    pintarMomento(contenedor, momento);
    onPaso(momento, i);
  }

  function finalizar() {
    if (terminado) return;
    terminado = true;
    limpiarTimer();
    onFin();
  }

  function saltar() {
    if (terminado) return;
    limpiarTimer();
    while (indice < lista.length) {
      emitir(lista[indice], indice);
      indice += 1;
    }
    finalizar();
  }

  if (lista.length === 0) {
    finalizar();
    return { saltar };
  }

  if (instantaneo) {
    saltar();
    return { saltar };
  }

  function paso() {
    if (terminado) return;
    emitir(lista[indice], indice);
    indice += 1;
    if (indice >= lista.length) {
      finalizar();
      return;
    }
    timerId = setTimeout(paso, INTERVALO_MS);
  }

  paso();

  return { saltar };
}
