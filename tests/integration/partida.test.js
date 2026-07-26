import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/core/rng.js';
import { crearPeleador } from '../../src/core/fighter.js';
import { crearPartida, siguienteBeat, firmarPelea } from '../../src/core/career.js';
import { crearPelea } from '../../src/core/fight.js';
import { avanzarPelea, aplicarInstruccionRincon, abrirGolpeDeGracia, resolverGolpeDeGracia } from '../../src/core/fight-interactive.js';
import { aplicarCarta } from '../../src/core/cards.js';
import { resolverOpcion } from '../../src/core/events.js';
import { aplicarResultado } from '../../src/core/offers.js';
import { registrarCruce, elegirArchirrival } from '../../src/core/rivalry.js';
import { calcularLegado } from '../../src/core/legacy.js';
import { serializar, deserializar } from '../../src/core/save.js';

// Corre la pelea de verdad (fight.js/fight-interactive.js, el mismo motor
// que usa el jugador real) para la oferta que quedó firmada, y aplica sus
// consecuencias (récord, dinero, fama, rivalidades) — mismo camino que
// beatOferta -> ... -> cerrarPelea en main.js, solo que acá el "plan" y las
// instrucciones de rincón se deciden con el rng de la simulación, no con
// clicks.
function jugarPeleaDeVerdad(partida, oferta, rng, contarPelea) {
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
  contarPelea();

  const resultado = aplicarResultado(partida.jugador, { oferta, resultado: pelea.resultado });
  const signo = pelea.resultado.ganador === 'jugador' ? 'v' : pelea.resultado.ganador === 'rival' ? 'd' : 'e';
  const rivalidades = registrarCruce(partida.rivalidades, oferta.rivalId, signo);
  elegirArchirrival(rivalidades);
  return { ...partida, jugador: resultado.jugador, rivalidades };
}

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

    // Task v3 ("las semanas de preparación antes de una pelea"): aceptar ya
    // no dispara la pelea en el acto — firma el contrato (firmarPelea) y
    // arranca el campamento (2-3 beats más, campCarta/campSparring). La
    // pelea REAL (con el motor de fight.js/fight-interactive.js, no un
    // resultado abstracto) se corre recién en el beat `ultimo` del
    // campamento, con la oferta que quedó guardada en ese mismo beat.
    if (beat.tipo === 'oferta') {
      partida = firmarPelea(partida, { oferta: beat.datos.oferta });
    }

    if (beat.tipo === 'campCarta') {
      const { carta, oferta, ultimo } = beat.datos;
      const opcion = rng.pick(carta.opciones);
      const resuelto = resolverOpcion(rng, {
        jugador: partida.jugador, carta, opcionId: opcion.id, rivalidades: partida.rivalidades,
      });
      partida = { ...partida, jugador: resuelto.jugador, rivalidades: resuelto.rivalidades };
      if (ultimo) partida = jugarPeleaDeVerdad(partida, oferta, rng, () => { peleas += 1; });
    }

    if (beat.tipo === 'campSparring') {
      const { oferta, ultimo } = beat.datos;
      partida = {
        ...partida,
        jugador: {
          ...partida.jugador,
          atributos: { ...partida.jugador.atributos, velocidad: Math.min(99, partida.jugador.atributos.velocidad + 1) },
        },
      };
      if (ultimo) partida = jugarPeleaDeVerdad(partida, oferta, rng, () => { peleas += 1; });
    }
  }

  return { partida, peleas, tecnicaInicial };
}

describe('carrera completa de punta a punta', () => {
  // v6, segunda vuelta ("no todas las peleas se juegan igual"): `peleas`
  // acá solo cuenta las JUGABLES (las que de verdad corren el motor de
  // fight.js/fight-interactive.js, ver jugarPeleaDeVerdad) — la mayoría de
  // las peleas de una carrera ahora son de trámite y se resuelven solas,
  // dentro de armarCola, sin pasar por acá. El objetivo de "30-40 peleas
  // profesionales" se mide sobre jugador.record (jugables + trámite), no
  // sobre `peleas`.
  it('termina sin colgarse, con peleas jugadas de verdad y un récord profesional completo', () => {
    for (const semilla of [1, 2, 3]) {
      const { partida, peleas } = jugarCarrera(semilla);
      expect(partida.terminada).toBe(true);
      expect(peleas).toBeGreaterThan(0);
      const { v, d, e } = partida.jugador.record;
      expect(v + d + e).toBeGreaterThanOrEqual(20);
    }
  });

  // El historial guarda tanto las jugables (modo:'jugada') como las de
  // trámite (modo:'tramite') — ver aplicarResultado, offers.js. `peleas`
  // (el contador de jugarPeleaDeVerdad) tiene que coincidir EXACTO con la
  // cantidad de entradas 'jugada' del historial: ni una pelea jugada de más
  // ni de menos quedó sin registrar.
  it('el historial distingue las peleas jugadas de las de tramite, y el total cierra con el record', () => {
    const { partida, peleas } = jugarCarrera(4);
    const { v, d, e } = partida.jugador.record;
    const jugadasEnHistorial = partida.jugador.historial.filter((h) => h.modo === 'jugada').length;
    expect(jugadasEnHistorial).toBe(peleas);
    expect(v + d + e).toBe(partida.jugador.historial.length);
    expect(partida.jugador.historial.length).toBeGreaterThan(peleas);
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
