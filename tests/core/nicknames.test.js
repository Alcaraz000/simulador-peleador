import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { NICKNAMES } from '../../src/content/nicknames.js';
import { repartirApodos, apodoPorId } from '../../src/core/nicknames.js';

const RAREZAS_VALIDAS = ['normal', 'rara', 'legendaria'];

describe('catalogo de apodos', () => {
  it('tiene un catalogo grande, con id unico', () => {
    expect(NICKNAMES.length).toBeGreaterThanOrEqual(20);
    const ids = NICKNAMES.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada apodo tiene nombre, descripcion, rareza valida y al menos un mod', () => {
    for (const apodo of NICKNAMES) {
      expect(apodo.nombre.length).toBeGreaterThan(0);
      expect(apodo.descripcion.length).toBeGreaterThan(0);
      expect(RAREZAS_VALIDAS).toContain(apodo.rareza);
      expect(Object.keys(apodo.mods).length).toBeGreaterThan(0);
    }
  });

  it('tiene apodos de las tres rarezas', () => {
    for (const rareza of RAREZAS_VALIDAS) {
      expect(NICKNAMES.some((n) => n.rareza === rareza)).toBe(true);
    }
  });

  it('las legendarias no vienen nerfeadas (mods netos altos)', () => {
    const legendarias = NICKNAMES.filter((n) => n.rareza === 'legendaria');
    for (const apodo of legendarias) {
      const positivos = Object.values(apodo.mods).filter((v) => v > 0).reduce((a, b) => a + b, 0);
      expect(positivos).toBeGreaterThanOrEqual(8);
    }
  });
});

describe('apodoPorId', () => {
  it('encuentra un apodo existente', () => {
    expect(apodoPorId('relampago').nombre).toBe('El Relámpago');
  });

  it('devuelve null si no existe', () => {
    expect(apodoPorId('no-existe')).toBeNull();
  });
});

describe('repartirApodos', () => {
  it('devuelve exactamente tres', () => {
    expect(repartirApodos(createRng(1))).toHaveLength(3);
  });

  it('nunca repite un apodo', () => {
    for (let semilla = 1; semilla <= 100; semilla += 1) {
      const apodos = repartirApodos(createRng(semilla));
      const ids = apodos.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('es determinista con la misma semilla', () => {
    const a = repartirApodos(createRng(7));
    const b = repartirApodos(createRng(7));
    expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id));
  });

  it('sobre muchas semillas, la distribucion de rarezas cae cerca de 70/25/5', () => {
    const conteo = { normal: 0, rara: 0, legendaria: 0 };
    let total = 0;
    for (let semilla = 1; semilla <= 500; semilla += 1) {
      for (const apodo of repartirApodos(createRng(semilla))) {
        conteo[apodo.rareza] += 1;
        total += 1;
      }
    }
    const pct = (n) => (100 * conteo[n]) / total;
    expect(pct('normal')).toBeGreaterThan(55);
    expect(pct('rara')).toBeGreaterThan(10);
    expect(pct('rara')).toBeLessThan(40);
    expect(pct('legendaria')).toBeLessThan(15);
  });
});
