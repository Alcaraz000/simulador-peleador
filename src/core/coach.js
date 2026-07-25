import { ENTRENADORES } from '../content/coaches.js';

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
 * Atributos base y aporte del entrenador, separados por clave, para que la
 * UI pueda mostrarlos distinto (ver panel-peleador.js: `63 +6`). El aporte
 * es un overlay: no está horneado en `jugador.atributos`, así que cambiar de
 * entrenador más adelante en la carrera no requiere reescribir los base.
 */
export function atributosConEntrenador(jugador) {
  const aporte = bonusDelEntrenador(jugador);
  const resultado = {};
  for (const [clave, valor] of Object.entries(jugador.atributos)) {
    resultado[clave] = { base: valor, aporte: aporte[clave] ?? 0 };
  }
  return resultado;
}
