import { clamp } from './stats.js';

export const OBJETIVOS_POR_DEFECTO = 10;
export const MS_PERFECTO = 320;
export const MS_BIEN = 700;

export function crearSparring(rng, { jugador, objetivos = OBJETIVOS_POR_DEFECTO }) {
  const secuencia = [];
  for (let i = 0; i < objetivos; i++) secuencia.push(rng.int(0, 5));
  return {
    objetivos,
    secuencia,
    indice: 0,
    aciertos: 0,
    tiempos: [],
    terminado: false,
    atributoObjetivo: jugador.disciplina === 'mma' ? 'velocidad' : 'velocidad',
  };
}

export function registrarGolpe(sparring, { acerto, ms }) {
  if (sparring.terminado) return sparring;
  const nuevo = {
    ...sparring,
    indice: sparring.indice + 1,
    aciertos: sparring.aciertos + (acerto ? 1 : 0),
    tiempos: [...sparring.tiempos, ms],
  };
  nuevo.terminado = nuevo.indice >= nuevo.objetivos;
  return nuevo;
}

export function promedioReaccion(sparring) {
  if (sparring.tiempos.length === 0) return 0;
  return Math.round(sparring.tiempos.reduce((a, b) => a + b, 0) / sparring.tiempos.length);
}

export function resultadoSparring(sparring, jugador) {
  const ratio = sparring.objetivos === 0 ? 0 : sparring.aciertos / sparring.objetivos;
  const promedio = promedioReaccion(sparring);

  if (ratio >= 0.9 && promedio <= MS_PERFECTO) {
    return {
      nivel: 'perfecto',
      mods: { velocidad: 2, forma: 3 },
      texto: `Sesión perfecta: ${sparring.aciertos}/${sparring.objetivos} y ${(promedio / 1000).toFixed(2)}s de reacción. Don Pepe casi sonríe.`,
    };
  }
  if (ratio >= 0.5) {
    return {
      nivel: 'bien',
      mods: { velocidad: 1 },
      texto: `Buena sesión: ${sparring.aciertos}/${sparring.objetivos}. Todavía te falta filo.`,
    };
  }
  return {
    nivel: 'flojo',
    mods: {},
    texto: `Sesión floja: ${sparring.aciertos}/${sparring.objetivos}. "Así en el ring te comen", te dice el entrenador.`,
  };
}
