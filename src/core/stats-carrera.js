import { EDAD_INICIAL } from './fighter.js';

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

  return {
    peleas: historial.length,
    victorias: victorias.length,
    derrotas: derrotas.length,
    empates: empates.length,
    porcentajeKO: victorias.length === 0 ? 0 : Math.round((porKO.length / victorias.length) * 100),
    rachaActual: rachaActual(historial),
    rachaMasLarga: rachaMasLargaDe(historial),
    rivalMasDuro: rivalMasDuro
      ? { nombre: rivalMasDuro.rivalNombre, apodo: rivalMasDuro.rivalApodo, media: rivalMasDuro.rivalMedia }
      : null,
    bolsaMayor: historial.reduce((a, p) => Math.max(a, p.bolsa ?? 0), 0),
    roundsPeleados,
    promedioRoundPorPelea: historial.length === 0 ? 0 : Math.round(roundsPeleados / historial.length),
    edadDebut: EDAD_INICIAL,
    edadRetiro: Math.floor(jugador.edad),
    titulosGanados: historial.filter((p) => p.esTitulo && p.resultado === 'v').length,
    defensasExitosas: jugador.defensas ?? 0,
  };
}
