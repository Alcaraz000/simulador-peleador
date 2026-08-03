import { clamp } from './stats.js';
import { PREGUNTAS_CAREO, NARRACION_CAREO } from '../content/cards-presser.js';

// v13 (simplificación de atributos): `canchero` prometía "+ FAMA" en su
// pista — la fama se va del juego (ver stats.js), pero el tono sigue
// funcionando igual por dentro (EFECTOS_TONO, más abajo: es el que más hype
// mueve después de provocador). La pista pasa a anunciar lo que de verdad
// hace: sube el hype, con el mismo condimento de "impredecible" que ya tenía.
export const TONOS = {
  provocador: { id: 'provocador', nombre: 'Provocador', pistaEfecto: '+ HYPE · riesgo: lo agranda' },
  frio: { id: 'frio', nombre: 'Frío / técnico', pistaEfecto: '+ VENTAJA MENTAL' },
  humilde: { id: 'humilde', nombre: 'Humilde', pistaEfecto: '– HYPE · + respeto' },
  canchero: { id: 'canchero', nombre: 'Canchero', pistaEfecto: '+ HYPE · impredecible' },
};

export const TELLS = {
  agresivo: { incomoda: 'frio', agranda: 'provocador', texto: 'Es explosivo y soberbio. Si lo provocás, se agranda. La frialdad técnica lo descoloca.' },
  provocador: { incomoda: 'humilde', agranda: 'canchero', texto: 'Vive del ida y vuelta. La humildad lo deja sin libreto; la joda le da pie.' },
  respetuoso: { incomoda: 'provocador', agranda: 'humilde', texto: 'Es un caballero. La provocación lo saca de eje; la humildad lo relaja.' },
  showman: { incomoda: 'frio', agranda: 'canchero', texto: 'Vino a actuar. La seriedad le arruina el show; la joda lo alimenta.' },
  tramposo: { incomoda: 'frio', agranda: 'provocador', texto: 'Busca sacarte del plan. Los datos fríos lo exponen; el barro es su terreno.' },
  mentor: { incomoda: 'canchero', agranda: 'humilde', texto: 'Te trata de aprendiz. La cancha lo irrita; la humildad le confirma el papel.' },
  mercenario: { incomoda: 'humilde', agranda: 'frio', texto: 'Solo le importa la bolsa. La humildad lo deja sin argumento; los números lo entretienen.' },
};

export const HYPE_INICIAL = 45;

export function crearCareo(rng, { oferta, rondas = 3 }) {
  const personalidad = oferta.rivalPersonalidad ?? 'respetuoso';
  return {
    ofertaId: oferta.id,
    rivalId: oferta.rivalId,
    // Se usa siempre SOLO (nunca junto al nombre — ver prefacioHablante y
    // NARRACION_CAREO en ui/screens/presser.js), así que cae al nombre si no
    // hay apodo (roster de 100, Pedido 1: la mayoría de los rivales de
    // relleno no tienen uno) en vez de mostrar "null".
    rivalApodo: oferta.rivalApodo ?? oferta.rivalNombre,
    personalidad,
    tell: TELLS[personalidad] ?? TELLS.respetuoso,
    hype: HYPE_INICIAL + (oferta.esTitulo ? 15 : 0),
    ventajaMental: 0,
    ronda: 1,
    rondas,
    preguntas: rng.shuffle(PREGUNTAS_CAREO).slice(0, rondas),
    terminado: false,
    // Qué se dijo en cada ronda y qué pasó (Task v3, pedido textual: "al
    // terminar el careo, mostrar un resumen de las respuestas y qué
    // consecuencias tuvo"). Se va completando en cada `responderCareo`.
    historial: [],
  };
}

const EFECTOS_TONO = {
  provocador: { hype: 12, ventaja: 0 },
  frio: { hype: 2, ventaja: 8 },
  humilde: { hype: -4, ventaja: 3 },
  canchero: { hype: 7, ventaja: 2 },
};

function rellenar(plantilla, datos) {
  return plantilla.replace(/\{(\w+)\}/g, (_, clave) => String(datos[clave] ?? ''));
}

export function responderCareo(careo, tonoId, rng) {
  if (!TONOS[tonoId]) throw new Error(`Tono desconocido: ${tonoId}`);
  if (careo.terminado) return { careo, evento: null };

  const pregunta = careo.preguntas[careo.ronda - 1];
  const respuesta = pregunta.respuestas.find((r) => r.tono === tonoId) ?? null;

  const base = EFECTOS_TONO[tonoId];
  let hypeDelta = base.hype + rng.int(-2, 2);
  let ventajaDelta = base.ventaja;

  if (tonoId === careo.tell.incomoda) ventajaDelta += 14;
  if (tonoId === careo.tell.agranda) ventajaDelta -= 16;

  const categoria = ventajaDelta > 8 ? 'incomoda' : ventajaDelta < 0 ? 'agranda' : 'neutral';
  const texto = rellenar(rng.pick(NARRACION_CAREO[categoria]), { rival: careo.rivalApodo });
  const evento = { texto, hypeDelta, ventajaDelta };

  const entrada = {
    ronda: careo.ronda,
    preguntaId: pregunta.id,
    hablante: pregunta.hablante,
    preguntaTexto: pregunta.texto,
    tono: tonoId,
    respuestaTexto: respuesta ? respuesta.texto : '',
    evento,
  };

  const nuevo = {
    ...careo,
    hype: clamp(careo.hype + hypeDelta, 0, 100),
    ventajaMental: clamp(careo.ventajaMental + ventajaDelta, -100, 100),
    ronda: careo.ronda + 1,
    historial: [...careo.historial, entrada],
  };
  nuevo.terminado = nuevo.ronda > careo.rondas;

  return { careo: nuevo, evento };
}

// Cuánto se lleva al ring el que gana la guerra psicológica, como MÁXIMO.
//
// Reportado, textual: "la conferencia está ok de momento, pero no siento que
// importe para nada el tema de las respuestas". Y era cierto: `resultadoCareo`
// devolvía hype y ventaja mental, pero lo único que el juego aplicaba de
// verdad era la calentura del rival. Las respuestas movían dos números que
// morían en la misma pantalla donde se mostraban.
//
// Ahora la ventaja mental viaja a la pelea como un envión temporal de
// AGILIDAD — leer al rival y reaccionar es exactamente lo que se gana ganando
// el careo — y puede ser NEGATIVA: si el rival te comió la cabeza, salís
// peor. Mismo camino que el envión del sparring (guardarBonusProximaPelea,
// career.js): se gasta en un combate y nunca toca la ficha. Distinto atributo
// a propósito, para que se lean como dos preparaciones distintas: el gimnasio
// da aire, el careo da lucidez.
export const VENTAJA_MAXIMA_AL_RING = 4;
const VENTAJA_POR_PUNTO = 12;

export function bonusDeVentajaMental(ventajaMental) {
  const bruto = Math.round((ventajaMental ?? 0) / VENTAJA_POR_PUNTO);
  return clamp(bruto, -VENTAJA_MAXIMA_AL_RING, VENTAJA_MAXIMA_AL_RING);
}

export function resultadoCareo(careo) {
  const agilidad = bonusDeVentajaMental(careo.ventajaMental);
  return {
    hype: careo.hype,
    ventajaMental: careo.ventajaMental,
    bonusFama: Math.round(careo.hype / 12),
    bonusMoral: Math.round(careo.ventajaMental / 6),
    heatRival: Math.round(careo.hype / 5),
    // Vacío cuando el careo quedó parejo: sin esto, "no pasó nada" se
    // guardaría como un cero que igual hay que consumir.
    bonusTemporal: agilidad === 0 ? {} : { agilidad },
  };
}
