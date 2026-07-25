import { describe, it, expect } from 'vitest';
import { ESTILOS, estilosDisponibles, ventajaDeEstilo } from '../../src/core/styles.js';

describe('estilos', () => {
  it('define los tres estilos de la v1', () => {
    expect(Object.keys(ESTILOS).sort()).toEqual(['menton', 'noqueador', 'tecnico']);
  });

  it('los tres estan disponibles en boxeo', () => {
    expect(estilosDisponibles('boxeo')).toHaveLength(3);
    expect(estilosDisponibles('boxeo').map((e) => e.id).sort()).toEqual(['menton', 'noqueador', 'tecnico']);
  });

  it('cada estilo tiene al menos un bonus y un malus', () => {
    for (const estilo of Object.values(ESTILOS)) {
      const valores = Object.values(estilo.mods);
      expect(valores.some((v) => v > 0)).toBe(true);
      expect(valores.some((v) => v < 0)).toBe(true);
    }
  });

  it('la ventaja de estilo es simetrica', () => {
    expect(ventajaDeEstilo('tecnico', 'noqueador')).toBeCloseTo(0.06, 5);
    expect(ventajaDeEstilo('noqueador', 'tecnico')).toBeCloseTo(-0.06, 5);
  });

  it('no hay ventaja contra el mismo estilo', () => {
    expect(ventajaDeEstilo('noqueador', 'noqueador')).toBe(0);
  });

  it('devuelve 0 con estilos desconocidos', () => {
    expect(ventajaDeEstilo('inventado', 'noqueador')).toBe(0);
  });
});
