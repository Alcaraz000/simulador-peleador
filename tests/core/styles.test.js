import { describe, it, expect } from 'vitest';
import { ESTILOS, estilosDisponibles, ventajaDeEstilo } from '../../src/core/styles.js';

describe('estilos', () => {
  it('define los tres estilos de la v1 mas el legendario nuevo', () => {
    expect(Object.keys(ESTILOS).sort()).toEqual(['contragolpeador', 'menton', 'noqueador', 'tecnico']);
  });

  it('los cuatro estan disponibles en boxeo', () => {
    expect(estilosDisponibles('boxeo')).toHaveLength(4);
    expect(estilosDisponibles('boxeo').map((e) => e.id).sort())
      .toEqual(['contragolpeador', 'menton', 'noqueador', 'tecnico']);
  });

  it('cada estilo tiene al menos un bonus y un malus', () => {
    for (const estilo of Object.values(ESTILOS)) {
      const valores = Object.values(estilo.mods);
      expect(valores.some((v) => v > 0)).toBe(true);
      expect(valores.some((v) => v < 0)).toBe(true);
    }
  });

  it('cada estilo declara una rareza valida', () => {
    for (const estilo of Object.values(ESTILOS)) {
      expect(['normal', 'rara', 'legendaria']).toContain(estilo.rareza);
    }
  });

  it('hay al menos un estilo legendario, y no viene nerfeado (mods netos altos)', () => {
    const legendarios = Object.values(ESTILOS).filter((e) => e.rareza === 'legendaria');
    expect(legendarios.length).toBeGreaterThanOrEqual(1);
    for (const estilo of legendarios) {
      const positivos = Object.values(estilo.mods).filter((v) => v > 0).reduce((a, b) => a + b, 0);
      expect(positivos).toBeGreaterThanOrEqual(8);
    }
  });

  it('el contragolpeador es legendario', () => {
    expect(ESTILOS.contragolpeador).toBeTruthy();
    expect(ESTILOS.contragolpeador.rareza).toBe('legendaria');
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

  it('la ventaja es simetrica para TODOS los pares de estilos, incluido el nuevo', () => {
    const ids = Object.keys(ESTILOS);
    for (const a of ids) {
      for (const b of ids) {
        if (a === b) continue;
        expect(ventajaDeEstilo(a, b)).toBeCloseTo(-ventajaDeEstilo(b, a), 5);
      }
    }
  });

  it('el ciclo de ventajas sigue cerrado: ningun estilo queda sin fuerteContra ni sin debilContra', () => {
    for (const estilo of Object.values(ESTILOS)) {
      expect(estilo.fuerteContra.length).toBeGreaterThan(0);
      expect(estilo.debilContra.length).toBeGreaterThan(0);
    }
  });

  it('cada estilo le gana a algun otro estilo de su disciplina y le pierde a algun otro (ninguno invicto ni pierde contra todos)', () => {
    for (const estilo of Object.values(ESTILOS)) {
      const otros = Object.keys(ESTILOS).filter((id) => id !== estilo.id);
      const leGana = otros.some((id) => ventajaDeEstilo(estilo.id, id) > 0);
      const lePierde = otros.some((id) => ventajaDeEstilo(estilo.id, id) < 0);
      expect(leGana).toBe(true);
      expect(lePierde).toBe(true);
    }
  });
});
