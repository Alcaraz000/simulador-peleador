// Resumen de fin de año (pedido textual del usuario: "cada vez que termina un
// año calendario, quiero que aparezca un resumen de lo ocurrido y gráficos
// que muestren cómo fueron cambiando con los meses la media, [...] las
// decisiones tomadas y las peleas hechas").
//
// El dato no existía: nadie registraba la media mes a mes ni qué decisiones
// tomó el jugador. Este módulo agrega el registro MÍNIMO para reconstruir el
// resumen — nada de más:
//   - `muestrasMedia`: un punto {semana, media} cada vez que la media pudo
//     haber cambiado (mejora/evento/redes/sparring/campamento — ver
//     `registrarMuestraMedia`, llamada desde el único punto de main.js que
//     aplica esos efectos, aplicarEfectoYSeguir). Guarda la media YA
//     REDONDEADA a un decimal (no el jugador entero): es lo único que hace
//     falta para el gráfico, y mantiene el guardado liviano.
//   - `decisiones`: qué opción se eligió en cada tarjeta (mejora/evento/
//     redes/campamento) — nunca el texto completo de la carta, solo lo que
//     hace falta para la lista del resumen (tipo, título de la carta, opción
//     elegida, semana).
//   - Las PELEAS no se duplican: `jugador.historial`/`historialAmateur` ya
//     traen rival/fecha(semanaGlobal)/resultado/método por cada pelea (ver
//     aplicarResultado, offers.js) — `peleasDelAnio` solo filtra por año
//     usando el mismo calendario que ya existe (calendario.js), nunca
//     inventa un segundo sistema de fechas.
//
// Todo puro, nada de rng, todo serializable a JSON — mismo contrato que el
// resto de core/.
//
// v8 (pedido textual: "un gráfico nuevo, cómo escalaste en el ranking"): cada
// muestra ahora también trae el puesto del jugador en ESE momento, con el
// mismo criterio que la media (mismo evento, mismo punto en el tiempo — un
// solo array, no dos, para no duplicar `semana` y mantener el guardado
// liviano: un campo entero más por muestra, no una estructura paralela).
// `mundo` es opcional (default `null`): partidas guardadas de un esquema
// anterior a esta ronda, o algún llamador que todavía no tenga el mundo a
// mano, siguen registrando la media sin romper — el ranking de esa muestra
// queda en `null` en vez de reventar.
import { fechaDe } from './calendario.js';
import { mediaDe } from './fighter.js';
import { ANIO_INICIAL, rankingDelJugador } from './world.js';

const DECIMAL = 10;
function redondear(media) {
  return Math.round(media * DECIMAL) / DECIMAL;
}

function muestraDe(semanaGlobal, jugador, mundo) {
  return {
    semana: semanaGlobal,
    media: redondear(mediaDe(jugador)),
    ranking: mundo ? rankingDelJugador(mundo, jugador) : null,
  };
}

/** Abre el registro de un año nuevo: una primera muestra (la media/ranking
 * tal cual arranca el año, después de crecimiento/declive pasivos) y sin
 * decisiones todavía. */
export function iniciarRegistroAnio(semanaGlobal, jugador, mundo = null) {
  return {
    anio: fechaDe(semanaGlobal, ANIO_INICIAL).anio,
    muestrasMedia: [muestraDe(semanaGlobal, jugador, mundo)],
    decisiones: [],
  };
}

/** Suma una muestra de media (y ranking, si hay `mundo`) al registro del año
 * en curso. No hace nada (devuelve `registro` tal cual, incluso `null`) si no
 * hay registro abierto — red de seguridad para partidas guardadas de un
 * esquema anterior a esta ronda. */
export function registrarMuestraMedia(registro, semanaGlobal, jugador, mundo = null) {
  if (!registro) return registro;
  return {
    ...registro,
    muestrasMedia: [...registro.muestrasMedia, muestraDe(semanaGlobal, jugador, mundo)],
  };
}

/** Suma una decisión tomada (qué carta, qué opción, cuándo) al registro del
 * año en curso. Mismo resguardo que `registrarMuestraMedia`: sin registro
 * abierto, no hace nada. */
export function registrarDecision(registro, {
  tipo, titulo, opcion, semana,
}) {
  if (!registro) return registro;
  return {
    ...registro,
    decisiones: [...registro.decisiones, {
      tipo, titulo, opcion, semana,
    }],
  };
}

function conFecha(p) {
  return p.fecha !== null && p.fecha !== undefined;
}

/** Peleas (profesionales + amateur) del historial del jugador que cayeron
 * dentro de `anio`, ordenadas por fecha. Nunca duplica el historial: lo lee
 * y lo filtra, nada más — ver el comentario grande arriba. */
export function peleasDelAnio(jugador, anio) {
  const combinado = [...jugador.historial, ...(jugador.historialAmateur ?? [])];
  return combinado
    .filter((p) => conFecha(p) && fechaDe(p.fecha, ANIO_INICIAL).anio === anio)
    .sort((a, b) => a.fecha - b.fecha);
}

/** Un año sin NADA que contar (ni peleas ni decisiones) no amerita
 * interrumpir la partida con el resumen — pedido explícito: "un año sin
 * peleas ni hitos no necesita ceremonia".
 *
 * v12 (pedido textual: "quiero que el resumen aparezca en cada enero"):
 * antes exigía al menos una pelea — eso dejaba afuera años enteros (sobre
 * todo en juvenil/amateur, donde `probPelea` es bajo y muchos años no traen
 * ninguna oferta) que sí tuvieron actividad real del jugador. Relajado a
 * "peleas O decisiones": con la mejora garantizada de todos los bloques
 * (armarCola, career.js), en la práctica casi todos los años van a tener al
 * menos esa decisión, así que el resumen deja de ser la excepción (antes
 * 72% de los años) para ser casi la regla. Solo un año SIN NINGUNA decisión
 * Y sin ninguna pelea (un año "fantasma" que nunca llegó a tener su propio
 * registro abierto — ver `cerrarAniosCruzados`, career.js, para un salto de
 * calendario que cruza más de un año de una sola vez) sigue sin ceremonia:
 * la excepción rara, no la regla. */
export function anioTieneAlgoQueContar(registro, jugador) {
  if (!registro) return false;
  if (peleasDelAnio(jugador, registro.anio).length > 0) return true;
  return registro.decisiones.length > 0;
}
