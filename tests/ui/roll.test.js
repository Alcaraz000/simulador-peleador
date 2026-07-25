import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { animarRoll } from '../../src/ui/components/roll.js';

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
