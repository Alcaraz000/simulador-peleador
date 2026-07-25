import { crearRoster } from './roster.js';
import { mediaDe } from './fighter.js';
import { clamp } from './stats.js';
// `rankingDelJugador` (más abajo) es lo que habilita las peleas de título:
// sin ranking, el jugador nunca calificaría para disputar un cinturón.

export const EDAD_RETIRO = 40;
export const ANIO_INICIAL = 2026;

export function crearMundo(rng, { disciplina, categoria, cantidad = 10 }) {
  const roster = crearRoster(rng, { disciplina, categoria, cantidad });
  return {
    disciplina,
    categoria,
    roster,
    anio: ANIO_INICIAL,
    campeonId: roster[0]?.id ?? null,
    titulares: [],
  };
}

export function recalcularRankings(roster) {
  const activos = roster.filter((p) => !p.retirado).sort((a, b) => mediaDe(b) - mediaDe(a));
  const retirados = roster.filter((p) => p.retirado);
  activos.forEach((p, i) => { p.ranking = i + 1; });
  retirados.forEach((p) => { p.ranking = null; });
  return [...activos, ...retirados];
}

function clonarRoster(roster) {
  return roster.map((p) => ({
    ...p,
    atributos: { ...p.atributos },
    especiales: { ...p.especiales },
    estado: { ...p.estado },
    record: { ...p.record },
    titulos: [...p.titulos],
    staff: [...p.staff],
    lujos: [...p.lujos],
    historial: [...p.historial],
  }));
}

function declive(peleador, rng) {
  if (peleador.edad < 32) {
    if (rng.chance(0.5)) peleador.atributos.tecnica = clamp(peleador.atributos.tecnica + 1, 1, 99);
    if (rng.chance(0.4)) peleador.atributos.iq = clamp(peleador.atributos.iq + 1, 1, 99);
    return;
  }
  peleador.atributos.velocidad = clamp(peleador.atributos.velocidad - rng.int(1, 3), 1, 99);
  peleador.atributos.cardio = clamp(peleador.atributos.cardio - rng.int(0, 2), 1, 99);
}

export function avanzarMundo(mundo, rng, { aniosPasados = 1 } = {}) {
  const roster = clonarRoster(mundo.roster);
  const sucesos = [];
  let campeonId = mundo.campeonId;

  for (let anio = 0; anio < Math.max(1, Math.round(aniosPasados)); anio++) {
    for (const peleador of roster) {
      if (peleador.retirado || peleador.esJugador) continue;
      peleador.edad += 1;
      declive(peleador, rng);
      if (peleador.edad >= EDAD_RETIRO) {
        peleador.retirado = true;
        sucesos.push({
          tipo: 'retiro',
          peleadorId: peleador.id,
          texto: `${peleador.nombre} anuncia su retiro a los ${peleador.edad} años.`,
        });
      }
    }

    const activos = roster.filter((p) => !p.retirado && !p.esJugador);
    const mezclados = rng.shuffle(activos);
    for (let i = 0; i + 1 < mezclados.length; i += 2) {
      const a = mezclados[i];
      const b = mezclados[i + 1];
      const fuerza = mediaDe(a) - mediaDe(b);
      const probA = clamp(0.5 + fuerza * 0.02, 0.1, 0.9);
      const ganador = rng.chance(probA) ? a : b;
      const perdedor = ganador === a ? b : a;
      const porKo = rng.chance(0.35);
      ganador.record.v += 1;
      if (porKo) ganador.record.ko += 1; else ganador.record.dec += 1;
      perdedor.record.d += 1;
      sucesos.push({
        tipo: 'victoria',
        peleadorId: ganador.id,
        rivalId: perdedor.id,
        texto: porKo
          ? `${ganador.nombre} noqueó a ${perdedor.nombre}.`
          : `${ganador.nombre} le ganó por puntos a ${perdedor.nombre}.`,
      });
      if (perdedor.id === campeonId) {
        campeonId = ganador.id;
        ganador.titulos.push(`Título ${mundo.categoria}`);
        sucesos.push({
          tipo: 'titulo',
          peleadorId: ganador.id,
          rivalId: perdedor.id,
          texto: `¡${ganador.nombre} es el nuevo campeón: le arrebató el cinturón a ${perdedor.nombre}!`,
        });
      }
    }
  }

  const ordenado = recalcularRankings(roster);
  const campeonSigueActivo = ordenado.some((p) => p.id === campeonId && !p.retirado);
  if (!campeonSigueActivo) {
    const nuevo = ordenado.find((p) => !p.retirado);
    campeonId = nuevo ? nuevo.id : null;
    if (nuevo) {
      sucesos.push({
        tipo: 'titulo',
        peleadorId: nuevo.id,
        texto: `${nuevo.nombre} queda como campeón con el cinturón vacante.`,
      });
    }
  }

  return {
    mundo: {
      ...mundo,
      roster: ordenado,
      anio: mundo.anio + Math.round(aniosPasados),
      campeonId,
      titulares: [...mundo.titulares],
    },
    sucesos,
  };
}

/**
 * Ranking del jugador dentro de su categoría: cuántos activos del roster lo superan.
 * El jugador no vive en el roster, así que su puesto se calcula comparando MEDIA
 * y ajustando por su récord (ganar te acerca a la cima).
 */
export function rankingDelJugador(mundo, jugador) {
  const activos = mundo.roster.filter((p) => !p.retirado);
  if (activos.length === 0) return 1;
  const miMedia = mediaDe(jugador);
  const bonusRecord = jugador.record.v - jugador.record.d * 2;
  const puntaje = miMedia + clamp(bonusRecord, -12, 12);
  const mejores = activos.filter((p) => mediaDe(p) > puntaje).length;
  return clamp(mejores + 1, 1, activos.length + 1);
}

export function buscarRival(mundo, { excluirIds = [], rankingCerca = null } = {}) {
  const candidatos = mundo.roster.filter(
    (p) => !p.retirado && !p.esJugador && !excluirIds.includes(p.id),
  );
  if (candidatos.length === 0) return null;
  if (rankingCerca === null) return candidatos[0];
  return candidatos.reduce((mejor, actual) => {
    const distMejor = Math.abs((mejor.ranking ?? 99) - rankingCerca);
    const distActual = Math.abs((actual.ranking ?? 99) - rankingCerca);
    return distActual < distMejor ? actual : mejor;
  });
}
