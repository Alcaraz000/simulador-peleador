import { clamp } from './stats.js';
import { LINEAS_NEGOCIACION, LINEAS_CIERRE } from '../content/negotiation-lines.js';

export const MOVIDAS = {
  cerrar: {
    id: 'cerrar',
    nombre: 'Cerrá el trato',
    texto: 'Firmás lo que hay sobre la mesa. Buen trato, a la lona.',
    riesgoBase: 0,
    mejora: {},
  },
  masPlata: {
    id: 'masPlata',
    nombre: 'Pedí más plata',
    texto: 'Vas por un 25% más. Si acepta, gran salto; si no, se enfría.',
    riesgoBase: 0.3,
    mejora: { bolsa: 0.25 },
  },
  taquilla: {
    id: 'taquilla',
    nombre: 'Quiero % de la taquilla',
    texto: 'Si es un gran evento, cobrás mucho más. Al promotor no le gusta.',
    riesgoBase: 0.35,
    mejora: { bolsa: 0.15, condicion: '% de taquilla' },
  },
  apretar: {
    id: 'apretar',
    nombre: 'Apretá: "o subís o no hay pelea"',
    texto: 'Todo o nada. Puede duplicar la bolsa... o mandarte a tu casa.',
    riesgoBase: 0.6,
    mejora: { bolsa: 1 },
  },
};

export const REDUCCION_MANAGER = 0.1;

// Pedido textual del usuario: "solo quiero que como máximo me deje presionar
// hasta 3 veces". Cuenta solo las movidas de presión (masPlata/taquilla/
// apretar) — "cerrar" no es un apriete y nunca cuenta acá.
export const LIMITE_APRIETES = 3;

// Cuánto se lleva puesto la bolsa cuando un apriete sale mal (Task v3: "un
// apriete que sale mal no significa que se cae la pelea", pero tampoco puede
// salir gratis: el promotor se calienta y retrocede sobre lo que ya estaba
// en la mesa, no vuelve a la oferta original).
const PENALIZACION_APRIETE_FALLIDO = 0.85;

export function crearNegociacion(oferta, { tieneManager = false } = {}) {
  return {
    ofertaId: oferta.id,
    bolsaInicial: oferta.bolsa,
    bolsa: oferta.bolsa,
    paciencia: 100,
    condiciones: [],
    // Cuántas veces ya presionó (independiente de si salió bien o mal).
    intentosApriete: 0,
    // Se prende cuando se acaba el margen para seguir presionando: por
    // agotar los 3 intentos, o porque un apriete salió mal. En ese estado
    // las movidas de presión quedan sin efecto (la UI las pinta apagadas) y
    // solo quedan disponibles cerrar o rechazar la pelea.
    bloqueada: false,
    cerrada: false,
    reduccionRiesgo: tieneManager ? REDUCCION_MANAGER : 0,
    // Qué acaba de pasar, para que la pantalla lo muestre (Task v3: "falta
    // un campo que describa lo que acaba de ocurrir"). Vive EN la
    // negociación (no como un valor de retorno aparte) para sobrevivir a un
    // repintado sin que quien llama tenga que guardarlo aparte.
    ultimoEvento: null,
  };
}

function clonar(negociacion) {
  return { ...negociacion, condiciones: [...negociacion.condiciones] };
}

export function riesgoDe(negociacion, movidaId) {
  const movida = MOVIDAS[movidaId];
  const porDesgaste = (100 - negociacion.paciencia) / 250;
  return clamp(movida.riesgoBase + porDesgaste - negociacion.reduccionRiesgo, 0, 0.95);
}

function rellenar(plantilla, datos) {
  return plantilla.replace(/\{(\w+)\}/g, (_, clave) => String(datos[clave] ?? ''));
}

function fmtBolsa(n) {
  return `US$ ${Math.round(n).toLocaleString('es-AR')}`;
}

function narrarCierre(negociacion, rng) {
  return rellenar(rng.pick(LINEAS_CIERRE), { bolsa: fmtBolsa(negociacion.bolsa) });
}

function narrarApriete(movidaId, exito, bolsaResultante, condicion, rng) {
  const pool = LINEAS_NEGOCIACION[movidaId][exito ? 'acepta' : 'rechaza'];
  return rellenar(rng.pick(pool), { bolsa: fmtBolsa(bolsaResultante), condicion: condicion ?? '' });
}

/**
 * Juega una movida de la negociación. `rng` es siempre el hilo "cosmético"
 * de la UI (el mismo que narra la pelea y el careo, ver main.js) — nunca el
 * rng de carrera, así que estas tiradas no mueven el ritmo/balance de la
 * carrera (ver el comentario sobre el rng compartido en career.js).
 */
export function jugarMovida(negociacion, movidaId, rng) {
  const movida = MOVIDAS[movidaId];
  if (!movida) throw new Error(`Movida desconocida: ${movidaId}`);
  if (negociacion.cerrada) return { negociacion, evento: null };

  if (movidaId === 'cerrar') {
    const nueva = clonar(negociacion);
    nueva.cerrada = true;
    const evento = { tipo: 'cierra', texto: narrarCierre(nueva, rng) };
    nueva.ultimoEvento = evento;
    return { negociacion: nueva, evento };
  }

  // Movida de presión: sin margen (tope de intentos o ya bloqueada por un
  // fallo anterior), no hace nada — la UI ya la pinta apagada, pero el
  // núcleo también se cuida de no hacer nada si igual la llaman.
  if (negociacion.bloqueada || negociacion.intentosApriete >= LIMITE_APRIETES) {
    return { negociacion, evento: null };
  }

  const nueva = clonar(negociacion);
  nueva.intentosApriete += 1;

  const riesgo = riesgoDe(negociacion, movidaId);
  nueva.paciencia = clamp(nueva.paciencia - Math.round(riesgo * 60), 0, 100);

  if (rng.chance(riesgo)) {
    nueva.bolsa = Math.round(nueva.bolsa * PENALIZACION_APRIETE_FALLIDO);
    nueva.bloqueada = true;
    const evento = {
      tipo: 'rechaza',
      texto: narrarApriete(movidaId, false, nueva.bolsa, movida.mejora.condicion, rng),
    };
    nueva.ultimoEvento = evento;
    return { negociacion: nueva, evento };
  }

  if (movida.mejora.bolsa) {
    nueva.bolsa = Math.round(nueva.bolsa * (1 + movida.mejora.bolsa));
  }
  if (movida.mejora.condicion && !nueva.condiciones.includes(movida.mejora.condicion)) {
    nueva.condiciones.push(movida.mejora.condicion);
  }
  // Se acaban de agotar los 3 intentos sin haber fallado ninguno: el tope
  // también corta el margen para seguir presionando (Task v3: "como máximo
  // 3 veces", no solo "hasta que falle una").
  if (nueva.intentosApriete >= LIMITE_APRIETES) nueva.bloqueada = true;

  const evento = {
    tipo: 'acepta',
    texto: narrarApriete(movidaId, true, nueva.bolsa, movida.mejora.condicion, rng),
  };
  nueva.ultimoEvento = evento;
  return { negociacion: nueva, evento };
}

export function resultadoNegociacion(negociacion) {
  return { bolsa: negociacion.bolsa, condiciones: [...negociacion.condiciones] };
}
