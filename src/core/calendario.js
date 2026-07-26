// Traduce el avance de la carrera (bloques que representan ~1 a ~1.3 años,
// ver ETAPAS en career.js) a semanas y meses, para que el tablero siempre
// pueda mostrarle al jugador en qué momento del calendario está y cuánto
// falta para la próxima pelea. `semanaGlobal` es la unidad de tiempo interna
// de la partida (1-indexada); todo lo demás se deriva de ella.

export const SEMANAS_POR_ANIO = 52;

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// Límite (semana del año, 0-indexada) en la que arranca cada mes. Se calcula
// repartiendo las 52 semanas en 12 meses de ~4.33 semanas: la mayoría de 4,
// algunos de 5, sin superposiciones ni huecos (suman exactamente 52).
const LIMITES_MES = Array.from(
  { length: 13 },
  (_, mes) => Math.floor((mes * SEMANAS_POR_ANIO) / 12),
);

function mesDeSemanaDelAnio(semanaDelAnio) {
  for (let mes = 11; mes >= 0; mes -= 1) {
    if (semanaDelAnio >= LIMITES_MES[mes]) return mes;
  }
  return 0;
}

/**
 * @param {number} semanaGlobal - 1-indexada: la semana 1 es el arranque de la carrera.
 * @param {number} anioInicial
 * @returns {{anio:number, mes:number, nombreMes:string, semanaDelMes:number, texto:string}}
 */
export function fechaDe(semanaGlobal, anioInicial) {
  const totalSemanas = Math.max(0, Math.round(semanaGlobal) - 1);
  const anio = anioInicial + Math.floor(totalSemanas / SEMANAS_POR_ANIO);
  const semanaDelAnio = totalSemanas % SEMANAS_POR_ANIO;
  const mesIndice = mesDeSemanaDelAnio(semanaDelAnio);
  const semanaDelMes = semanaDelAnio - LIMITES_MES[mesIndice] + 1;
  const nombreMes = NOMBRES_MES[mesIndice];

  return {
    anio,
    mes: mesIndice + 1,
    nombreMes,
    semanaDelMes,
    texto: `${nombreMes} ${anio} · Semana ${semanaDelMes}`,
  };
}

/** Cuántas semanas representa un bloque de carrera, dado sus años por bloque. */
export function semanasDeBloque(aniosPorBloque) {
  return Math.round(aniosPorBloque * SEMANAS_POR_ANIO);
}

/**
 * Cuántas semanas faltan para la próxima pelea firmada. `null` si todavía no
 * hay ninguna pelea firmada (partida.proximaPelea) — una oferta sin aceptar
 * no cuenta, aunque ya esté armada internamente (ver ofertaPendiente en
 * career.js).
 */
export function semanasHastaPelea(partida) {
  if (!partida.proximaPelea) return null;
  return Math.max(0, partida.proximaPelea.semanaObjetivo - partida.semanaGlobal);
}
