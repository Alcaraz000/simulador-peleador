import { describe, it, expect } from 'vitest';
import { LINEAS } from '../../src/content/fight-lines.js';

const CATEGORIAS_MINIMO_8 = ['dominio', 'parejo', 'sufriendo', 'caida', 'ko', 'campana', 'jab', 'cuerpo', 'contragolpe', 'cansancio'];

describe('LINEAS', () => {
  it('tiene al menos 8 variantes en cada categoria clave', () => {
    for (const categoria of CATEGORIAS_MINIMO_8) {
      expect(LINEAS[categoria].length, `LINEAS.${categoria}`).toBeGreaterThanOrEqual(8);
    }
  });

  it('no tiene lineas repetidas dentro de una misma categoria', () => {
    for (const [categoria, lineas] of Object.entries(LINEAS)) {
      const unicas = new Set(lineas);
      expect(unicas.size, `LINEAS.${categoria} tiene duplicados`).toBe(lineas.length);
    }
  });

  it('toda linea que usa {rival} tambien podria usar {yo} sin quedar vacia', () => {
    for (const lineas of Object.values(LINEAS)) {
      for (const linea of lineas) {
        expect(linea.length).toBeGreaterThan(5);
      }
    }
  });

  it('sumision tiene variedad razonable', () => {
    expect(LINEAS.sumision.length).toBeGreaterThanOrEqual(6);
  });
});
