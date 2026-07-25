import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearPartida, siguienteBeat } from '../../src/core/career.js';
import { crearPelea } from '../../src/core/fight.js';
import { avanzarPelea, aplicarInstruccionRincon, abrirGolpeDeGracia, resolverGolpeDeGracia } from '../../src/core/fight-interactive.js';
import { aplicarCarta } from '../../src/core/cards.js';
import { resolverOpcion } from '../../src/core/events.js';
import { aplicarResultado } from '../../src/core/offers.js';
import { registrarCruce, elegirArchirrival } from '../../src/core/rivalry.js';
import { calcularLegado } from '../../src/core/legacy.js';
import { serializar, deserializar } from '../../src/core/save.js';

function jugarCarrera(semilla) {
  const jugador = crearPeleador({
    nombre: 'Lucas Ortiz', apodo: 'El Relámpago', nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: 'barrio', media: 38, esJugador: true,
  });
  const tecnicaInicial = jugador.atributos.tecnica;
  let partida = crearPartida({ jugador, semilla });
  const rng = createRng(semilla + 1000);
  let peleas = 0;
  let guardia = 0;

  while (!partida.terminada && guardia < 500) {
    guardia += 1;
    const paso = siguienteBeat(partida);
    partida = paso.partida;
    const beat = paso.beat;
    if (!beat) continue;

    if (beat.tipo === 'mejora') {
      const carta = rng.pick(beat.datos.cartas);
      partida = { ...partida, jugador: aplicarCarta(partida.jugador, carta).jugador };
    }

    if (beat.tipo === 'evento' || beat.tipo === 'redes') {
      const carta = beat.datos.carta;
      const opcion = rng.pick(carta.opciones);
      const resuelto = resolverOpcion(rng, {
        jugador: partida.jugador, carta, opcionId: opcion.id,
        rivalidades: partida.rivalidades, rivalObjetivoId: partida.mundo.roster[0].id,
      });
      partida = { ...partida, jugador: resuelto.jugador, rivalidades: resuelto.rivalidades };
    }

    if (beat.tipo === 'oferta') {
      const { oferta } = beat.datos;
      const rival = partida.mundo.roster.find((p) => p.id === oferta.rivalId);
      let pelea = crearPelea({
        jugador: partida.jugador, rival, disciplina: partida.jugador.disciplina,
        nivel: oferta.nivelPelea, plan: 'afuera', rng,
      });

      let vueltas = 0;
      while (!pelea.terminada && vueltas < 40) {
        vueltas += 1;
        const avance = avanzarPelea(pelea);
        pelea = avance.pelea;
        if (pelea.pendiente === 'rincon') pelea = aplicarInstruccionRincon(pelea, 'cuerpo');
        else if (pelea.pendiente === 'golpe') {
          const info = abrirGolpeDeGracia(pelea);
          pelea = resolverGolpeDeGracia(pelea, {
            zonaElegida: info.zonaAbierta, precision: 0.8, aTiempo: true,
          }).pelea;
        }
      }

      expect(pelea.terminada).toBe(true);
      peleas += 1;

      const resultado = aplicarResultado(partida.jugador, { oferta, resultado: pelea.resultado });
      const signo = pelea.resultado.ganador === 'jugador' ? 'v' : pelea.resultado.ganador === 'rival' ? 'd' : 'e';
      const rivalidades = registrarCruce(partida.rivalidades, oferta.rivalId, signo);
      elegirArchirrival(rivalidades);
      partida = { ...partida, jugador: resultado.jugador, rivalidades };
    }
  }

  return { partida, peleas, tecnicaInicial };
}

describe('carrera completa de punta a punta', () => {
  it('termina sin colgarse y con peleas jugadas', () => {
    for (const semilla of [1, 2, 3]) {
      const { partida, peleas } = jugarCarrera(semilla);
      expect(partida.terminada).toBe(true);
      expect(peleas).toBeGreaterThan(5);
    }
  });

  it('el record cierra con la cantidad de peleas jugadas', () => {
    const { partida, peleas } = jugarCarrera(4);
    const { v, d, e } = partida.jugador.record;
    expect(v + d + e).toBe(peleas);
  });

  it('el peleador mejora respecto del arranque', () => {
    const { partida, tecnicaInicial } = jugarCarrera(5);
    expect(partida.jugador.atributos.tecnica).toBeGreaterThan(tecnicaInicial);
    expect(partida.jugador.historial.length).toBeGreaterThan(5);
  });

  it('genera noticias durante la carrera', () => {
    const { partida } = jugarCarrera(6);
    expect(partida.noticias.length).toBeGreaterThan(0);
  });

  it('el legado final es coherente', () => {
    const { partida } = jugarCarrera(7);
    const legado = calcularLegado(partida);
    expect(legado.legados).toHaveLength(5);
    expect(legado.peleas).toBe(partida.jugador.record.v + partida.jugador.record.d + partida.jugador.record.e);
    expect(legado.biografia.length).toBeGreaterThan(40);
  });

  it('la partida sobrevive a un guardado y una carga', () => {
    const { partida } = jugarCarrera(8);
    const recuperada = deserializar(serializar(partida));
    expect(recuperada.jugador.record).toEqual(partida.jugador.record);
    expect(recuperada.noticias.length).toBe(partida.noticias.length);
  });

  it('es determinista con la misma semilla', () => {
    const a = jugarCarrera(9);
    const b = jugarCarrera(9);
    expect(a.partida.jugador.record).toEqual(b.partida.jugador.record);
  });

  it('el dinero nunca queda negativo', () => {
    const { partida } = jugarCarrera(10);
    expect(partida.jugador.dinero).toBeGreaterThanOrEqual(0);
  });
});
