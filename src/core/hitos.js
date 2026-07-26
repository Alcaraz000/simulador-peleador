// Sistema 4 (feedback del usuario: "faltan popups cuando pasen cosas
// importantes: cuando se gana un cinturón, cuando se pierde un cinturón,
// cuando se avanza de categoría... etc."). Este módulo solo DETECTA hitos
// (comparando antes/después, puro, sin rng ni DOM) y resuelve su texto —
// pintar el popup de verdad (abrirPopup, ui/components/popup.js) es
// responsabilidad de main.js. Deliberadamente acotado a momentos RAROS: un
// hito por pelea cerrada como mucho (ver prioridad en `hitosDePelea`), y
// las transiciones de etapa son apenas dos en toda la carrera (v6, segunda
// vuelta: ETAPAS pasó de cuatro entradas a tres — juvenil, amateur,
// profesional — así que solo quedan dos saltos: juvenil->amateur y
// amateur->profesional; "veterano" ya no es una etapa real, ver
// tagContenido en career.js).

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
    // `rival` se usa siempre SOLO en el texto del hito (nunca junto al
    // nombre): con el roster de 100 (Pedido 1) la mayoría de los rivales de
    // relleno no tienen apodo, así que cae al nombre en vez de mostrar "null".
    hitos.push({ tipo: 'rivalidad_consagrada', rival: oferta.rivalApodo ?? oferta.rivalNombre, contexto });
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

// Cada cuántas victorias EN LA CARRERA (no seguidas: total acumulado, ver
// `record.v`) se cuenta como una marca — pedido v6, "marcaste un récord".
// Deliberadamente redondo (10, 20, 30...) para que se lea como un número que
// de verdad importa, no cualquier victoria más.
const UMBRAL_RECORD_VICTORIAS = 10;

// Cuántos puestos tiene que subir de golpe en el ranking para que valga la
// pena contarlo en el feed — la mayoría de las peleas mueven el puesto un
// poco (ver rankingDelJugador, world.js); esto filtra el salto de rutina del
// que de verdad reordena la conversación de la categoría.
const UMBRAL_SALTO_RANKING = 8;

/**
 * A LO SUMO un hito del jugador traducido a `{tipo, datos}`, listo para
 * `generarNoticia(rng, {tipo, datos})` (news.js) — o `null` si esta pelea no
 * dejó nada digno del feed. Pedido v6 ("las noticias también deberían
 * nombrar al jugador cuando ocurren cosas importantes: obtención de un
 * título, pelea de revancha, defensa de un cinturón..."): a diferencia de
 * `hitosDePelea` (que alimenta el popup y puede devolver varios a la vez,
 * cada uno con su propia relevancia para ESE sistema), acá hay una
 * prioridad DISTINTA y un techo de uno solo — el feed es un lugar que se
 * lee de reojo, no una lista de éxitos.
 *
 * Pura y sin rng: la variedad de titular/cuerpo la resuelve quien llama esto
 * con `generarNoticia`, que trae su propio rng aparte (nunca el compartido
 * de la carrera — ver el comentario grande en news.js).
 *
 * @param {{
 *   hitos: Array, oferta: object, resultado: {ganador: string},
 *   jugadorAntes: object, jugador: object,
 *   rankingAntes?: number|null, rankingDespues?: number|null,
 * }} datos
 */
export function noticiaDeHitoJugador({
  hitos = [], oferta, resultado, jugadorAntes, jugador, rankingAntes = null, rankingDespues = null,
}) {
  const gano = resultado.ganador === 'jugador';
  const porTipo = (tipo) => hitos.find((h) => h.tipo === tipo) ?? null;
  const base = {
    nombre: jugador.nombre,
    apodo: jugador.apodo,
    rival: oferta.rivalApodo ?? oferta.rivalNombre,
  };

  const tituloGanado = porTipo('titulo_ganado');
  if (tituloGanado) return { tipo: 'titulo', datos: { ...base, titulo: tituloGanado.cinturon } };

  const tituloPerdido = porTipo('titulo_perdido');
  if (tituloPerdido) return { tipo: 'titulo_perdido', datos: { ...base, titulo: tituloPerdido.cinturon } };

  const defensa = porTipo('defensa_exitosa');
  if (defensa) {
    const numero = oferta.cinturonId ? (jugador.defensasCinturon?.[oferta.cinturonId] ?? '') : '';
    return {
      tipo: 'defensa', datos: { ...base, titulo: defensa.cinturon, numero },
    };
  }

  if (oferta.esRevancha && gano) return { tipo: 'revancha_ganada', datos: base };

  if (porTipo('primera_pelea')) return { tipo: 'debut', datos: { nombre: base.nombre, apodo: base.apodo } };

  const vAntes = jugadorAntes.record?.v ?? 0;
  const vDespues = jugador.record?.v ?? 0;
  if (vDespues > vAntes && vDespues > 0 && vDespues % UMBRAL_RECORD_VICTORIAS === 0) {
    return { tipo: 'record', datos: { nombre: base.nombre, apodo: base.apodo, numero: vDespues } };
  }

  if (
    rankingAntes !== null && rankingDespues !== null
    && rankingAntes - rankingDespues >= UMBRAL_SALTO_RANKING
  ) {
    return { tipo: 'ranking', datos: { nombre: base.nombre, apodo: base.apodo, numero: rankingDespues } };
  }

  return null;
}
