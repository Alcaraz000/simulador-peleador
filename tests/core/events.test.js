import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import { CARTAS_EVENTO } from '../../src/content/cards-events.js';
import { CARTAS_REDES } from '../../src/content/cards-social.js';
import { elegirEvento, elegirCartaRedes, resolverOpcion } from '../../src/core/events.js';

const RAREZAS_VALIDAS = ['normal', 'rara', 'legendaria'];

function jugador(extra = {}) {
  return {
    ...crearPeleador({
      nombre: 'Test', apodo: 'El Test', nacionalidad: 'AR', disciplina: 'boxeo',
      estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 55, esJugador: true,
    }),
    ...extra,
  };
}

describe('catalogo de eventos', () => {
  it('tiene al menos doce cartas con id unico', () => {
    expect(CARTAS_EVENTO.length).toBeGreaterThanOrEqual(12);
    const ids = CARTAS_EVENTO.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada carta ofrece dos o tres opciones', () => {
    for (const carta of CARTAS_EVENTO) {
      expect(carta.opciones.length).toBeGreaterThanOrEqual(2);
      expect(carta.opciones.length).toBeLessThanOrEqual(3);
    }
  });

  it('cada opcion tiene efecto directo o probabilistico', () => {
    for (const carta of CARTAS_EVENTO) {
      for (const opcion of carta.opciones) {
        const tieneAlgo = Boolean(opcion.mods || opcion.probabilidades || opcion.efectos);
        expect(tieneAlgo).toBe(true);
      }
    }
  });

  it('mezcla eventos de carrera y de vida personal', () => {
    const categorias = new Set(CARTAS_EVENTO.map((c) => c.categoria));
    expect(categorias).toContain('evento');
    expect(categorias).toContain('vida');
  });

  it('toda carta declara una rareza valida', () => {
    for (const carta of CARTAS_EVENTO) {
      expect(RAREZAS_VALIDAS).toContain(carta.rareza);
    }
  });

  it('tiene 1 o 2 eventos legendarios, potentes de verdad', () => {
    const legendarios = CARTAS_EVENTO.filter((c) => c.rareza === 'legendaria');
    expect(legendarios.length).toBeGreaterThanOrEqual(1);
    expect(legendarios.length).toBeLessThanOrEqual(2);
    for (const carta of legendarios) {
      const sumaPositivos = carta.opciones.reduce((acc, o) => {
        const deMods = Object.values(o.mods ?? {}).filter((v) => v > 0).reduce((a, b) => a + b, 0);
        return Math.max(acc, deMods);
      }, 0);
      expect(sumaPositivos).toBeGreaterThanOrEqual(8);
    }
  });
});

describe('catalogo de redes', () => {
  it('tiene al menos ocho cartas de tres opciones', () => {
    expect(CARTAS_REDES.length).toBeGreaterThanOrEqual(8);
    for (const carta of CARTAS_REDES) expect(carta.opciones).toHaveLength(3);
  });

  it('siempre hay una opcion que sube el heat del rival', () => {
    for (const carta of CARTAS_REDES) {
      expect(carta.opciones.some((o) => (o.efectos?.heatRival ?? 0) > 0)).toBe(true);
    }
  });

  it('toda carta declara una rareza valida', () => {
    for (const carta of CARTAS_REDES) {
      expect(RAREZAS_VALIDAS).toContain(carta.rareza);
    }
  });

  it('tiene al menos una carta de redes legendaria, potente de verdad', () => {
    const legendarias = CARTAS_REDES.filter((c) => c.rareza === 'legendaria');
    expect(legendarias.length).toBeGreaterThanOrEqual(1);
    for (const carta of legendarias) {
      const famaMaxima = Math.max(...carta.opciones.map((o) => o.efectos?.fama ?? 0));
      expect(famaMaxima).toBeGreaterThanOrEqual(10);
    }
  });
});

describe('elegirEvento', () => {
  it('respeta la etapa', () => {
    const carta = elegirEvento(createRng(1), { jugador: jugador(), etapa: 'juvenil' });
    expect(carta.etapas).toContain('juvenil');
  });

  it('puede filtrar por categoria', () => {
    const carta = elegirEvento(createRng(2), { jugador: jugador(), etapa: 'profesional', categoria: 'vida' });
    expect(carta.categoria).toBe('vida');
  });

  it('es determinista', () => {
    const a = elegirEvento(createRng(3), { jugador: jugador(), etapa: 'profesional' });
    const b = elegirEvento(createRng(3), { jugador: jugador(), etapa: 'profesional' });
    expect(a.id).toBe(b.id);
  });

  it('la carta elegida trae su rareza intacta', () => {
    const carta = elegirEvento(createRng(14), { jugador: jugador(), etapa: 'profesional' });
    expect(RAREZAS_VALIDAS).toContain(carta.rareza);
  });

  it('sobre muchas semillas, la distribucion de rarezas cae cerca de 70/25/5', () => {
    const conteo = { normal: 0, rara: 0, legendaria: 0 };
    for (let semilla = 1; semilla <= 500; semilla += 1) {
      const carta = elegirEvento(createRng(semilla), { jugador: jugador(), etapa: 'profesional' });
      conteo[carta.rareza] += 1;
    }
    const pct = (n) => (100 * conteo[n]) / 500;
    expect(pct('normal')).toBeGreaterThan(50);
    expect(pct('rara')).toBeGreaterThan(10);
    expect(pct('rara')).toBeLessThan(45);
    expect(pct('legendaria')).toBeLessThan(15);
  });
});

describe('elegirCartaRedes', () => {
  it('devuelve una carta del catalogo', () => {
    const carta = elegirCartaRedes(createRng(4), { jugador: jugador() });
    expect(CARTAS_REDES.map((c) => c.id)).toContain(carta.id);
  });

  it('la carta elegida trae su rareza intacta', () => {
    const carta = elegirCartaRedes(createRng(15), { jugador: jugador() });
    expect(RAREZAS_VALIDAS).toContain(carta.rareza);
  });

  it('sobre muchas semillas, la distribucion de rarezas cae cerca de 70/25/5', () => {
    const conteo = { normal: 0, rara: 0, legendaria: 0 };
    for (let semilla = 1; semilla <= 500; semilla += 1) {
      const carta = elegirCartaRedes(createRng(semilla), { jugador: jugador() });
      conteo[carta.rareza] += 1;
    }
    const pct = (n) => (100 * conteo[n]) / 500;
    expect(pct('normal')).toBeGreaterThan(50);
    expect(pct('legendaria')).toBeLessThan(15);
  });
});

describe('resolverOpcion', () => {
  const carta = {
    id: 'test', categoria: 'evento', titulo: 'T', texto: 't', etapas: ['profesional'],
    opciones: [
      { id: 'directo', texto: 'Directo', mods: { cardio: 5 } },
      { id: 'plata', texto: 'Plata', efectos: { dinero: 5000, fama: 3 } },
      { id: 'riesgo', texto: 'Riesgo', probabilidades: [
        { peso: 1, mods: { forma: 5 }, texto: 'Salió bien.' },
        { peso: 1, mods: { forma: -5 }, texto: 'Salió mal.' },
      ] },
      { id: 'picante', texto: 'Picante', efectos: { heatRival: 20 } },
    ],
  };

  it('aplica modificadores directos', () => {
    const yo = jugador();
    const paso = resolverOpcion(createRng(5), { jugador: yo, carta, opcionId: 'directo' });
    expect(paso.jugador.atributos.cardio).toBe(yo.atributos.cardio + 5);
    expect(paso.deltasTexto).toContain('+5 Cardio');
  });

  it('aplica efectos de dinero y fama', () => {
    const yo = jugador({ dinero: 100, fama: 10 });
    const paso = resolverOpcion(createRng(6), { jugador: yo, carta, opcionId: 'plata' });
    expect(paso.jugador.dinero).toBe(5100);
    expect(paso.jugador.fama).toBe(13);
  });

  it('resuelve las opciones con probabilidad', () => {
    const yo = jugador();
    const paso = resolverOpcion(createRng(7), { jugador: yo, carta, opcionId: 'riesgo' });
    expect(Math.abs(paso.jugador.estado.forma - yo.estado.forma)).toBe(5);
    expect(paso.texto).toMatch(/Salió/);
  });

  it('sube el heat del rival indicado', () => {
    const paso = resolverOpcion(createRng(8), {
      jugador: jugador(), carta, opcionId: 'picante',
      rivalidades: [], rivalObjetivoId: 'riv_1',
    });
    expect(paso.rivalidades.find((r) => r.rivalId === 'riv_1').heat).toBeGreaterThan(0);
  });

  it('la fama nunca sale del rango 0-100', () => {
    const cartaExtrema = {
      ...carta,
      opciones: [{ id: 'boom', texto: 'x', efectos: { fama: 999 } }],
    };
    const paso = resolverOpcion(createRng(9), { jugador: jugador({ fama: 90 }), carta: cartaExtrema, opcionId: 'boom' });
    expect(paso.jugador.fama).toBe(100);
  });

  it('el dinero nunca queda negativo', () => {
    const cartaCara = { ...carta, opciones: [{ id: 'caro', texto: 'x', efectos: { dinero: -999999 } }] };
    const paso = resolverOpcion(createRng(10), { jugador: jugador({ dinero: 100 }), carta: cartaCara, opcionId: 'caro' });
    expect(paso.jugador.dinero).toBe(0);
  });

  it('rechaza una opcion inexistente', () => {
    expect(() => resolverOpcion(createRng(11), { jugador: jugador(), carta, opcionId: 'inventada' })).toThrow(/inventada/);
  });

  it('no muta el jugador original', () => {
    const yo = jugador();
    const antes = JSON.stringify(yo);
    resolverOpcion(createRng(12), { jugador: yo, carta, opcionId: 'directo' });
    expect(JSON.stringify(yo)).toBe(antes);
  });

  it('es determinista', () => {
    const a = resolverOpcion(createRng(13), { jugador: jugador(), carta, opcionId: 'riesgo' });
    const b = resolverOpcion(createRng(13), { jugador: jugador(), carta, opcionId: 'riesgo' });
    expect(a.texto).toBe(b.texto);
  });

  it('expone los deltas crudos ademas de deltasTexto, sin romper deltasTexto', () => {
    const yo = jugador();
    const paso = resolverOpcion(createRng(5), { jugador: yo, carta, opcionId: 'directo' });
    expect(paso.deltas).toEqual({ cardio: 5 });
    expect(paso.deltasTexto).toEqual(['+5 Cardio']);
  });
});
