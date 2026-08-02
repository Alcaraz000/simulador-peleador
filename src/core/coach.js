import { ENTRENADORES } from '../content/coaches.js';
import { clamp, LIMITES_ATRIBUTO } from './stats.js';
import { SENALES_TALENTO, DECISIONES_ANTES_DE_OPINAR } from '../content/senales-talento.js';
import { lecturaDeTalento } from './talento.js';
import { aplicarModificadores } from './stats.js';

/** Entrada cruda del catálogo (con `mods`) asociada a un estilo, o null. */
export function entrenadorDeEstilo(estiloId) {
  return ENTRENADORES.find((e) => e.estiloId === estiloId) ?? null;
}

// Contrato FIJO consumido por el tablero (ver entrenadorDe en
// src/ui/screens/panel-peleador.js): { nombre, iniciales, escuela, frase,
// aporte }. `aporte` es el aviso separado de los atributos base para que la
// UI lo pinte distinto (dorado, "+N" al lado del número).
export function crearEntrenadorDe(estiloId) {
  const entrenador = entrenadorDeEstilo(estiloId);
  if (!entrenador) return null;
  return {
    nombre: entrenador.nombre,
    iniciales: entrenador.iniciales,
    escuela: entrenador.escuela,
    frase: entrenador.frase,
    aporte: { ...entrenador.mods },
  };
}

/** Los mods que aporta el entrenador ACTUALMENTE adjunto al jugador (no muta nada). */
export function bonusDelEntrenador(jugador) {
  return { ...(jugador?.entrenador?.aporte ?? {}) };
}

/**
 * Atributos base (sin el entrenador) y aporte del entrenador, separados por
 * clave, para que la UI pueda mostrarlos distinto (ver panel-peleador.js:
 * `63 +6`, donde 69 = jugador.atributos[clave] es el valor EFECTIVO —el que
 * de verdad pelea—, 63 es el desglose de "cuánto tenías sin cuerpo técnico"
 * y 6 es el aporte). El aporte del entrenador está horneado en
 * `jugador.atributos` desde `crearPeleador` (igual que estilo/origen/apodo):
 * no es un overlay aparte, porque la pelea, el ranking y las ofertas leen
 * `jugador.atributos` directo — un valor "efectivo" que viviera solo acá
 * se desincroniza en cuanto alguien se olvide de sumarlo (mismo bug de
 * "staff que no hace nada" que tuvo la v1).
 *
 * Invariante: para toda clave, `base + aporte === jugador.atributos[clave]`.
 */
export function atributosConEntrenador(jugador) {
  const aporte = bonusDelEntrenador(jugador);
  const resultado = {};
  for (const [clave, valor] of Object.entries(jugador.atributos)) {
    const aporteClave = aporte[clave] ?? 0;
    // `valor` ya viene clampeado a 1-99, así que restarle un aporte NEGATIVO
    // daba una base fuera de rango: con la defensa en el tope y un entrenador
    // que resta 2, el tablero mostraba 101. La base se clampea igual que el
    // atributo, y el aporte se recalcula sobre ella para que la invariante
    // `base + aporte === atributos[clave]` siga siendo cierta.
    const base = clamp(valor - aporteClave, LIMITES_ATRIBUTO.min, LIMITES_ATRIBUTO.max);
    resultado[clave] = { base, aporte: valor - base };
  }
  return resultado;
}

/**
 * Reemplaza el entrenador del jugador: resta el aporte del que tenía puesto
 * y suma el del nuevo, directo sobre `jugador.atributos` (no muta el
 * jugador original). Todavía nadie la llama desde el resto del juego —
 * queda lista para cuando se pueda fichar un entrenador nuevo más adelante
 * en la carrera (staff/tienda)— pero ya funciona y está testeada: cambiar
 * de entrenador tiene que mover los números de verdad, no solo el cartel.
 */
export function cambiarEntrenador(jugador, nuevoEntrenador) {
  const aporteViejo = bonusDelEntrenador(jugador);
  const aporteNuevo = nuevoEntrenador?.aporte ?? {};

  const restar = {};
  for (const [clave, valor] of Object.entries(aporteViejo)) {
    if (clave in jugador.atributos) restar[clave] = -valor;
  }
  const sinAporteViejo = aplicarModificadores(jugador.atributos, restar).resultado;

  const sumar = {};
  for (const [clave, valor] of Object.entries(aporteNuevo)) {
    if (clave in sinAporteViejo) sumar[clave] = valor;
  }
  const atributos = aplicarModificadores(sinAporteViejo, sumar).resultado;

  return { ...jugador, atributos, entrenador: nuevoEntrenador ?? null };
}

// ---- Señales de talento (v13) ------------------------------------------

/**
 * La frase con la que el entrenador deja intuir el talento del peleador.
 * Devuelve `null` mientras no haya con qué opinar (menos de
 * DECISIONES_ANTES_DE_OPINAR decisiones tomadas): cantar el talento en el
 * minuto uno le sacaría toda la gracia al descubrimiento.
 *
 * Determinista, sin rng: dos partidas idénticas dan la misma señal, y no
 * consume tiradas de la secuencia compartida (correrla descalibraría el
 * ritmo de toda la carrera — ver el comentario de ETAPAS en career.js).
 *
 * NUNCA devuelve un número: el jugador lo intuye, no lo lee.
 */
export function senalDeTalento(jugador, decisionesTomadas = 0) {
  if (decisionesTomadas < DECISIONES_ANTES_DE_OPINAR) return null;
  const familia = SENALES_TALENTO[lecturaDeTalento(jugador)] ?? SENALES_TALENTO.normal;
  return familia[decisionesTomadas % familia.length];
}
