// El talento de un peleador: cuánto le rinde entrenar y cuándo llega a su
// mejor momento. Es la palanca principal de rejugabilidad (spec v13): a uno
// le toca un cuerpo que aprende solo y a otro uno que hay que empujar, y esa
// diferencia es lo que hace que dos partidas se sientan distintas.
//
// NADA de esto se muestra nunca como número. El jugador lo intuye por las
// señales que le tira el entrenador (senalDeTalento, coach.js) y, sobre
// todo, por lo que ve arriba del ring.

import { clamp } from './stats.js';

// El grueso de los peleadores rinde cerca de lo normal; los cracks y los que
// no dan son las colas. Se sortea sumando tres tiradas y promediando: eso
// genera una campana (teorema central del límite en versión barata) en vez
// de un uniforme, donde un techo extremo sería tan común como uno normal.
export const TECHO_MIN = 0.2;
export const TECHO_MAX = 1.3;

const CURVAS = ['temprana', 'normal', 'tardia'];

// Cuándo está cada curva en su mejor momento de aprendizaje. El temprano
// exprime la juventud y se apaga antes; el tardío tarda en arrancar pero
// sigue creciendo cuando los otros ya bajaron.
const PICO_POR_CURVA = { temprana: 21, normal: 25, tardia: 30 };

// Qué tan rápido cae el rendimiento al alejarse del pico. Más chico = curva
// más plana (rinde parecido a cualquier edad); más grande = más marcada.
const ANCHO_CURVA = 11;

export function sortearTalento(rng) {
  const bruto = (rng.next() + rng.next() + rng.next()) / 3;
  const techo = TECHO_MIN + bruto * (TECHO_MAX - TECHO_MIN);
  const curva = CURVAS[rng.int(0, CURVAS.length - 1)];
  return { techo: Math.round(techo * 100) / 100, curva };
}

/**
 * Cuánto rinde una mejora para este peleador a esta edad: el techo (fijo de
 * por vida) por el factor de la curva (que depende de qué tan cerca está de
 * su pico). Devuelve un multiplicador que se aplica a los mods POSITIVOS de
 * una carta — nunca a los negativos, porque que el talento te salve de tus
 * propias malas decisiones sería raro (ver aplicarCarta, cards.js).
 */
export function rendimientoDeMejora(jugador, edad = jugador?.edad ?? 25) {
  const talento = jugador?.talento;
  if (!talento) return 1;
  const pico = PICO_POR_CURVA[talento.curva] ?? PICO_POR_CURVA.normal;
  const distancia = Math.abs(edad - pico);
  const factorCurva = clamp(1.15 - (distancia / ANCHO_CURVA) * 0.5, 0.55, 1.15);
  // Bloque 6 ("que el talento pese más"): el piso/techo de acá abajo eran
  // 0.35/1.6 — con TECHO_MIN/TECHO_MAX en 0.7/1.3 (rango viejo), el peor caso
  // posible (0.7*0.55=0.385) ya caía casi encima del piso de 0.35: ensanchar
  // solo TECHO_MIN/TECHO_MAX no cambiaba nada en la práctica, el clamp de
  // ACÁ absorbía toda la diferencia. Ensanchado a juego con el rango nuevo
  // (0.4-1.6 de techo): un peleador realmente flojo, lejos de su pico, rinde
  // de verdad menos de la mitad de uno normal (0.18) — y uno con suerte
  // extrema, en su pico, rinde casi el doble (1.84).
  return clamp(talento.techo * factorCurva, 0.12, 2.0);
}

/**
 * Cómo se lee este talento, para elegir qué familia de frases le toca al
 * entrenador. Nunca expone el número.
 */
export function lecturaDeTalento(jugador) {
  const techo = jugador?.talento?.techo ?? 1;
  if (techo >= 1.12) return 'alto';
  if (techo <= 0.88) return 'bajo';
  return 'normal';
}
