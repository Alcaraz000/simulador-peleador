import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import {
  sortearTalento, rendimientoDeMejora, lecturaDeTalento, TECHO_MIN, TECHO_MAX,
} from '../../src/core/talento.js';

describe('sortearTalento', () => {
  // Bloque 6 (v13): el rango se ensanchó (TECHO_MIN bajó) para que el talento
  // pese de verdad y las partidas se sientan distintas. La forma sigue siendo
  // de campana — el grueso agrupado en el centro del rango, no repartido
  // parejo — pero ese centro ya no está en 1.
  it('el techo se reparte como campana: el grueso agrupado, con colas a los dos lados', () => {
    const techos = Array.from({ length: 500 }, (_, i) => sortearTalento(createRng(i + 1)).techo);
    const centro = (TECHO_MIN + TECHO_MAX) / 2;
    const anchoCuarto = (TECHO_MAX - TECHO_MIN) / 4;
    const enElMedio = techos.filter((t) => Math.abs(t - centro) <= anchoCuarto).length / techos.length;
    expect(enElMedio).toBeGreaterThan(0.5);
    expect(Math.min(...techos)).toBeLessThan(centro - anchoCuarto);
    expect(Math.max(...techos)).toBeGreaterThan(centro + anchoCuarto);
  });

  it('nunca se sale del rango declarado', () => {
    for (let s = 1; s <= 200; s += 1) {
      const { techo } = sortearTalento(createRng(s));
      expect(techo).toBeGreaterThanOrEqual(TECHO_MIN);
      expect(techo).toBeLessThanOrEqual(TECHO_MAX);
    }
  });

  it('reparte las tres curvas', () => {
    const curvas = new Set(Array.from({ length: 100 }, (_, i) => sortearTalento(createRng(i + 1)).curva));
    expect([...curvas].sort()).toEqual(['normal', 'tardia', 'temprana']);
  });

  it('es determinista con la misma semilla', () => {
    expect(sortearTalento(createRng(42))).toEqual(sortearTalento(createRng(42)));
  });

  it('no usa Math.random: la misma semilla siempre da lo mismo aunque cambie el orden', () => {
    const a = Array.from({ length: 5 }, (_, i) => sortearTalento(createRng(i + 1)).techo);
    const b = Array.from({ length: 5 }, (_, i) => sortearTalento(createRng(i + 1)).techo);
    expect(a).toEqual(b);
  });
});

describe('rendimientoDeMejora', () => {
  const con = (techo, curva) => ({ talento: { techo, curva } });

  it('un techo alto rinde mas que uno bajo a la misma edad', () => {
    expect(rendimientoDeMejora(con(1.3, 'normal'), 25))
      .toBeGreaterThan(rendimientoDeMejora(con(0.7, 'normal'), 25));
  });

  it('el de curva temprana rinde mas joven; el tardio, mas grande', () => {
    expect(rendimientoDeMejora(con(1, 'temprana'), 21))
      .toBeGreaterThan(rendimientoDeMejora(con(1, 'tardia'), 21));
    expect(rendimientoDeMejora(con(1, 'tardia'), 32))
      .toBeGreaterThan(rendimientoDeMejora(con(1, 'temprana'), 32));
  });

  it('un peleador sin talento asignado rinde normal, no rompe', () => {
    expect(rendimientoDeMejora(undefined, 25)).toBe(1);
    expect(rendimientoDeMejora({}, 25)).toBe(1);
  });

  it('nunca devuelve un multiplicador absurdo', () => {
    for (const curva of ['temprana', 'normal', 'tardia']) {
      for (let edad = 15; edad <= 40; edad += 1) {
        for (const techo of [TECHO_MIN, 1, TECHO_MAX]) {
          // El rango se ensanchó junto con el techo (Bloque 6): un peleador
          // realmente flojo lejos de su pico rinde menos de la mitad que uno
          // normal, y uno con suerte extrema en su pico casi el doble.
          const r = rendimientoDeMejora(con(techo, curva), edad);
          expect(r).toBeGreaterThan(0.1);
          expect(r).toBeLessThan(2.1);
        }
      }
    }
  });
});

describe('lecturaDeTalento', () => {
  it('separa alto, normal y bajo', () => {
    expect(lecturaDeTalento({ talento: { techo: 1.25 } })).toBe('alto');
    expect(lecturaDeTalento({ talento: { techo: 1 } })).toBe('normal');
    expect(lecturaDeTalento({ talento: { techo: 0.75 } })).toBe('bajo');
  });

  it('sin talento asignado lee normal', () => {
    expect(lecturaDeTalento({})).toBe('normal');
  });
});
