import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';

describe('createRng', () => {
  it('es determinista para la misma semilla', () => {
    const a = createRng(123);
    const b = createRng(123);
    const seqA = [a.next(), a.next(), a.next()];
    const seqB = [b.next(), b.next(), b.next()];
    expect(seqA).toEqual(seqB);
  });

  it('da secuencias distintas para semillas distintas', () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  it('acepta semilla de texto', () => {
    const a = createRng('pelea');
    const b = createRng('pelea');
    expect(a.next()).toBe(b.next());
  });

  it('next devuelve floats en [0,1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 200; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int respeta los limites inclusive', () => {
    const rng = createRng(9);
    const vistos = new Set();
    for (let i = 0; i < 400; i++) vistos.add(rng.int(1, 3));
    expect([...vistos].sort()).toEqual([1, 2, 3]);
  });

  it('chance(0) es siempre falso y chance(1) siempre verdadero', () => {
    const rng = createRng(4);
    for (let i = 0; i < 50; i++) {
      expect(rng.chance(0)).toBe(false);
      expect(rng.chance(1)).toBe(true);
    }
  });

  it('pick devuelve un elemento del arreglo', () => {
    const rng = createRng(11);
    const arr = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) expect(arr).toContain(rng.pick(arr));
  });

  it('weighted favorece el peso mayor', () => {
    const rng = createRng(5);
    let altos = 0;
    for (let i = 0; i < 1000; i++) {
      if (rng.weighted([{ valor: 'alto', peso: 9 }, { valor: 'bajo', peso: 1 }]) === 'alto') altos++;
    }
    expect(altos).toBeGreaterThan(800);
  });

  it('weighted ignora pesos cero', () => {
    const rng = createRng(6);
    for (let i = 0; i < 50; i++) {
      expect(rng.weighted([{ valor: 'si', peso: 1 }, { valor: 'no', peso: 0 }])).toBe('si');
    }
  });

  it('shuffle no muta el original y conserva los elementos', () => {
    const rng = createRng(8);
    const original = [1, 2, 3, 4, 5];
    const copia = [...original];
    const mezclado = rng.shuffle(original);
    expect(original).toEqual(copia);
    expect([...mezclado].sort()).toEqual(copia);
  });

  it('se puede guardar y restaurar el estado', () => {
    const rng = createRng(42);
    rng.next();
    rng.next();
    const guardado = rng.estado();
    const esperado = [rng.next(), rng.next()];
    rng.restaurar(guardado);
    expect([rng.next(), rng.next()]).toEqual(esperado);
  });
});
