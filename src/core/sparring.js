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

// Bug reportado por el usuario: "el minijuego de sparring, ¿tiene algún
// efecto? No parece". La causa real tenía dos partes:
//
// 1) `MS_BIEN` estaba definida y exportada pero ninguna rama de acá abajo la
//    usaba: con ratio>=0.5 alcanzaba "bien" sin importar la velocidad de
//    reacción. Sumado a que la UI (sparring.js) no tenía ningún límite de
//    tiempo por golpe (bug del timer, ver ese fix), un pao podía quedar
//    prendido para siempre — CUALQUIER sesión, jugada con la paciencia que
//    sea, terminaba en "bien" (el nivel "flojo", que no da ningún mod, era
//    casi inalcanzable). El resultado SÍ se aplicaba (ver beatSparring en
//    main.js), pero era el mismo +1 de siempre, jugaras bien o mal.
// 2) Aun aplicado, +1 a un solo atributo es un cambio tan chico que se pierde
//    contra el resto del juego (una carta de mejora normal mueve 3-6 puntos).
//    "Bien" ahora exige de verdad reaccionar rápido (promedio <= MS_BIEN,
//    igual que "perfecto" exige <= MS_PERFECTO) y ambos niveles alcanzables
//    reparten una recompensa que se nota.
export function resultadoSparring(sparring, jugador) {
  const ratio = sparring.objetivos === 0 ? 0 : sparring.aciertos / sparring.objetivos;
  const promedio = promedioReaccion(sparring);

  if (ratio >= 0.9 && promedio <= MS_PERFECTO) {
    return {
      nivel: 'perfecto',
      mods: { velocidad: 3, forma: 4 },
      texto: `Sesión perfecta: ${sparring.aciertos}/${sparring.objetivos} y ${(promedio / 1000).toFixed(2)}s de reacción. El entrenador casi sonríe.`,
    };
  }
  if (ratio >= 0.5 && promedio <= MS_BIEN) {
    return {
      nivel: 'bien',
      mods: { velocidad: 2 },
      texto: `Buena sesión: ${sparring.aciertos}/${sparring.objetivos} y ${(promedio / 1000).toFixed(2)}s de reacción. Todavía te falta filo.`,
    };
  }
  return {
    nivel: 'flojo',
    mods: {},
    texto: `Sesión floja: ${sparring.aciertos}/${sparring.objetivos}. "Así en el ring te comen", te dice el entrenador.`,
  };
}
