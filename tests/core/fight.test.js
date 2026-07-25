import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import { PLANES, crearPelea, simularRound, peleaTerminada, resultadoDe } from '../../src/core/fight.js';

function armar({ estiloJugador = 'tecnico', estiloRival = 'tecnico', mediaJugador = 60, mediaRival = 60, disciplina = 'boxeo', nivel = 'profesional', plan = 'afuera', semilla = 1 } = {}) {
  const jugador = crearPeleador({
    nombre: 'Jugador', apodo: 'El Test', nacionalidad: 'AR', disciplina,
    estilo: estiloJugador, categoria: 'pluma', origen: 'barrio', media: mediaJugador, esJugador: true,
  });
  const rival = crearPeleador({
    nombre: 'Rival', apodo: 'El Otro', nacionalidad: 'MX', disciplina,
    estilo: estiloRival, categoria: 'pluma', origen: 'barrio', media: mediaRival,
  });
  return crearPelea({ jugador, rival, disciplina, nivel, plan, rng: createRng(semilla) });
}

function pelearHasta(pelea) {
  let actual = pelea;
  const todos = [];
  let guardia = 0;
  while (!peleaTerminada(actual) && guardia < 40) {
    guardia += 1;
    const paso = simularRound(actual);
    actual = paso.pelea;
    todos.push(...paso.eventos);
  }
  return { pelea: actual, eventos: todos };
}

describe('planes', () => {
  it('define los tres planes', () => {
    expect(Object.keys(PLANES).sort()).toEqual(['afuera', 'aguantar', 'frente']);
  });

  it('ir al frente cuesta mas gas que aguantar', () => {
    expect(PLANES.frente.mods.gasto).toBeGreaterThan(PLANES.aguantar.mods.gasto);
  });
});

describe('crearPelea', () => {
  it('arranca en el round 1 con aguante lleno', () => {
    const pelea = armar();
    expect(pelea.roundActual).toBe(1);
    expect(pelea.aguante.jugador).toBe(100);
    expect(pelea.aguante.rival).toBe(100);
    expect(pelea.terminada).toBe(false);
    expect(pelea.resultado).toBeNull();
  });

  it('usa los rounds que corresponden al nivel', () => {
    expect(armar({ nivel: 'amateur' }).rounds).toBe(3);
    expect(armar({ nivel: 'profesional' }).rounds).toBe(8);
    expect(armar({ nivel: 'titulo' }).rounds).toBe(12);
  });

  it('rechaza un plan desconocido', () => {
    expect(() => armar({ plan: 'inventado' })).toThrow(/inventado/);
  });

  it('guarda un snapshot de ambos peleadores', () => {
    const pelea = armar();
    expect(pelea.snapshot.jugador.nombre).toBe('Jugador');
    expect(pelea.snapshot.rival.nombre).toBe('Rival');
  });
});

describe('simularRound', () => {
  it('no muta la pelea original', () => {
    const pelea = armar();
    const antes = JSON.stringify(pelea);
    simularRound(pelea);
    expect(JSON.stringify(pelea)).toBe(antes);
  });

  it('avanza el round y produce eventos narrados', () => {
    const { pelea, eventos } = simularRound(armar());
    expect(pelea.roundActual).toBe(2);
    expect(eventos.length).toBeGreaterThan(0);
    for (const e of eventos) {
      expect(e.texto).toBeTruthy();
      expect(e.texto).not.toMatch(/\{yo\}|\{rival\}/);
    }
  });

  it('acumula fatiga', () => {
    const inicial = armar({ plan: 'frente' });
    const fatigaInicial = inicial.fatiga.jugador;
    const { pelea } = simularRound(inicial);
    expect(pelea.fatiga.jugador).toBeGreaterThan(fatigaInicial);
  });

  it('el plan frente gasta mas fatiga que aguantar', () => {
    const { pelea: peleaFrente } = simularRound(armar({ plan: 'frente' }));
    const { pelea: peleaAguantar } = simularRound(armar({ plan: 'aguantar' }));
    expect(peleaFrente.fatiga.jugador).toBeGreaterThan(peleaAguantar.fatiga.jugador);
  });

  it('suma tarjetas a alguien cada round', () => {
    const { pelea } = simularRound(armar());
    expect(pelea.tarjetas.jugador + pelea.tarjetas.rival).toBeGreaterThan(0);
  });

  it('no hace nada si la pelea ya termino', () => {
    const { pelea } = pelearHasta(armar({ nivel: 'amateur' }));
    const paso = simularRound(pelea);
    expect(paso.eventos).toEqual([]);
    expect(paso.pelea.roundActual).toBe(pelea.roundActual);
  });
});

describe('desenlace', () => {
  it('siempre termina con un resultado valido', () => {
    for (let semilla = 1; semilla <= 30; semilla++) {
      const { pelea } = pelearHasta(armar({ semilla }));
      expect(peleaTerminada(pelea)).toBe(true);
      const r = resultadoDe(pelea);
      expect(['jugador', 'rival', 'empate']).toContain(r.ganador);
      expect(['ko', 'tko', 'sumision', 'decision', 'descalificacion']).toContain(r.metodo);
      expect(r.round).toBeGreaterThanOrEqual(1);
      expect(r.texto).toBeTruthy();
    }
  });

  it('en boxeo nunca hay sumision', () => {
    for (let semilla = 1; semilla <= 30; semilla++) {
      const { pelea } = pelearHasta(armar({ semilla, disciplina: 'boxeo' }));
      expect(resultadoDe(pelea).metodo).not.toBe('sumision');
    }
  });

  it('un peleador muy superior gana la mayoria de las veces', () => {
    let ganadas = 0;
    for (let semilla = 1; semilla <= 40; semilla++) {
      const { pelea } = pelearHasta(armar({ mediaJugador: 85, mediaRival: 45, semilla }));
      if (resultadoDe(pelea).ganador === 'jugador') ganadas++;
    }
    expect(ganadas).toBeGreaterThan(30);
  });

  it('la ventaja de estilo mueve la aguja', () => {
    const contar = (estiloJugador) => {
      let ganadas = 0;
      for (let semilla = 1; semilla <= 60; semilla++) {
        const { pelea } = pelearHasta(armar({ estiloJugador, estiloRival: 'noqueador', semilla }));
        if (resultadoDe(pelea).ganador === 'jugador') ganadas++;
      }
      return ganadas;
    };
    // tecnico le gana al noqueador; menton pierde contra el noqueador
    expect(contar('tecnico')).toBeGreaterThan(contar('menton'));
  });

  it('es determinista con la misma semilla', () => {
    const a = pelearHasta(armar({ semilla: 77 }));
    const b = pelearHasta(armar({ semilla: 77 }));
    expect(a.eventos).toEqual(b.eventos);
    expect(resultadoDe(a.pelea)).toEqual(resultadoDe(b.pelea));
  });

  it('el ganador por decision es el que tiene mas tarjetas', () => {
    for (let semilla = 1; semilla <= 40; semilla++) {
      const { pelea } = pelearHasta(armar({ semilla }));
      const r = resultadoDe(pelea);
      if (r.metodo !== 'decision') continue;
      if (r.ganador === 'jugador') expect(pelea.tarjetas.jugador).toBeGreaterThan(pelea.tarjetas.rival);
      if (r.ganador === 'rival') expect(pelea.tarjetas.rival).toBeGreaterThan(pelea.tarjetas.jugador);
      if (r.ganador === 'empate') expect(pelea.tarjetas.jugador).toBe(pelea.tarjetas.rival);
    }
  });
});
