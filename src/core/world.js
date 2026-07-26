import { crearRoster, generarDebutantes } from './roster.js';
import { mediaDe, recordTexto } from './fighter.js';
import { clamp } from './stats.js';
// `rankingDelJugador` (más abajo) es lo que habilita las peleas de título:
// sin ranking, el jugador nunca calificaría para disputar un cinturón.

export const EDAD_RETIRO = 40;
export const ANIO_INICIAL = 2026;

// Cuántos de los activos son "la parte alta de la tabla" (ver avanzarMundo):
// sus peleas entre sí SÍ generan noticia; el resto de la categoría igual
// pelea y su récord igual se actualiza, pero sin ensuciar el feed. Coincide
// a propósito con el rankingMax más generoso de CINTURONES (offers.js,
// "Cinturón regional"): es la misma "parte alta" que le importa al jugador.
export const TAMANO_ELITE = 20;

export function crearMundo(rng, { disciplina, categoria, cantidad = 10, apodosReservados = [] }) {
  const roster = crearRoster(rng, { disciplina, categoria, cantidad, apodosReservados });
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
    recordAmateur: { ...(p.recordAmateur ?? { v: 0, d: 0, e: 0, ko: 0, sub: 0, dec: 0 }) },
    titulos: [...p.titulos],
    staff: [...p.staff],
    lujos: [...p.lujos],
    historial: [...p.historial],
    historialAmateur: [...(p.historialAmateur ?? [])],
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

/**
 * Avanza el mundo un bloque de carrera.
 *
 * `anio` permite que quien llama imponga el año del calendario. La carrera lo
 * usa siempre: los bloques duran 1 a 1.3 años, así que acumular años enteros
 * acá haría que el mundo se atrasara varios años respecto del calendario y de
 * la edad del jugador. Sin `anio` se cae al conteo propio (útil en tests del
 * mundo aislado). El envejecimiento del roster sigue yendo por `aniosPasados`.
 */
export function avanzarMundo(mundo, rng, { aniosPasados = 1, jugadorEsCampeon = false, anio = null } = {}) {
  const roster = clonarRoster(mundo.roster);
  const sucesos = [];
  let campeonId = mundo.campeonId;

  for (let anio = 0; anio < Math.max(1, Math.round(aniosPasados)); anio++) {
    let retirosEsteAnio = 0;
    for (const peleador of roster) {
      if (peleador.retirado || peleador.esJugador) continue;
      peleador.edad += 1;
      declive(peleador, rng);
      if (peleador.edad >= EDAD_RETIRO) {
        peleador.retirado = true;
        retirosEsteAnio += 1;
        sucesos.push({
          tipo: 'retiro',
          peleadorId: peleador.id,
          texto: `${peleador.nombre} anuncia su retiro a los ${peleador.edad} años.`,
        });
      }
    }

    // Pedido 2 (v6, "el ranking se achica solo... tienen que ir apareciendo
    // nuevos"): cada retiro se repone con un debutante (promesa joven y
    // floja, ver generarDebutantes en roster.js) para que la categoría no se
    // vaya vaciando con los años — el mundo tiene que sentirse vivo, no una
    // cuenta regresiva. `existente` es el roster COMPLETO (activos y
    // retirados): un nombre/apodo que ya se usó no vuelve a aparecer, ni
    // siquiera si el original ya colgó los guantes.
    if (retirosEsteAnio > 0) {
      const debutantes = generarDebutantes(rng, {
        disciplina: mundo.disciplina,
        categoria: mundo.categoria,
        cantidad: retirosEsteAnio,
        existente: roster,
      });
      for (const debutante of debutantes) {
        roster.push(debutante);
        sucesos.push({
          tipo: 'debut',
          peleadorId: debutante.id,
          texto: debutante.apodo
            ? `Debuta "${debutante.apodo}" ${debutante.nombre}: una cara nueva en la categoría.`
            : `Debuta ${debutante.nombre}: una cara nueva en la categoría.`,
        });
      }
    }

    const activos = roster.filter((p) => !p.retirado && !p.esJugador);
    // Pedido 1 (v6, "cuidá el rendimiento... simular en detalle solo la
    // parte alta de la tabla y resolver el resto de forma más barata"): con
    // 100 activos, cada año arma ~50 pares — generar una noticia por CADA
    // uno inundaba el feed (cap de 30, ver agregarNoticias en news.js) en un
    // solo bloque, algo que nunca pasaba con 12 rivales (~6 pares). El
    // resultado (récord, KO/decisión, título si corresponde) se sigue
    // resolviendo IGUAL para todos los pares — nadie deja de "vivir" ni de
    // subir su récord —; lo que se recorta es la noticia de "fulano le ganó
    // a mengano", que solo se emite si alguno de los dos está entre los
    // TAMANO_ELITE mejores del momento (la parte alta de la tabla es la que
    // de verdad le importa al jugador: rivales de título, futuros
    // adversarios cercanos a su propio puesto).
    const elite = new Set(
      [...activos].sort((x, y) => mediaDe(y) - mediaDe(x)).slice(0, TAMANO_ELITE).map((p) => p.id),
    );
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
      if (elite.has(a.id) || elite.has(b.id)) {
        sucesos.push({
          tipo: 'victoria',
          peleadorId: ganador.id,
          rivalId: perdedor.id,
          texto: porKo
            ? `${ganador.nombre} noqueó a ${perdedor.nombre}.`
            : `${ganador.nombre} le ganó por puntos a ${perdedor.nombre}.`,
        });
      }
      // Mientras el jugador tiene puesto el cinturón mundial, el mundo no
      // corona a nadie más: campeonId sigue apuntando a lo que apuntaba antes
      // (no importa, no se muestra en ningún lado) y no se emite el suceso
      // que el feed de noticias convertiría en "¡X es el nuevo campeón!".
      if (!jugadorEsCampeon && perdedor.id === campeonId) {
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
  // Misma razón: si el jugador es el campeón, no hay vacante que declarar
  // aunque el NPC que ocupaba campeonId se haya retirado en este avance.
  if (!jugadorEsCampeon) {
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
  }

  return {
    mundo: {
      ...mundo,
      roster: ordenado,
      anio: anio ?? mundo.anio + Math.round(aniosPasados),
      campeonId,
      titulares: [...mundo.titulares],
    },
    sucesos,
  };
}

// Fracción de los activos que define el tope del bono de récord (ver más
// abajo): con 12 rivales (v5) daría ~4, muy por debajo del piso de 12 que ya
// tenía el juego, así que `Math.max` deja ese piso viejo intacto para
// rosters chicos (los que ya usan varios tests) y solo escala hacia arriba
// con rosters grandes.
const FRACCION_TOPE_BONUS_RECORD = 0.3;
const TOPE_BONUS_RECORD_MINIMO = 12;

/**
 * Ranking del jugador dentro de su categoría: cuántos activos del roster lo
 * superan. El jugador no vive en el roster, así que su puesto se calcula
 * comparando MEDIA y ajustando por su récord (ganar te acerca a la cima,
 * perder te aleja).
 *
 * Pedido 1 (v6, "escalar tiene que costar y ser volátil"): con 12 rivales el
 * bono de récord tenía un tope fijo de ±12 — cubría casi toda la tabla. Con
 * el roster de 100 (la "montaña") ese mismo tope apenas corre un escalón en
 * una tabla mucho más densa, así que deja de sentirse ganado. El tope ahora
 * escala con la cantidad de activos (`FRACCION_TOPE_BONUS_RECORD`), sin bajar
 * nunca del piso de 12 que ya tenía el juego: una racha sostenida de verdad
 * (ganar mucho, o perder mucho) mueve el puesto en proporción al tamaño real
 * de la categoría, sea de 12 o de 100.
 */
export function rankingDelJugador(mundo, jugador) {
  const activos = mundo.roster.filter((p) => !p.retirado);
  if (activos.length === 0) return 1;
  const miMedia = mediaDe(jugador);
  const bonusRecord = jugador.record.v - jugador.record.d * 2;
  const tope = Math.max(TOPE_BONUS_RECORD_MINIMO, Math.round(activos.length * FRACCION_TOPE_BONUS_RECORD));
  const puntaje = miMedia + clamp(bonusRecord, -tope, tope);
  const mejores = activos.filter((p) => mediaDe(p) > puntaje).length;
  return clamp(mejores + 1, 1, activos.length + 1);
}

function filaDe(peleador, esJugador) {
  return {
    id: peleador.id,
    nombre: peleador.nombre,
    apodo: peleador.apodo,
    nacionalidad: peleador.nacionalidad,
    media: mediaDe(peleador),
    record: recordTexto(peleador),
    esJugador,
  };
}

/**
 * Tabla de posiciones completa: el roster activo (sin retirados, igual que
 * `buscarRival` — así los mismos nombres que ofrece una pelea son los que
 * aparecen acá) con el jugador insertado en su puesto real, calculado con
 * `rankingDelJugador`. Pura y no muta ni `mundo` ni `jugador`: arma listas
 * nuevas en cada llamada.
 */
export function tablaRanking(mundo, jugador) {
  const activos = [...mundo.roster]
    .filter((p) => !p.retirado)
    .sort((a, b) => mediaDe(b) - mediaDe(a));

  const filas = activos.map((p) => filaDe(p, false));
  const miPuesto = rankingDelJugador(mundo, jugador);
  filas.splice(clamp(miPuesto - 1, 0, filas.length), 0, filaDe(jugador, true));

  return filas.map((fila, indice) => ({ ...fila, ranking: indice + 1 }));
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
