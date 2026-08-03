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
//   - AMATEUR: pool aparte, sin un solo nombre en común con los otros tres, y
//     ordenado por el récord AMATEUR de cada uno.
//   - REGIONAL: la escalera de entrada de tu país — los que todavía no
//     llegaron a la elite nacional.
//   - NACIONAL: TODO tu país, la escalera regional incluida.
//   - MUNDIAL: todos los profesionales del mundo.
//
// Las tres profesionales son ANIDADAS: regional ⊂ nacional ⊂ mundial. Eso es
// lo que hace que los tamaños crezcan (una región tiene menos gente que un
// país, y un país menos que el mundo) y, sobre todo, que el #1 del regional
// APAREZCA en la tabla nacional — más abajo, porque adelante suyo está la
// elite que todavía no alcanzó, pero aparece. La primera versión (v17.8) las
// hacía excluyentes: el regional era "el país menos la elite", así que su #1
// no figuraba en el nacional y el nacional tenía menos gente que el regional.
// Las dos cosas fueron reportadas, y las dos venían del mismo error.
//
// Sigue valiendo lo pedido: estar primero en el regional no es estar primero
// en el nacional (adelante están todos los de la elite), y estar primero en el
// nacional no es estarlo en el mundial (adelante están los extranjeros
// mejores).
//
// Todo puro y determinista: se calcula desde el roster, no se guarda ninguna
// posición en el peleador. Lo único que sí vive en el mundo es quién tiene
// cada cinturón puesto (`mundo.campeones`), porque eso NO se deduce de una
// tabla — es historia, y hay que recordarla.

import { mediaDe } from './fighter.js';

export const DIVISIONES = ['amateur', 'regional', 'nacional', 'mundial'];

// Dónde se corta cada escalón de la escalera profesional.
//
// NACIONAL: la elite de tu país. REGIONAL: los que la siguen. Por debajo de
// los dos no hay rango — se sigue peleando, pero todavía no se entró a
// ninguna tabla. MUNDIAL: la tabla del mundo entero, grande a propósito
// ("deberían ser muchos más"), con su propia punta para decir quién es de
// nivel mundial de verdad.
export const CUPO_ELITE_NACIONAL = 10;
export const CUPO_MUNDIAL = 60;
export const CUPO_ELITE_MUNDIAL = 15;

export const CUPO_REGIONAL = 20;

// Cuánto pesa lo que HICISTE frente a lo que SOS.
//
// Primera versión (v17.8): el récord movía ±25 sobre una media que va de ~48 a
// ~88, así que los atributos seguían mandando — un debutante 0-2 con buena
// media aparecía por encima de veteranos con 25-18. Reportado con capturas.
// Ahora el récord manda: mueve casi lo mismo que TODO el rango de media.
export const ESCALA_RECORD = 45;
const SUAVIZADO_RECORD = 8;

// Una pizca lineal que nunca satura, para que cualquier derrota baje el
// puntaje siempre — por más ganador que sea el historial (ver el comentario
// de bonusRecordSuavizado, world.js, que resolvió esto mismo para el ranking
// viejo).
const PENDIENTE_LINEAL = 0.3;

/**
 * El puntaje que ordena a un peleador: lo que es (media) más lo que hizo
 * (récord). Puro, sin rng.
 *
 * `clave` elige QUÉ récord mirar: el profesional (`record`) o el amateur
 * (`recordAmateur`). Sin esto, el ranking amateur ordenaba a todos por su
 * récord profesional y el jugador —recién ascendido, con media de pro—
 * aparecía a mitad de la tabla amateur sin haber ganado nunca.
 *
 * El saldo es `victorias - derrotas`, no `victorias - 2*derrotas`: con el
 * doble castigo, un veterano 25-18 (un peleador de oficio, con más de cuarenta
 * peleas encima) quedaba por debajo de un debutante 0-2, que es exactamente al
 * revés de lo que dice el sentido común del boxeo.
 */
export function puntajeDe(peleador, clave = 'record') {
  const record = peleador?.[clave] ?? { v: 0, d: 0, e: 0 };
  const saldo = (record.v ?? 0) - (record.d ?? 0);
  return mediaDe(peleador)
    + ESCALA_RECORD * Math.tanh(saldo / SUAVIZADO_RECORD)
    + PENDIENTE_LINEAL * saldo;
}

function yaDebuto(peleador) {
  const record = peleador.record ?? { v: 0, d: 0, e: 0 };
  return (record.v ?? 0) + (record.d ?? 0) + (record.e ?? 0) > 0;
}

function ordenar(peleadores, clave = 'record') {
  // Desempate por id para que dos peleadores con el mismo puntaje no se
  // intercambien de puesto entre dos llamadas: el orden tiene que ser estable
  // aunque el array de entrada venga distinto.
  return [...peleadores].sort((a, b) => {
    const dif = puntajeDe(b, clave) - puntajeDe(a, clave);
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
  // El filtro de "ya debutó" es SOLO para el jugador: un peleador del roster
  // es un profesional en actividad por definición, tenga el récord que tenga.
  // Aplicárselo también a ellos vaciaba el mundo con los años — los que se
  // retiraban eran reemplazados por debutantes 0-0 que quedaban invisibles, y
  // medido a veinte temporadas el ranking mundial se caía de 60 peleadores a
  // 6. El jugador sí tiene que debutar: no ocupa un puesto que no se ganó.
  const pool = [
    ...(mundo.roster ?? []).filter((p) => !p.retirado),
    ...(jugador && yaDebuto(jugador) ? [jugador] : []),
  ];

  // El mundo entero, de cualquier país.
  const mundial = ordenar(pool).slice(0, CUPO_MUNDIAL);
  // Todo el país: la elite Y la escalera de abajo.
  const nacionalCompleto = ordenar(pool.filter((p) => p.nacionalidad === local));
  const nacional = nacionalCompleto.slice(0, CUPO_ELITE_NACIONAL);
  // El escalón de abajo: los del país que siguen a la elite. Es un
  // SUBCONJUNTO del nacional (su #1 figura también ahí, más abajo), y se entra
  // y se sale por nivel — eso es justamente lo que el juego ahora avisa como
  // hito (ver `hitosDeDivision`, career.js): "entraste en el ranking
  // regional", "descendiste del nacional". Por debajo del regional no se
  // vuelve al amateur: simplemente no se tiene rango.
  const regional = nacionalCompleto.slice(CUPO_ELITE_NACIONAL, CUPO_ELITE_NACIONAL + CUPO_REGIONAL);

  return { regional, nacional, mundial };
}

/**
 * El ranking amateur: pool propio, que no comparte un solo nombre con los
 * profesionales (pedido textual). Vive en `mundo.rosterAmateur`.
 */
export function rankingAmateur(mundo, jugador = null) {
  // El circuito amateur deja de existir cuando el jugador se hace profesional
  // (pedido v17.12: "solo debe verse cuando uno es amateur, después
  // desaparece; no es necesario mantenerlo"). Es una etapa de formación, no
  // una tabla que se siga mirando desde arriba.
  if (jugador && yaDebuto(jugador)) return [];
  const enAmateur = jugador && (jugador.recordAmateur?.v ?? 0) + (jugador.recordAmateur?.d ?? 0) > 0;
  const pool = [
    ...(mundo.rosterAmateur ?? []),
    ...(enAmateur ? [jugador] : []),
  ];
  // Ordenado por el récord AMATEUR. Antes se ordenaba por el profesional, y
  // como el jugador recién ascendido tiene media de pro pero nunca peleó de
  // amateur más que un par de veces, aparecía a mitad de la tabla amateur con
  // un 0-2 por encima de peleadores con 30-7. Reportado con captura.
  return ordenar(pool, 'recordAmateur');
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
  // La división donde está parado hoy, de arriba hacia abajo. `null` no es un
  // error: es "sin rango" — todavía no entró a ninguna tabla, o se cayó de
  // todas. Del regional no se baja al amateur; se baja a no tener rango.
  const puestoMundial = puestoEn(rankings, 'mundial', id);
  if (puestoMundial !== null && puestoMundial <= CUPO_ELITE_MUNDIAL) return 'mundial';
  if (puestoEn(rankings, 'nacional', id) !== null) return 'nacional';
  if (puestoEn(rankings, 'regional', id) !== null) return 'regional';
  return null;
}

// El orden de las divisiones, de menor a mayor. `null` (sin rango) es el
// escalón cero: sirve para decidir si un cambio fue ascenso o descenso.
export const ESCALERA = ['regional', 'nacional', 'mundial'];

export function alturaDeDivision(division) {
  return division === null || division === undefined ? 0 : ESCALERA.indexOf(division) + 1;
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
