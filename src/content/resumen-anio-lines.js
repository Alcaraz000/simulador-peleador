// Crónica del resumen de fin de año (v7, pedido textual del usuario: "un
// resumen de lo ocurrido"). Voz de crónica de box, español rioplatense —
// mismo criterio que POOLS_TRAMITE (tramite-lines.js): plantillas cortas con
// placeholders, elegidas con el rng COSMÉTICO de main.js (nunca el rng
// compartido de la carrera: esto es sabor, no una decisión de juego).
//
// Categorías (mismo criterio que `resumenLote`, tramite.js, aplicado a TODAS
// las peleas del año, no solo las de trámite): 'perfecta' (todas ganadas),
// 'derrotas' (todas perdidas), 'mixta' (de las dos), y los casos de una sola
// pelea aparte (unaGanada/unaPerdida/unaEmpatada) para no sonar grandilocuente
// con una sola victoria. Placeholders: {record} ("3-1"), {ko} (frase corta
// sobre nocauts, puede venir vacía).
export const POOL_RESUMEN_ANIO = {
  perfecta: [
    'Año redondo arriba del ring: {record}{ko}. Nadie te paró.',
    '{record} sin ceder una sola vez{ko}. Un año para enmarcar.',
    'De punta a punta, {record}{ko}. El rincón no podía pedir más.',
  ],
  derrotas: [
    'Año duro: {record}. Tocó levantarse más de una vez.',
    '{record}. Ninguna noche fácil, pero la carrera sigue.',
    'Se hizo cuesta arriba: {record}. Ahora a reconstruir.',
  ],
  mixta: [
    'Año parejo: {record}{ko}. De todo un poco, como cualquier carrera de verdad.',
    '{record}{ko}. Hubo noches buenas y otras para el olvido.',
    'Altibajos: {record}{ko}. Así se construye un récord de verdad.',
  ],
  unaGanada: [
    'Una sola pelea, y se ganó{ko}. Poco ruido, buen resultado.',
    'Año corto pero efectivo: la única pelea terminó en victoria{ko}.',
  ],
  unaPerdida: [
    'Una sola pelea, y se perdió. Año para el olvido, arriba se sigue.',
    'Poca actividad y encima una derrota. A remontar el año que viene.',
  ],
  unaEmpatada: [
    'Una sola pelea, y quedó en tablas. Ni gloria ni derrota.',
  ],
};

function koTexto(kos, victorias) {
  if (kos === 0 || victorias === 0) return '';
  if (kos === victorias) return ', todas por nocaut';
  if (kos === 1) return ', una por nocaut';
  return `, ${kos} por nocaut`;
}

function rellenar(plantilla, datos) {
  return plantilla.replace(/\{(\w+)\}/g, (_, clave) => String(datos[clave] ?? ''));
}

/**
 * Compone la crónica del año a partir de las peleas ya resueltas (mismo
 * formato que jugador.historial: {resultado:'v'|'d'|'e', metodo}). `rng` es
 * SIEMPRE el cosmético de main.js (nunca el de la carrera — ver el comentario
 * grande arriba). Si `peleas` viene vacío, devuelve un texto neutro — v12:
 * esto SÍ pasa ahora en el uso normal (`anioTieneAlgoQueContar`,
 * year-summary.js, se relajó a "peleas O decisiones": un año con la mejora
 * obligatoria pero sin ninguna pelea firmada igual dispara el beat
 * 'resumenAnio'), no solo como resguardo defensivo.
 */
export function textoResumenAnio(rng, { peleas }) {
  if (peleas.length === 0) return 'Año tranquilo, sin nada para el cronista.';

  const victorias = peleas.filter((p) => p.resultado === 'v').length;
  const derrotas = peleas.filter((p) => p.resultado === 'd').length;
  const empates = peleas.length - victorias - derrotas;
  const kos = peleas.filter((p) => p.resultado === 'v' && (p.metodo === 'ko' || p.metodo === 'tko')).length;

  let categoria;
  if (peleas.length === 1) {
    categoria = victorias === 1 ? 'unaGanada' : derrotas === 1 ? 'unaPerdida' : 'unaEmpatada';
  } else if (derrotas === 0 && empates === 0) {
    categoria = 'perfecta';
  } else if (victorias === 0 && empates === 0) {
    categoria = 'derrotas';
  } else {
    categoria = 'mixta';
  }

  const record = empates > 0 ? `${victorias}-${derrotas}-${empates}` : `${victorias}-${derrotas}`;
  const pool = POOL_RESUMEN_ANIO[categoria];
  return rellenar(rng.pick(pool), { record, ko: koTexto(kos, victorias) });
}
