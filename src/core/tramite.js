// Peleas de "trámite" (v6, rediseño de ritmo: "no todas las peleas se juegan
// igual" — la decisión de diseño central de esta ronda). Este módulo decide
// CUÁNTAS peleas caen en un bloque y resuelve las que no ameritan crónica
// completa (ver esPeleaImportante, offers.js) en un lote — nunca pinta nada,
// eso sigue siendo trabajo de main.js.
//
// El criterio completo (documentado también en el comentario grande de
// ETAPAS, career.js, y en esPeleaImportante, offers.js): una pelea se JUEGA
// COMPLETA (careo, campamento, ronda a ronda) cuando es de título, defensa,
// revancha, contra el archirrival, o una eliminatoria (define el ascenso al
// puesto de retador). Todo lo demás es trámite: se resuelve solo, en lote,
// con sabor (ver resumenLote), sin gastar los minutos del jugador.

import { clamp } from './stats.js';
import { getDisciplina } from './disciplines.js';
import { mediaDe } from './fighter.js';
import {
  generarOferta, aplicarResultado, esPeleaImportante,
  cinturonActual, proximoCinturon, puedeDisputar, CINTURONES,
} from './offers.js';
import { recuperar, puedePelear } from './injuries.js';
import { POOLS_TRAMITE } from '../content/tramite-lines.js';

// Cuántos cupos de pelea trae un año de carrera profesional, según la edad
// (Pedido 3, v6: "de joven se pelea más seguido... un pibe de 21 pelea
// cuatro o cinco veces al año; un campeón de 34 pelea dos"). La MAYORÍA de
// estos cupos van a ser trámite (ver armarLotePeleas): un pibe de 21 con
// cuatro o cinco peleas en el año casi siempre tiene UNA que importa (o
// ninguna) y el resto son cartelera de relleno que ni el jugador necesita
// jugar. Calibrado con scripts/_tune.mjs (ver el comentario de ETAPAS en
// career.js para los números medidos).
const BANDAS_FRECUENCIA_PRO = [
  { hasta: 22, min: 3, max: 3 },
  { hasta: 25, min: 2, max: 2 },
  { hasta: 29, min: 2, max: 2 },
  { hasta: 33, min: 1, max: 1 },
  { hasta: Infinity, min: 1, max: 1 },
];

function bandaDe(edad) {
  return BANDAS_FRECUENCIA_PRO.find((b) => edad <= b.hasta) ?? BANDAS_FRECUENCIA_PRO.at(-1);
}

// "Sube con lo que está en juego": defendiendo un cinturón (o ya calificado
// por ranking para el próximo) el circuito no te deja quieto — un campeón
// sigue activo, no descansa la temporada entera. Se refleja subiendo el TECHO
// del rango en vez de mover el piso: el mínimo de la banda de edad no
// cambia, pero el año puede estirarse uno más si hay algo grande en juego.
function conMuchoEnJuego(jugador) {
  return Boolean(cinturonActual(jugador)) || puedeDisputar(jugador, proximoCinturon(jugador));
}

export function intentosDePelea(rng, jugador) {
  const banda = bandaDe(Math.floor(jugador.edad));
  const max = conMuchoEnJuego(jugador) ? banda.max + 1 : banda.max;
  return rng.int(banda.min, max);
}

// Un campeón indiscutido (los tres cinturones puestos) ya escaló todo lo que
// el ranking le podía pedir. Sin este freno, medido con
// scripts/balance-sim.mjs: un "jugando bien" que corona los tres cinturones
// a mitad de carrera pasa el resto (a veces 8-10 años más) con CADA cupo de
// pelea convertido en una defensa del mundial — esPeleaImportante la marca
// esTitulo siempre, así que cada año de campeón indiscutido se volvía una
// pelea JUGABLE más, dispuesto el presupuesto de minutos muy por encima de
// los ~20 declarados sin sumarle nada al eje de cinturones (ya los tiene
// los tres). La cuenta de peleas PROFESIONALES totales no se toca (el año
// sigue trayendo sus cupos de trámite, ver intentosDePelea arriba) — lo que
// se apaga es la posibilidad de que ESTE año en particular sea la excepción
// que se juega completa: el campeón, la mayoría de los años, elige no
// arriesgar el cinturón en nada que no sea trámite. Esto no toca la
// frecuencia mientras el reinado todavía se está construyendo (subir a
// buscar el próximo cinturón, o la primera defensa recién ganado el
// mundial) — sólo el tramo final, ya consagrado.
const PROB_DESCANSO_CAMPEON_INDISCUTIDO = 0.8;

export function permiteMarqueeEsteAnio(rng, jugador) {
  const esCampeonIndiscutido = (jugador.titulos?.length ?? 0) >= CINTURONES.length;
  if (esCampeonIndiscutido && rng.chance(PROB_DESCANSO_CAMPEON_INDISCUTIDO)) return false;
  return true;
}

// Resultado rápido de una pelea de trámite: mismo criterio que el combate
// NPC-vs-NPC de `avanzarMundo` (world.js) — la diferencia de MEDIA empuja la
// probabilidad, con piso/techo para que ni el más flojo ni el más fuerte sea
// un resultado 100% cantado. Nunca hay empate (mismo criterio que
// avanzarMundo): un trámite es un resultado seco, no una pelea completa
// round a round. Deliberadamente NO tira lesión: el riesgo de lesión de
// verdad vive en las peleas que el jugador SÍ juega (ver cerrarPelea,
// main.js) — un combate de trámite lo maneja tu equipo, no vos.
function resolverResultadoRapido(rng, { jugador, oferta }) {
  const fuerza = mediaDe(jugador) - oferta.rivalMedia;
  const probJugador = clamp(0.5 + fuerza * 0.02, 0.12, 0.88);
  const ganaJugador = rng.chance(probJugador);
  const porKo = rng.chance(0.35);
  const disc = getDisciplina(jugador.disciplina);
  const tope = disc.roundsPorNivel[oferta.nivelPelea] ?? disc.roundsPorNivel.profesional;
  return {
    ganador: ganaJugador ? 'jugador' : 'rival',
    metodo: porKo ? 'ko' : 'decision',
    round: porKo ? rng.int(1, tope) : tope,
  };
}

// ===== Minijuego de trámite (Pedido 2, v7): "que se juegue un poco" ========
//
// Pedido textual del usuario: una tarjeta con el rival (media/rango/récord/
// estadísticas) y un botón "Simular pelea" que dispara un piedra-papel-
// tijera al mejor de 5, traducido a boxeo. El ciclo de tres reusa el que YA
// existe entre estilos (styles.js: tecnico > noqueador > menton > tecnico,
// un triángulo cerrado dentro del grafo más grande de ESTILOS) — acá no es
// el estilo permanente del peleador, es la decisión TÁCTICA de una ronda
// puntual: boxear a distancia (tecnico), ir a buscar el nocaut (noqueador) o
// cerrarte en guardia a resistir (menton). Mismo lenguaje que el resto del
// juego ya le enseñó al jugador, no una mecánica pegada con cinta.
export const ACCIONES_MINIJUEGO = ['tecnico', 'noqueador', 'menton'];

const LE_GANA_A_MINIJUEGO = { tecnico: 'noqueador', noqueador: 'menton', menton: 'tecnico' };

/**
 * La acción del RIVAL que hace falta mostrar para que la ronda cierre con el
 * resultado ya decidido (`gana`): si el jugador ganó, el rival tiene que
 * haber jugado la acción que la del jugador vence; si perdió, la que lo
 * vence a él. El ciclo de 3 solo tiene una respuesta posible para cada caso,
 * así que esto no consume rng — es pura consecuencia del ciclo.
 */
export function accionRivalDe(accionJugador, gana) {
  if (gana) return LE_GANA_A_MINIJUEGO[accionJugador];
  return ACCIONES_MINIJUEGO.find((a) => LE_GANA_A_MINIJUEGO[a] === accionJugador);
}

// Probabilidad de ganar CADA ronda del minijuego: mismo criterio que
// `resolverResultadoRapido` (la diferencia de MEDIA empuja la probabilidad),
// pero con un factor más suave (0.016 en vez de 0.02) y un piso/techo más
// angosto (16%-84% en vez de 12%-88%): esto se compone hasta 5 veces (una
// pelea puede necesitar hasta 5 rondas para definirse), así que el mismo
// factor "por pelea" de resolverResultadoRapido, aplicado ronda a ronda,
// volvería una diferencia de media moderada en un resultado casi cantado de
// punta a punta (0.7^3 ya es 34%). Con 0.016/piso 16%, una ventaja de media
// grande (ej. +20) sigue siendo MUY favorable pelea a pelea sin volverse
// determinista ronda a ronda — "que se note sin volverlo determinista",
// pedido textual del usuario.
const PISO_PROB_RONDA = 0.16;
const TECHO_PROB_RONDA = 0.84;
const FACTOR_PROB_RONDA = 0.016;

function probRondaJugador(jugador, rivalMedia) {
  const fuerza = mediaDe(jugador) - rivalMedia;
  return clamp(0.5 + fuerza * FACTOR_PROB_RONDA, PISO_PROB_RONDA, TECHO_PROB_RONDA);
}

/**
 * El marcador completo de un combate de trámite jugado con el minijuego:
 * ronda a ronda (Bernoulli, ver `probRondaJugador`) hasta que alguno de los
 * dos llega a 3 — "al mejor de 5", nunca más de 5 rondas ni empate posible
 * (ganar/perder una ronda siempre define a alguien, igual criterio que
 * `resolverResultadoRapido`: un trámite es un resultado seco). `rondas` es
 * la secuencia ORDENADA de quién ganó cada una ('jugador'|'rival') — la UI
 * la recorre para revelar el minijuego ronda a ronda sin volver a consumir
 * rng: la acción del rival en cada ronda se DERIVA de la del jugador más
 * este resultado ya decidido (ver `accionRivalDe`), nunca al revés.
 */
export function armarMarcador(rng, { jugador, rivalMedia }) {
  const prob = probRondaJugador(jugador, rivalMedia);
  const rondas = [];
  let puntosJugador = 0;
  let puntosRival = 0;
  while (puntosJugador < 3 && puntosRival < 3) {
    const ganaJugador = rng.chance(prob);
    rondas.push(ganaJugador ? 'jugador' : 'rival');
    if (ganaJugador) puntosJugador += 1; else puntosRival += 1;
  }
  return { rondas, jugador: puntosJugador, rival: puntosRival };
}

// La tabla marcador -> resultado que pidió el usuario, textual: "3 a 0 es un
// KO, 3 a 1 es por puntos (decisión unánime), 3 a 2 es decisión dividida" —
// simétrica para la derrota (0-3 KO en contra, 1-3 unánime en contra, 2-3
// dividida en contra). `perdedor` son las rondas que se llevó quien pierde
// la pelea (0, 1 o 2 — nunca 3, eso sería un empate y acá no existen).
const DETALLE_DE_RONDAS_PERDEDOR = { 0: 'ko', 1: 'unanime', 2: 'dividida' };

/** Traduce un marcador (`armarMarcador`) al resultado de la pelea. */
export function resultadoDeMarcador(marcador) {
  const ganaJugador = marcador.jugador > marcador.rival;
  const rondasPerdedor = ganaJugador ? marcador.rival : marcador.jugador;
  const detalle = DETALLE_DE_RONDAS_PERDEDOR[rondasPerdedor];
  return {
    ganador: ganaJugador ? 'jugador' : 'rival',
    metodo: detalle === 'ko' ? 'ko' : 'decision',
    detalle,
  };
}

/**
 * Resuelve una pelea de trámite CON el minijuego: arma el marcador
 * (`armarMarcador`) y lo traduce a un resultado completo, con `round` (para
 * el historial) igual criterio que `resolverResultadoRapido` — un KO cae en
 * cualquier round hasta el tope de la disciplina/nivel, una decisión llega
 * al tope. Devuelve también el propio `marcador`: la UI lo necesita para
 * revelar el minijuego ronda a ronda (ver `beatPeleasResueltas`, main.js).
 */
export function resolverConMinijuego(rng, { jugador, oferta }) {
  const marcador = armarMarcador(rng, { jugador, rivalMedia: oferta.rivalMedia });
  const { ganador, metodo, detalle } = resultadoDeMarcador(marcador);
  const disc = getDisciplina(jugador.disciplina);
  const tope = disc.roundsPorNivel[oferta.nivelPelea] ?? disc.roundsPorNivel.profesional;
  const round = metodo === 'ko' ? rng.int(1, tope) : tope;
  return { resultado: { ganador, metodo, round, detalle }, marcador };
}

// Qué tan seguido un lote de trámite saca un destacado jugable con
// card+minijuego (ver el comentario grande en `armarLotePeleas`, más abajo,
// para el porqué del número): 0.3 deja ~6-7 destacados por carrera, medido
// con scripts/balance-sim.mjs.
const PROB_DESTACADO_TRAMITE = 0.3;

const NUMERO = ['cero', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete'];
const numero = (n) => NUMERO[n] ?? String(n);
const capitalizar = (s) => (s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1));

function cantidadTexto(n) {
  return n === 1 ? 'Una pelea' : `${capitalizar(numero(n))} peleas`;
}

function koTexto(kos, victorias) {
  if (kos === 0) return '';
  if (kos === 1) return ', una por nocaut';
  if (kos === victorias) return ', todas por nocaut';
  return `, ${numero(kos)} por nocaut`;
}

function rellenar(plantilla, datos) {
  return plantilla.replace(/\{(\w+)\}/g, (_, clave) => String(datos[clave] ?? ''));
}

/**
 * Resumen con sabor de un lote de peleas de trámite ya resueltas. `tono`
 * ('amateur' | 'juvenil' | 'profesional' | 'veterano') elige la voz — ver
 * content/tramite-lines.js. Puro (no consume rng para nada que no sea elegir
 * la variante de texto — mismo criterio que el resto del "sabor" del juego,
 * p.ej. LINEAS en fight.js).
 */
export function resumenLote(rng, { resultados, tono = 'profesional' }) {
  const victorias = resultados.filter((r) => r.resultado === 'v').length;
  const derrotas = resultados.length - victorias;
  const kos = resultados.filter(
    (r) => r.resultado === 'v' && (r.metodo === 'ko' || r.metodo === 'tko'),
  ).length;

  const poolKey = tono === 'juvenil' ? 'amateur' : tono;
  const pool = POOLS_TRAMITE[poolKey] ?? POOLS_TRAMITE.profesional;

  let categoria;
  if (resultados.length === 1) {
    categoria = victorias === 1 ? 'unaGanada' : 'unaPerdida';
  } else if (derrotas === 0) {
    categoria = 'perfecta';
  } else if (victorias === 0) {
    categoria = 'derrotas';
  } else {
    categoria = 'mixta';
  }

  const datos = {
    cantidad: cantidadTexto(resultados.length),
    record: `${victorias}-${derrotas}`,
    ko: koTexto(kos, victorias),
  };

  return {
    titulo: poolKey === 'amateur' ? 'Circuito amateur' : 'Mientras tanto...',
    texto: rellenar(rng.pick(pool[categoria]), datos),
    victorias,
    derrotas,
  };
}

// v7, corrección del coordinador ("las lesiones tienen que costar de
// verdad, evaluadas semana a semana, no una vez por bloque"): antes, el
// gate de lesión vivía ENTERO en career.js/armarCola, evaluado UNA sola vez
// por bloque, contra el estado de la lesión tal cual quedó al CIERRE del
// bloque anterior — así que un salto instantáneo de 52 semanas (avanzarBloque)
// siempre corría ANTES de esa única revisión, y cualquier lesión de 52
// semanas o menos ya aparecía curada la primera vez que se la miraba. Cero
// costo real para ceja/nariz/costillas/mano/hombro; la cirugía no cambiaba
// nada.
//
// Ahora cada CUPO (`intentos`, más abajo) representa una porción del año —
// `semanasPorIntento` semanas, calculadas en career.js como
// `semanasDeBloque(...) / intentos` — y la revisión de "¿puede pelear
// AHORA?" pasa a hacerse cupo por cupo, en el momento puntual en que ese
// cupo se juega, no una vez para todo el año. Si el jugador sigue
// lesionado EN ESE MOMENTO, el cupo se pierde del todo (ni oferta ni
// trámite: nadie te ofrece nada estando de baja) y esas semanas se
// descuentan de lo que falta para recuperarse (`recuperar`, injuries.js) —
// si con eso alcanza para curarse, el PRÓXIMO cupo del mismo bloque (si lo
// hay) ya lo encuentra sano y genera una oferta real. Consecuencia directa:
// un pibe de 21 con tres cupos por año pierde SOLO los cupos que caen
// mientras sigue de baja, nunca el año entero salvo que la lesión sea larga
// de verdad; un veterano con un único cupo por año, en cambio, pierde el
// año completo si le toca estar lesionado justo en ese momento — igual que
// en el boxeo real, menos actividad significa menos margen para el error.
function cupoBloqueadoPorLesion(jugadorActual, semanasPorIntento) {
  if (puedePelear(jugadorActual)) return { bloqueado: false, jugador: jugadorActual };
  const paso = recuperar(jugadorActual, { semanas: semanasPorIntento });
  return { bloqueado: true, jugador: paso.peleador };
}

/**
 * Arma (y resuelve) el lote de peleas de un bloque: hasta `intentos` cupos,
 * de los cuales como MUCHO el primero que de verdad se juega puede terminar
 * siendo una pelea que importa (ver esPeleaImportante) — el resto son
 * siempre de trámite (nivel regional forzado, ver `soloRegional` en
 * generarOferta). Si ese cupo SÍ importa, se lo deja afuera del lote
 * (`marqueeOferta`): esa la juega el jugador de verdad (career.js la encola
 * como beat 'oferta'); las demás se resuelven acá mismo, en el momento.
 *
 * `permiteJugable=false` (juvenil/amateur): NINGÚN cupo puede volverse
 * jugable — la etapa de formación entera se resuelve sola (ver el criterio
 * en el comentario grande de ETAPAS, career.js). Esas etapas tampoco pueden
 * tener una lesión activa (nunca juegan una pelea de verdad, único origen de
 * una lesión — ver cerrarPelea, main.js), así que el gate de acá abajo nunca
 * las afecta en la práctica.
 *
 * `semanasPorIntento` (v7): cuántas semanas de calendario representa CADA
 * cupo, para el gate de lesión (ver `cupoBloqueadoPorLesion`, arriba). El
 * default (52) es una red de seguridad para llamadores que no lo pasen
 * (equivale al viejo comportamiento "un cupo = el año entero").
 *
 * No muta `jugador` ni `rivalidades`; el `rng` sí viaja mutado (mismo
 * contrato que el resto de career.js: quien llama guarda `rng.estado()`).
 *
 * Devuelve además `bloqueados`: cuántos cupos de ESTE lote se perdieron por
 * seguir lesionado en ese momento — es la métrica real de "cuántas ofertas
 * le costó la lesión" (career.js la usa para decidir si hace falta avisar
 * con el beat 'lesionSinOferta', y scripts/balance-sim.mjs la suma para
 * medir el costo de la regla sobre una carrera completa).
 */
export function armarLotePeleas(rng, {
  jugador, mundo, etapa, rivalidades = [], forzarTitulo = false, intentos, permiteJugable = true, tono = 'profesional',
  semanasPorIntento = 52,
}) {
  let jugadorActual = jugador;
  const excluidos = [];
  let marqueeOferta = null;
  const resultados = [];
  let bloqueados = 0;
  // Reemplaza al viejo `i === 0`: el "primer cupo" (el único que puede
  // volverse jugable/forzar título) ahora es el primero que de verdad se
  // JUEGA — si los primeros cupos del año se pierden por lesión, el que
  // sigue en cuanto se cura hereda esa chance, no se pierde para siempre.
  let primerCupoDisponible = true;
  // Pedido 1/2 (v7, "que se anuncie antes" + "que se juegue un poco"): DE
  // TODO el lote, a lo sumo el primer combate que de verdad se resuelve como
  // trámite (no marquee) se anuncia con el minijuego (armarMarcador,
  // resolverConMinijuego, arriba) — el resto, si el año trae más de un cupo
  // de trámite, se sigue resolviendo con el viejo resultado seco
  // (resolverResultadoRapido).
  //
  // Y ni siquiera CADA lote saca uno: medido con scripts/balance-sim.mjs,
  // "un destacado por cada lote que tenga trámite" salía a ~19 por carrera
  // — con card+minijuego, ~112 acciones EXTRA por carrera (+~15 minutos),
  // reventando por completo el presupuesto de ~20 (quedaba en ~36). Bajarlo
  // a "a veces" (PROB_DESTACADO_TRAMITE) es la palanca que de verdad importa
  // acá: sigue cumpliendo "no aparece de la nada" para los que SÍ salen
  // destacados, sin convertir cada año de trámite en su propia mini-pelea.
  // 0.3 deja ~6-7 destacados por carrera (sumado a las ~6 jugables de
  // siempre, un total razonable de "peleas que se sienten" sin volver la
  // partida una hora) — ver el informe de balance entregado con esta ronda.
  const hayDestacadoEsteLote = rng.chance(PROB_DESTACADO_TRAMITE);
  let esPrimerResultadoTramite = hayDestacadoEsteLote;

  for (let i = 0; i < intentos; i += 1) {
    const { bloqueado, jugador: jugadorTrasChequeo } = cupoBloqueadoPorLesion(jugadorActual, semanasPorIntento);
    jugadorActual = jugadorTrasChequeo;
    if (bloqueado) {
      bloqueados += 1;
      continue;
    }

    const primerCupo = primerCupoDisponible && permiteJugable && !marqueeOferta;
    const oferta = generarOferta(rng, {
      jugador: jugadorActual,
      mundo,
      etapa,
      rivalidades,
      forzarTitulo: primerCupo && forzarTitulo,
      soloRegional: !primerCupo,
      excluirIdsExtra: excluidos,
    });
    if (!oferta) continue; // sin rivales disponibles (rarísimo, roster agotado)
    primerCupoDisponible = false;
    excluidos.push(oferta.rivalId);

    if (primerCupo && esPeleaImportante(oferta)) {
      marqueeOferta = oferta;
      continue;
    }

    let resultado;
    let marcador = null;
    if (esPrimerResultadoTramite) {
      const resuelto = resolverConMinijuego(rng, { jugador: jugadorActual, oferta });
      resultado = resuelto.resultado;
      marcador = resuelto.marcador;
      esPrimerResultadoTramite = false;
    } else {
      resultado = resolverResultadoRapido(rng, { jugador: jugadorActual, oferta });
    }
    const paso = aplicarResultado(jugadorActual, { oferta, resultado, modo: 'tramite' });
    jugadorActual = paso.jugador;
    resultados.push({
      rivalId: oferta.rivalId,
      rivalNombre: oferta.rivalNombre,
      rivalApodo: oferta.rivalApodo,
      resultado: resultado.ganador === 'jugador' ? 'v' : 'd',
      metodo: resultado.metodo,
      detalle: resultado.detalle ?? null,
      bolsa: oferta.bolsa,
      // Solo el primer resultado (el destacado, ver arriba) trae `marcador`
      // (ronda a ronda) y la `oferta` completa: es lo único que la tarjeta
      // del minijuego necesita para mostrar al rival y revelar el
      // combate — los demás resultados del lote se narran en la síntesis
      // (resumenLote, más abajo), nunca con su propia tarjeta.
      marcador,
      oferta,
    });
  }

  const beatTramite = resultados.length > 0
    ? {
      tipo: 'peleasResueltas',
      datos: {
        resultados, semanasPorIntento, ...resumenLote(rng, { resultados, tono }),
      },
    }
    : null;

  return {
    marqueeOferta, beatTramite, jugador: jugadorActual, rivalidades, bloqueados,
  };
}
