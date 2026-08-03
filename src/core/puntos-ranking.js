// Los puntos de ranking, por división (rediseño v18).
//
// Hasta acá el puesto salía de una FÓRMULA sobre atributos y récord global, y
// por eso cada ajuste generaba un absurdo nuevo: si pesaba la media, un 0-2
// superaba a un 25-18; si pesaba el récord global, ganarle a cualquiera te
// subía en las tres tablas por igual. El pedido del usuario destrabó el
// problema: el puesto no sale de una fórmula, sale de A QUIÉN ENFRENTASTE.
//
// Ahora cada peleador —el jugador Y los NPC— lleva sus propios puntos en cada
// división, y solo se mueven peleando contra alguien que esté EN esa división.
// Ganarle a un extranjero del mundial te sube en el mundial y no toca el
// nacional, porque no enfrentaste a nadie del nacional. Si el rival está en
// dos tablas, se mueven las dos.
//
// Todo puro y determinista, sin rng: los mismos resultados dan los mismos
// puntos siempre.

import { clamp } from './stats.js';

export const DIVISIONES_PUNTUABLES = ['regional', 'nacional', 'mundial'];

// Puntos que reparte una pelea. La base es lo que vale ganar; el resto lo
// decide la DIFERENCIA de puesto: ganarle a alguien muy por encima tuyo vale
// mucho más que ganarle a alguien que ya estaba debajo, y perder contra
// alguien peor rankeado duele más que perder contra el mejor de la tabla.
export const PUNTOS_BASE_VICTORIA = 100;
export const PUNTOS_BASE_DERROTA = -70;
export const PUNTOS_EMPATE = 15;
// Cuánto suma (o resta) cada puesto de diferencia. Con 12 puntos por escalón,
// ganarle al #1 estando #15 vale 100 + 168: un salto real, de los que cambian
// una carrera. Ganarle al #20 estando #1 vale casi nada, que es justo lo que
// tiene que pasar para que elegir rival sea una decisión.
export const PUNTOS_POR_ESCALON = 12;
export const TOPE_ESCALONES = 20;
// Ganar SIEMPRE suma algo y perder SIEMPRE resta algo, por más desparejo que
// haya sido el cruce: sin estos topes, ganarle a alguien muy por debajo tuyo
// daba puntos negativos y perder contra el #1 daba positivos, que es un
// sinsentido.
export const PISO_VICTORIA = 10;
export const TECHO_DERROTA = -10;

// Un rival SIN puesto en esa división no puede darte puntos ahí: no se sube en
// el ranking nacional ganándole a alguien que no está en el ranking nacional.
// Sí puede costarte, y caro: perder contra alguien que ni figura es la clase de
// resultado que te tira abajo en todas las tablas donde estés.
export const PUNTOS_DERROTA_CONTRA_NADIE = -120;

// Cuánto se pierde por año sin pelear contra nadie de esa división. El ranking
// no perdona la inactividad — pedido del usuario, y es lo que pasa de verdad.
export const DECAIMIENTO_ANUAL = 0.12;

export const PUNTOS_MINIMOS = 0;
export const PUNTOS_MAXIMOS = 4000;

/** Los puntos de un peleador en una división (0 si nunca sumó ahí). */
export function puntosEn(peleador, division) {
  return peleador?.puntosRanking?.[division] ?? 0;
}

/**
 * Cuánto mueve una pelea los puntos de UNA división.
 *
 * `miPuesto` y `puestoRival` son las posiciones en esa división ANTES de la
 * pelea; `null` significa "no estaba en la tabla".
 */
export function deltaDePelea({ resultado, miPuesto, puestoRival }) {
  if (resultado === 'e') return PUNTOS_EMPATE;

  // El rival no pertenece a esta división: ganarle no suma acá.
  if (puestoRival === null || puestoRival === undefined) {
    return resultado === 'v' ? 0 : PUNTOS_DERROTA_CONTRA_NADIE;
  }

  // Sin puesto propio todavía, se cuenta como si estuvieras justo afuera de la
  // tabla: así entrar por primera vez ganándole a un rankeado vale mucho.
  const mio = miPuesto ?? TOPE_ESCALONES + 1;
  // `ventaja` positiva = el rival estaba PEOR rankeado que vos (número más
  // alto). Ganarle a alguien peor suma poco; perder contra alguien peor es lo
  // que más cuesta.
  const ventaja = clamp(puestoRival - mio, -TOPE_ESCALONES, TOPE_ESCALONES);

  return resultado === 'v'
    ? Math.max(PISO_VICTORIA, PUNTOS_BASE_VICTORIA - ventaja * PUNTOS_POR_ESCALON)
    : Math.min(TECHO_DERROTA, PUNTOS_BASE_DERROTA - ventaja * PUNTOS_POR_ESCALON);
}

/**
 * Aplica una pelea a los puntos de un peleador. Devuelve el mapa nuevo, sin
 * mutar.
 *
 * `puestosRival` dice en qué divisiones está el rival y en qué puesto; se
 * actualizan SOLO esas. Si el rival está en el regional y en el nacional, se
 * mueven las dos — el caso que marcó el usuario.
 */
export function aplicarPuntos(peleador, { resultado, misPuestos = {}, puestosRival = {} }) {
  const actuales = { ...(peleador.puntosRanking ?? {}) };
  const divisiones = resultado === 'v'
    ? Object.keys(puestosRival)
    : DIVISIONES_PUNTUABLES.filter((d) => misPuestos[d] != null || puestosRival[d] != null);

  for (const division of divisiones) {
    if (!DIVISIONES_PUNTUABLES.includes(division)) continue;
    const delta = deltaDePelea({
      resultado,
      miPuesto: misPuestos[division] ?? null,
      puestoRival: puestosRival[division] ?? null,
    });
    actuales[division] = clamp((actuales[division] ?? 0) + delta, PUNTOS_MINIMOS, PUNTOS_MAXIMOS);
  }
  return actuales;
}

/** El desgaste de un año sin pelear en esa división. */
export function decaerPuntos(puntosRanking, divisionesActivas = []) {
  const salida = { ...(puntosRanking ?? {}) };
  for (const division of DIVISIONES_PUNTUABLES) {
    if (divisionesActivas.includes(division)) continue;
    const actual = salida[division] ?? 0;
    if (actual <= 0) continue;
    salida[division] = Math.max(PUNTOS_MINIMOS, Math.round(actual * (1 - DECAIMIENTO_ANUAL)));
  }
  return salida;
}

/**
 * Puntos de arranque de un NPC, para que el mundo nazca con tablas creíbles en
 * vez de con todos en cero.
 *
 * No es una fórmula que reemplace a los puntos: es la FOTO INICIAL de una
 * carrera que ya venía corriendo antes de que el jugador debutara. A partir de
 * ahí los puntos solo se mueven peleando, igual que los del jugador.
 *
 * Se deriva de lo que el peleador ya hizo (su récord) y de lo bueno que es (su
 * media), y se reparte en cascada: todos tienen algo de regional, los buenos
 * además tienen nacional, y solo los muy buenos tienen mundial. Eso reproduce
 * de entrada la cadena regional -> nacional -> mundial sin tener que simular
 * veinte años de historia.
 */
export function puntosInicialesDe(peleador, media) {
  const record = peleador.record ?? { v: 0, d: 0 };
  const saldo = (record.v ?? 0) - (record.d ?? 0);
  // Un peleador de media 60 con récord parejo arranca cerca de cero; uno de
  // media 85 con 25-3 arranca bien arriba.
  const base = Math.max(0, (media - 55) * 22 + saldo * 30);

  return {
    regional: clamp(Math.round(base), PUNTOS_MINIMOS, PUNTOS_MAXIMOS),
    nacional: clamp(Math.round(base - 260), PUNTOS_MINIMOS, PUNTOS_MAXIMOS),
    mundial: clamp(Math.round(base - 620), PUNTOS_MINIMOS, PUNTOS_MAXIMOS),
  };
}
