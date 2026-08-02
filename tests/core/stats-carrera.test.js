import { describe, it, expect } from 'vitest';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearPartida } from '../../src/core/career.js';
import { estadisticasDeCarrera, rachaActual } from '../../src/core/stats-carrera.js';

function pelea(resultado, extra = {}) {
  return {
    rivalId: 'r1', rivalNombre: 'Dyke Tyzon', rivalApodo: 'El Ciclón',
    resultado, metodo: 'ko', round: 3, bolsa: 10000, enJuego: 'Ranking', esTitulo: false,
    ...extra,
  };
}

function partidaCon(historial, extra = {}) {
  const jugador = {
    ...crearPeleador({
      nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
      estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 60, esJugador: true,
    }),
    historial,
    edad: 39,
    ...extra,
  };
  jugador.record = {
    v: historial.filter((p) => p.resultado === 'v').length,
    d: historial.filter((p) => p.resultado === 'd').length,
    e: historial.filter((p) => p.resultado === 'e').length,
    ko: historial.filter((p) => p.resultado === 'v' && p.metodo === 'ko').length,
    sub: 0,
    dec: historial.filter((p) => p.resultado === 'v' && p.metodo === 'decision').length,
  };
  return { ...crearPartida({ jugador, semilla: 1 }), jugador };
}

describe('rachaActual', () => {
  it('cuenta victorias seguidas al final', () => {
    expect(rachaActual([pelea('d'), pelea('v'), pelea('v')])).toBe(2);
  });

  it('una derrota al final corta la racha', () => {
    expect(rachaActual([pelea('v'), pelea('v'), pelea('d')])).toBe(0);
  });

  it('sin historial devuelve cero', () => {
    expect(rachaActual([])).toBe(0);
  });
});

describe('estadisticasDeCarrera', () => {
  it('cuenta peleas, victorias y derrotas', () => {
    const e = estadisticasDeCarrera(partidaCon([pelea('v'), pelea('v'), pelea('d')]));
    expect(e.peleas).toBe(3);
    expect(e.victorias).toBe(2);
    expect(e.derrotas).toBe(1);
  });

  it('calcula el porcentaje de KO sobre las victorias', () => {
    const e = estadisticasDeCarrera(partidaCon([
      pelea('v', { metodo: 'ko' }), pelea('v', { metodo: 'decision' }),
    ]));
    expect(e.porcentajeKO).toBe(50);
  });

  it('encuentra la racha mas larga aunque no sea la actual', () => {
    const e = estadisticasDeCarrera(partidaCon([
      pelea('v'), pelea('v'), pelea('v'), pelea('d'), pelea('v'),
    ]));
    expect(e.rachaMasLarga).toBe(3);
  });

  // Pedido 3 (v7, "mostrá la 'racha de victorias' más larga... y la 'racha
  // de derrotas' también"): mismo criterio que rachaMasLarga (victorias),
  // pero contando derrotas consecutivas — los empates cortan la racha igual
  // que una victoria la cortaría en la de arriba.
  it('encuentra la racha de derrotas mas larga, no solo la actual', () => {
    const e = estadisticasDeCarrera(partidaCon([
      pelea('d'), pelea('v'), pelea('d'), pelea('d'), pelea('d'), pelea('v'), pelea('d'),
    ]));
    expect(e.rachaDerrotasMasLarga).toBe(3);
  });

  it('un empate corta la racha de derrotas, igual que corta la de victorias', () => {
    const e = estadisticasDeCarrera(partidaCon([
      pelea('d'), pelea('d'), pelea('e'), pelea('d'),
    ]));
    expect(e.rachaDerrotasMasLarga).toBe(2);
  });

  it('sin derrotas, la racha de derrotas mas larga es cero', () => {
    const e = estadisticasDeCarrera(partidaCon([pelea('v'), pelea('v')]));
    expect(e.rachaDerrotasMasLarga).toBe(0);
  });

  it('reporta la bolsa mas grande', () => {
    const e = estadisticasDeCarrera(partidaCon([pelea('v', { bolsa: 5000 }), pelea('v', { bolsa: 90000 })]));
    expect(e.bolsaMayor).toBe(90000);
  });

  it('suma los rounds peleados y el promedio', () => {
    const e = estadisticasDeCarrera(partidaCon([pelea('v', { round: 4 }), pelea('d', { round: 12 })]));
    expect(e.roundsPeleados).toBe(16);
    expect(e.promedioRoundPorPelea).toBe(8);
  });

  it('cuenta titulos y defensas', () => {
    const e = estadisticasDeCarrera(partidaCon(
      [pelea('v', { esTitulo: true, enJuego: 'Cinturón regional' })],
      { titulos: ['Cinturón regional'], defensas: 2 },
    ));
    expect(e.titulosGanados).toBe(1);
    expect(e.defensasExitosas).toBe(2);
  });

  it('identifica al rival mas duro (el de mayor media enfrentado)', () => {
    const e = estadisticasDeCarrera(partidaCon([
      pelea('v', { rivalNombre: 'Flojo', rivalApodo: 'El Flojo', rivalMedia: 50 }),
      pelea('d', { rivalNombre: 'Dyke Tyzon', rivalApodo: 'El Ciclón', rivalMedia: 88 }),
    ]));
    expect(e.rivalMasDuro.nombre).toBe('Dyke Tyzon');
  });

  it('con carrera vacia no explota', () => {
    const e = estadisticasDeCarrera(partidaCon([]));
    expect(e.peleas).toBe(0);
    expect(e.porcentajeKO).toBe(0);
    expect(e.promedioRoundPorPelea).toBe(0);
    expect(e.rivalMasDuro).toBeNull();
  });

  // Task 6.2: el cierre de carrera necesita distinguir "el rival más duro que
  // ENFRENTÓ" (rivalMasDuro, de arriba, cuenta también las derrotas) de "el
  // rival más duro al que le GANÓ" — solo esta segunda es una victoria que
  // vale la pena destacar en el cierre. Un peleador que perdió contra un
  // crack no "venció a alguien grande": lo enfrentó, nomás.
  describe('mejorVictoria (el rival mas duro al que le gano, no solo enfrento)', () => {
    it('identifica al rival de mayor media entre los que SI vencio', () => {
      const e = estadisticasDeCarrera(partidaCon([
        pelea('v', { rivalNombre: 'Flojo', rivalApodo: 'El Flojo', rivalMedia: 50 }),
        pelea('d', { rivalNombre: 'Dyke Tyzon', rivalApodo: 'El Ciclón', rivalMedia: 90 }),
        pelea('v', { rivalNombre: 'Nico Salas', rivalApodo: 'El Nico', rivalMedia: 75 }),
      ]));
      expect(e.mejorVictoria.nombre).toBe('Nico Salas');
    });

    it('sin ninguna victoria, es null', () => {
      const e = estadisticasDeCarrera(partidaCon([
        pelea('d', { rivalMedia: 90 }),
      ]));
      expect(e.mejorVictoria).toBeNull();
    });

    it('con carrera vacia no explota', () => {
      const e = estadisticasDeCarrera(partidaCon([]));
      expect(e.mejorVictoria).toBeNull();
    });
  });
});
