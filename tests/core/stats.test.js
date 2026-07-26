import { describe, it, expect } from 'vitest';
import {
  ATRIBUTOS, ETIQUETAS, crearAtributos, crearEstado, clamp,
  calcularMedia, aplicarModificadores, etiquetaEstado,
  RANGOS_MEDIA, rangoDeMedia,
} from '../../src/core/stats.js';

describe('atributos', () => {
  it('define los siete atributos', () => {
    expect(ATRIBUTOS).toEqual(['potencia', 'velocidad', 'tecnica', 'defensa', 'cardio', 'iq', 'grappling']);
  });

  it('tiene etiqueta corta y larga para cada atributo y especial', () => {
    for (const clave of [...ATRIBUTOS, 'disciplinaPersonal', 'menton']) {
      expect(ETIQUETAS[clave].corta).toBeTruthy();
      expect(ETIQUETAS[clave].larga).toBeTruthy();
    }
  });

  it('crearAtributos arranca en 40 y acepta overrides', () => {
    const a = crearAtributos({ potencia: 70 });
    expect(a.potencia).toBe(70);
    expect(a.cardio).toBe(40);
  });

  it('crearAtributos clampea entre 1 y 99', () => {
    const a = crearAtributos({ potencia: 200, cardio: -5 });
    expect(a.potencia).toBe(99);
    expect(a.cardio).toBe(1);
  });

  it('crearEstado arranca con valores sanos y sin lesion', () => {
    expect(crearEstado()).toEqual({ forma: 60, fatiga: 10, moral: 60, lesion: null });
  });
});

describe('clamp', () => {
  it('acota por arriba y por abajo', () => {
    expect(clamp(5, 1, 10)).toBe(5);
    expect(clamp(-3, 1, 10)).toBe(1);
    expect(clamp(99, 1, 10)).toBe(10);
  });
});

describe('calcularMedia', () => {
  it('promedia segun los pesos y devuelve entero', () => {
    const atributos = crearAtributos({ potencia: 80, velocidad: 60 });
    const media = calcularMedia(atributos, { potencia: 0.5, velocidad: 0.5 });
    expect(media).toBe(70);
  });

  it('ignora atributos sin peso', () => {
    const atributos = crearAtributos({ potencia: 80, grappling: 99 });
    expect(calcularMedia(atributos, { potencia: 1 })).toBe(80);
  });
});

describe('aplicarModificadores', () => {
  it('suma modificadores sin mutar el original', () => {
    const base = crearAtributos({ potencia: 50 });
    const { resultado, deltas } = aplicarModificadores(base, { potencia: 3 });
    expect(base.potencia).toBe(50);
    expect(resultado.potencia).toBe(53);
    expect(deltas.potencia).toBe(3);
  });

  it('clampea atributos en 99 y reporta el delta real', () => {
    const base = crearAtributos({ potencia: 98 });
    const { resultado, deltas } = aplicarModificadores(base, { potencia: 5 });
    expect(resultado.potencia).toBe(99);
    expect(deltas.potencia).toBe(1);
  });

  it('clampea estado entre 0 y 100', () => {
    const estado = crearEstado();
    const { resultado } = aplicarModificadores(estado, { forma: 999, fatiga: -999 }, { min: 0, max: 100 });
    expect(resultado.forma).toBe(100);
    expect(resultado.fatiga).toBe(0);
  });

  it('ignora claves que no existen en el objetivo', () => {
    const base = crearAtributos();
    const { resultado } = aplicarModificadores(base, { inventado: 10 });
    expect(resultado.inventado).toBeUndefined();
  });
});

describe('etiquetaEstado', () => {
  it('describe la forma en palabras', () => {
    expect(etiquetaEstado('forma', 90)).toBe('EN PUNTO');
    expect(etiquetaEstado('forma', 55)).toBe('NORMAL');
    expect(etiquetaEstado('forma', 20)).toBe('OXIDADO');
  });

  it('describe la fatiga al reves que la forma', () => {
    expect(etiquetaEstado('fatiga', 85)).toBe('FUNDIDO');
    expect(etiquetaEstado('fatiga', 15)).toBe('ENTERO');
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
