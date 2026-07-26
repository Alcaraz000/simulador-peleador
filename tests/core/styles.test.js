import { describe, it, expect } from 'vitest';
import {
  ESTILOS, estilosDisponibles, ventajaDeEstilo, repartirEstilos,
} from '../../src/core/styles.js';
import { createRng } from '../../src/core/rng.js';

const IDS_ESTILOS_V4 = [
  'contragolpeador', 'menton', 'noqueador', 'presionador', 'rustico', 'tecnico', 'volante', 'zurdo_cruzado',
];

describe('estilos', () => {
  it('define el catalogo completo v4 (8 estilos: los 4 originales + 4 nuevos)', () => {
    expect(Object.keys(ESTILOS).sort()).toEqual(IDS_ESTILOS_V4);
  });

  it('los 8 estan disponibles en boxeo', () => {
    expect(estilosDisponibles('boxeo')).toHaveLength(8);
    expect(estilosDisponibles('boxeo').map((e) => e.id).sort()).toEqual(IDS_ESTILOS_V4);
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

  // Pedido v4 ("cuidado con el ciclo de ventajas entre estilos"): estas dos
  // pruebas iteran Object.values(ESTILOS)/Object.keys(ESTILOS) — el catálogo
  // COMPLETO, no una lista fija — así que valen automáticamente para
  // cualquier estilo que se sume después, sin tocar el test.
  it('el ciclo de ventajas sigue cerrado: ningun estilo queda sin fuerteContra ni sin debilContra', () => {
    expect(Object.keys(ESTILOS).length).toBeGreaterThanOrEqual(7);
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

describe('repartirEstilos', () => {
  it('reparte exactamente 2 estilos sin repetir', () => {
    const ofrecidos = repartirEstilos(createRng(1), 'boxeo');
    expect(ofrecidos).toHaveLength(2);
    expect(new Set(ofrecidos.map((e) => e.id)).size).toBe(2);
  });

  it('los 2 ofrecidos son siempre parte del catalogo disponible en esa disciplina', () => {
    for (let s = 1; s <= 50; s += 1) {
      const disponibles = new Set(estilosDisponibles('boxeo').map((e) => e.id));
      const ofrecidos = repartirEstilos(createRng(s), 'boxeo');
      for (const e of ofrecidos) expect(disponibles.has(e.id)).toBe(true);
    }
  });

  it('es determinista con la misma semilla', () => {
    const a = repartirEstilos(createRng(7), 'boxeo').map((e) => e.id);
    const b = repartirEstilos(createRng(7), 'boxeo').map((e) => e.id);
    expect(a).toEqual(b);
  });

  it('con distintas semillas, no siempre ofrece el mismo par (rejugabilidad real)', () => {
    const pares = new Set();
    for (let s = 1; s <= 40; s += 1) {
      pares.add(repartirEstilos(createRng(s), 'boxeo').map((e) => e.id).sort().join(','));
    }
    expect(pares.size).toBeGreaterThan(1);
  });

  it('usa por defecto la disciplina boxeo si no se pasa ninguna', () => {
    const ofrecidos = repartirEstilos(createRng(3));
    expect(ofrecidos).toHaveLength(2);
  });
});
