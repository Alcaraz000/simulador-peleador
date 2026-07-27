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
import { fechaDe } from './calendario.js';
import { mediaDe } from './fighter.js';
import { ANIO_INICIAL } from './world.js';

const DECIMAL = 10;
function redondear(media) {
  return Math.round(media * DECIMAL) / DECIMAL;
}

function muestraDe(semanaGlobal, jugador) {
  return { semana: semanaGlobal, media: redondear(mediaDe(jugador)) };
}

/** Abre el registro de un año nuevo: una primera muestra (la media tal cual
 * arranca el año, después de crecimiento/declive pasivos) y sin decisiones
 * todavía. */
export function iniciarRegistroAnio(semanaGlobal, jugador) {
  return {
    anio: fechaDe(semanaGlobal, ANIO_INICIAL).anio,
    muestrasMedia: [muestraDe(semanaGlobal, jugador)],
    decisiones: [],
  };
}

/** Suma una muestra de media al registro del año en curso. No hace nada
 * (devuelve `registro` tal cual, incluso `null`) si no hay registro abierto —
 * red de seguridad para partidas guardadas de un esquema anterior a esta
 * ronda. */
export function registrarMuestraMedia(registro, semanaGlobal, jugador) {
  if (!registro) return registro;
  return {
    ...registro,
    muestrasMedia: [...registro.muestrasMedia, muestraDe(semanaGlobal, jugador)],
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

/** Un año sin ninguna pelea (profesional o amateur) no amerita interrumpir
 * la partida con el resumen — pedido explícito: "un año sin peleas ni hitos
 * no necesita ceremonia". La mejora obligatoria de todos los bloques no
 * cuenta por sí sola: sin esto, TODOS los años (incluso los años quietos de
 * juvenil/amateur) dispararían el resumen. */
export function anioTieneAlgoQueContar(registro, jugador) {
  if (!registro) return false;
  return peleasDelAnio(jugador, registro.anio).length > 0;
}
