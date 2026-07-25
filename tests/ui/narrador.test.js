import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  narrar, leerPreferenciaNarracion, guardarPreferenciaNarracion,
} from '../../src/ui/components/narrador.js';

let cont;
let matchMediaOriginal;

function momentos(n) {
  return Array.from({ length: n }, (_, i) => ({
    round: 1, tipo: i === n - 1 ? 'campana' : 'jab', texto: `Momento ${i}`, snapshot: { indice: i },
  }));
}

beforeEach(() => {
  cont = document.createElement('div');
  document.body.appendChild(cont);
  matchMediaOriginal = window.matchMedia;
  window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  window.matchMedia = matchMediaOriginal;
  document.body.innerHTML = '';
});

describe('narrar en modo depoco', () => {
  it('emite los momentos en orden, uno a la vez, y llama onPaso por cada uno', () => {
    const vistos = [];
    narrar(cont, momentos(4), { modo: 'depoco', onPaso: (m, i) => vistos.push([i, m.texto]) });

    expect(vistos).toEqual([[0, 'Momento 0']]);
    expect(cont.querySelectorAll('p')).toHaveLength(1);

    vi.advanceTimersByTime(700);
    expect(vistos).toEqual([[0, 'Momento 0'], [1, 'Momento 1']]);

    vi.advanceTimersByTime(700);
    vi.advanceTimersByTime(700);
    expect(vistos.map((v) => v[0])).toEqual([0, 1, 2, 3]);
    expect(cont.querySelectorAll('p')).toHaveLength(4);
  });

  it('llama onFin exactamente una vez al terminar naturalmente', () => {
    const onFin = vi.fn();
    narrar(cont, momentos(3), { modo: 'depoco', onFin });
    vi.runAllTimers();
    expect(onFin).toHaveBeenCalledTimes(1);
  });

  it('no deja timers vivos al terminar', () => {
    narrar(cont, momentos(5), { modo: 'depoco' });
    vi.runAllTimers();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('marca de destacado los momentos de caida/ko/tko/sumision', () => {
    const lista = [
      { round: 1, tipo: 'jab', texto: 'a' },
      { round: 1, tipo: 'ko', texto: 'b' },
    ];
    narrar(cont, lista, { modo: 'depoco' });
    vi.runAllTimers();
    const parrafos = [...cont.querySelectorAll('p')];
    expect(parrafos[0].classList.contains('destacado')).toBe(false);
    expect(parrafos[1].classList.contains('destacado')).toBe(true);
  });
});

describe('saltar()', () => {
  it('completa todos los momentos de inmediato, pinta todo y llama onFin una vez', () => {
    const vistos = [];
    const onFin = vi.fn();
    const { saltar } = narrar(cont, momentos(5), { modo: 'depoco', onPaso: (m, i) => vistos.push(i), onFin });

    saltar();

    expect(vistos).toEqual([0, 1, 2, 3, 4]);
    expect(cont.querySelectorAll('p')).toHaveLength(5);
    expect(onFin).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('no vuelve a llamar onFin si se llama saltar despues de terminar solo', () => {
    const onFin = vi.fn();
    const { saltar } = narrar(cont, momentos(2), { modo: 'depoco', onFin });
    vi.runAllTimers();
    expect(onFin).toHaveBeenCalledTimes(1);
    saltar();
    expect(onFin).toHaveBeenCalledTimes(1);
  });

  it('llamar saltar dos veces no llama onFin dos veces', () => {
    const onFin = vi.fn();
    const { saltar } = narrar(cont, momentos(3), { modo: 'depoco', onFin });
    saltar();
    saltar();
    expect(onFin).toHaveBeenCalledTimes(1);
  });
});

describe('modo todo', () => {
  it('resuelve todo de inmediato, sin timers, llamando onPaso por cada momento y onFin una vez', () => {
    const vistos = [];
    const onFin = vi.fn();
    narrar(cont, momentos(4), { modo: 'todo', onPaso: (m, i) => vistos.push(i), onFin });

    expect(vistos).toEqual([0, 1, 2, 3]);
    expect(onFin).toHaveBeenCalledTimes(1);
    expect(cont.querySelectorAll('p')).toHaveLength(4);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('lista vacia', () => {
  it('llama onFin de inmediato sin romper', () => {
    const onFin = vi.fn();
    narrar(cont, [], { modo: 'depoco', onFin });
    expect(onFin).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('prefers-reduced-motion', () => {
  it('resuelve todo de inmediato aunque el modo sea depoco', () => {
    window.matchMedia = () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} });
    const onFin = vi.fn();
    narrar(cont, momentos(3), { modo: 'depoco', onFin });
    expect(onFin).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('preferencia en localStorage', () => {
  it('guarda y lee la preferencia', () => {
    guardarPreferenciaNarracion('todo');
    expect(leerPreferenciaNarracion()).toBe('todo');
    guardarPreferenciaNarracion('depoco');
    expect(leerPreferenciaNarracion()).toBe('depoco');
  });

  it('por defecto, sin nada guardado, es depoco', () => {
    expect(leerPreferenciaNarracion()).toBe('depoco');
  });

  it('narrar sin modo explicito usa la preferencia guardada', () => {
    guardarPreferenciaNarracion('todo');
    const onFin = vi.fn();
    narrar(cont, momentos(3), { onFin });
    expect(onFin).toHaveBeenCalledTimes(1);
  });

  it('leer nunca tira aunque localStorage explote', () => {
    const storageRoto = {
      getItem: () => { throw new Error('bloqueado'); },
      setItem: () => { throw new Error('bloqueado'); },
    };
    expect(() => leerPreferenciaNarracion(storageRoto)).not.toThrow();
    expect(() => guardarPreferenciaNarracion('todo', storageRoto)).not.toThrow();
    expect(leerPreferenciaNarracion(storageRoto)).toBe('depoco');
  });

  it('con storage null no tira', () => {
    expect(() => leerPreferenciaNarracion(null)).not.toThrow();
    expect(() => guardarPreferenciaNarracion('todo', null)).not.toThrow();
  });
});
