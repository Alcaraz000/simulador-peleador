import { clamp } from './stats.js';

export const OBJETIVOS_POR_DEFECTO = 10;
export const MS_PERFECTO = 320;
export const MS_BIEN = 700;

// Rework visual (pedido textual: "que se parezca mucho más a lo que se
// ideó en el mockup"): la barra "Reflejos de la serie" de la UI necesita
// marcar EXACTAMENTE dónde arrancan los tramos "bien"/"perfecto" — se
// exportan acá para que sea un solo número de verdad, nunca uno adentro de
// resultadoSparring y otro copiado a mano en la UI que se puede desalinear.
export const UMBRAL_RATIO_BIEN = 0.5;
export const UMBRAL_RATIO_PERFECTO = 0.9;

export function crearSparring(rng, { jugador, objetivos = OBJETIVOS_POR_DEFECTO }) {
  const secuencia = [];
  for (let i = 0; i < objetivos; i++) secuencia.push(rng.int(0, 5));
  return {
    objetivos,
    secuencia,
    indice: 0,
    aciertos: 0,
    tiempos: [],
    // Racha de aciertos SEGUIDOS (mockup: "x7 COMBO"): un error la corta a
    // 0, distinto de `aciertos` que solo suma y nunca baja.
    racha: 0,
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
    racha: acerto ? sparring.racha + 1 : 0,
  };
  nuevo.terminado = nuevo.indice >= nuevo.objetivos;
  return nuevo;
}

export function promedioReaccion(sparring) {
  if (sparring.tiempos.length === 0) return 0;
  return Math.round(sparring.tiempos.reduce((a, b) => a + b, 0) / sparring.tiempos.length);
}

// Pedido v6 ("quiero que el timer sea por todo el juego, no solo por cada
// golpe"): el reloj de la UI (ui/screens/sparring.js) ya no es por pao, es
// uno solo para toda la sesión. Cuando se acaba, el minijuego tiene que
// cortar YA (no quedarse esperando el golpe que falta) — esta función marca
// `terminado` con lo que ya se acumuló hasta ese momento, sin tocar nada
// más: los golpes que sí llegaste a pegar siguen contando para
// `resultadoSparring` tal cual (ratio sobre `objetivos`, promedio sobre los
// tiempos ya registrados). Pura e idempotente: si ya estaba terminado (llegó
// a completar la secuencia un instante antes de que expire el reloj), no
// hace nada.
export function terminarPorTiempo(sparring) {
  if (sparring.terminado) return sparring;
  return { ...sparring, terminado: true };
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
// Pedido del usuario ("¿algún impacto real, subida de cardio temporal para
// esta pelea?"): sesión perfecta/buena, además del mod permanente de
// siempre, trae un `bonusTemporal` de cardio pensado para durar SOLO la
// próxima pelea (entrenaste fuerte para ESA, no para el resto de la
// carrera). Se calcula acá, puro y determinista — nada de Math.random, nada
// que dependa de un reloj — porque tiene que dar lo mismo si la partida se
// guarda a mitad de camino y se retoma.
//
// Dónde termina de aplicarse: main.js lo guarda en la partida al cerrar la
// sesión (`guardarBonusProximaPelea`) y lo gasta al armar el combate
// (`consumirBonusProximaPelea`, career.js), que devuelve un peleador con el
// cardio levantado SOLO para ese `crearPelea`. La pelea se arma entera con
// esos números —snapshot incluido, así que pega en la efectividad y en el
// desgaste por fatiga— y el envión no vuelve nunca a la ficha guardada.
export const BONUS_TEMPORAL_CARDIO = { perfecto: 8, bien: 4 };

// Techo del envión acumulado. Un campamento encadena varias sesiones antes de
// una misma pelea, así que sin tope tres sesiones perfectas valdrían +24 de
// cardio — +6 de media, más que cualquier tarjeta legendaria, por un
// minijuego que se puede repetir. Con el tope, entrenar bien todo el
// campamento vale exactamente lo que vale entrenar bien: el envión de una
// sesión perfecta, no tres apilados.
export const BONUS_TEMPORAL_MAXIMO = BONUS_TEMPORAL_CARDIO.perfecto;

// La recompensa permanente de agilidad, con nombre propio (no un literal
// suelto adentro de la función): la barra de tramos de la UI (mockup: las
// tres cajas "PERFECTO +4 AGI / BIEN +2 AGI / FLOJO NADA") la muestra ANTES
// de que termine la sesión, como vista previa de lo que se está por ganar —
// tiene que leer el mismo número que de verdad se va a aplicar, nunca uno
// copiado a mano aparte.
export const AGILIDAD_BONUS = { perfecto: 4, bien: 2 };

export function resultadoSparring(sparring, jugador) {
  const ratio = sparring.objetivos === 0 ? 0 : sparring.aciertos / sparring.objetivos;
  const promedio = promedioReaccion(sparring);

  if (ratio >= UMBRAL_RATIO_PERFECTO && promedio <= MS_PERFECTO) {
    return {
      nivel: 'perfecto',
      mods: { agilidad: AGILIDAD_BONUS.perfecto },
      bonusTemporal: { cardio: BONUS_TEMPORAL_CARDIO.perfecto },
      texto: `Sesión perfecta: ${sparring.aciertos}/${sparring.objetivos} y ${(promedio / 1000).toFixed(2)}s de reacción. El entrenador casi sonríe.`,
    };
  }
  if (ratio >= UMBRAL_RATIO_BIEN && promedio <= MS_BIEN) {
    return {
      nivel: 'bien',
      mods: { agilidad: AGILIDAD_BONUS.bien },
      bonusTemporal: { cardio: BONUS_TEMPORAL_CARDIO.bien },
      texto: `Buena sesión: ${sparring.aciertos}/${sparring.objetivos} y ${(promedio / 1000).toFixed(2)}s de reacción. Todavía te falta filo.`,
    };
  }
  return {
    nivel: 'flojo',
    mods: {},
    bonusTemporal: {},
    texto: `Sesión floja: ${sparring.aciertos}/${sparring.objetivos}. "Así en el ring te comen", te dice el entrenador.`,
  };
}
