import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import { PLANES, crearPelea, simularRound, peleaTerminada, resultadoDe, tarjetasJurados } from '../../src/core/fight.js';

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

  it('el snapshot incluye la nacionalidad de ambos (para la bandera del marcador)', () => {
    const pelea = armar();
    expect(pelea.snapshot.jugador.nacionalidad).toBe('AR');
    expect(pelea.snapshot.rival.nacionalidad).toBe('MX');
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

// Sistema 1 (feedback del usuario: "¿Qué efecto tienen las lesiones?
// Parecería que no afecta en nada"): `efectividad()` (interna) tiene que
// pesar de verdad la lesión activa del peleador, no solo maquillarla. Se mide
// estadísticamente (igual que "un peleador muy superior gana la mayoria de
// las veces", más arriba): con todo lo demás igual, un jugador lesionado
// tiene que ganar menos peleas parejas que uno sano.
describe('penalización por lesión', () => {
  function armarConLesion({ lesion = null, semilla = 1 } = {}) {
    const jugador = crearPeleador({
      nombre: 'Jugador', apodo: 'El Test', nacionalidad: 'AR', disciplina: 'boxeo',
      estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 60, esJugador: true,
    });
    if (lesion) jugador.estado.lesion = lesion;
    const rival = crearPeleador({
      nombre: 'Rival', apodo: 'El Otro', nacionalidad: 'MX', disciplina: 'boxeo',
      estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 60,
    });
    return crearPelea({
      jugador, rival, disciplina: 'boxeo', nivel: 'profesional', plan: 'afuera', rng: createRng(semilla),
    });
  }

  it('lesionado gana menos peleas parejas que sano', () => {
    const contarVictorias = (lesion) => {
      let ganadas = 0;
      for (let semilla = 1; semilla <= 80; semilla++) {
        const { pelea } = pelearHasta(armarConLesion({ lesion, semilla }));
        if (resultadoDe(pelea).ganador === 'jugador') ganadas++;
      }
      return ganadas;
    };
    const sano = contarVictorias(null);
    const lesionLeve = contarVictorias({
      id: 'ceja', nombre: 'Ceja', severidad: 1, semanasRestantes: 4, costo: 1, texto: 'x',
    });
    const lesionModerada = contarVictorias({
      id: 'mano', nombre: 'Mano fracturada', severidad: 2, semanasRestantes: 10, costo: 1, texto: 'x',
    });
    expect(lesionLeve).toBeLessThan(sano);
    expect(lesionModerada).toBeLessThan(lesionLeve);
  });
});

describe('estadisticas de golpes', () => {
  it('arranca en cero', () => {
    const pelea = armar();
    expect(pelea.golpes.jugador).toEqual({ lanzados: 0, conectados: 0, significativos: 0 });
    expect(pelea.golpes.rival).toEqual({ lanzados: 0, conectados: 0, significativos: 0 });
  });

  it('crecen round a round y quedan coherentes', () => {
    for (let semilla = 1; semilla <= 25; semilla++) {
      let pelea = armar({ semilla });
      for (let i = 0; i < 6 && !pelea.terminada; i++) {
        const antes = pelea.golpes;
        const paso = simularRound(pelea);
        pelea = paso.pelea;
        for (const lado of ['jugador', 'rival']) {
          expect(pelea.golpes[lado].lanzados).toBeGreaterThanOrEqual(antes[lado].lanzados);
          expect(pelea.golpes[lado].conectados).toBeLessThanOrEqual(pelea.golpes[lado].lanzados);
          expect(pelea.golpes[lado].significativos).toBeLessThanOrEqual(pelea.golpes[lado].conectados);
        }
      }
    }
  });

  it('el que domina el round conecta al menos tantos golpes como el que lo pierde, ese round', () => {
    for (let semilla = 1; semilla <= 25; semilla++) {
      const pelea = armar({ semilla });
      const { pelea: despues, eventos } = simularRound(pelea);
      const ganaJugador = despues.tarjetas.jugador > pelea.tarjetas.jugador;
      const conectadosRoundJugador = despues.golpes.jugador.conectados - pelea.golpes.jugador.conectados;
      const conectadosRoundRival = despues.golpes.rival.conectados - pelea.golpes.rival.conectados;
      if (ganaJugador) {
        expect(conectadosRoundJugador).toBeGreaterThanOrEqual(conectadosRoundRival);
      } else {
        expect(conectadosRoundRival).toBeGreaterThanOrEqual(conectadosRoundJugador);
      }
      expect(eventos.length).toBeGreaterThan(0);
    }
  });

  it('no muta las estadisticas de la pelea original', () => {
    const pelea = armar();
    const antes = JSON.stringify(pelea.golpes);
    simularRound(pelea);
    expect(JSON.stringify(pelea.golpes)).toBe(antes);
  });
});

describe('momentos del round', () => {
  it('produce entre 4 y 6 momentos por round', () => {
    for (let semilla = 1; semilla <= 20; semilla++) {
      const pelea = armar({ semilla });
      const { eventos } = simularRound(pelea);
      expect(eventos.length).toBeGreaterThanOrEqual(4);
      expect(eventos.length).toBeLessThanOrEqual(6);
    }
  });

  it('incluye tipos de momento nuevos (jab y cuerpo o contragolpe)', () => {
    const tiposVistos = new Set();
    for (let semilla = 1; semilla <= 15; semilla++) {
      const pelea = armar({ semilla });
      const { eventos } = simularRound(pelea);
      for (const e of eventos) tiposVistos.add(e.tipo);
    }
    expect(tiposVistos.has('jab')).toBe(true);
    expect(tiposVistos.has('cuerpo') || tiposVistos.has('contragolpe')).toBe(true);
  });

  it('cada momento trae un snapshot con aguante, fatiga y golpes', () => {
    const pelea = armar();
    const { eventos } = simularRound(pelea);
    for (const e of eventos) {
      expect(e.snapshot).toBeTruthy();
      expect(typeof e.snapshot.aguante.jugador).toBe('number');
      expect(typeof e.snapshot.aguante.rival).toBe('number');
      expect(typeof e.snapshot.fatiga.jugador).toBe('number');
      expect(typeof e.snapshot.fatiga.rival).toBe('number');
      expect(e.snapshot.golpes.jugador.conectados).toBeLessThanOrEqual(e.snapshot.golpes.jugador.lanzados);
      expect(e.snapshot.golpes.rival.conectados).toBeLessThanOrEqual(e.snapshot.golpes.rival.lanzados);
    }
  });

  it('el snapshot del ultimo momento del round coincide con el estado real de la pelea', () => {
    const pelea = armar();
    const { pelea: despues, eventos } = simularRound(pelea);
    const ultimo = eventos[eventos.length - 1];
    expect(ultimo.snapshot.aguante.jugador).toBe(Math.round(despues.aguante.jugador));
    expect(ultimo.snapshot.aguante.rival).toBe(Math.round(despues.aguante.rival));
    expect(ultimo.snapshot.golpes.jugador).toEqual(despues.golpes.jugador);
    expect(ultimo.snapshot.golpes.rival).toEqual(despues.golpes.rival);
  });

  it('no repite la misma linea de texto dos veces seguidas en el mismo round', () => {
    for (let semilla = 1; semilla <= 30; semilla++) {
      const pelea = armar({ semilla });
      const { eventos } = simularRound(pelea);
      for (let i = 1; i < eventos.length; i++) {
        expect(eventos[i].texto).not.toBe(eventos[i - 1].texto);
      }
    }
  });

  it('sigue siendo determinista con la misma semilla (mismos momentos y snapshots)', () => {
    const a = simularRound(armar({ semilla: 42 }));
    const b = simularRound(armar({ semilla: 42 }));
    expect(a.eventos).toEqual(b.eventos);
  });
});

describe('tarjetasJurados', () => {
  it('antes de pelear ningun round, da todo parejo', () => {
    const pelea = armar();
    const { jueces } = tarjetasJurados(pelea);
    for (const j of jueces) {
      expect(j.jugador).toBe(0);
      expect(j.rival).toBe(0);
    }
  });

  it('cada juez suma 10-9 por round ya peleado', () => {
    let pelea = armar();
    for (let i = 0; i < 5; i++) {
      pelea = simularRound(pelea).pelea;
    }
    const { jueces } = tarjetasJurados(pelea);
    const rounds = pelea.historialRounds.length;
    for (const j of jueces) {
      expect(j.jugador + j.rival).toBe(rounds * 19);
    }
  });

  it('es pura: llamarla dos veces da exactamente lo mismo', () => {
    let pelea = armar({ semilla: 9 });
    for (let i = 0; i < 4; i++) pelea = simularRound(pelea).pelea;
    expect(tarjetasJurados(pelea)).toEqual(tarjetasJurados(pelea));
  });

  it('no consume ni altera el rng de la pelea', () => {
    let pelea = armar({ semilla: 5 });
    for (let i = 0; i < 3; i++) pelea = simularRound(pelea).pelea;
    const estadoAntes = pelea.rngEstado;
    tarjetasJurados(pelea);
    tarjetasJurados(pelea);
    expect(pelea.rngEstado).toBe(estadoAntes);
  });

  it('trae un resumen textual', () => {
    let pelea = armar();
    for (let i = 0; i < 3; i++) pelea = simularRound(pelea).pelea;
    const { resumen } = tarjetasJurados(pelea);
    expect(typeof resumen).toBe('string');
    expect(resumen.length).toBeGreaterThan(0);
  });

  it('si un peleador domina claramente, el resumen lo refleja arriba', () => {
    const jugador = crearPeleador({
      nombre: 'Jugador', apodo: 'El Test', nacionalidad: 'AR', disciplina: 'boxeo',
      estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 90, esJugador: true,
    });
    const rival = crearPeleador({
      nombre: 'Rival', apodo: 'El Otro', nacionalidad: 'MX', disciplina: 'boxeo',
      estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 30,
    });
    let pelea = crearPelea({ jugador, rival, disciplina: 'boxeo', nivel: 'profesional', plan: 'afuera', rng: createRng(3) });
    for (let i = 0; i < 6 && !pelea.terminada; i++) pelea = simularRound(pelea).pelea;
    const { resumen } = tarjetasJurados(pelea);
    expect(resumen.toLowerCase()).toContain('arriba');
  });
});
