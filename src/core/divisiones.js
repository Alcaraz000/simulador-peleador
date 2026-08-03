// Las cuatro divisiones y sus rankings (pedido v17.5, punto 7).
//
// Antes había UN solo ranking: los 100 peleadores del mundo ordenados por
// media, con el récord como ajuste chico. Eso traía tres problemas que el
// usuario reportó por separado y que en realidad eran el mismo:
//
//   1. Un 0-2 aparecía #58 de 100 — porque el puesto lo daba la media (los
//      atributos), y ganar o perder casi no lo movía. En boxeo el puesto se
//      gana peleando, no entrenando.
//   2. Los cinturones no tenían dueño. `mundo.campeonId` existía pero solo
//      alimentaba noticias, y al perder un título el rival no quedaba
//      registrado como campeón en ningún lado. Se podía pelear "por el
//      mundial" contra alguien que nunca lo había ganado.
//   3. Estar arriba en el ranking no significaba nada concreto: no había
//      escalera, era una única lista de 100.
//
// El modelo nuevo:
//
//   - AMATEUR: pool aparte, sin un solo nombre en común con los otros tres.
//     Es la etapa de formación y muere ahí.
//   - REGIONAL: peleadores del país del jugador que todavía NO entraron a la
//     elite nacional. La escalera de entrada.
//   - NACIONAL: los `CUPO_NACIONAL` mejores del país.
//   - MUNDIAL: los `CUPO_MUNDIAL` mejores del mundo, de cualquier país (con
//      los locales que califiquen, si califican).
//
// De ahí sale sola la coherencia que pidió el usuario: el #1 regional es, por
// construcción, el que quedó JUSTO afuera de la elite nacional — nunca es
// también el #1 nacional. Y el #1 nacional solo es #1 mundial si de verdad no
// hay extranjero mejor.
//
// Todo puro y determinista: se calcula desde el roster, no se guarda ninguna
// posición en el peleador. Lo único que sí vive en el mundo es quién tiene
// cada cinturón puesto (`mundo.campeones`), porque eso NO se deduce de una
// tabla — es historia, y hay que recordarla.

import { mediaDe } from './fighter.js';

export const DIVISIONES = ['amateur', 'regional', 'nacional', 'mundial'];

// Cuántos entran a cada elite. El nacional es más chico que el mundial a
// propósito: ser top-12 de tu país tiene que costar más que ser top-16 del
// mundo entero medido en cantidad de rivales, porque el pool local es una
// fracción del global (ver FRACCION_LOCAL, roster.js).
export const CUPO_NACIONAL = 12;
export const CUPO_MUNDIAL = 16;

// Cuánto pesa el récord frente a los atributos.
//
// Antes el puesto era `media + tanh(v - 2d)` con un tope que en la práctica
// valía unos pocos puntos: un debutante con buenos atributos entraba a mitad
// de tabla sin haber ganado una sola pelea. Con esto, el récord mueve hasta
// ±ESCALA_RECORD puntos de puntaje — suficiente para que un invicto suba de
// verdad y para que una racha de derrotas se pague, sin que deje de importar
// lo bueno que sea el peleador.
//
// `tanh` en vez de un tope duro por el mismo motivo de siempre en este
// proyecto: nunca es perfectamente plana, así que CUALQUIER derrota mueve el
// puntaje aunque el historial ya esté saturado (ver el comentario de
// bonusRecordSuavizado, world.js, que resolvió eso mismo para el ranking
// viejo).
export const ESCALA_RECORD = 25;
const SUAVIZADO_RECORD = 6;

// Una pizca LINEAL que nunca satura. `tanh` sola tiene un problema conocido en
// este proyecto (ya resuelto una vez para el ranking viejo): con un historial
// muy ganador queda tan pegada a 1 que sumar derrotas no mueve nada — un 40-0
// y un 40-7 daban prácticamente el mismo puntaje. Este término, chico frente
// al resto, garantiza que CUALQUIER derrota baje el puntaje siempre, por más
// saturado que esté el récord: perder cuesta, sin excepciones.
const PENDIENTE_LINEAL = 0.15;

/**
 * El puntaje que ordena a un peleador dentro de su división: lo que es
 * (media) más lo que hizo (récord). Puro, sin rng.
 */
export function puntajeDe(peleador) {
  const record = peleador.record ?? { v: 0, d: 0, e: 0 };
  const crudo = (record.v ?? 0) - (record.d ?? 0) * 2;
  return mediaDe(peleador)
    + ESCALA_RECORD * Math.tanh(crudo / SUAVIZADO_RECORD)
    + PENDIENTE_LINEAL * crudo;
}

function yaDebuto(peleador) {
  const record = peleador.record ?? { v: 0, d: 0, e: 0 };
  return (record.v ?? 0) + (record.d ?? 0) + (record.e ?? 0) > 0;
}

function ordenar(peleadores) {
  // Desempate por id para que dos peleadores con el mismo puntaje no se
  // intercambien de puesto entre dos llamadas: el orden tiene que ser estable
  // aunque el array de entrada venga distinto.
  return [...peleadores].sort((a, b) => {
    const dif = puntajeDe(b) - puntajeDe(a);
    if (dif !== 0) return dif;
    return String(a.id).localeCompare(String(b.id));
  });
}

/**
 * Los tres rankings profesionales, ya ordenados.
 *
 * `jugador` entra al pool como uno más (no vive en `mundo.roster`), y solo si
 * ya debutó como profesional: un juvenil no ocupa un puesto que todavía no se
 * ganó.
 *
 * @returns {{regional: object[], nacional: object[], mundial: object[]}}
 */
export function rankingsProfesionales(mundo, jugador = null) {
  const local = mundo.nacionalidadLocal ?? jugador?.nacionalidad ?? null;
  const pool = [
    ...(mundo.roster ?? []).filter((p) => !p.retirado && yaDebuto(p)),
    ...(jugador && yaDebuto(jugador) ? [jugador] : []),
  ];

  const mundial = ordenar(pool).slice(0, CUPO_MUNDIAL);

  const delPais = ordenar(pool.filter((p) => p.nacionalidad === local));
  const nacional = delPais.slice(0, CUPO_NACIONAL);
  // El regional es el resto del país: los que todavía no entraron a la elite
  // nacional. Por eso el #1 regional NUNCA es el #1 nacional — es el primero
  // de los que quedaron afuera, que es justo la coherencia pedida.
  const regional = delPais.slice(CUPO_NACIONAL);

  return { regional, nacional, mundial };
}

/**
 * El ranking amateur: pool propio, que no comparte un solo nombre con los
 * profesionales (pedido textual). Vive en `mundo.rosterAmateur`.
 */
export function rankingAmateur(mundo, jugador = null) {
  const enAmateur = jugador && (jugador.recordAmateur?.v ?? 0) + (jugador.recordAmateur?.d ?? 0) > 0;
  const pool = [
    ...(mundo.rosterAmateur ?? []),
    ...(enAmateur ? [jugador] : []),
  ];
  return ordenar(pool);
}

/**
 * Los cuatro rankings juntos, que es lo que consume la pantalla de ranking.
 */
export function rankingsDe(mundo, jugador = null) {
  return { amateur: rankingAmateur(mundo, jugador), ...rankingsProfesionales(mundo, jugador) };
}

/** Puesto (1-based) de un peleador en una división, o `null` si no está. */
export function puestoEn(rankings, division, id) {
  const lista = rankings[division] ?? [];
  const indice = lista.findIndex((p) => p.id === id);
  return indice === -1 ? null : indice + 1;
}

/**
 * En qué división profesional está parado hoy: la MÁS ALTA en la que aparece.
 * Un peleador puede estar en el nacional y también en el mundial; lo que
 * define su lugar en el mundo es el techo, no el piso.
 */
export function divisionDe(rankings, id) {
  if (puestoEn(rankings, 'mundial', id)) return 'mundial';
  if (puestoEn(rankings, 'nacional', id)) return 'nacional';
  if (puestoEn(rankings, 'regional', id)) return 'regional';
  return null;
}

// ---- Los cinturones y sus dueños -----------------------------------------

/**
 * Estado inicial de los tres cinturones: el #1 de cada división lo tiene
 * puesto. A partir de ahí solo cambia de manos peleando (ver
 * `coronarCampeon`).
 */
export function campeonesIniciales(mundo, jugador = null) {
  const rankings = rankingsProfesionales(mundo, jugador);
  return {
    regional: rankings.regional[0]?.id ?? null,
    nacional: rankings.nacional[0]?.id ?? null,
    mundial: rankings.mundial[0]?.id ?? null,
  };
}

/** Quién tiene puesto ese cinturón hoy. */
export function campeonDe(mundo, cinturonId) {
  return (mundo.campeones ?? {})[cinturonId] ?? null;
}

/** El cinturón cambia de manos. Devuelve un mapa nuevo, sin mutar. */
export function coronarCampeon(campeones, cinturonId, nuevoCampeonId) {
  return { ...(campeones ?? {}), [cinturonId]: nuevoCampeonId };
}

/** Qué cinturones tiene puestos este peleador ahora mismo. */
export function cinturonesDe(campeones, id) {
  return Object.entries(campeones ?? {})
    .filter(([, campeonId]) => campeonId === id)
    .map(([cinturonId]) => cinturonId);
}
