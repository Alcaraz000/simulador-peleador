import { clamp } from './stats.js';
import { PREGUNTAS_CAREO } from '../content/cards-presser.js';

export const TONOS = {
  provocador: { id: 'provocador', nombre: 'Provocador', pistaEfecto: '+ HYPE · riesgo: lo agranda' },
  frio: { id: 'frio', nombre: 'Frío / técnico', pistaEfecto: '+ VENTAJA MENTAL' },
  humilde: { id: 'humilde', nombre: 'Humilde', pistaEfecto: '– HYPE · + respeto' },
  canchero: { id: 'canchero', nombre: 'Canchero', pistaEfecto: '+ FAMA · impredecible' },
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
    rivalApodo: oferta.rivalApodo,
    personalidad,
    tell: TELLS[personalidad] ?? TELLS.respetuoso,
    hype: HYPE_INICIAL + (oferta.esTitulo ? 15 : 0),
    ventajaMental: 0,
    ronda: 1,
    rondas,
    preguntas: rng.shuffle(PREGUNTAS_CAREO).slice(0, rondas),
    terminado: false,
  };
}

const EFECTOS_TONO = {
  provocador: { hype: 12, ventaja: 0 },
  frio: { hype: 2, ventaja: 8 },
  humilde: { hype: -4, ventaja: 3 },
  canchero: { hype: 7, ventaja: 2 },
};

export function responderCareo(careo, tonoId, rng) {
  if (!TONOS[tonoId]) throw new Error(`Tono desconocido: ${tonoId}`);
  if (careo.terminado) return { careo, evento: null };

  const base = EFECTOS_TONO[tonoId];
  let hypeDelta = base.hype + rng.int(-2, 2);
  let ventajaDelta = base.ventaja;

  if (tonoId === careo.tell.incomoda) ventajaDelta += 14;
  if (tonoId === careo.tell.agranda) ventajaDelta -= 16;

  const nuevo = {
    ...careo,
    hype: clamp(careo.hype + hypeDelta, 0, 100),
    ventajaMental: clamp(careo.ventajaMental + ventajaDelta, -100, 100),
    ronda: careo.ronda + 1,
  };
  nuevo.terminado = nuevo.ronda > careo.rondas;

  const texto = ventajaDelta > 8
    ? `${careo.rivalApodo} se queda sin respuesta. Le pegaste donde duele.`
    : ventajaDelta < 0
      ? `${careo.rivalApodo} se agranda con eso. La sala explota a su favor.`
      : 'La sala murmura. Nadie se llevó la ronda.';

  return { careo: nuevo, evento: { texto, hypeDelta, ventajaDelta } };
}

export function resultadoCareo(careo) {
  return {
    hype: careo.hype,
    ventajaMental: careo.ventajaMental,
    bonusFama: Math.round(careo.hype / 12),
    bonusMoral: Math.round(careo.ventajaMental / 6),
    heatRival: Math.round(careo.hype / 5),
  };
}
