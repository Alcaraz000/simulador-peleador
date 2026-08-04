import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import {
  crearPartida, aplicarPuntosDePelea, aplicarPuntosDeLote, avanzarBloque,
} from '../../src/core/career.js';
import { armarLotePeleas } from '../../src/core/tramite.js';
import { rankingsProfesionales, puestoEn } from '../../src/core/divisiones.js';
import {
  deltaDePelea, aplicarPuntos, decaerPuntos, puntosEn, puntosInicialesDe,
  PUNTOS_DERROTA_CONTRA_NADIE, DIVISIONES_PUNTUABLES,
} from '../../src/core/puntos-ranking.js';

function partida(semilla = 7) {
  const jugador = crearPeleador({
    apellido: 'Test', apodo: 'El Test', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 72, esJugador: true,
    rng: createRng(semilla),
  });
  jugador.record = { v: 10, d: 2, e: 0, ko: 5 };
  return crearPartida({ jugador, semilla });
}

// El rediseño v18: el puesto no sale de una fórmula sobre atributos, sale de a
// quién enfrentaste. Estos son los incentivos que eso tiene que producir.
describe('los puntos de una pelea', () => {
  it('ganarle a alguien muy por encima vale mucho más que ganarle a uno por debajo', () => {
    const contraElMejor = deltaDePelea({ resultado: 'v', miPuesto: 15, puestoRival: 1 });
    const contraElPeor = deltaDePelea({ resultado: 'v', miPuesto: 1, puestoRival: 20 });

    expect(contraElMejor).toBeGreaterThan(contraElPeor * 5);
  });

  it('ganar SIEMPRE suma y perder SIEMPRE resta, por desparejo que sea el cruce', () => {
    expect(deltaDePelea({ resultado: 'v', miPuesto: 1, puestoRival: 20 })).toBeGreaterThan(0);
    expect(deltaDePelea({ resultado: 'd', miPuesto: 20, puestoRival: 1 })).toBeLessThan(0);
  });

  it('perder contra alguien peor rankeado es lo que más cuesta', () => {
    const contraPeor = deltaDePelea({ resultado: 'd', miPuesto: 1, puestoRival: 20 });
    const contraMejor = deltaDePelea({ resultado: 'd', miPuesto: 20, puestoRival: 1 });

    expect(contraPeor).toBeLessThan(contraMejor);
  });

  it('ganarle a alguien que no está en la tabla no suma ahí', () => {
    expect(deltaDePelea({ resultado: 'v', miPuesto: 5, puestoRival: null })).toBe(0);
  });

  it('pero perder contra alguien que no está sí cuesta, y caro', () => {
    expect(deltaDePelea({ resultado: 'd', miPuesto: 5, puestoRival: null }))
      .toBe(PUNTOS_DERROTA_CONTRA_NADIE);
  });
});

describe('a qué divisiones llega una pelea', () => {
  const peleador = { puntosRanking: { regional: 500, nacional: 300, mundial: 100 } };

  // El caso que marcó el usuario: un rival puede estar en varias tablas.
  it('un rival que está en dos tablas mueve las dos', () => {
    const nuevos = aplicarPuntos(peleador, {
      resultado: 'v',
      misPuestos: { regional: 8, nacional: 6 },
      puestosRival: { regional: 3, nacional: 2 },
    });

    expect(nuevos.regional).toBeGreaterThan(500);
    expect(nuevos.nacional).toBeGreaterThan(300);
    expect(nuevos.mundial).toBe(100);
  });

  it('un rival que está solo en el mundial no toca el nacional', () => {
    const nuevos = aplicarPuntos(peleador, {
      resultado: 'v', misPuestos: { mundial: 12 }, puestosRival: { mundial: 4 },
    });

    expect(nuevos.mundial).toBeGreaterThan(100);
    expect(nuevos.nacional).toBe(300);
    expect(nuevos.regional).toBe(500);
  });

  it('los puntos nunca bajan de cero', () => {
    const sinNada = { puntosRanking: { regional: 10 } };
    const nuevos = aplicarPuntos(sinNada, {
      resultado: 'd', misPuestos: { regional: 1 }, puestosRival: { regional: 20 },
    });
    expect(nuevos.regional).toBe(0);
  });
});

describe('el decaimiento por inactividad', () => {
  it('baja los puntos de las divisiones donde no se peleó', () => {
    const antes = { regional: 1000, nacional: 500, mundial: 200 };
    const despues = decaerPuntos(antes, ['nacional']);

    expect(despues.regional).toBeLessThan(1000);
    expect(despues.mundial).toBeLessThan(200);
    expect(despues.nacional).toBe(500);
  });

  it('no muta el mapa original', () => {
    const antes = { regional: 1000 };
    decaerPuntos(antes, []);
    expect(antes.regional).toBe(1000);
  });
});

describe('la siembra inicial de los NPC', () => {
  it('reparte en cascada: todos algo de regional, los buenos nacional, pocos mundial', () => {
    const flojo = puntosInicialesDe({ record: { v: 3, d: 5 } }, 55);
    const bueno = puntosInicialesDe({ record: { v: 25, d: 3 } }, 85);

    expect(bueno.regional).toBeGreaterThan(flojo.regional);
    expect(bueno.mundial).toBeGreaterThan(0);
    expect(flojo.mundial).toBe(0);
  });
});

// La integración: una pelea del jugador mueve los puntos de los DOS.
describe('una pelea del jugador', () => {
  it('le suma al jugador y le resta al rival cuando gana', () => {
    const p = partida();
    const rival = p.mundo.roster[0];
    const antesRival = puntosEn(rival, 'regional');

    const despues = aplicarPuntosDePelea(p, { rivalId: rival.id, resultado: 'v' });
    const rivalDespues = despues.mundo.roster.find((x) => x.id === rival.id);

    expect(puntosEn(rivalDespues, 'regional')).toBeLessThanOrEqual(antesRival);
    expect(despues.jugador.puntosRanking).toBeDefined();
  });

  it('no toca a ningún otro peleador del roster', () => {
    const p = partida();
    const rival = p.mundo.roster[0];
    const otro = p.mundo.roster[5];

    const despues = aplicarPuntosDePelea(p, { rivalId: rival.id, resultado: 'v' });
    const otroDespues = despues.mundo.roster.find((x) => x.id === otro.id);

    expect(otroDespues.puntosRanking).toEqual(otro.puntosRanking);
  });

  it('ganarle a un rankeado puede meter al jugador en la tabla', () => {
    const p = partida();
    const rankings = rankingsProfesionales(p.mundo, p.jugador);
    const rival = rankings.regional[2];
    expect(rival).toBeTruthy();

    let actual = p;
    for (let i = 0; i < 3; i += 1) {
      actual = aplicarPuntosDePelea(actual, { rivalId: rival.id, resultado: 'v' });
    }

    const despues = rankingsProfesionales(actual.mundo, actual.jugador);
    expect(puestoEn(despues, 'regional', actual.jugador.id)).not.toBeNull();
  });
});

// v18: un lote resuelve varias peleas contra UNA sola foto de rankings — el
// mismo criterio que la tanda anual de los NPC (avanzarMundo, world.js).
describe('un lote de peleas del jugador', () => {
  it('mueve los puntos de cada rival, no solo los del primero', () => {
    const p = partida();
    const rankings = rankingsProfesionales(p.mundo, p.jugador);
    const [unoA, unoB] = [rankings.regional[1], rankings.regional[2]];

    const despues = aplicarPuntosDeLote(p, [
      { rivalId: unoA.id, resultado: 'v' },
      { rivalId: unoB.id, resultado: 'v' },
    ]);

    const finalA = despues.mundo.roster.find((x) => x.id === unoA.id);
    const finalB = despues.mundo.roster.find((x) => x.id === unoB.id);
    expect(puntosEn(finalA, 'regional')).toBeLessThan(puntosEn(unoA, 'regional'));
    expect(puntosEn(finalB, 'regional')).toBeLessThan(puntosEn(unoB, 'regional'));
  });

  // La foto de puestos se toma UNA vez, al entrar: la segunda pelea del lote
  // se puntúa contra la tabla de ANTES del lote, no contra la que dejó la
  // primera. Con el jugador ya lejos del piso de cero (donde el clamp hace que
  // el orden sí importe, y con razón: perder cuando no tenés nada no cuesta
  // nada), eso se ve como que el orden no cambia el total.
  it('las dos peleas se puntúan contra la MISMA foto', () => {
    const base = partida();
    const p = {
      ...base,
      jugador: { ...base.jugador, puntosRanking: { regional: 800, nacional: 800, mundial: 800 } },
    };
    const rankings = rankingsProfesionales(p.mundo, p.jugador);
    const [unoA, unoB] = [rankings.regional[1], rankings.regional[5]];

    const enOrden = aplicarPuntosDeLote(p, [
      { rivalId: unoA.id, resultado: 'v' }, { rivalId: unoB.id, resultado: 'd' },
    ]);
    const alReves = aplicarPuntosDeLote(p, [
      { rivalId: unoB.id, resultado: 'd' }, { rivalId: unoA.id, resultado: 'v' },
    ]);

    expect(enOrden.jugador.puntosRanking).toEqual(alReves.jugador.puntosRanking);
  });

  it('una lista vacía no toca nada', () => {
    const p = partida();
    expect(aplicarPuntosDeLote(p, [])).toBe(p);
  });
});

// El agujero que quedaba abierto: las peleas jugadas ya puntuaban, pero las de
// trámite (la mayoría de una carrera) no movían ninguna tabla.
describe('las peleas de trámite también puntúan', () => {
  it('el lote devuelve las peleas que resolvió, con rival y resultado', () => {
    const p = partida();
    const lote = armarLotePeleas(createRng(11), {
      jugador: p.jugador, mundo: p.mundo, etapa: 'profesional', intentos: 3, tono: 'profesional',
    });

    expect(lote.peleasPuntuables.length).toBe(lote.beatTramite?.datos.resultados.length ?? 0);
    for (const pelea of lote.peleasPuntuables) {
      expect(pelea.rivalId).toBeTruthy();
      expect(['v', 'd', 'e']).toContain(pelea.resultado);
    }
  });

  it('ni el marquee ni el destacado entran: esos se puntúan cuando se juegan', () => {
    // Sobre varias semillas, la cuenta de puntuables NUNCA supera a la de
    // peleas efectivamente resueltas en el lote.
    for (let s = 1; s <= 40; s += 1) {
      const p = partida(s);
      const lote = armarLotePeleas(createRng(s), {
        jugador: p.jugador, mundo: p.mundo, etapa: 'profesional', intentos: 3, tono: 'profesional',
      });
      const resueltas = lote.beatTramite?.datos.resultados.length ?? 0;
      expect(lote.peleasPuntuables.length).toBe(resueltas);
    }
  });
});

describe('el decaimiento por inactividad del jugador', () => {
  // Antes de v18 el jugador era el único del mundo que no decaía: los cien
  // NPC perdían su 12% anual y él conservaba los puntos para siempre.
  it('un año sin pelear le baja los puntos, igual que a un NPC', () => {
    const p = partida();
    const conPuntos = {
      ...p,
      jugador: {
        ...p.jugador,
        puntosRanking: { regional: 900, nacional: 600, mundial: 300 },
        peleasAlCerrarAnio: p.jugador.historial.length,
      },
    };

    const despues = avanzarBloque(conPuntos);

    for (const division of DIVISIONES_PUNTUABLES) {
      expect(despues.jugador.puntosRanking[division])
        .toBeLessThan(conPuntos.jugador.puntosRanking[division]);
    }
  });

  it('un año CON pelea no le baja nada', () => {
    const p = partida();
    const conPuntos = {
      ...p,
      jugador: {
        ...p.jugador,
        puntosRanking: { regional: 900, nacional: 600, mundial: 300 },
        // Marca de "el año pasado tenía una pelea menos": el historial creció,
        // así que sí peleó.
        peleasAlCerrarAnio: p.jugador.historial.length - 1,
      },
    };

    const despues = avanzarBloque(conPuntos);

    expect(despues.jugador.puntosRanking).toEqual(conPuntos.jugador.puntosRanking);
  });
});
