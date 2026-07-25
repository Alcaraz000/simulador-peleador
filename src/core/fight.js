import { getDisciplina, pesosDe } from './disciplines.js';
import { ventajaDeEstilo } from './styles.js';
import { calcularMedia, clamp } from './stats.js';
import { createRng } from './rng.js';
import { LINEAS } from '../content/fight-lines.js';

export const PLANES = {
  frente: {
    id: 'frente',
    nombre: 'Ir al frente',
    descripcion: 'Presión sin descanso. Más daño, más gasto.',
    mods: { agresion: 0.12, gasto: 1.5, defensa: -0.08 },
  },
  afuera: {
    id: 'afuera',
    nombre: 'Boxear de afuera',
    descripcion: 'Distancia y precisión. Equilibrado.',
    mods: { agresion: 0, gasto: 1.0, defensa: 0.04 },
  },
  aguantar: {
    id: 'aguantar',
    nombre: 'Aguantar y contragolpear',
    descripcion: 'Defensa primero, buscando el error del rival.',
    mods: { agresion: -0.08, gasto: 0.7, defensa: 0.12 },
  },
};

function snapshotDe(peleador) {
  return {
    id: peleador.id,
    nombre: peleador.nombre,
    apodo: peleador.apodo,
    estilo: peleador.estilo,
    atributos: { ...peleador.atributos },
    especiales: { ...peleador.especiales },
    estado: { ...peleador.estado },
  };
}

export function crearPelea({ jugador, rival, disciplina, nivel = 'profesional', plan = 'afuera', rng }) {
  if (!PLANES[plan]) throw new Error(`Plan desconocido: ${plan}`);
  const disc = getDisciplina(disciplina);
  const rounds = disc.roundsPorNivel[nivel];
  if (!rounds) throw new Error(`Nivel desconocido: ${nivel}`);

  return {
    jugadorId: jugador.id,
    rivalId: rival.id,
    disciplina,
    nivel,
    rounds,
    roundActual: 1,
    plan,
    aguante: { jugador: 100, rival: 100 },
    fatiga: { jugador: jugador.estado.fatiga ?? 0, rival: rival.estado.fatiga ?? 0 },
    tarjetas: { jugador: 0, rival: 0 },
    caidas: { jugador: 0, rival: 0 },
    pendiente: null,
    terminada: false,
    resultado: null,
    snapshot: { jugador: snapshotDe(jugador), rival: snapshotDe(rival) },
    semilla: rng.seed,
    rngEstado: rng.estado(),
  };
}

export function peleaTerminada(pelea) {
  return pelea.terminada;
}

export function resultadoDe(pelea) {
  return pelea.resultado;
}

function rngDe(pelea, createRng) {
  const rng = createRng(pelea.semilla);
  rng.restaurar(pelea.rngEstado);
  return rng;
}

function efectividad(snapshot, disciplina, fatiga, planMods, esJugador) {
  const media = calcularMedia(snapshot.atributos, pesosDe(disciplina));
  const forma = (snapshot.estado.forma ?? 60) / 60;
  const moral = (snapshot.estado.moral ?? 60) / 60;
  const castigoFatiga = 1 - clamp(fatiga, 0, 100) / 220;
  const castigoLesion = snapshot.estado.lesion ? 0.88 : 1;
  const agresion = esJugador ? planMods.agresion : 0;
  return media * forma * 0.5 + media * 0.5 * moral * castigoFatiga * castigoLesion * (1 + agresion);
}

function texto(plantilla, yo, rival) {
  return plantilla.replaceAll('{yo}', yo).replaceAll('{rival}', rival);
}

function clonarPelea(pelea) {
  return {
    ...pelea,
    aguante: { ...pelea.aguante },
    fatiga: { ...pelea.fatiga },
    tarjetas: { ...pelea.tarjetas },
    caidas: { ...pelea.caidas },
    snapshot: pelea.snapshot,
  };
}

export function simularRound(pelea, { createRng: crear } = {}) {
  if (pelea.terminada) return { pelea, eventos: [] };
  const crearRng = crear ?? createRng;
  const nueva = clonarPelea(pelea);
  const rng = rngDe(nueva, crearRng);
  const disc = getDisciplina(nueva.disciplina);
  const planMods = PLANES[nueva.plan].mods;
  const round = nueva.roundActual;
  const eventos = [];

  const apodoJ = nueva.snapshot.jugador.apodo;
  const apodoR = nueva.snapshot.rival.apodo;

  const efJ = efectividad(nueva.snapshot.jugador, nueva.disciplina, nueva.fatiga.jugador, planMods, true);
  const efR = efectividad(nueva.snapshot.rival, nueva.disciplina, nueva.fatiga.rival, planMods, false);
  const ventaja = ventajaDeEstilo(nueva.snapshot.jugador.estilo, nueva.snapshot.rival.estilo);
  const probJ = clamp(efJ / (efJ + efR) + ventaja + rng.float(-0.08, 0.08), 0.05, 0.95);

  const ganaRound = rng.chance(probJ);
  const margen = Math.abs(probJ - 0.5);

  if (ganaRound) nueva.tarjetas.jugador += 1; else nueva.tarjetas.rival += 1;

  const dano = Math.round((6 + margen * 30) * rng.float(0.7, 1.4));
  if (ganaRound) nueva.aguante.rival = clamp(nueva.aguante.rival - dano, 0, 100);
  else nueva.aguante.jugador = clamp(nueva.aguante.jugador - dano, 0, 100);

  const gastoBase = 9;
  const cardioJ = nueva.snapshot.jugador.atributos.cardio;
  const cardioR = nueva.snapshot.rival.atributos.cardio;
  nueva.fatiga.jugador = clamp(nueva.fatiga.jugador + gastoBase * planMods.gasto * (60 / cardioJ), 0, 100);
  nueva.fatiga.rival = clamp(nueva.fatiga.rival + gastoBase * (60 / cardioR), 0, 100);

  const clave = ganaRound ? (margen > 0.12 ? 'dominio' : 'parejo') : (margen > 0.12 ? 'sufriendo' : 'parejo');
  eventos.push({ round, tipo: clave, texto: texto(rng.pick(LINEAS[clave]), apodoJ, apodoR) });

  const atacante = ganaRound ? 'jugador' : 'rival';
  const defensor = ganaRound ? 'rival' : 'jugador';
  const aguanteDefensor = nueva.aguante[defensor];
  const mentonDefensor = nueva.snapshot[defensor].especiales.menton;
  const potenciaAtacante = nueva.snapshot[atacante].atributos.potencia;

  const probCaida = clamp((100 - aguanteDefensor) / 260 + (potenciaAtacante - mentonDefensor) / 500, 0, 0.4);
  if (rng.chance(probCaida)) {
    nueva.caidas[defensor] += 1;
    const yo = defensor === 'jugador' ? apodoJ : apodoR;
    const otro = defensor === 'jugador' ? apodoR : apodoJ;
    eventos.push({ round, tipo: 'caida', texto: texto(rng.pick(LINEAS.caida), yo, otro) });
    nueva.aguante[defensor] = clamp(nueva.aguante[defensor] - 10, 0, 100);
  }

  const puedeSumision = disc.desenlaces.includes('sumision');
  const grapplingAtacante = nueva.snapshot[atacante].atributos.grappling;
  const grapplingDefensor = nueva.snapshot[defensor].atributos.grappling;
  const probSumision = puedeSumision
    ? clamp((grapplingAtacante - grapplingDefensor) / 400 + (100 - aguanteDefensor) / 500, 0, 0.18)
    : 0;

  const probKo = clamp((100 - nueva.aguante[defensor]) / 130 - 0.55, 0, 0.5)
    + (nueva.caidas[defensor] >= 2 ? 0.25 : 0);

  let metodo = null;
  if (nueva.aguante[defensor] <= 0 || rng.chance(probKo)) {
    metodo = nueva.caidas[defensor] >= 2 ? 'tko' : 'ko';
  } else if (rng.chance(probSumision)) {
    metodo = 'sumision';
  }

  if (metodo) {
    const yo = atacante === 'jugador' ? apodoJ : apodoR;
    const otro = atacante === 'jugador' ? apodoR : apodoJ;
    const lineas = metodo === 'sumision' ? LINEAS.sumision : LINEAS.ko;
    eventos.push({ round, tipo: metodo, texto: texto(rng.pick(lineas), yo, otro) });
    nueva.terminada = true;
    nueva.resultado = {
      ganador: atacante,
      metodo,
      round,
      texto: `${atacante === 'jugador' ? apodoJ : apodoR} gana por ${metodo.toUpperCase()} en el round ${round}.`,
    };
  } else if (round >= nueva.rounds) {
    const j = nueva.tarjetas.jugador;
    const r = nueva.tarjetas.rival;
    const ganador = j > r ? 'jugador' : r > j ? 'rival' : 'empate';
    eventos.push({ round, tipo: 'campana', texto: 'Se termina la pelea. Van a las tarjetas.' });
    nueva.terminada = true;
    nueva.resultado = {
      ganador,
      metodo: 'decision',
      round,
      texto: ganador === 'empate'
        ? 'Fallo empatado: se reparten los puntos.'
        : `${ganador === 'jugador' ? apodoJ : apodoR} gana por decisión ${j > r ? `${j}-${r}` : `${r}-${j}`}.`,
    };
  } else {
    eventos.push({ round, tipo: 'campana', texto: rng.pick(LINEAS.campana) });
    nueva.roundActual = round + 1;
  }

  nueva.rngEstado = rng.estado();
  return { pelea: nueva, eventos };
}
