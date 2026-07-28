import { describe, it, expect } from 'vitest';
import {
  ATRIBUTOS, ETIQUETAS, crearAtributos, crearEstado, clamp,
  aplicarModificadores, LIMITES_ATRIBUTO,
  RANGOS_MEDIA, rangoDeMedia,
} from '../../src/core/stats.js';

describe('atributos', () => {
  it('define exactamente los cuatro atributos', () => {
    expect(ATRIBUTOS).toEqual(['fuerza', 'defensa', 'cardio', 'agilidad']);
  });

  it('el estado ya no lleva forma, moral ni fatiga: solo la lesión', () => {
    expect(crearEstado()).toEqual({ lesion: null });
  });

  it('tiene etiqueta corta y larga para cada uno de los cuatro atributos, y nada más', () => {
    expect(Object.keys(ETIQUETAS).sort()).toEqual([...ATRIBUTOS].sort());
    for (const clave of ATRIBUTOS) {
      expect(ETIQUETAS[clave].corta).toBeTruthy();
      expect(ETIQUETAS[clave].larga).toBeTruthy();
    }
  });

  it('crearAtributos arranca en 40 y acepta overrides', () => {
    const a = crearAtributos({ fuerza: 70 });
    expect(a.fuerza).toBe(70);
    expect(a.cardio).toBe(40);
  });

  it('crearAtributos clampea entre 1 y 99', () => {
    const a = crearAtributos({ fuerza: 200, cardio: -5 });
    expect(a.fuerza).toBe(99);
    expect(a.cardio).toBe(1);
  });

  it('crearAtributos no produce ninguna clave fuera de los cuatro atributos', () => {
    const a = crearAtributos({ fuerza: 50, potencia: 90, menton: 80 });
    expect(Object.keys(a).sort()).toEqual([...ATRIBUTOS].sort());
  });
});

describe('LIMITES_ATRIBUTO', () => {
  it('va de 1 a 99', () => {
    expect(LIMITES_ATRIBUTO).toEqual({ min: 1, max: 99 });
  });
});

describe('clamp', () => {
  it('acota por arriba y por abajo', () => {
    expect(clamp(5, 1, 10)).toBe(5);
    expect(clamp(-3, 1, 10)).toBe(1);
    expect(clamp(99, 1, 10)).toBe(10);
  });
});

describe('aplicarModificadores', () => {
  it('suma modificadores sin mutar el original', () => {
    const base = crearAtributos({ fuerza: 50 });
    const { resultado, deltas } = aplicarModificadores(base, { fuerza: 3 });
    expect(base.fuerza).toBe(50);
    expect(resultado.fuerza).toBe(53);
    expect(deltas.fuerza).toBe(3);
  });

  it('clampea atributos en 99 y reporta el delta real', () => {
    const base = crearAtributos({ fuerza: 98 });
    const { resultado, deltas } = aplicarModificadores(base, { fuerza: 5 });
    expect(resultado.fuerza).toBe(99);
    expect(deltas.fuerza).toBe(1);
  });

  it('ignora claves que no existen en el objetivo', () => {
    const base = crearAtributos();
    const { resultado } = aplicarModificadores(base, { inventado: 10 });
    expect(resultado.inventado).toBeUndefined();
  });

  it('acepta límites custom (por ejemplo, para un objeto que no sea atributos)', () => {
    const objetivo = { valor: 50 };
    const { resultado } = aplicarModificadores(objetivo, { valor: 999 }, { min: 0, max: 100 });
    expect(resultado.valor).toBe(100);
  });
});

describe('RANGOS_MEDIA y rangoDeMedia', () => {
  it('define los cinco rangos en orden creciente', () => {
    expect(Object.keys(RANGOS_MEDIA)).toEqual(['hierro', 'bronce', 'plata', 'oro', 'platino']);
  });

  it('cada rango define color y nombre', () => {
    for (const rango of Object.values(RANGOS_MEDIA)) {
      expect(rango.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(rango.nombre).toBeTruthy();
    }
  });

  it('clasifica hierro de 1 a 49', () => {
    expect(rangoDeMedia(1).id).toBe('hierro');
    expect(rangoDeMedia(49).id).toBe('hierro');
    expect(rangoDeMedia(1).color).toBe('#9aa0a6');
  });

  it('clasifica bronce de 50 a 64', () => {
    expect(rangoDeMedia(50).id).toBe('bronce');
    expect(rangoDeMedia(64).id).toBe('bronce');
  });

  it('clasifica plata de 65 a 79', () => {
    expect(rangoDeMedia(65).id).toBe('plata');
    expect(rangoDeMedia(79).id).toBe('plata');
  });

  it('clasifica oro de 80 a 89', () => {
    expect(rangoDeMedia(80).id).toBe('oro');
    expect(rangoDeMedia(89).id).toBe('oro');
  });

  it('clasifica platino de 90 a 99', () => {
    expect(rangoDeMedia(90).id).toBe('platino');
    expect(rangoDeMedia(99).id).toBe('platino');
  });

  it('no rompe fuera de rango: valores extremos caen en el extremo mas cercano', () => {
    expect(rangoDeMedia(0).id).toBe('hierro');
    expect(rangoDeMedia(150).id).toBe('platino');
  });
});
