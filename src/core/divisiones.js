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
import { puntosEn } from './puntos-ranking.js';

export const DIVISIONES = ['amateur', 'regional', 'nacional', 'mundial'];

// Dónde se corta cada escalón de la escalera profesional.
//
// NACIONAL: la elite de tu país. REGIONAL: los que la siguen. Por debajo de
// los dos no hay rango — se sigue peleando, pero todavía no se entró a
// ninguna tabla. MUNDIAL: la tabla del mundo entero, grande a propósito
// ("deberían ser muchos más"), con su propia punta para decir quién es de
// nivel mundial de verdad.
export const CUPO_ELITE_NACIONAL = 10;
// 30 y no 60: con ~100 activos y ~48 locales, un mundial de 60 lugares (60%
// del planeta) resultaba MÁS FÁCIL de alcanzar que el top-20 del propio país
// (42%), y salían peleadores rankeados en el mundo pero no en su casa. Con 30
// la escalera vuelve a ordenar: primero tu país, después el mundo. Sigue
// siendo casi el doble de los 16 de la primera versión.
export const CUPO_MUNDIAL = 30;
export const CUPO_ELITE_MUNDIAL = 15;

// El ranking regional es el TOP 20 del país, y el nacional el TOP 10 — o sea
// que el nacional está CONTENIDO en el regional. Un peleador puede figurar en
// varios rankings a la vez, que es como funciona de verdad: el campeón
// nacional también está rankeado regionalmente, y si es bueno, además en el
// mundial. Las versiones anteriores los hacían disjuntos (el regional era "del
// 11 al 30") y eso producía el absurdo de que ascender te BORRARA del regional.
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

/**
 * Ordena por PUNTOS de una división (v18): el puesto lo dan los resultados
 * contra gente de esa tabla, no una fórmula sobre atributos. Empate de puntos
 * se rompe por id, para que el orden sea estable entre llamadas.
 */
function ordenarPorPuntos(peleadores, division) {
  return [...peleadores].sort((a, b) => {
    const dif = puntosEn(b, division) - puntosEn(a, division);
    if (dif !== 0) return dif;
    return String(a.id).localeCompare(String(b.id));
  });
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
  const pool = [
    ...(mundo.roster ?? []).filter((p) => !p.retirado),
    ...(jugador && yaDebuto(jugador) ? [jugador] : []),
  ];

  // La cadena, tal como la pidió el usuario: "si estás en el top X del
  // regional entrás en el ranking nacional, y si estás en el top X del
  // nacional entrás en el mundial".
  //
  // REGIONAL: el top del país. NACIONAL: el top del regional. MUNDIAL: las
  // elites nacionales de TODOS los países, juntadas y reordenadas entre sí.
  //
  // La consecuencia importante es la que el usuario marcó como innegociable:
  // "no le veo sentido a que alguien pueda ser top 30 del mundo y NO top 10 de
  // su propio país". Con el mundial armado desde los rankings nacionales, eso
  // es imposible por construcción — para entrar al mundo hay que estar primero
  // en la elite de tu casa.
  const delPais = pool.filter((p) => p.nacionalidad === local);
  // Cada tabla se ordena por SUS puntos: se puede subir en el mundial sin
  // moverse en el nacional (ganándole a un extranjero) y al revés. El nacional
  // sale del regional, y solo entran los que además tienen puntos ahí.
  const regional = ordenarPorPuntos(delPais, 'regional')
    .filter((p) => puntosEn(p, 'regional') > 0)
    .slice(0, CUPO_REGIONAL);
  const nacional = ordenarPorPuntos(regional, 'nacional')
    .filter((p) => puntosEn(p, 'nacional') > 0)
    .slice(0, CUPO_ELITE_NACIONAL);

  const porPais = new Map();
  for (const peleador of pool) {
    const pais = peleador.nacionalidad ?? '??';
    if (!porPais.has(pais)) porPais.set(pais, []);
    porPais.get(pais).push(peleador);
  }
  const eliteDeCadaPais = [...porPais.values()].flatMap((peleadores) => ordenarPorPuntos(
    ordenarPorPuntos(peleadores, 'regional').slice(0, CUPO_REGIONAL), 'nacional',
  ).filter((p) => puntosEn(p, 'nacional') > 0).slice(0, CUPO_ELITE_NACIONAL));
  const mundial = ordenarPorPuntos(eliteDeCadaPais, 'mundial')
    .filter((p) => puntosEn(p, 'mundial') > 0)
    .slice(0, CUPO_MUNDIAL);

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
  const donde = rankingsDondeEsta(rankings, id);
  return donde.length === 0 ? null : donde[donde.length - 1];
}

/**
 * En qué rankings figura hoy este peleador. Puede ser más de uno: el regional
 * contiene al nacional, y el mundial es una tabla aparte que cruza países.
 * Devuelve los ids en orden de menor a mayor, y `[]` si no tiene rango.
 */
export function rankingsDondeEsta(rankings, id) {
  return ESCALERA.filter((division) => puestoEn(rankings, division, id) !== null);
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
