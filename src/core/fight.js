import { getDisciplina, pesosDe } from './disciplines.js';
import { ventajaDeEstilo } from './styles.js';
import { calcularMedia, clamp } from './stats.js';
import { createRng } from './rng.js';
import { LINEAS } from '../content/fight-lines.js';

// Las descripciones son la voz del entrenador armando el plan con vos, no un
// resumen seco de los mods: qué buscás con ese enfoque y qué resignás para
// conseguirlo (misma voz que INSTRUCCIONES_RINCON en fight-interactive.js).
export const PLANES = {
  frente: {
    id: 'frente',
    nombre: 'Ir al frente',
    descripcion: 'Presión de punta a punta: lo vas a buscar a fuerza de tirar. Vas a gastar más gas y quedar más servido atrás.',
    mods: { agresion: 0.12, gasto: 1.5, defensa: -0.08 },
  },
  afuera: {
    id: 'afuera',
    nombre: 'Boxear de afuera',
    descripcion: 'Jugás con la distancia, tocás y salís. Parejo en todo, sin resignar defensa ni gas.',
    mods: { agresion: 0, gasto: 1.0, defensa: 0.04 },
  },
  aguantar: {
    id: 'aguantar',
    nombre: 'Aguantar y contragolpear',
    descripcion: 'Te cerrás atrás y esperás que se equivoque. Tirás menos, pero cada contragolpe pesa más.',
    mods: { agresion: -0.08, gasto: 0.7, defensa: 0.12 },
  },
};

function snapshotDe(peleador) {
  return {
    id: peleador.id,
    nombre: peleador.nombre,
    apodo: peleador.apodo,
    estilo: peleador.estilo,
    nacionalidad: peleador.nacionalidad,
    atributos: { ...peleador.atributos },
    especiales: { ...peleador.especiales },
    estado: { ...peleador.estado },
  };
}

function golpesVacio() {
  return { lanzados: 0, conectados: 0, significativos: 0 };
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
    golpes: { jugador: golpesVacio(), rival: golpesVacio() },
    historialRounds: [],
    // 'inicio': todavía no se simuló ningún round — la UI usa este valor
    // (distinto de `null`, que en pleno combate significa "sin nada
    // pendiente, listo para el próximo round") para mostrar el botón de
    // "Empezar pelea" en vez de arrancar la narración sola (Task v3, pedido
    // textual: "Debe incluirse un botón que sea para empezar la pelea").
    // `avanzarPelea`/`simularRound` no leen este campo, así que no cambia
    // ningún cálculo — es puro dato de estado para la pantalla.
    pendiente: 'inicio',
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
    golpes: { jugador: { ...pelea.golpes.jugador }, rival: { ...pelea.golpes.rival } },
    historialRounds: [...pelea.historialRounds],
    snapshot: pelea.snapshot,
  };
}

// ---- Golpes del round -------------------------------------------------
//
// Se derivan del margen del round (qué tan clara fue la diferencia) y de
// algo de azar propio de la pelea. Se llama DESPUÉS de resueltas todas las
// decisiones del round (quién gana, si hay caída, si hay KO/sumisión), así
// que agregar o sacar tiradas acá nunca cambia esas decisiones para una
// misma semilla — solo cuánto "ruido" de golpes se agrega arriba.
function calcularGolpesRound(rng, { ganaRound, margen, planMods }) {
  const actividadJugador = 34 + rng.int(0, 18) + Math.round(planMods.agresion * 30);
  const actividadRival = 34 + rng.int(0, 18);
  const lanzadosJugador = Math.max(14, actividadJugador);
  const lanzadosRival = Math.max(14, actividadRival);

  const precisionGanador = clamp(0.34 + margen * 0.55 + rng.float(-0.04, 0.04), 0.2, 0.8);
  const precisionPerdedor = clamp(0.28 - margen * 0.3 + rng.float(-0.04, 0.04), 0.1, 0.36);

  const lanzadosGanador = ganaRound ? lanzadosJugador : lanzadosRival;
  const lanzadosPerdedor = ganaRound ? lanzadosRival : lanzadosJugador;

  let conectadosGanador = Math.min(lanzadosGanador, Math.round(lanzadosGanador * precisionGanador));
  let conectadosPerdedor = Math.min(lanzadosPerdedor, Math.round(lanzadosPerdedor * precisionPerdedor));
  if (conectadosPerdedor >= conectadosGanador) {
    conectadosPerdedor = Math.max(0, Math.min(conectadosPerdedor, conectadosGanador - 1));
  }

  const tasaSigGanador = clamp(0.3 + margen * 0.35, 0.2, 0.6);
  const tasaSigPerdedor = clamp(0.16 + rng.float(-0.03, 0.03), 0.08, 0.28);
  const significativosGanador = Math.min(conectadosGanador, Math.round(conectadosGanador * tasaSigGanador));
  const significativosPerdedor = Math.min(conectadosPerdedor, Math.round(conectadosPerdedor * tasaSigPerdedor));

  const statsGanador = { lanzados: lanzadosGanador, conectados: conectadosGanador, significativos: significativosGanador };
  const statsPerdedor = { lanzados: lanzadosPerdedor, conectados: conectadosPerdedor, significativos: significativosPerdedor };

  return {
    jugador: ganaRound ? statsGanador : statsPerdedor,
    rival: ganaRound ? statsPerdedor : statsGanador,
  };
}

function sumarGolpes(acumulado, delRound) {
  return {
    lanzados: acumulado.lanzados + delRound.lanzados,
    conectados: acumulado.conectados + delRound.conectados,
    significativos: acumulado.significativos + delRound.significativos,
  };
}

// ---- Momentos del round: 4-5 (a veces 6, si hay caída y cansancio) ----
//
// Fracción acumulada del round en la que "ocurre" cada beat narrativo.
// Se usa solo para interpolar el snapshot en vivo (aguante/fatiga/golpes
// van del valor de inicio del round al de fin del round); no representa
// nada mecánico. El último momento del round siempre cae en 1, así el
// snapshot de ese momento coincide exactamente con el estado real.
const FRACCION = { jab: 0.15, flavor: 0.4, cansancio: 0.55, resultado: 0.85, caida: 0.95, cierre: 1 };
const UMBRAL_CANSANCIO = 55;

function lerp(inicio, fin, frac) {
  return inicio + (fin - inicio) * frac;
}

function interpolarGolpes(inicio, fin, frac) {
  const lanzados = Math.round(lerp(inicio.lanzados, fin.lanzados, frac));
  let conectados = Math.round(lerp(inicio.conectados, fin.conectados, frac));
  let significativos = Math.round(lerp(inicio.significativos, fin.significativos, frac));
  conectados = Math.min(conectados, lanzados);
  significativos = Math.min(significativos, conectados);
  return { lanzados, conectados, significativos };
}

// Snapshot parcial que viaja en cada momento: cómo queda el estado
// (aguante, fatiga, golpes) en ese instante puntual de la narración. Es lo
// que consume `onPaso` del narrador para mover el marcador en vivo, sin
// esperar a que termine el round.
function snapshotEn(frac, { inicio, fin }) {
  return {
    aguante: {
      jugador: Math.round(lerp(inicio.aguante.jugador, fin.aguante.jugador, frac)),
      rival: Math.round(lerp(inicio.aguante.rival, fin.aguante.rival, frac)),
    },
    fatiga: {
      jugador: Math.round(lerp(inicio.fatiga.jugador, fin.fatiga.jugador, frac)),
      rival: Math.round(lerp(inicio.fatiga.rival, fin.fatiga.rival, frac)),
    },
    golpes: {
      jugador: interpolarGolpes(inicio.golpes.jugador, fin.golpes.jugador, frac),
      rival: interpolarGolpes(inicio.golpes.rival, fin.golpes.rival, frac),
    },
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

  const apodoJ = nueva.snapshot.jugador.apodo;
  const apodoR = nueva.snapshot.rival.apodo;

  const efJ = efectividad(nueva.snapshot.jugador, nueva.disciplina, nueva.fatiga.jugador, planMods, true);
  const efR = efectividad(nueva.snapshot.rival, nueva.disciplina, nueva.fatiga.rival, planMods, false);
  const ventaja = ventajaDeEstilo(nueva.snapshot.jugador.estilo, nueva.snapshot.rival.estilo);
  const probJ = clamp(efJ / (efJ + efR) + ventaja + rng.float(-0.08, 0.08), 0.05, 0.95);

  const ganaRound = rng.chance(probJ);
  const margen = Math.abs(probJ - 0.5);

  if (ganaRound) nueva.tarjetas.jugador += 1; else nueva.tarjetas.rival += 1;
  nueva.historialRounds.push({ round, margen, ganador: ganaRound ? 'jugador' : 'rival' });

  const dano = Math.round((6 + margen * 30) * rng.float(0.7, 1.4));
  if (ganaRound) nueva.aguante.rival = clamp(nueva.aguante.rival - dano, 0, 100);
  else nueva.aguante.jugador = clamp(nueva.aguante.jugador - dano, 0, 100);

  const gastoBase = 9;
  const cardioJ = nueva.snapshot.jugador.atributos.cardio;
  const cardioR = nueva.snapshot.rival.atributos.cardio;
  nueva.fatiga.jugador = clamp(nueva.fatiga.jugador + gastoBase * planMods.gasto * (60 / cardioJ), 0, 100);
  nueva.fatiga.rival = clamp(nueva.fatiga.rival + gastoBase * (60 / cardioR), 0, 100);

  const clave = ganaRound ? (margen > 0.12 ? 'dominio' : 'parejo') : (margen > 0.12 ? 'sufriendo' : 'parejo');
  const textoResultado = texto(rng.pick(LINEAS[clave]), apodoJ, apodoR);

  const atacante = ganaRound ? 'jugador' : 'rival';
  const defensor = ganaRound ? 'rival' : 'jugador';
  const aguanteDefensor = nueva.aguante[defensor];
  const mentonDefensor = nueva.snapshot[defensor].especiales.menton;
  const potenciaAtacante = nueva.snapshot[atacante].atributos.potencia;

  let huboCaida = false;
  let textoCaida = null;
  const probCaida = clamp((100 - aguanteDefensor) / 260 + (potenciaAtacante - mentonDefensor) / 500, 0, 0.4);
  if (rng.chance(probCaida)) {
    huboCaida = true;
    nueva.caidas[defensor] += 1;
    const yoCaida = defensor === 'jugador' ? apodoJ : apodoR;
    const otroCaida = defensor === 'jugador' ? apodoR : apodoJ;
    textoCaida = texto(rng.pick(LINEAS.caida), yoCaida, otroCaida);
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

  let textoCierre;
  let tipoCierre;
  if (metodo) {
    const yoCierre = atacante === 'jugador' ? apodoJ : apodoR;
    const otroCierre = atacante === 'jugador' ? apodoR : apodoJ;
    const lineas = metodo === 'sumision' ? LINEAS.sumision : LINEAS.ko;
    textoCierre = texto(rng.pick(lineas), yoCierre, otroCierre);
    tipoCierre = metodo;
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
    textoCierre = 'Se termina la pelea. Van a las tarjetas.';
    tipoCierre = 'campana';
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
    textoCierre = rng.pick(LINEAS.campana);
    tipoCierre = 'campana';
    nueva.roundActual = round + 1;
  }

  // ---- A partir de acá: solo momentos de color y estadísticas. Todas las
  // decisiones de arriba (quién gana, caída, KO/sumisión/decisión) ya están
  // resueltas y no dependen de nada de lo que sigue. ----
  const golpesRound = calcularGolpesRound(rng, { ganaRound, margen, planMods });
  nueva.golpes = {
    jugador: sumarGolpes(nueva.golpes.jugador, golpesRound.jugador),
    rival: sumarGolpes(nueva.golpes.rival, golpesRound.rival),
  };

  const apodoAtacante = atacante === 'jugador' ? apodoJ : apodoR;
  const apodoDefensor = atacante === 'jugador' ? apodoR : apodoJ;

  let ultimaLinea = null;
  function elegir(lista) {
    let elegida = rng.pick(lista);
    if (lista.length > 1 && elegida === ultimaLinea) {
      elegida = lista[(lista.indexOf(elegida) + 1) % lista.length];
    }
    ultimaLinea = elegida;
    return elegida;
  }

  const beats = [];
  beats.push({ tipo: 'jab', frac: FRACCION.jab, texto: texto(elegir(LINEAS.jab), apodoAtacante, apodoDefensor) });

  const prefiereCuerpo = nueva.plan === 'frente' ? rng.chance(0.8) : nueva.plan === 'aguantar' ? rng.chance(0.2) : rng.chance(0.5);
  const tipoFlavor = prefiereCuerpo ? 'cuerpo' : 'contragolpe';
  beats.push({ tipo: tipoFlavor, frac: FRACCION.flavor, texto: texto(elegir(LINEAS[tipoFlavor]), apodoAtacante, apodoDefensor) });

  const fatigadoEsJugador = nueva.fatiga.jugador >= nueva.fatiga.rival;
  const maxFatiga = Math.max(nueva.fatiga.jugador, nueva.fatiga.rival);
  if (maxFatiga > UMBRAL_CANSANCIO) {
    const cansado = fatigadoEsJugador ? apodoJ : apodoR;
    const otroCansancio = fatigadoEsJugador ? apodoR : apodoJ;
    beats.push({ tipo: 'cansancio', frac: FRACCION.cansancio, texto: texto(elegir(LINEAS.cansancio), cansado, otroCansancio) });
  }

  // El texto de "resultado" y "caída" ya fue elegido más arriba (en su
  // posición original, para no mover las tiradas de las que dependen las
  // decisiones de las que se calculan). Acá solo se encolan en el orden
  // narrativo; no se re-tiran aunque coincidan con la línea anterior
  // (cambiaría una decisión), pero es una coincidencia rarísima entre
  // categorías distintas y cada una es igualmente reconocible por su tipo.
  ultimaLinea = textoResultado;
  beats.push({ tipo: clave, frac: FRACCION.resultado, texto: textoResultado });

  if (huboCaida) {
    ultimaLinea = textoCaida;
    beats.push({ tipo: 'caida', frac: FRACCION.caida, texto: textoCaida });
  }

  ultimaLinea = textoCierre;
  beats.push({ tipo: tipoCierre, frac: FRACCION.cierre, texto: textoCierre });

  const rango = { inicio: { aguante: pelea.aguante, fatiga: pelea.fatiga, golpes: pelea.golpes }, fin: { aguante: nueva.aguante, fatiga: nueva.fatiga, golpes: nueva.golpes } };
  const eventos = beats.map((b) => ({
    round,
    tipo: b.tipo,
    texto: b.texto,
    snapshot: snapshotEn(b.frac, rango),
  }));

  nueva.rngEstado = rng.estado();
  return { pelea: nueva, eventos };
}

// ---- Tarjetas de los jurados --------------------------------------------
//
// Estimadas y deterministas: NO tiran del RNG de la pelea (la UI puede
// llamar a esto todas las veces que quiera por round sin gastar tiradas ni
// mover el resultado). El "ruido" de cada jurado sale de una tirada
// efímera e independiente, sembrada con (juez, round, margen) — mismos
// datos, mismo resultado, siempre.
const NOMBRES_JUECES = ['Juez 1', 'Juez 2', 'Juez 3'];

function ruidoJuez(juezIndex, round, margen) {
  const semilla = ((juezIndex + 1) * 104729 + round * 7919 + Math.round(margen * 1000)) >>> 0;
  return createRng(semilla).next();
}

/**
 * Tres tarjetas 10-9 estimadas, más un resumen textual. Pura y determinista:
 * llamarla dos veces con la misma pelea da exactamente lo mismo.
 */
export function tarjetasJurados(pelea) {
  const historial = pelea.historialRounds ?? [];
  const jueces = NOMBRES_JUECES.map((nombre, idx) => {
    let jugador = 0;
    let rival = 0;
    for (const r of historial) {
      const ruido = ruidoJuez(idx, r.round, r.margen);
      // Cuanto más parejo el round (margen chico), más chance de que este
      // juez en particular lo haya visto al revés que el veredicto "real".
      const umbralVuelco = clamp((0.5 - r.margen) * 0.55, 0, 0.4);
      const vuelco = ruido < umbralVuelco;
      const ganadorJuez = vuelco ? (r.ganador === 'jugador' ? 'rival' : 'jugador') : r.ganador;
      if (ganadorJuez === 'jugador') { jugador += 10; rival += 9; } else { rival += 10; jugador += 9; }
    }
    return { nombre, jugador, rival };
  });

  return { jueces, resumen: resumenTarjetas(jueces) };
}

function resumenTarjetas(jueces) {
  const diffs = jueces.map((j) => j.jugador - j.rival);
  const favorJugador = diffs.filter((d) => d > 0).length;
  const favorRival = diffs.filter((d) => d < 0).length;
  const promedio = diffs.reduce((a, b) => a + b, 0) / jueces.length;
  const magnitud = Math.abs(promedio);

  if (favorJugador === 0 && favorRival === 0) return 'Va parejo en las tres tarjetas.';
  if (favorJugador === jueces.length) {
    return magnitud >= 6 ? 'Vas arriba claro en las tres tarjetas.' : 'Vas arriba por poco en las tres tarjetas.';
  }
  if (favorRival === jueces.length) {
    return magnitud >= 6 ? 'Vas abajo claro en las tres tarjetas.' : 'Vas abajo por poco en las tres tarjetas.';
  }
  if (promedio > 0) return 'Vas arriba, pero dividido entre los jueces.';
  if (promedio < 0) return 'Vas abajo, pero dividido entre los jueces.';
  return 'Parejo y dividido entre los jueces.';
}
