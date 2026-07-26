// Sistema 4 (feedback del usuario: "faltan popups cuando pasen cosas
// importantes: cuando se gana un cinturón, cuando se pierde un cinturón,
// cuando se avanza de categoría... etc."). Este módulo solo DETECTA hitos
// (comparando antes/después, puro, sin rng ni DOM) y resuelve su texto —
// pintar el popup de verdad (abrirPopup, ui/components/popup.js) es
// responsabilidad de main.js. Deliberadamente acotado a momentos RAROS: un
// hito por pelea cerrada como mucho (ver prioridad en `hitosDePelea`), y
// las transiciones de etapa son apenas tres en toda la carrera.

import { rachaActual } from './stats-carrera.js';
import {
  TITULO_GANADO, TITULO_PERDIDO, DEFENSA_EXITOSA, ETAPA_AVANZA,
  PRIMERA_PELEA, RIVALIDAD_CONSAGRADA, RACHA,
} from '../content/hitos-lines.js';

// Cada cuántas victorias seguidas se festeja una racha: alto a propósito
// (Sistema 4, "que no moleste" — con 12-22 peleas por carrera, llegar a 10
// seguidas es una hazaña, no algo que pase todos los bloques).
const RACHA_HITO = 10;

/**
 * Detecta los hitos que produjo UNA pelea recién cerrada (cerrarPelea,
 * main.js). `tituloGanado` ya viene resuelto por `aplicarResultado`
 * (offers.js) — acá no se recalcula, solo se traduce a hito. Devuelve una
 * lista (puede tener más de un hito a la vez, p. ej. título ganado +
 * racha); quien pinta decide si muestra uno solo o los encola.
 */
export function hitosDePelea({
  oferta, resultado, tituloGanado, jugadorAntes, defensasActuales = null,
  archirrivalAntesId = null, archirrivalDespuesId = null, contexto = 0,
}) {
  const hitos = [];
  const gano = resultado.ganador === 'jugador';
  const empate = resultado.ganador === 'empate';

  // "defensa_exitosa" es deliberadamente RARO, no una vez por cada defensa
  // ganada: con 2-4 defensas obligatorias por cinturón (ver CINTURONES,
  // offers.js), festejar cada una convertía el hito en rutina — medido, ~3.3
  // popups de defensa por carrera jugando de punta a punta, muy lejos de
  // "raro". Ahora solo se dispara la defensa que CONSOLIDA el reinado (la
  // que llega justo a `defensasObligatorias`): un verdadero hito, no un
  // trámite que se repite.
  if (tituloGanado) {
    hitos.push({ tipo: 'titulo_ganado', cinturon: tituloGanado, contexto });
  } else if (
    oferta.esObligatoria && gano
    && defensasActuales !== null && oferta.defensasObligatorias
    && defensasActuales === oferta.defensasObligatorias
  ) {
    hitos.push({ tipo: 'defensa_exitosa', cinturon: oferta.enJuego, contexto });
  } else if (oferta.esObligatoria && !gano && !empate) {
    hitos.push({ tipo: 'titulo_perdido', cinturon: oferta.enJuego, contexto });
  }

  const rachaAntes = rachaActual(jugadorAntes.historial ?? []);
  const rachaDespues = gano ? rachaAntes + 1 : 0;
  if (rachaDespues === RACHA_HITO) {
    hitos.push({ tipo: 'racha', cantidad: rachaDespues, contexto });
  }

  if (!archirrivalAntesId && archirrivalDespuesId) {
    hitos.push({ tipo: 'rivalidad_consagrada', rival: oferta.rivalApodo, contexto });
  }

  if ((jugadorAntes.historial?.length ?? 0) === 0) {
    hitos.push({ tipo: 'primera_pelea', contexto });
  }

  return hitos;
}

/**
 * Hito de transición de etapa (siguienteBeat, career.js): null si no hubo
 * cambio, o si todavía no hay etapa anterior conocida (arranque de la
 * carrera — el primer beat de juvenil no es "un avance", es el inicio).
 */
export function hitoDeEtapa({ etapaAnteriorId, etapaNueva, contexto = 0 }) {
  if (!etapaAnteriorId || etapaAnteriorId === etapaNueva.id) return null;
  return {
    tipo: 'etapa_avanza', etapa: etapaNueva.nombre, etapaId: etapaNueva.id, frase: etapaNueva.frase, contexto,
  };
}

const POOLS = {
  titulo_ganado: TITULO_GANADO,
  titulo_perdido: TITULO_PERDIDO,
  defensa_exitosa: DEFENSA_EXITOSA,
  etapa_avanza: ETAPA_AVANZA,
  primera_pelea: PRIMERA_PELEA,
  rivalidad_consagrada: RIVALIDAD_CONSAGRADA,
  racha: RACHA,
};

const ICONOS = {
  titulo_ganado: 'trofeo',
  titulo_perdido: 'peligro',
  defensa_exitosa: 'escudo',
  etapa_avanza: 'flecha',
  primera_pelea: 'guante',
  rivalidad_consagrada: 'rayo',
  racha: 'estrella',
};

// Tono para que la UI (main.js) pueda pintar el popup acorde (dorado en
// positivo, rojo en negativo) sin tener que repetir este mapeo ahí.
const TONOS = {
  titulo_ganado: 'positivo',
  titulo_perdido: 'negativo',
  defensa_exitosa: 'positivo',
  etapa_avanza: 'neutro',
  primera_pelea: 'neutro',
  rivalidad_consagrada: 'neutro',
  racha: 'positivo',
};

// Hash chico y estable (mismo criterio que `indiceEstable` en offers.js):
// elige la variante de texto a partir de datos PROPIOS del hito, nunca de
// un contador global ni del rng compartido de la carrera — así la misma
// situación en carreras distintas puede mostrar un cartel distinto sin
// robarle una tirada al hilo de azar que calibra el ritmo de la carrera.
function indiceEstable(texto, modulo) {
  let h = 0;
  for (let i = 0; i < texto.length; i += 1) h = (h * 31 + texto.charCodeAt(i)) % 100000;
  return h % modulo;
}

function rellenar(plantilla, datos) {
  return plantilla.replace(/\{(\w+)\}/g, (_, clave) => String(datos[clave] ?? ''));
}

/**
 * Título, cuerpo e ícono ya resueltos (marcadores rellenos) para un hito, o
 * `null` si el tipo no se reconoce (nunca revienta: un hito con tipo raro
 * simplemente no se muestra).
 */
export function textoDeHito(hito) {
  const pool = POOLS[hito.tipo];
  if (!pool) return null;
  const clave = `${hito.tipo}|${hito.cinturon ?? ''}|${hito.rival ?? ''}|${hito.etapaId ?? ''}|${hito.cantidad ?? ''}|${hito.contexto ?? 0}`;
  const indiceTitulo = indiceEstable(clave, pool.titulos.length);
  const indiceCuerpo = indiceEstable(`${clave}|cuerpo`, pool.cuerpos.length);
  return {
    titulo: pool.titulos[indiceTitulo],
    texto: rellenar(pool.cuerpos[indiceCuerpo], hito),
    icono: ICONOS[hito.tipo],
    tono: TONOS[hito.tipo] ?? 'neutro',
  };
}
