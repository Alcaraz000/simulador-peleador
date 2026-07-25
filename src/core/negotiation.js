import { clamp } from './stats.js';

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

export function crearNegociacion(oferta, { tieneManager = false } = {}) {
  return {
    ofertaId: oferta.id,
    bolsaInicial: oferta.bolsa,
    bolsa: oferta.bolsa,
    paciencia: 100,
    condiciones: [],
    movidas: 0,
    cerrada: false,
    perdida: false,
    reduccionRiesgo: tieneManager ? REDUCCION_MANAGER : 0,
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

export function jugarMovida(negociacion, movidaId, rng) {
  const movida = MOVIDAS[movidaId];
  if (!movida) throw new Error(`Movida desconocida: ${movidaId}`);
  if (negociacion.cerrada || negociacion.perdida) return { negociacion, evento: null };

  const nueva = clonar(negociacion);
  nueva.movidas += 1;

  if (movidaId === 'cerrar') {
    nueva.cerrada = true;
    return {
      negociacion: nueva,
      evento: { tipo: 'cierra', texto: `Cerrado: US$ ${nueva.bolsa.toLocaleString('es-AR')}. Apretón de manos y a entrenar.` },
    };
  }

  const riesgo = riesgoDe(negociacion, movidaId);
  nueva.paciencia = clamp(nueva.paciencia - Math.round(riesgo * 60), 0, 100);

  if (rng.chance(riesgo)) {
    nueva.perdida = true;
    return {
      negociacion: nueva,
      evento: { tipo: 'rechaza', texto: 'El promotor junta los papeles y se levanta. "Buscate otro."' },
    };
  }

  if (movida.mejora.bolsa) {
    nueva.bolsa = Math.round(nueva.bolsa * (1 + movida.mejora.bolsa));
  }
  if (movida.mejora.condicion && !nueva.condiciones.includes(movida.mejora.condicion)) {
    nueva.condiciones.push(movida.mejora.condicion);
  }

  return {
    negociacion: nueva,
    evento: { tipo: 'acepta', texto: `El promotor resopla y acepta: US$ ${nueva.bolsa.toLocaleString('es-AR')}.` },
  };
}

export function resultadoNegociacion(negociacion) {
  if (negociacion.perdida) {
    return {
      bolsa: Math.round(negociacion.bolsaInicial * 0.7),
      condiciones: [],
      perdida: true,
    };
  }
  return { bolsa: negociacion.bolsa, condiciones: [...negociacion.condiciones], perdida: false };
}
