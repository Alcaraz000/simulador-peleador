import { ETAPAS } from './career.js';

// v6, segunda vuelta ("las peleas amateur no cuentan ni en el ranking ni en
// el historial"): "Debutaste a los X" en la pantalla de legado (ver
// legacy.js) tiene que hablar del debut PROFESIONAL (21 años, ver
// ETAPAS.profesional.edadDesde en career.js) — no de EDAD_INICIAL (15, el
// arranque del personaje en juvenil), que era lo que se mostraba antes de
// esta ronda. `jugador.historial` (de acá en más, pro-only) ya reflejaba
// solo lo profesional; el rótulo de la edad de debut se quedó atrás.
const EDAD_DEBUT_PROFESIONAL = ETAPAS.find((e) => e.id === 'profesional').edadDesde;

export function rachaActual(historial) {
  let racha = 0;
  for (let i = historial.length - 1; i >= 0; i--) {
    if (historial[i].resultado !== 'v') break;
    racha += 1;
  }
  return racha;
}

function rachaMasLargaDe(historial) {
  let mejor = 0;
  let actual = 0;
  for (const pelea of historial) {
    if (pelea.resultado === 'v') {
      actual += 1;
      mejor = Math.max(mejor, actual);
    } else {
      actual = 0;
    }
  }
  return mejor;
}

// Pedido 3 (v7, "también mostrá la 'racha de victorias' más larga... y la
// 'racha de derrotas' también" en la pantalla final): mismo criterio que
// rachaMasLargaDe (arriba), pero contando derrotas consecutivas — un empate
// corta la racha de derrotas igual que corta la de victorias.
function rachaDerrotasMasLargaDe(historial) {
  let mejor = 0;
  let actual = 0;
  for (const pelea of historial) {
    if (pelea.resultado === 'd') {
      actual += 1;
      mejor = Math.max(mejor, actual);
    } else {
      actual = 0;
    }
  }
  return mejor;
}

export function estadisticasDeCarrera(partida) {
  const { jugador } = partida;
  const historial = jugador.historial ?? [];
  const victorias = historial.filter((p) => p.resultado === 'v');
  const derrotas = historial.filter((p) => p.resultado === 'd');
  const empates = historial.filter((p) => p.resultado === 'e');
  const porKO = victorias.filter((p) => p.metodo === 'ko' || p.metodo === 'tko');
  const roundsPeleados = historial.reduce((a, p) => a + (p.round ?? 0), 0);

  const rivalMasDuro = historial.reduce((mejor, p) => {
    if (typeof p.rivalMedia !== 'number') return mejor;
    if (!mejor || p.rivalMedia > mejor.rivalMedia) return p;
    return mejor;
  }, null);

  // Task 6.2 (cierre de carrera): "rivalMasDuro" de arriba cuenta cualquier
  // pelea, ganada o perdida — sirve para "el más difícil que enfrentaste".
  // El cierre necesita algo distinto: el más duro al que le GANASTE, para la
  // frase "venció a alguien grande". Enfrentar a un crack y perder no es lo
  // mismo que vencerlo.
  const mejorVictoria = historial.reduce((mejor, p) => {
    if (p.resultado !== 'v' || typeof p.rivalMedia !== 'number') return mejor;
    if (!mejor || p.rivalMedia > mejor.rivalMedia) return p;
    return mejor;
  }, null);

  return {
    peleas: historial.length,
    victorias: victorias.length,
    derrotas: derrotas.length,
    empates: empates.length,
    porcentajeKO: victorias.length === 0 ? 0 : Math.round((porKO.length / victorias.length) * 100),
    rachaActual: rachaActual(historial),
    rachaMasLarga: rachaMasLargaDe(historial),
    rachaDerrotasMasLarga: rachaDerrotasMasLargaDe(historial),
    rivalMasDuro: rivalMasDuro
      ? { nombre: rivalMasDuro.rivalNombre, apodo: rivalMasDuro.rivalApodo, media: rivalMasDuro.rivalMedia }
      : null,
    mejorVictoria: mejorVictoria
      ? { nombre: mejorVictoria.rivalNombre, apodo: mejorVictoria.rivalApodo, media: mejorVictoria.rivalMedia }
      : null,
    bolsaMayor: historial.reduce((a, p) => Math.max(a, p.bolsa ?? 0), 0),
    roundsPeleados,
    promedioRoundPorPelea: historial.length === 0 ? 0 : Math.round(roundsPeleados / historial.length),
    edadDebut: EDAD_DEBUT_PROFESIONAL,
    edadRetiro: Math.floor(jugador.edad),
    titulosGanados: historial.filter((p) => p.esTitulo && p.resultado === 'v').length,
    defensasExitosas: jugador.defensas ?? 0,
  };
}
