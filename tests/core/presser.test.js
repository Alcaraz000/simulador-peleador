import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { PREGUNTAS_CAREO } from '../../src/content/cards-presser.js';
import { TONOS, TELLS, crearCareo, responderCareo, resultadoCareo } from '../../src/core/presser.js';

const oferta = {
  id: 'of_1', rivalId: 'riv_1', rivalApodo: 'El Ciclón', rivalNombre: 'Dyke Tyzon',
  rivalPersonalidad: 'agresivo', esTitulo: true,
};

describe('contenido del careo', () => {
  it('tiene al menos ocho preguntas con cuatro respuestas', () => {
    expect(PREGUNTAS_CAREO.length).toBeGreaterThanOrEqual(8);
    for (const p of PREGUNTAS_CAREO) {
      expect(p.respuestas).toHaveLength(4);
      expect(new Set(p.respuestas.map((r) => r.tono)).size).toBe(4);
    }
  });

  it('define los cuatro tonos', () => {
    expect(Object.keys(TONOS).sort()).toEqual(['canchero', 'frio', 'humilde', 'provocador']);
  });

  it('hay un tell por personalidad', () => {
    for (const personalidad of ['respetuoso', 'provocador', 'tramposo', 'showman', 'mentor', 'agresivo', 'mercenario']) {
      expect(TELLS[personalidad]).toBeTruthy();
      expect(TELLS[personalidad].texto.length).toBeGreaterThan(0);
    }
  });
});

describe('crearCareo', () => {
  it('arranca en la ronda 1 con tres preguntas', () => {
    const careo = crearCareo(createRng(1), { oferta });
    expect(careo.ronda).toBe(1);
    expect(careo.rondas).toBe(3);
    expect(careo.preguntas).toHaveLength(3);
    expect(careo.terminado).toBe(false);
  });

  it('trae el tell de la personalidad del rival', () => {
    const careo = crearCareo(createRng(2), { oferta });
    expect(careo.tell).toEqual(TELLS.agresivo);
  });

  it('el hype arranca en un valor medio', () => {
    const careo = crearCareo(createRng(3), { oferta });
    expect(careo.hype).toBeGreaterThan(0);
    expect(careo.hype).toBeLessThan(100);
  });

  it('es determinista', () => {
    const a = crearCareo(createRng(4), { oferta });
    const b = crearCareo(createRng(4), { oferta });
    expect(a.preguntas.map((p) => p.id)).toEqual(b.preguntas.map((p) => p.id));
  });
});

describe('responderCareo', () => {
  it('provocar sube el hype', () => {
    const careo = crearCareo(createRng(5), { oferta });
    const { careo: despues, evento } = responderCareo(careo, 'provocador', createRng(6));
    expect(despues.hype).toBeGreaterThan(careo.hype);
    expect(evento.hypeDelta).toBeGreaterThan(0);
  });

  it('el tono que incomoda al rival da ventaja mental', () => {
    const careo = crearCareo(createRng(7), { oferta });
    const { careo: despues } = responderCareo(careo, careo.tell.incomoda, createRng(8));
    expect(despues.ventajaMental).toBeGreaterThan(careo.ventajaMental);
  });

  it('el tono que lo agranda te quita ventaja', () => {
    const careo = crearCareo(createRng(9), { oferta });
    const { careo: despues } = responderCareo(careo, careo.tell.agranda, createRng(10));
    expect(despues.ventajaMental).toBeLessThan(careo.ventajaMental);
  });

  it('humilde baja el hype', () => {
    const careo = crearCareo(createRng(11), { oferta });
    const { careo: despues } = responderCareo(careo, 'humilde', createRng(12));
    expect(despues.hype).toBeLessThanOrEqual(careo.hype);
  });

  it('avanza la ronda y termina al completar', () => {
    let careo = crearCareo(createRng(13), { oferta });
    for (let i = 0; i < 3; i++) careo = responderCareo(careo, 'frio', createRng(i)).careo;
    expect(careo.terminado).toBe(true);
    expect(careo.ronda).toBe(4);
  });

  it('no hace nada si ya termino', () => {
    let careo = crearCareo(createRng(14), { oferta });
    for (let i = 0; i < 3; i++) careo = responderCareo(careo, 'frio', createRng(i)).careo;
    const { careo: igual, evento } = responderCareo(careo, 'provocador', createRng(20));
    expect(igual).toEqual(careo);
    expect(evento).toBeNull();
  });

  it('no muta el careo original', () => {
    const careo = crearCareo(createRng(15), { oferta });
    const antes = JSON.stringify(careo);
    responderCareo(careo, 'provocador', createRng(16));
    expect(JSON.stringify(careo)).toBe(antes);
  });

  it('el hype y la ventaja quedan acotados', () => {
    let careo = crearCareo(createRng(17), { oferta });
    for (let i = 0; i < 3; i++) careo = responderCareo(careo, 'provocador', createRng(i)).careo;
    expect(careo.hype).toBeLessThanOrEqual(100);
    expect(careo.ventajaMental).toBeGreaterThanOrEqual(-100);
    expect(careo.ventajaMental).toBeLessThanOrEqual(100);
  });

  it('rechaza un tono desconocido', () => {
    const careo = crearCareo(createRng(18), { oferta });
    expect(() => responderCareo(careo, 'inventado', createRng(19))).toThrow(/inventado/);
  });
});

describe('resultadoCareo', () => {
  it('mas hype da mas fama', () => {
    let careo = crearCareo(createRng(21), { oferta });
    for (let i = 0; i < 3; i++) careo = responderCareo(careo, 'provocador', createRng(i)).careo;
    const r = resultadoCareo(careo);
    expect(r.bonusFama).toBeGreaterThan(0);
    expect(r.heatRival).toBeGreaterThan(0);
  });

  it('la ventaja mental se traduce en moral', () => {
    let careo = crearCareo(createRng(22), { oferta });
    for (let i = 0; i < 3; i++) careo = responderCareo(careo, careo.tell.incomoda, createRng(i)).careo;
    expect(resultadoCareo(careo).bonusMoral).toBeGreaterThan(0);
  });
});
