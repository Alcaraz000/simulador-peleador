import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  animarRoll, animarBarajado, DURACION_BARAJADO_MS, PAUSA_ELECCION_RIVAL_MS,
} from '../../src/ui/components/roll.js';

let cont;
let matchMediaOriginal;

function crearTarjetaFalsa(cantidad) {
  cont = document.createElement('div');
  for (let i = 0; i < cantidad; i += 1) {
    const label = document.createElement('div');
    label.className = 'tarjeta-efecto';
    label.textContent = `opcion ${i}`;
    cont.appendChild(label);
  }
  document.body.appendChild(cont);
  return cont;
}

function labels() {
  return [...cont.querySelectorAll('.tarjeta-efecto')];
}

function crearTarjetasFalsas(cantidad) {
  cont = document.createElement('div');
  const nodos = [];
  for (let i = 0; i < cantidad; i += 1) {
    const nodo = document.createElement('button');
    nodo.className = 'tarjeta';
    nodo.textContent = `opcion ${i}`;
    cont.appendChild(nodo);
    nodos.push(nodo);
  }
  document.body.appendChild(cont);
  return nodos;
}

beforeEach(() => {
  document.body.innerHTML = '';
  matchMediaOriginal = window.matchMedia;
  window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  window.matchMedia = matchMediaOriginal;
});

describe('animarRoll', () => {
  it('termina dejando iluminado solo el índice ganador', () => {
    const nodo = crearTarjetaFalsa(3);
    animarRoll(nodo, { indiceGanador: 1, cantidad: 3, onFin: () => {} });

    vi.runAllTimers();

    const estados = labels().map((l) => l.classList.contains('iluminado'));
    expect(estados).toEqual([false, true, false]);
  });

  it('llama a onFin una sola vez', () => {
    const nodo = crearTarjetaFalsa(3);
    const onFin = vi.fn();
    animarRoll(nodo, { indiceGanador: 2, cantidad: 3, onFin });

    vi.runAllTimers();

    expect(onFin).toHaveBeenCalledTimes(1);
  });

  it('no deja temporizadores vivos al terminar', () => {
    const nodo = crearTarjetaFalsa(4);
    animarRoll(nodo, { indiceGanador: 0, cantidad: 4, onFin: () => {} });

    vi.runAllTimers();

    expect(vi.getTimerCount()).toBe(0);
  });

  it('dura entre 1200 y 1800 ms', () => {
    const nodo = crearTarjetaFalsa(3);
    const inicio = Date.now();
    let fin = null;
    animarRoll(nodo, {
      indiceGanador: 0, cantidad: 3, onFin: () => { fin = Date.now(); },
    });

    vi.runAllTimers();

    expect(fin).not.toBeNull();
    const duracion = fin - inicio;
    expect(duracion).toBeGreaterThanOrEqual(1200);
    expect(duracion).toBeLessThanOrEqual(1800);
  });

  it('con prefers-reduced-motion resuelve inmediato, sin animar', () => {
    window.matchMedia = () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} });
    const nodo = crearTarjetaFalsa(3);
    const onFin = vi.fn();

    animarRoll(nodo, { indiceGanador: 2, cantidad: 3, onFin });

    expect(onFin).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    const estados = labels().map((l) => l.classList.contains('iluminado'));
    expect(estados).toEqual([false, false, true]);
  });

  it('detener() cancela antes de tiempo, limpia timers y no dispara onFin', () => {
    const nodo = crearTarjetaFalsa(3);
    const onFin = vi.fn();
    const { detener } = animarRoll(nodo, { indiceGanador: 1, cantidad: 3, onFin });

    vi.advanceTimersByTime(150);
    detener();

    expect(vi.getTimerCount()).toBe(0);
    expect(onFin).not.toHaveBeenCalled();

    // avanzar más tiempo no debería revivir nada
    vi.advanceTimersByTime(5000);
    expect(onFin).not.toHaveBeenCalled();
  });

  it('con un solo resultado posible no rompe y resuelve directo', () => {
    const nodo = crearTarjetaFalsa(1);
    const onFin = vi.fn();
    animarRoll(nodo, { indiceGanador: 0, cantidad: 1, onFin });

    expect(onFin).toHaveBeenCalledTimes(1);
    expect(labels()[0].classList.contains('iluminado')).toBe(true);
  });
});

// Barajado del minijuego de trámite (v8, "que se vea cómo se rollea"): a
// diferencia de animarRoll (que ya sabe el índice ganador desde el arranque
// porque el roll de una carta se resuelve ANTES de animar), acá todavía no
// se sabe qué elige el rival — eso recién lo decide resolverRondaMinijuego,
// con el rng de sesión, cuando ESTE barajado termina. Por eso no recibe
// `indiceGanador` y nunca deja nada "iluminado" al terminar: es puro clima
// mientras se resuelve, el resultado de verdad se narra en la pantalla
// siguiente (texto + marcador), no acá.
// Pedido v17: "falta una espera cuando elige el contrincante". Antes el
// barajado marcaba la tarjeta del rival y resolvía la ronda en el mismo tick,
// así que el remount se comía el fotograma y la jugada del rival no se veía
// nunca.
describe('animarBarajado — la espera sobre la elección del rival', () => {
  // El ciclo del barajado avanza en pasos de duración variable (curva en U),
  // así que no se puede saltar al aterrizaje con un número fijo de ms: se
  // corre timer por timer hasta que la tarjeta del rival queda marcada, y ahí
  // arranca la pausa que se quiere medir.
  function avanzarHastaAterrizar(nodo) {
    for (let i = 0; i < 200; i += 1) {
      if (nodo.classList.contains('tarjeta-rival')) return true;
      vi.advanceTimersToNextTimer();
    }
    return nodo.classList.contains('tarjeta-rival');
  }

  it('no resuelve la ronda apenas aterriza: deja ver la tarjeta del rival', () => {
    const nodos = crearTarjetasFalsas(3);
    const onFin = vi.fn();
    animarBarajado(nodos, { indiceFinal: 1, onFin });

    expect(avanzarHastaAterrizar(nodos[1])).toBe(true);
    expect(onFin).not.toHaveBeenCalled();
  });

  it('resuelve recién al cumplirse la pausa', () => {
    const nodos = crearTarjetasFalsas(3);
    const onFin = vi.fn();
    animarBarajado(nodos, { indiceFinal: 1, onFin });

    avanzarHastaAterrizar(nodos[1]);
    vi.advanceTimersByTime(PAUSA_ELECCION_RIVAL_MS);

    expect(onFin).toHaveBeenCalledTimes(1);
  });

  it('sin aterrizaje no espera nada (no hay jugada del rival que mostrar)', () => {
    const nodos = crearTarjetasFalsas(3);
    const onFin = vi.fn();
    animarBarajado(nodos, { indiceFinal: -1, onFin });

    vi.runAllTimers();

    expect(onFin).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('detener() durante la pausa resuelve YA, sin dejar la ronda colgada', () => {
    const nodos = crearTarjetasFalsas(3);
    const onFin = vi.fn();
    const control = animarBarajado(nodos, { indiceFinal: 2, onFin });

    avanzarHastaAterrizar(nodos[2]);
    control.detener();

    expect(onFin).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('detener() después de que la pausa ya resolvió no dispara onFin dos veces', () => {
    const nodos = crearTarjetasFalsas(3);
    const onFin = vi.fn();
    const control = animarBarajado(nodos, { indiceFinal: 0, onFin });

    vi.runAllTimers();
    control.detener();

    expect(onFin).toHaveBeenCalledTimes(1);
  });
});

describe('animarBarajado', () => {
  it('llama a onFin una sola vez', () => {
    const nodos = crearTarjetasFalsas(3);
    const onFin = vi.fn();
    animarBarajado(nodos, { onFin });

    vi.runAllTimers();

    expect(onFin).toHaveBeenCalledTimes(1);
  });

  it('termina sin ningún nodo resaltado (nunca se compromete a un "ganador")', () => {
    const nodos = crearTarjetasFalsas(3);
    animarBarajado(nodos, { onFin: () => {} });

    vi.runAllTimers();

    expect(nodos.some((n) => n.classList.contains('tarjeta-rolleo'))).toBe(false);
  });

  it('no deja temporizadores vivos al terminar', () => {
    const nodos = crearTarjetasFalsas(3);
    animarBarajado(nodos, { onFin: () => {} });

    vi.runAllTimers();

    expect(vi.getTimerCount()).toBe(0);
  });

  it('mientras corre, resalta a lo sumo un nodo por vez (nunca dos juntos)', () => {
    const nodos = crearTarjetasFalsas(3);
    animarBarajado(nodos, { onFin: () => {} });

    vi.advanceTimersByTime(60);

    const resaltados = nodos.filter((n) => n.classList.contains('tarjeta-rolleo'));
    expect(resaltados.length).toBeLessThanOrEqual(1);
  });

  it('dura un instante corto, pensado para repetirse varias rondas seguidas', () => {
    const nodos = crearTarjetasFalsas(3);
    const inicio = Date.now();
    let fin = null;
    animarBarajado(nodos, { onFin: () => { fin = Date.now(); } });

    vi.runAllTimers();

    expect(fin).not.toBeNull();
    const duracion = fin - inicio;
    expect(duracion).toBeGreaterThan(0);
    // Margen sobre DURACION_BARAJADO_MS: el último paso discreto puede
    // pasarse un poco del objetivo antes de que el bucle corte.
    expect(duracion).toBeLessThanOrEqual(DURACION_BARAJADO_MS + 250);
  });

  it('con prefers-reduced-motion resuelve inmediato, sin animar', () => {
    window.matchMedia = () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} });
    const nodos = crearTarjetasFalsas(3);
    const onFin = vi.fn();

    animarBarajado(nodos, { onFin });

    expect(onFin).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    expect(nodos.some((n) => n.classList.contains('tarjeta-rolleo'))).toBe(false);
  });

  // A diferencia de animarRoll.detener() (que cancela SIN disparar onFin,
  // porque quien lo llama ya sabe aplicar el efecto por su cuenta):
  // acá "cancelar" significa "resolvé ya" — no hay ningún otro lugar que
  // sepa qué hacer con la ronda pendiente si el jugador se va a mitad del
  // barajado (mismo criterio pedido: nunca dejar un timer colgado, y nunca
  // perder una ronda que ya se decidió con el rng).
  it('detener() resuelve YA: limpia timers y llama a onFin una sola vez', () => {
    const nodos = crearTarjetasFalsas(3);
    const onFin = vi.fn();
    const { detener } = animarBarajado(nodos, { onFin });

    vi.advanceTimersByTime(100);
    detener();

    expect(vi.getTimerCount()).toBe(0);
    expect(onFin).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(5000);
    expect(onFin).toHaveBeenCalledTimes(1);
  });

  it('con un solo nodo no rompe y resuelve directo', () => {
    const nodos = crearTarjetasFalsas(1);
    const onFin = vi.fn();
    animarBarajado(nodos, { onFin });

    expect(onFin).toHaveBeenCalledTimes(1);
  });
});
