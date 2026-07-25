import { createRng } from './rng.js';
import { crearMundo, avanzarMundo, rankingDelJugador } from './world.js';
import { repartirMejoras } from './cards.js';
import { elegirEvento, elegirCartaRedes } from './events.js';
import { generarOferta } from './offers.js';
import { crearSparring } from './sparring.js';
import { noticiasDeSucesos, agregarNoticias } from './news.js';
import { recuperar, puedePelear } from './injuries.js';
import { cobrarSponsor } from './money.js';
import { clamp } from './stats.js';

// Probabilidades por etapa ajustadas respecto del brief original: con 20 bloques
// fijos y un beat de 'mejora' + uno de 'noticias' obligatorios en cada uno, el piso
// ya son 40 beats garantizados. Ajustar solo probEvento de profesional (como sugería
// el Step 4) no alcanza para bajar de 60: incluso poniendo en cero TODO el contenido
// opcional de profesional, juvenil+amateur+veterano solos ya rondan 51-61 beats con
// sus probabilidades originales. Hubo que recalibrar las cuatro etapas (ver informe
// de la Task 17 para el detalle numérico y la búsqueda que lo respalda).
export const ETAPAS = [
  {
    id: 'juvenil', nombre: 'Juvenil', bloques: 3, aniosPorBloque: 1, edadDesde: 15,
    probPelea: 0.04, probEvento: 0.05, probRedes: 0, probSparring: 0.05,
    frase: 'Nadie sabe quién sos. Todavía.',
  },
  {
    id: 'amateur', nombre: 'Amateur', bloques: 3, aniosPorBloque: 1, edadDesde: 18,
    probPelea: 0.09, probEvento: 0.06, probRedes: 0.03, probSparring: 0.04,
    frase: 'El ascenso no consagra ídolos. Ganate el salto.',
  },
  {
    id: 'profesional', nombre: 'Profesional', bloques: 11, aniosPorBloque: 1.3, edadDesde: 21,
    probPelea: 0.45, probEvento: 0.09, probRedes: 0.07, probSparring: 0.04,
    frase: 'Acá se cobra y se sangra. Bienvenido.',
  },
  {
    id: 'veterano', nombre: 'Veterano', bloques: 3, aniosPorBloque: 1.3, edadDesde: 36,
    probPelea: 0.08, probEvento: 0.07, probRedes: 0.04, probSparring: 0.01,
    frase: 'Cada pelea puede ser la última. Elegí bien.',
  },
];

export function etapaActual(partida) {
  return ETAPAS[Math.min(partida.etapaIndice, ETAPAS.length - 1)];
}

export function crearPartida({ jugador, semilla }) {
  const rng = createRng(semilla);
  const mundo = crearMundo(rng, {
    disciplina: jugador.disciplina,
    categoria: jugador.categoria,
    cantidad: 12,
  });
  return {
    version: 1,
    semilla,
    rngEstado: rng.estado(),
    jugador: { ...jugador, ranking: rankingDelJugador(mundo, jugador) },
    mundo,
    rivalidades: [],
    noticias: [],
    etapaIndice: 0,
    bloque: 1,
    bloqueGlobal: 1,
    cola: [],
    beatActual: null,
    historialBeats: 0,
    terminada: false,
    legado: null,
  };
}

function rngDe(partida) {
  const rng = createRng(partida.semilla);
  rng.restaurar(partida.rngEstado);
  return rng;
}

function clonarPartida(partida) {
  return {
    ...partida,
    jugador: {
      ...partida.jugador,
      atributos: { ...partida.jugador.atributos },
      especiales: { ...partida.jugador.especiales },
      estado: { ...partida.jugador.estado },
      record: { ...partida.jugador.record },
      titulos: [...partida.jugador.titulos],
      staff: [...partida.jugador.staff],
      lujos: [...partida.jugador.lujos],
      historial: [...partida.jugador.historial],
    },
    rivalidades: partida.rivalidades.map((r) => ({ ...r, h2h: { ...r.h2h }, hitos: [...r.hitos] })),
    noticias: [...partida.noticias],
    cola: [...partida.cola],
  };
}

export function avanzarBloque(partida) {
  const nueva = clonarPartida(partida);
  const rng = rngDe(nueva);
  const etapa = etapaActual(nueva);

  nueva.jugador.edad += etapa.aniosPorBloque;
  nueva.jugador.estado.fatiga = clamp(nueva.jugador.estado.fatiga - 25, 0, 100);
  nueva.jugador.estado.forma = clamp(nueva.jugador.estado.forma + 5, 0, 100);

  const recuperacion = recuperar(nueva.jugador, { bloques: 1 });
  nueva.jugador = recuperacion.peleador;

  const sponsor = cobrarSponsor(nueva.jugador, rng);
  if (sponsor) nueva.jugador = sponsor.jugador;

  const paso = avanzarMundo(nueva.mundo, rng, { aniosPasados: Math.round(etapa.aniosPorBloque) });
  nueva.mundo = paso.mundo;

  // El ranking del jugador se recalcula cada bloque: es lo que habilita
  // las peleas de título y las defensas obligatorias.
  nueva.jugador.ranking = rankingDelJugador(nueva.mundo, nueva.jugador);

  const nuevas = noticiasDeSucesos(rng, paso.sucesos, { anio: paso.mundo.anio });
  if (sponsor) {
    nuevas.unshift({
      id: `noticia_sponsor_${nueva.bloqueGlobal}`,
      tipo: 'escandalo',
      titular: sponsor.texto,
      fecha: paso.mundo.anio,
    });
  }
  nueva.noticias = agregarNoticias(nueva.noticias, nuevas);

  nueva.rngEstado = rng.estado();
  return nueva;
}

function armarCola(partida) {
  const rng = rngDe(partida);
  const etapa = etapaActual(partida);
  const cola = [];

  cola.push({
    tipo: 'mejora',
    datos: { cartas: repartirMejoras(rng, { jugador: partida.jugador, etapa: etapa.id }) },
  });

  if (rng.chance(etapa.probSparring)) {
    cola.push({ tipo: 'sparring', datos: { sparring: crearSparring(rng, { jugador: partida.jugador }) } });
  }

  if (rng.chance(etapa.probEvento)) {
    const categoria = rng.chance(0.5) ? 'vida' : 'evento';
    cola.push({ tipo: 'evento', datos: { carta: elegirEvento(rng, { jugador: partida.jugador, etapa: etapa.id, categoria }) } });
  }

  if (rng.chance(etapa.probRedes)) {
    cola.push({ tipo: 'redes', datos: { carta: elegirCartaRedes(rng, { jugador: partida.jugador }) } });
  }

  if (rng.chance(etapa.probPelea) && puedePelear(partida.jugador)) {
    const forzarTitulo = etapa.id === 'profesional'
      && partida.jugador.titulos.length === 0
      && (partida.jugador.ranking ?? 99) <= 3;
    const oferta = generarOferta(rng, {
      jugador: partida.jugador,
      mundo: partida.mundo,
      etapa: etapa.id,
      rivalidades: partida.rivalidades,
      forzarTitulo,
    });
    if (oferta) cola.push({ tipo: 'oferta', datos: { oferta } });
  }

  cola.push({ tipo: 'noticias', datos: {} });

  return { cola, rngEstado: rng.estado() };
}

export function siguienteBeat(partida) {
  if (partida.terminada) return { partida, beat: null };

  let nueva = clonarPartida(partida);

  if (nueva.cola.length === 0) {
    const etapa = etapaActual(nueva);
    if (nueva.bloque > etapa.bloques) {
      if (nueva.etapaIndice >= ETAPAS.length - 1) {
        nueva.terminada = true;
        nueva.beatActual = null;
        return { partida: nueva, beat: null };
      }
      nueva.etapaIndice += 1;
      nueva.bloque = 1;
    }
    if (nueva.bloqueGlobal > 1) nueva = avanzarBloque(nueva);
    const armado = armarCola(nueva);
    nueva.cola = armado.cola;
    nueva.rngEstado = armado.rngEstado;
    nueva.bloque += 1;
    nueva.bloqueGlobal += 1;
  }

  const beat = nueva.cola.shift() ?? null;
  nueva.beatActual = beat;
  nueva.historialBeats += beat ? 1 : 0;
  return { partida: nueva, beat };
}

export function totalBeatsEstimado() {
  return ETAPAS.reduce((total, etapa) => {
    const porBloque = 2 + etapa.probSparring + etapa.probEvento + etapa.probRedes + etapa.probPelea;
    return total + etapa.bloques * porBloque;
  }, 0);
}
