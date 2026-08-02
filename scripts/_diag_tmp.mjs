import { crearPeleador, mediaDe, repartirOrigenes } from '../src/core/fighter.js';
import { crearPartida, siguienteBeat, firmarPelea, registrarDecision } from '../src/core/career.js';
import { aplicarResultado, CINTURONES } from '../src/core/offers.js';
import { resolverRondaMinijuego, resultadoDeMarcador, roundDeCierreMinijuego, rondasParaGanar } from '../src/core/tramite.js';
import { aplicarCarta } from '../src/core/cards.js';
import { resolverOpcion } from '../src/core/events.js';
import { repartirApodos } from '../src/core/nicknames.js';
import { createRng } from '../src/core/rng.js';

function puntajeMods(mods = {}) {
  return Object.values(mods).reduce((acc, v) => acc + Math.max(0, v), 0);
}
function elegirMejor(items, puntuar) {
  let mejor = items[0]; let mejorPuntaje = -Infinity;
  for (const item of items) { const p = puntuar(item); if (p > mejorPuntaje) { mejorPuntaje = p; mejor = item; } }
  return mejor;
}
function elegirMejorOpcion(carta) {
  return elegirMejor(carta.opciones, (o) => {
    const base = puntajeMods(o.mods);
    const prob = o.probabilidades ? Math.max(...o.probabilidades.map((p) => puntajeMods(p.mods))) : 0;
    const dinero = (o.efectos?.dinero ?? 0) / 20000;
    return base + prob + dinero;
  });
}
function nuevoJugadorCreacionReal(semilla) {
  const rngCreacion = createRng(`creacion_${semilla}`);
  const origenesOfrecidos = repartirOrigenes(rngCreacion);
  const origenElegido = elegirMejor(origenesOfrecidos, (o) => puntajeMods(o.mods));
  const apodosOfrecidos = repartirApodos(rngCreacion);
  const apodoElegido = elegirMejor(apodosOfrecidos, (a) => puntajeMods(a.mods));
  const jugador = crearPeleador({
    apellido: 'Ortiz', apodoId: apodoElegido.id, nacionalidad: 'AR', disciplina: 'boxeo',
    estilo: 'tecnico', categoria: 'pluma', origen: origenElegido.id, media: 38, esJugador: true,
  });
  return jugador;
}

const tipoCount = {};
const N = 300;
for (let semilla = 1; semilla <= N; semilla++) {
  const jugador = nuevoJugadorCreacionReal(semilla);
  let partida = crearPartida({ jugador, semilla });
  const rngCosmetico = createRng(semilla + 7777);
  let guardia = 0;
  while (!partida.terminada && guardia < 700) {
    guardia++;
    const paso = siguienteBeat(partida);
    partida = paso.partida;
    const beat = paso.beat;
    if (!beat) continue;
    if (beat.tipo === 'mejora') {
      const cartas = beat.datos.cartas;
      const elegida = elegirMejor(cartas, (c) => puntajeMods(c.mods));
      partida = registrarDecision(partida, { tipo: 'mejora', titulo: 'Mejora', opcion: elegida.titulo });
      const aplicado = aplicarCarta(partida.jugador, elegida);
      partida = { ...partida, jugador: aplicado.jugador };
    } else if (beat.tipo === 'evento' || beat.tipo === 'redes') {
      const carta = beat.datos.carta;
      const opcion = elegirMejorOpcion(carta);
      partida = registrarDecision(partida, { tipo: beat.tipo, titulo: carta.titulo, opcion: opcion.texto ?? '' });
      const rivalObjetivoId = partida.mundo.roster[0]?.id ?? null;
      const resuelto = resolverOpcion(rngCosmetico, { jugador: partida.jugador, carta, opcionId: opcion.id, rivalidades: partida.rivalidades, rivalObjetivoId });
      partida = { ...partida, jugador: resuelto.jugador, rivalidades: resuelto.rivalidades };
    } else if (beat.tipo === 'tramiteDestacado') {
      const key = 'destacado_' + beat.datos.oferta.nivel + (beat.datos.oferta.esPrimeraDefensa ? '_primera' : '');
      tipoCount[key] = (tipoCount[key] ?? 0) + 1;
      const { oferta, alMejorDe } = beat.datos;
      const necesarias = rondasParaGanar(alMejorDe);
      let pj = 0, pr = 0;
      while (pj < necesarias && pr < necesarias) {
        const { resultado } = resolverRondaMinijuego(rngCosmetico, { jugador: partida.jugador, rivalMedia: oferta.rivalMedia, eleccionJugador: 'tecnico' });
        if (resultado === 'jugador') pj++; else pr++;
      }
      const { metodo, ganador } = resultadoDeMarcador({ jugador: pj, rival: pr }, alMejorDe);
      const round = roundDeCierreMinijuego(rngCosmetico, { jugador: partida.jugador, oferta, metodo });
      const resuelto = aplicarResultado(partida.jugador, { oferta, resultado: { ganador, metodo, round }, modo: 'tramite', semanaGlobal: partida.semanaGlobal });
      partida = { ...partida, jugador: resuelto.jugador };
    } else if (beat.tipo === 'campSparring' || beat.tipo === 'campCarta') {
      const { ultimo } = beat.datos;
      if (beat.tipo === 'campCarta') {
        const { carta, oferta } = beat.datos;
        const opcion = elegirMejorOpcion(carta);
        partida = registrarDecision(partida, { tipo: 'campamento', titulo: carta.titulo, opcion: opcion.texto ?? '' });
        const resuelto = resolverOpcion(rngCosmetico, { jugador: partida.jugador, carta, opcionId: opcion.id, rivalidades: partida.rivalidades });
        partida = { ...partida, jugador: resuelto.jugador, rivalidades: resuelto.rivalidades };
      } else {
        partida = { ...partida, jugador: { ...partida.jugador, atributos: { ...partida.jugador.atributos, agilidad: Math.min(99, partida.jugador.atributos.agilidad + 2) } } };
      }
      if (ultimo) {
        const oferta = beat.datos.oferta;
        const key = 'jugable_' + oferta.nivel + (oferta.esPrimeraDefensa ? '_primera' : '') + (oferta.esRevancha ? '_revancha' : '') + (oferta.esArchirrival ? '_archirrival' : '');
        tipoCount[key] = (tipoCount[key] ?? 0) + 1;
        const resultado = aplicarResultado(partida.jugador, { oferta, resultado: { ganador: 'jugador', metodo: 'ko', round: 3 }, semanaGlobal: partida.semanaGlobal });
        partida = { ...partida, jugador: resultado.jugador };
      }
    } else if (beat.tipo === 'oferta') {
      partida = firmarPelea(partida, { oferta: beat.datos.oferta });
    }
  }
}
console.log(tipoCount);
const totalJugable = Object.entries(tipoCount).filter(([k]) => k.startsWith('jugable')).reduce((a, [, v]) => a + v, 0);
const totalDestacado = Object.entries(tipoCount).filter(([k]) => k.startsWith('destacado')).reduce((a, [, v]) => a + v, 0);
console.log('avg jugables/carrera:', (totalJugable / N).toFixed(2));
console.log('avg destacados/carrera:', (totalDestacado / N).toFixed(2));
